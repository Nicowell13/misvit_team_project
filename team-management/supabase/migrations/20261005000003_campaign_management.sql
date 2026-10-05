-- Campaign execution and accountability tables.
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL, objective TEXT, status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','paused','completed','cancelled')),
  start_date DATE, end_date DATE, created_by UUID REFERENCES public.profiles(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE, title TEXT NOT NULL, description TEXT,
  assignee_id UUID REFERENCES public.profiles(id), due_date DATE, priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog','planned','in_progress','blocked','review','done')),
  completion_note TEXT, created_by UUID REFERENCES public.profiles(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE, category TEXT NOT NULL, item TEXT NOT NULL,
  unit TEXT, volume NUMERIC NOT NULL DEFAULT 0, unit_price BIGINT NOT NULL DEFAULT 0 CHECK (unit_price >= 0), allocated_amount BIGINT NOT NULL DEFAULT 0 CHECK (allocated_amount >= 0),
  source TEXT DEFAULT 'manual', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id), budget_item_id UUID REFERENCES public.budget_items(id), transaction_date DATE NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0), vendor TEXT, purpose TEXT NOT NULL, receipt_path TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','reviewed','approved','rejected','paid')),
  submitted_by UUID NOT NULL REFERENCES public.profiles(id), approved_by UUID REFERENCES public.profiles(id), review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), CHECK (approved_by IS NULL OR approved_by <> submitted_by)
);
CREATE TABLE IF NOT EXISTS public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id), task_id UUID REFERENCES public.tasks(id), title TEXT NOT NULL, description TEXT,
  category TEXT NOT NULL, severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','closed')),
  reported_by UUID NOT NULL REFERENCES public.profiles(id), assigned_to UUID REFERENCES public.profiles(id), resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), CHECK (status NOT IN ('resolved','closed') OR resolution_note IS NOT NULL)
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

-- Organization membership is the common access boundary. Role checks stay in mutation policies.
CREATE OR REPLACE FUNCTION public.is_org_member(target_org UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id=target_org AND om.user_id=auth.uid());
$$;
CREATE OR REPLACE FUNCTION public.has_org_role(target_org UUID, allowed TEXT[]) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id=target_org AND om.user_id=auth.uid() AND om.roles && allowed);
$$;

DO $$ DECLARE t TEXT; BEGIN
 FOREACH t IN ARRAY ARRAY['campaigns','tasks','budget_items','expenses','issues'] LOOP
  EXECUTE format('CREATE POLICY "org members read %1$s" ON public.%1$I FOR SELECT USING (public.is_org_member(organization_id))', t);
  EXECUTE format('CREATE POLICY "org team insert %1$s" ON public.%1$I FOR INSERT WITH CHECK (public.has_org_role(organization_id, ARRAY[''admin'',''manager'',''finance'',''member'']))', t);
  EXECUTE format('CREATE POLICY "org managers update %1$s" ON public.%1$I FOR UPDATE USING (public.has_org_role(organization_id, ARRAY[''admin'',''manager'',''finance'']))', t);
 END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_campaigns_org ON public.campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_campaign_status ON public.tasks(campaign_id,status);
CREATE INDEX IF NOT EXISTS idx_budget_campaign ON public.budget_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_expenses_campaign_status ON public.expenses(campaign_id,status);
CREATE INDEX IF NOT EXISTS idx_issues_campaign_status ON public.issues(campaign_id,status);
