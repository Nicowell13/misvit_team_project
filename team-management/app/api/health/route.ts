import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const checks: Record<string, boolean> = {
    supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabase_anon_key: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabase_service_key: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    nine_router_url: Boolean(process.env.NINE_ROUTER_BASE_URL),
    nine_router_model: Boolean(process.env.NINE_ROUTER_MODEL),
    pancake_connector: Boolean(process.env.PANCAKE_WEBHOOK_SECRET),
  }
  const healthy = Object.values(checks).filter(Boolean).length
  const total = Object.keys(checks).length
  return NextResponse.json({ status: healthy === total ? 'ok' : 'partial', checks, healthy, total })
}
