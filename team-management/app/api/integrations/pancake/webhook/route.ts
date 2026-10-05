import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizePancakeEvent, pancakeConfig, verifyPancakeSignature } from '@/lib/pancake'

export async function GET() {
  return NextResponse.json({ provider: 'pancake', configured: Boolean(pancakeConfig.webhookSecret), status: 'ready' })
}

export async function POST(request: Request) {
  if (!pancakeConfig.webhookSecret) return NextResponse.json({ error: 'Pancake belum dikonfigurasi.' }, { status: 503 })
  const rawBody = await request.text()
  const signature = request.headers.get('x-pancake-signature') ?? request.headers.get('x-signature')
  if (!verifyPancakeSignature(rawBody, signature)) return NextResponse.json({ error: 'Signature tidak valid.' }, { status: 401 })

  let payload: Record<string, unknown>
  try { payload = JSON.parse(rawBody) } catch { return NextResponse.json({ error: 'Payload JSON tidak valid.' }, { status: 400 }) }
  const event = normalizePancakeEvent(payload)
  if (!event.externalId) return NextResponse.json({ error: 'Event ID wajib untuk idempotency.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: org } = await supabase.from('organizations').select('id').eq('slug', 'misvit-marketing').maybeSingle()
  if (!org) return NextResponse.json({ error: 'Organization belum tersedia.' }, { status: 503 })

  const { error } = await supabase.from('crm_events').upsert({
    organization_id: org.id,
    external_id: event.externalId,
    occurred_at: event.occurredAt,
    channel: event.channel,
    event_type: event.eventType,
    order_status: event.orderStatus || null,
    revenue: event.revenue,
    payload: { conversationId: event.conversationId, orderId: event.orderId },
  }, { onConflict: 'organization_id,external_id' })
  if (error) return NextResponse.json({ error: 'Event gagal disimpan.' }, { status: 500 })
  return NextResponse.json({ received: true })
}
