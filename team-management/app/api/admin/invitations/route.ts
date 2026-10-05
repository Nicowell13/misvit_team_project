import { createHash, randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  roles: z.array(z.enum(['admin','manager','finance','member'])).min(1).max(4).transform(v=>[...new Set(v)]),
})

async function adminContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: membership } = await supabase.from('organization_members').select('organization_id,roles').eq('user_id',user.id).limit(1).maybeSingle()
  if (!membership || !(membership.roles as string[]).includes('admin')) return null
  return { supabase, user, organizationId: membership.organization_id as string }
}

export async function GET() {
  const ctx = await adminContext()
  if (!ctx) return NextResponse.json({ error: 'Khusus admin.' }, { status: 403 })
  const { data, error } = await ctx.supabase.from('organization_invitations').select('id,email,roles,expires_at,accepted_at,created_at').eq('organization_id',ctx.organizationId).order('created_at',{ascending:false}).limit(50)
  if (error) return NextResponse.json({ error: 'Undangan gagal dimuat.' }, { status: 500 })
  return NextResponse.json({ invitations:data })
}

export async function POST(request: Request) {
  const ctx = await adminContext()
  if (!ctx) return NextResponse.json({ error: 'Khusus admin.' }, { status: 403 })
  const parsed = schema.safeParse(await request.json().catch(()=>null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Input tidak valid.' }, { status: 400 })
  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const { data, error } = await ctx.supabase.from('organization_invitations').insert({ organization_id:ctx.organizationId,email:parsed.data.email,roles:parsed.data.roles,token_hash:tokenHash,invited_by:ctx.user.id }).select('id,email,roles,expires_at').single()
  if (error) return NextResponse.json({ error: 'Undangan gagal dibuat.' }, { status: 500 })
  const origin = new URL(request.url).origin
  return NextResponse.json({ invitation:data, inviteUrl:`${origin}/invite/${token}` }, { status: 201 })
}
