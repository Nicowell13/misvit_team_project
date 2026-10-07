-- Standalone SQL Editor patch. Requires existing foundation, audit_logs, invitations,
-- login_allowlist and pgcrypto. Do NOT replay older migrations.
-- Policy: verified-email holders may accept ONE pending admin invite without its
-- token if OAuth lost the destination. Multiple pending invites require a token.
BEGIN;

CREATE OR REPLACE FUNCTION public.provision_allowlisted_member()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE user_email TEXT; allowed_roles TEXT[]; org_id UUID; member_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  SELECT lower(trim(email)) INTO user_email FROM auth.users
    WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL;
  IF user_email IS NULL THEN RAISE EXCEPTION 'verified_email_required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::TEXT, 0));
  SELECT id INTO org_id FROM public.organizations WHERE slug = 'misvit-marketing';
  IF org_id IS NULL THEN RAISE EXCEPTION 'organization_not_found'; END IF;
  IF EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = org_id AND user_id = auth.uid()) THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;
  SELECT roles INTO allowed_roles FROM public.login_allowlist WHERE email = user_email;
  IF allowed_roles IS NULL THEN RETURN jsonb_build_object('allowed', false); END IF;
  INSERT INTO public.organization_members(organization_id, user_id, roles, invited_by)
    VALUES (org_id, auth.uid(), allowed_roles, auth.uid())
    ON CONFLICT (organization_id, user_id) DO NOTHING RETURNING id INTO member_id;
  IF member_id IS NOT NULL THEN
    INSERT INTO public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, metadata)
      VALUES (org_id, auth.uid(), 'PROVISION', 'organization_member', member_id, jsonb_build_object('roles', allowed_roles, 'source', 'login_allowlist'));
  END IF;
  RETURN jsonb_build_object('allowed', true);
END $$;

CREATE OR REPLACE FUNCTION public.admit_misvit_member(raw_token TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE user_email TEXT; org_id UUID; inv public.organization_invitations%ROWTYPE;
        candidate UUID; candidates INTEGER := 0; token_digest TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  SELECT lower(trim(email)) INTO user_email FROM auth.users
    WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL;
  IF user_email IS NULL THEN RAISE EXCEPTION 'verified_email_required'; END IF;
  SELECT id INTO org_id FROM public.organizations WHERE slug = 'misvit-marketing';
  IF org_id IS NULL THEN RAISE EXCEPTION 'organization_not_found'; END IF;
  -- Serialize admission per user, including direct RPC callers.
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::TEXT, 0));
  IF raw_token IS NULL AND EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = org_id AND user_id = auth.uid()) THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;
  IF raw_token IS NOT NULL THEN
    IF length(raw_token) > 128 OR raw_token !~ '^[A-Za-z0-9_-]+$' THEN
      RAISE EXCEPTION 'invitation_invalid_or_expired';
    END IF;
    -- pgcrypto may live in public or extensions; resolve only those trusted schemas.
    token_digest := encode(digest(raw_token, 'sha256'), 'hex');
    SELECT * INTO inv FROM public.organization_invitations
      WHERE organization_id = org_id AND token_hash = token_digest
        AND accepted_at IS NULL AND expires_at > now() FOR UPDATE;
    IF inv.id IS NULL THEN RAISE EXCEPTION 'invitation_invalid_or_expired'; END IF;
    IF user_email IS DISTINCT FROM lower(trim(inv.email)) THEN RAISE EXCEPTION 'invitation_email_mismatch'; END IF;
  ELSE
    FOR candidate IN SELECT id FROM public.organization_invitations i
      WHERE i.organization_id = org_id AND lower(trim(i.email)) = user_email
        AND accepted_at IS NULL AND expires_at > now()
        AND EXISTS (SELECT 1 FROM public.organization_members m
          WHERE m.organization_id = org_id AND m.user_id = i.invited_by AND 'admin' = ANY(m.roles))
      ORDER BY id FOR UPDATE OF i
    LOOP
      candidates := candidates + 1;
      SELECT * INTO inv FROM public.organization_invitations WHERE id = candidate;
    END LOOP;
    IF candidates > 1 THEN RAISE EXCEPTION 'invitation_ambiguous'; END IF;
    IF candidates = 0 THEN RETURN public.provision_allowlisted_member(); END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id AND user_id = inv.invited_by AND 'admin' = ANY(roles)) THEN
    RAISE EXCEPTION 'invitation_invalid_or_expired';
  END IF;
  -- Existing roles remain intact. Invite may provision a new member, not silently
  -- replace an existing member's roles; admin_update_member_roles handles changes.
  INSERT INTO public.organization_members(organization_id, user_id, roles, invited_by)
    VALUES (org_id, auth.uid(), inv.roles, inv.invited_by)
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  UPDATE public.organization_invitations SET accepted_at = now(), accepted_by = auth.uid() WHERE id = inv.id;
  INSERT INTO public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, metadata)
    VALUES (org_id, auth.uid(), 'ACCEPT', 'organization_invitation', inv.id,
      jsonb_build_object('roles', inv.roles, 'source', CASE WHEN raw_token IS NULL THEN 'verified_email' ELSE 'token' END));
  RETURN jsonb_build_object('allowed', true, 'accepted', true);
END $$;

-- Resolve digest schema explicitly without trusting caller search_path.
DO $$
DECLARE crypto_schema TEXT;
BEGIN
  SELECT n.nspname INTO crypto_schema FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'pgcrypto';
  IF crypto_schema IS NULL OR crypto_schema NOT IN ('public', 'extensions') THEN RAISE EXCEPTION 'pgcrypto_required_in_trusted_schema'; END IF;
  EXECUTE format('ALTER FUNCTION public.admit_misvit_member(TEXT) SET search_path = pg_catalog, public, %I', crypto_schema);
END $$;

CREATE OR REPLACE FUNCTION public.accept_organization_invitation(raw_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF raw_token IS NULL THEN RAISE EXCEPTION 'invitation_invalid_or_expired'; END IF;
  RETURN public.admit_misvit_member(raw_token);
END $$;

REVOKE ALL ON FUNCTION public.provision_allowlisted_member() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admit_misvit_member(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_organization_invitation(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provision_allowlisted_member() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admit_misvit_member(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(TEXT) TO authenticated;
-- Patch previously exposed every invitation email/role to every authenticated user.
DROP POLICY IF EXISTS "authenticated users can read invitations" ON public.organization_invitations;

-- Approved deployment configuration; preserve admin1 and any existing roles.
DO $$
DECLARE admin_email CONSTANT TEXT := 'khazwelatala06@gmail.com';
        org_id UUID; admin_id UUID; member_id UUID; old_roles TEXT[]; new_roles TEXT[];
BEGIN
  SELECT id INTO org_id FROM public.organizations WHERE slug = 'misvit-marketing';
  IF org_id IS NULL THEN RAISE EXCEPTION 'organization_not_found'; END IF;
  SELECT roles INTO old_roles FROM public.login_allowlist WHERE email = admin_email;
  INSERT INTO public.login_allowlist AS existing(email, roles)
    VALUES (admin_email, ARRAY['admin']::TEXT[])
    ON CONFLICT (email) DO UPDATE SET roles = ARRAY(
      SELECT DISTINCT role FROM unnest(existing.roles || EXCLUDED.roles) AS role ORDER BY role);
  SELECT roles INTO new_roles FROM public.login_allowlist WHERE email = admin_email;
  IF old_roles IS DISTINCT FROM new_roles THEN
    INSERT INTO public.audit_logs(organization_id, actor_id, action, entity_type, metadata)
      VALUES (org_id, NULL, 'SEED_ADMIN2_ALLOWLIST', 'login_allowlist', jsonb_build_object('roles', new_roles));
  END IF;
  SELECT id INTO admin_id FROM auth.users WHERE lower(trim(email)) = admin_email AND email_confirmed_at IS NOT NULL;
  IF admin_id IS NULL THEN RETURN; END IF;
  SELECT roles INTO old_roles FROM public.organization_members WHERE organization_id = org_id AND user_id = admin_id;
  INSERT INTO public.organization_members AS existing(organization_id, user_id, roles, invited_by)
    VALUES (org_id, admin_id, ARRAY['admin']::TEXT[], admin_id)
    ON CONFLICT (organization_id, user_id) DO UPDATE SET roles = ARRAY(
      SELECT DISTINCT role FROM unnest(existing.roles || EXCLUDED.roles) AS role ORDER BY role)
    RETURNING id, roles INTO member_id, new_roles;
  IF old_roles IS DISTINCT FROM new_roles THEN
    INSERT INTO public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, metadata)
      VALUES (org_id, NULL, 'SEED_ADMIN2', 'organization_member', member_id,
        jsonb_build_object('old_roles', old_roles, 'roles', new_roles));
  END IF;
END $$;
COMMIT;
