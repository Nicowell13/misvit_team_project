-- Final role capability matrix. manager = Team leader.
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['campaigns','tasks','budget_items','issues'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "org team insert %1$s" ON public.%1$I',t);
    EXECUTE format('DROP POLICY IF EXISTS "org managers update %1$s" ON public.%1$I',t);
    EXECUTE format('DROP POLICY IF EXISTS "org team update %1$s" ON public.%1$I',t);
    EXECUTE format('DROP POLICY IF EXISTS "org leaders update %1$s" ON public.%1$I',t);
    EXECUTE format('DROP POLICY IF EXISTS "org leaders delete %1$s" ON public.%1$I',t);
    EXECUTE format('CREATE POLICY "org leaders insert %1$s" ON public.%1$I FOR INSERT WITH CHECK (public.has_org_role(organization_id,ARRAY[''admin'',''manager'']))',t);
    EXECUTE format('CREATE POLICY "org leaders update %1$s" ON public.%1$I FOR UPDATE USING (public.has_org_role(organization_id,ARRAY[''admin'',''manager''])) WITH CHECK (public.has_org_role(organization_id,ARRAY[''admin'',''manager'']))',t);
  END LOOP;
END $$;
CREATE POLICY "org leaders delete campaigns" ON public.campaigns FOR DELETE USING (public.has_org_role(organization_id,ARRAY['admin','manager']));

DROP POLICY IF EXISTS "org team insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "org leaders update expenses" ON public.expenses;
CREATE POLICY "org members insert expenses" ON public.expenses FOR INSERT WITH CHECK (
  public.is_org_member(organization_id) AND submitted_by=auth.uid() AND status='submitted'
);
CREATE POLICY "org leaders update expenses" ON public.expenses FOR UPDATE
  USING (public.has_org_role(organization_id,ARRAY['admin','manager']))
  WITH CHECK (public.has_org_role(organization_id,ARRAY['admin','manager']) AND approved_by IS DISTINCT FROM submitted_by);
