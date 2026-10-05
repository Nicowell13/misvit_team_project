-- Members/finance create and update their own tasks/issues; leaders manage all.
DROP POLICY IF EXISTS "org leaders insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "org leaders update tasks" ON public.tasks;
DROP POLICY IF EXISTS "org leaders insert issues" ON public.issues;
DROP POLICY IF EXISTS "org leaders update issues" ON public.issues;

CREATE POLICY "org members insert tasks" ON public.tasks FOR INSERT
WITH CHECK (public.is_org_member(organization_id) AND created_by=auth.uid());
CREATE POLICY "org owners or leaders update tasks" ON public.tasks FOR UPDATE
USING (created_by=auth.uid() OR public.has_org_role(organization_id,ARRAY['admin','manager']))
WITH CHECK (created_by=auth.uid() OR public.has_org_role(organization_id,ARRAY['admin','manager']));

CREATE POLICY "org members insert issues" ON public.issues FOR INSERT
WITH CHECK (public.is_org_member(organization_id) AND reported_by=auth.uid());
CREATE POLICY "org owners or leaders update issues" ON public.issues FOR UPDATE
USING (reported_by=auth.uid() OR public.has_org_role(organization_id,ARRAY['admin','manager']))
WITH CHECK (reported_by=auth.uid() OR public.has_org_role(organization_id,ARRAY['admin','manager']));
