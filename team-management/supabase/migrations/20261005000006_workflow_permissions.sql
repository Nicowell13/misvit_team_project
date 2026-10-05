-- Workflow permissions: manager is the existing team-leader role.
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id), action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org managers read audit logs" ON public.audit_logs;
CREATE POLICY "org managers read audit logs" ON public.audit_logs FOR SELECT USING (public.has_org_role(organization_id, ARRAY['admin','manager']));

DROP POLICY IF EXISTS "org managers update budget_items" ON public.budget_items;
DROP POLICY IF EXISTS "org managers update expenses" ON public.expenses;
CREATE POLICY "org leaders update budget_items" ON public.budget_items FOR UPDATE
  USING (public.has_org_role(organization_id, ARRAY['admin','manager']))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['admin','manager']));
CREATE POLICY "org leaders update expenses" ON public.expenses FOR UPDATE
  USING (public.has_org_role(organization_id, ARRAY['admin','manager']))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['admin','manager']) AND (approved_by IS NULL OR approved_by <> submitted_by));

CREATE OR REPLACE FUNCTION public.log_sensitive_change() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,metadata)
  VALUES (NEW.organization_id,auth.uid(),TG_OP, TG_TABLE_NAME,NEW.id,jsonb_build_object('old_status',to_jsonb(OLD)->>'status','new_status',to_jsonb(NEW)->>'status'));
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS audit_expense_changes ON public.expenses;
CREATE TRIGGER audit_expense_changes AFTER UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_change();
DROP TRIGGER IF EXISTS audit_budget_changes ON public.budget_items;
CREATE TRIGGER audit_budget_changes AFTER UPDATE ON public.budget_items FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_change();
