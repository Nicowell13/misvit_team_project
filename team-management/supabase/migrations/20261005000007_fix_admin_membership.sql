-- Correct admin membership for the account confirmed by the operator.
DO $$
DECLARE
  admin_user_id UUID;
  org_id UUID;
BEGIN
  SELECT id INTO admin_user_id
  FROM public.profiles
  WHERE lower(email) = 'khazwelata30@gmail.com';

  IF admin_user_id IS NULL THEN
    RAISE NOTICE 'Admin profile khazwelata30@gmail.com not found; login once, then rerun this migration.';
    RETURN;
  END IF;

  SELECT id INTO org_id FROM public.organizations WHERE slug = 'misvit-marketing';
  IF org_id IS NULL THEN
    INSERT INTO public.organizations(name, slug, created_by)
    VALUES ('MISVIT Marketing Team', 'misvit-marketing', admin_user_id)
    RETURNING id INTO org_id;
  END IF;

  INSERT INTO public.organization_members(organization_id, user_id, roles, invited_by)
  VALUES (org_id, admin_user_id, ARRAY['admin','manager','finance']::TEXT[], admin_user_id)
  ON CONFLICT (organization_id, user_id)
  DO UPDATE SET roles = ARRAY(
    SELECT DISTINCT role
    FROM unnest(organization_members.roles || EXCLUDED.roles) AS role
  );
END $$;
