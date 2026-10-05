-- Safe phase 1: document knowledge, CSV imports, normalized metrics, and human-reviewed insights.
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 title TEXT NOT NULL, source_file TEXT NOT NULL, document_type TEXT NOT NULL DEFAULT 'pptx', summary TEXT,
 extracted_content JSONB NOT NULL DEFAULT '[]', uploaded_by UUID REFERENCES public.profiles(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(organization_id, source_file)
);
CREATE TABLE IF NOT EXISTS public.crm_imports (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 provider TEXT NOT NULL DEFAULT 'pancake', file_name TEXT NOT NULL, row_count INTEGER NOT NULL DEFAULT 0,
 column_mapping JSONB NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'processing' CHECK(status IN ('processing','ready','failed')),
 error_message TEXT, imported_by UUID NOT NULL REFERENCES public.profiles(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.crm_events (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 import_id UUID REFERENCES public.crm_imports(id) ON DELETE CASCADE, external_id TEXT, occurred_at TIMESTAMPTZ,
 channel TEXT, event_type TEXT, campaign_source TEXT, cta_variant TEXT, lead_stage TEXT, order_status TEXT,
 revenue BIGINT NOT NULL DEFAULT 0, response_seconds INTEGER, agent_name TEXT, topic TEXT, outcome TEXT,
 payload JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.marketing_insights (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 title TEXT NOT NULL, insight_type TEXT NOT NULL, evidence JSONB NOT NULL DEFAULT '{}', recommendation TEXT NOT NULL,
 priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','dismissed','converted_to_task')),
 campaign_id UUID REFERENCES public.campaigns(id), assigned_to UUID REFERENCES public.profiles(id), approved_by UUID REFERENCES public.profiles(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_insights ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE t TEXT; BEGIN
 FOREACH t IN ARRAY ARRAY['knowledge_documents','crm_imports','crm_events','marketing_insights'] LOOP
  EXECUTE format('DROP POLICY IF EXISTS "org members read %1$s" ON public.%1$I',t);
  EXECUTE format('DROP POLICY IF EXISTS "org team insert %1$s" ON public.%1$I',t);
  EXECUTE format('DROP POLICY IF EXISTS "org managers update %1$s" ON public.%1$I',t);
  EXECUTE format('CREATE POLICY "org members read %1$s" ON public.%1$I FOR SELECT USING (public.is_org_member(organization_id))',t);
  EXECUTE format('CREATE POLICY "org team insert %1$s" ON public.%1$I FOR INSERT WITH CHECK (public.has_org_role(organization_id,ARRAY[''admin'',''manager'',''member'']))',t);
  EXECUTE format('CREATE POLICY "org managers update %1$s" ON public.%1$I FOR UPDATE USING (public.has_org_role(organization_id,ARRAY[''admin'',''manager'']))',t);
 END LOOP;
END $$;
CREATE INDEX IF NOT EXISTS idx_crm_events_analysis ON public.crm_events(organization_id,occurred_at,channel,event_type);
CREATE INDEX IF NOT EXISTS idx_insights_status ON public.marketing_insights(organization_id,status,priority);
