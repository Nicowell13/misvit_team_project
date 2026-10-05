-- Admin-created, single-use organization invitations.
CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  roles TEXT[] NOT NULL DEFAULT ARRAY['member']::TEXT[],
  token_hash TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES public.profiles(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (cardinality(roles) > 0 AND roles <@ ARRAY['admin','manager','finance','member']::TEXT[])
);
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage invitations" ON public.organization_invitations;
CREATE POLICY "admins manage invitations" ON public.organization_invitations FOR ALL
  USING (public.has_org_role(organization_id, ARRAY['admin']))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['admin']));

CREATE OR REPLACE FUNCTION public.accept_organization_invitation(raw_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE inv public.organization_invitations%ROWTYPE; current_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  SELECT lower(email) INTO current_email FROM public.profiles WHERE id=auth.uid();
  SELECT * INTO inv FROM public.organization_invitations
    WHERE token_hash=encode(digest(raw_token,'sha256'),'hex')
      AND accepted_at IS NULL AND expires_at > now()
    FOR UPDATE;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'invitation_invalid_or_expired'; END IF;
  IF current_email IS DISTINCT FROM lower(inv.email) THEN RAISE EXCEPTION 'invitation_email_mismatch'; END IF;
  INSERT INTO public.organization_members(organization_id,user_id,roles,invited_by)
    VALUES(inv.organization_id,auth.uid(),inv.roles,inv.invited_by)
    ON CONFLICT(organization_id,user_id) DO UPDATE SET roles=EXCLUDED.roles;
  UPDATE public.organization_invitations SET accepted_at=now(),accepted_by=auth.uid() WHERE id=inv.id;
  INSERT INTO public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,metadata)
    VALUES(inv.organization_id,auth.uid(),'ACCEPT','organization_invitation',inv.id,jsonb_build_object('roles',inv.roles));
  RETURN jsonb_build_object('accepted',true,'roles',inv.roles);
END $$;
REVOKE ALL ON FUNCTION public.accept_organization_invitation(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(TEXT) TO authenticated;
CREATE INDEX IF NOT EXISTS idx_invitations_org_created ON public.organization_invitations(organization_id,created_at DESC);
