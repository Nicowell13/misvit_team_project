import { createHmac, timingSafeEqual } from 'node:crypto'

export const pancakeConfig = {
  apiBaseUrl: process.env.PANCAKE_API_BASE_URL ?? 'https://pages.fm/api/public_api/v2',
  accessToken: process.env.PANCAKE_ACCESS_TOKEN,
  webhookSecret: process.env.PANCAKE_WEBHOOK_SECRET,
  pageId: process.env.PANCAKE_PAGE_ID,
}

export function verifyPancakeSignature(rawBody: string, signature: string | null) {
  if (!pancakeConfig.webhookSecret || !signature) return false
  const received = signature.replace(/^sha256=/, '')
  const expected = createHmac('sha256', pancakeConfig.webhookSecret).update(rawBody).digest('hex')
  const a = Buffer.from(received)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function normalizePancakeEvent(payload: Record<string, unknown>) {
  const object = (payload.data && typeof payload.data === 'object' ? payload.data : payload) as Record<string, unknown>
  return {
    externalId: String(payload.id ?? object.id ?? ''),
    eventType: String(payload.event ?? payload.type ?? 'unknown'),
    occurredAt: String(payload.timestamp ?? object.inserted_at ?? new Date().toISOString()),
    channel: String(object.channel ?? object.platform ?? 'unknown'),
    conversationId: String(object.conversation_id ?? object.conversationId ?? ''),
    orderId: String(object.order_id ?? object.orderId ?? ''),
    orderStatus: String(object.order_status ?? object.status ?? ''),
    revenue: Number(object.total_price ?? object.revenue ?? 0) || 0,
  }
}
