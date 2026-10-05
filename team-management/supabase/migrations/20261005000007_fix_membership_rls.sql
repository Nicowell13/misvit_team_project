-- Fix infinite recursion in organization_members RLS.
CREATE OR REPLACE FUNCTION public.is_org_member(target_org UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = target_org AND om.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(target_org UUID, allowed TEXT[]) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = target_org AND om.user_id = auth.uid() AND om.roles && allowed
  );
$$;

REVOKE ALL ON FUNCTION public.is_org_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_org_role(UUID, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_org_role(UUID, TEXT[]) TO authenticated;

DROP POLICY IF EXISTS "Members can view other members in same organization" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can add members" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can update member roles" ON public.organization_members;

CREATE POLICY "Members can view other members in same organization"
ON public.organization_members FOR SELECT
USING (public.is_org_member(organization_id));

CREATE POLICY "Admins can add members"
ON public.organization_members FOR INSERT
WITH CHECK (public.has_org_role(organization_id, ARRAY['admin']));

CREATE POLICY "Admins can update member roles"
ON public.organization_members FOR UPDATE
USING (public.has_org_role(organization_id, ARRAY['admin']))
WITH CHECK (public.has_org_role(organization_id, ARRAY['admin']));
