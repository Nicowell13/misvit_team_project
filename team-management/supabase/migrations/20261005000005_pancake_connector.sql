-- Idempotency and service ingestion policy for Pancake events.
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_events_external_unique
  ON public.crm_events(organization_id, external_id)
  WHERE external_id IS NOT NULL AND external_id <> '';

-- Webhook server uses a dedicated service credential in production. Do not expose it to browser clients.
COMMENT ON TABLE public.crm_events IS 'Normalized CRM events. Raw PII must not be stored in payload.';
