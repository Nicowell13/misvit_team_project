-- ============================================================
-- MISVIT Team Management — Full Idempotent Setup
-- Jalankan sekali di Supabase SQL Editor.
-- Aman dijalankan ulang kapan saja.
-- ============================================================

-- ── FOUNDATION ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  roles TEXT[] DEFAULT ARRAY['member']::TEXT[],
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES public.profiles(id),
  UNIQUE(organization_id, user_id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view organizations they are members of" ON public.organizations;
DROP POLICY IF EXISTS "Admins can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update their organizations" ON public.organizations;
CREATE POLICY "Users can view organizations they are members of" ON public.organizations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = organizations.id AND user_id = auth.uid()));
CREATE POLICY "Admins can create organizations" ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admins can update their organizations" ON public.organizations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = organizations.id AND user_id = auth.uid() AND 'admin' = ANY(roles)));

DROP POLICY IF EXISTS "Members can view other members in same organization" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can add members" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can update member roles" ON public.organization_members;
CREATE POLICY "Members can view other members in same organization" ON public.organization_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.organization_members AS om WHERE om.organization_id = organization_members.organization_id AND om.user_id = auth.uid()));
CREATE POLICY "Admins can add members" ON public.organization_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members AS om WHERE om.organization_id = organization_members.organization_id AND om.user_id = auth.uid() AND 'admin' = ANY(om.roles)));
CREATE POLICY "Admins can update member roles" ON public.organization_members FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.organization_members AS om WHERE om.organization_id = organization_members.organization_id AND om.user_id = auth.uid() AND 'admin' = ANY(om.roles)));

CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── SHARED ROLE FUNCTIONS ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_org_member(target_org UUID) RETURNS BOOLEAN
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id=target_org AND user_id=auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(target_org UUID, allowed TEXT[]) RETURNS BOOLEAN
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id=target_org AND user_id=auth.uid() AND roles && allowed);
$$;

-- ── CAMPAIGN MANAGEMENT ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  objective TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','paused','completed','cancelled')),
  start_date DATE, end_date DATE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL, description TEXT,
  assignee_id UUID REFERENCES public.profiles(id), due_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog','planned','in_progress','blocked','review','done')),
  completion_note TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  category TEXT NOT NULL, item TEXT NOT NULL, unit TEXT,
  volume NUMERIC NOT NULL DEFAULT 0,
  unit_price BIGINT NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  allocated_amount BIGINT NOT NULL DEFAULT 0 CHECK (allocated_amount >= 0),
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id),
  budget_item_id UUID REFERENCES public.budget_items(id),
  transaction_date DATE NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  vendor TEXT, purpose TEXT NOT NULL, receipt_path TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','reviewed','approved','rejected','paid')),
  submitted_by UUID NOT NULL REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (approved_by IS NULL OR approved_by <> submitted_by)
);

CREATE TABLE IF NOT EXISTS public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id),
  task_id UUID REFERENCES public.tasks(id),
  title TEXT NOT NULL, description TEXT,
  category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','closed')),
  reported_by UUID NOT NULL REFERENCES public.profiles(id),
  assigned_to UUID REFERENCES public.profiles(id),
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status NOT IN ('resolved','closed') OR resolution_note IS NOT NULL)
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['campaigns','tasks','budget_items','expenses','issues'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "org members read %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "org team insert %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "org managers update %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "org leaders update %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "org members read %1$s" ON public.%1$I FOR SELECT USING (public.is_org_member(organization_id))', t);
    EXECUTE format('CREATE POLICY "org team insert %1$s" ON public.%1$I FOR INSERT WITH CHECK (public.has_org_role(organization_id, ARRAY[''admin'',''manager'',''finance'',''member'']))', t);
  END LOOP;
END $$;

-- budget_items dan expenses: update hanya admin/manager
DROP POLICY IF EXISTS "org leaders update budget_items" ON public.budget_items;
DROP POLICY IF EXISTS "org leaders update expenses" ON public.expenses;
CREATE POLICY "org leaders update budget_items" ON public.budget_items FOR UPDATE
  USING (public.has_org_role(organization_id, ARRAY['admin','manager']))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['admin','manager']));
CREATE POLICY "org leaders update expenses" ON public.expenses FOR UPDATE
  USING (public.has_org_role(organization_id, ARRAY['admin','manager']))
  WITH CHECK (public.has_org_role(organization_id, ARRAY['admin','manager']) AND (approved_by IS NULL OR approved_by <> submitted_by));

-- issues: semua anggota bisa update (resolve sendiri)
DROP POLICY IF EXISTS "org team update issues" ON public.issues;
CREATE POLICY "org team update issues" ON public.issues FOR UPDATE
  USING (public.has_org_role(organization_id, ARRAY['admin','manager','finance','member']));

-- tasks: manager ke atas bisa update
DROP POLICY IF EXISTS "org managers update tasks" ON public.tasks;
CREATE POLICY "org managers update tasks" ON public.tasks FOR UPDATE
  USING (public.has_org_role(organization_id, ARRAY['admin','manager','finance']));

CREATE INDEX IF NOT EXISTS idx_campaigns_org ON public.campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_campaign_status ON public.tasks(campaign_id,status);
CREATE INDEX IF NOT EXISTS idx_budget_campaign ON public.budget_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_expenses_campaign_status ON public.expenses(campaign_id,status);
CREATE INDEX IF NOT EXISTS idx_issues_campaign_status ON public.issues(campaign_id,status);

-- ── MARKETING INTELLIGENCE ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL, source_file TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'pptx', summary TEXT,
  extracted_content JSONB NOT NULL DEFAULT '[]',
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, source_file)
);

CREATE TABLE IF NOT EXISTS public.crm_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'pancake', file_name TEXT NOT NULL, row_count INTEGER NOT NULL DEFAULT 0,
  column_mapping JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'processing' CHECK(status IN ('processing','ready','failed')),
  error_message TEXT,
  imported_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  import_id UUID REFERENCES public.crm_imports(id) ON DELETE CASCADE,
  external_id TEXT, occurred_at TIMESTAMPTZ,
  channel TEXT, event_type TEXT, campaign_source TEXT, cta_variant TEXT,
  lead_stage TEXT, order_status TEXT,
  revenue BIGINT NOT NULL DEFAULT 0,
  response_seconds INTEGER, agent_name TEXT, topic TEXT, outcome TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketing_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL, insight_type TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}', recommendation TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','dismissed','converted_to_task')),
  campaign_id UUID REFERENCES public.campaigns(id),
  assigned_to UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_insights ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['knowledge_documents','crm_imports','crm_events','marketing_insights'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "org members read %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "org team insert %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "org managers update %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "org members read %1$s" ON public.%1$I FOR SELECT USING (public.is_org_member(organization_id))', t);
    EXECUTE format('CREATE POLICY "org team insert %1$s" ON public.%1$I FOR INSERT WITH CHECK (public.has_org_role(organization_id,ARRAY[''admin'',''manager'',''member'']))', t);
    EXECUTE format('CREATE POLICY "org managers update %1$s" ON public.%1$I FOR UPDATE USING (public.has_org_role(organization_id,ARRAY[''admin'',''manager'']))', t);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_events_external_unique ON public.crm_events(organization_id, external_id)
  WHERE external_id IS NOT NULL AND external_id <> '';
CREATE INDEX IF NOT EXISTS idx_crm_events_analysis ON public.crm_events(organization_id,occurred_at,channel,event_type);
CREATE INDEX IF NOT EXISTS idx_insights_status ON public.marketing_insights(organization_id,status,priority);

-- ── AUDIT LOG ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org managers read audit logs" ON public.audit_logs;
CREATE POLICY "org managers read audit logs" ON public.audit_logs FOR SELECT
  USING (public.has_org_role(organization_id, ARRAY['admin','manager']));

CREATE OR REPLACE FUNCTION public.log_sensitive_change() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,metadata)
  VALUES (NEW.organization_id, auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id,
    jsonb_build_object('old_status', to_jsonb(OLD)->>'status', 'new_status', to_jsonb(NEW)->>'status'));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS audit_expense_changes ON public.expenses;
CREATE TRIGGER audit_expense_changes AFTER UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_change();
DROP TRIGGER IF EXISTS audit_budget_changes ON public.budget_items;
CREATE TRIGGER audit_budget_changes AFTER UPDATE ON public.budget_items FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_change();

-- ── SEED ADMIN ────────────────────────────────────────────────
-- Jalankan SETELAH khazwelatala30@gmail.com pernah login minimal sekali.

DO $$
DECLARE
  admin_id UUID;
  org_id   UUID;
BEGIN
  SELECT id INTO admin_id FROM public.profiles WHERE email = 'khazwelatala30@gmail.com';
  IF admin_id IS NULL THEN
    RAISE NOTICE 'Profile belum ada. Login dulu lalu jalankan ulang.';
    RETURN;
  END IF;

  INSERT INTO public.organizations (name, slug, created_by)
  VALUES ('MISVIT Marketing Team', 'misvit-marketing', admin_id)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO org_id;

  IF org_id IS NULL THEN
    SELECT id INTO org_id FROM public.organizations WHERE slug = 'misvit-marketing';
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, roles, invited_by)
  VALUES (org_id, admin_id, ARRAY['admin','manager','finance']::TEXT[], admin_id)
  ON CONFLICT (organization_id, user_id) DO UPDATE SET roles = ARRAY['admin','manager','finance']::TEXT[];

  RAISE NOTICE 'Admin seed selesai. org_id = %', org_id;
END $$;
