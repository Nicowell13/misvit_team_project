-- Seed default organization for MISVIT
DO $$
DECLARE
  admin_user_id UUID;
  org_id UUID;
BEGIN
  -- Find admin user by email (khazwelatala30@gmail.com)
  SELECT id INTO admin_user_id FROM public.profiles WHERE email = 'khazwelatala30@gmail.com';

  -- Create organization if admin exists
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.organizations (name, slug, created_by)
    VALUES ('MISVIT Marketing Team', 'misvit-marketing', admin_user_id)
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO org_id;

    -- Add admin as member with all roles
    IF org_id IS NOT NULL THEN
      INSERT INTO public.organization_members (organization_id, user_id, roles, invited_by)
      VALUES (org_id, admin_user_id, ARRAY['admin', 'manager', 'finance']::TEXT[], admin_user_id)
      ON CONFLICT (organization_id, user_id) DO NOTHING;
    END IF;
  END IF;
END $$;
