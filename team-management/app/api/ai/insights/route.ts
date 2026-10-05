import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { insightInputSchema, insightResponseSchema } from '@/lib/ai-schema'
import deckKnowledge from '@/lib/deck-knowledge.json'

const endpoint = process.env.NINE_ROUTER_BASE_URL ?? 'https://r98jwt6.abc-tunnel.us/v1'
const model = process.env.NINE_ROUTER_MODEL ?? 'mid-task'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = insightInputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Input tidak valid', details: parsed.error.flatten() }, { status: 400 })

  const apiKey = process.env.NINE_ROUTER_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'NINE_ROUTER_API_KEY belum tersedia di server.' }, { status: 503 })

  const campaignKnowledge = deckKnowledge.map(document => ({
    document: document.title,
    slides: document.slides.map(slide => slide.text).filter(Boolean),
  }))

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45_000)
  try {
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Anda analis marketing MISVIT. Gunakan campaign knowledge sebagai dasar strategi dan guardrail, lalu gunakan data operasional sebagai bukti aktual. Beri rekomendasi konkret untuk PIC/eksekutor. Jangan membuat klaim medis atau menyatakan produk sudah bersertifikat halal. Output JSON saja: {"summary":string,"insights":[{"title":string,"type":"trend|cta|sales|content|operations|risk","evidence":string,"recommendation":string,"priority":"low|medium|high|urgent","suggestedPic"?:string,"suggestedKpi"?:string}]}. Maksimal 10 insight. Jika data kurang, nyatakan keterbatasan sebagai evidence.' },
          { role: 'user', content: JSON.stringify({ campaignKnowledge, operationalInput: parsed.data }) },
        ],
      }),
    })
    if (!response.ok) return NextResponse.json({ error: `9router gagal (${response.status})` }, { status: 502 })
    const payload = await response.json()
    const content = payload?.choices?.[0]?.message?.content
    if (typeof content !== 'string') return NextResponse.json({ error: 'Respons model tidak berisi content.' }, { status: 502 })
    const validated = insightResponseSchema.safeParse(JSON.parse(content))
    if (!validated.success) return NextResponse.json({ error: 'Format insight dari model tidak valid.' }, { status: 502 })
    return NextResponse.json({ ...validated.data, model })
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError' ? 'Analisis melewati batas waktu 45 detik.' : 'Analisis gagal.'
    return NextResponse.json({ error: message }, { status: 502 })
  } finally {
    clearTimeout(timeout)
  }
}
