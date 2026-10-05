import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const uuid = z.string().uuid()
const createSchemas = {
  campaign: z.object({ name: z.string().trim().min(3).max(120), objective: z.string().trim().max(1000).optional(), startDate: z.string().date().optional(), endDate: z.string().date().optional() }),
  issue: z.object({ campaignId: uuid.optional(), title: z.string().trim().min(3).max(160), description: z.string().trim().max(2000).optional(), category: z.string().trim().min(2).max(60), severity: z.enum(['low','medium','high','critical']) }),
  expense: z.object({ campaignId: uuid, budgetItemId: uuid.optional(), transactionDate: z.string().date(), amount: z.coerce.number().int().positive().max(100_000_000_000), vendor: z.string().trim().max(120).optional(), purpose: z.string().trim().min(3).max(500) }),
  budget: z.object({ campaignId: uuid.optional(), category: z.string().trim().min(2).max(120), item: z.string().trim().min(2).max(180), unit: z.string().trim().max(40).optional(), volume: z.coerce.number().nonnegative().max(1_000_000), unitPrice: z.coerce.number().int().nonnegative().max(100_000_000_000) }),
  task: z.object({ campaignId: uuid.optional(), title: z.string().trim().min(3).max(180), description: z.string().trim().max(2000).optional(), assigneeId: uuid.optional(), dueDate: z.string().date().optional(), priority: z.enum(['low','medium','high','urgent']) }),
}

async function context() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthenticated' as const }
  const { data: membership, error } = await supabase.from('organization_members').select('organization_id,roles').eq('user_id', user.id).limit(1).maybeSingle()
  if (error) return { error: 'database' as const, code: error.code, detail: error.message }
  if (!membership) return { error: 'no_membership' as const }
  return { supabase, user, organizationId: membership.organization_id as string, roles: (membership.roles ?? []) as string[] }
}

function contextError(ctx: Awaited<ReturnType<typeof context>>) {
  if (!('error' in ctx)) return null
  if (ctx.error === 'unauthenticated') return NextResponse.json({ error: 'Sesi login tidak ditemukan. Silakan login ulang.' }, { status: 401 })
  if (ctx.error === 'no_membership') return NextResponse.json({ error: 'Akun belum terdaftar dalam organisasi MISVIT. Jalankan migration admin membership.' }, { status: 403 })
  return NextResponse.json({ error: 'Database organisasi belum siap.', code: ctx.code, detail: ctx.detail }, { status: 503 })
}

export async function GET() {
  const ctx = await context()
  const failure = contextError(ctx)
  if (failure) return failure
  if ('error' in ctx) throw new Error('unreachable')
  const org = ctx.organizationId
  const [campaigns, issues, expenses, budgets, tasks, members] = await Promise.all([
    ctx.supabase.from('campaigns').select('*').eq('organization_id', org).order('created_at', { ascending: false }),
    ctx.supabase.from('issues').select('*').eq('organization_id', org).order('created_at', { ascending: false }),
    ctx.supabase.from('expenses').select('*').eq('organization_id', org).order('created_at', { ascending: false }),
    ctx.supabase.from('budget_items').select('*').eq('organization_id', org).order('created_at', { ascending: false }),
    ctx.supabase.from('tasks').select('*').eq('organization_id', org).order('created_at', { ascending: false }),
    ctx.supabase.from('organization_members').select('user_id,profiles!organization_members_user_id_fkey(email,full_name)').eq('organization_id', org),
  ])
  const error = campaigns.error ?? issues.error ?? expenses.error ?? budgets.error ?? tasks.error ?? members.error
  if (error) return NextResponse.json({ error: 'Data workspace gagal dimuat.' }, { status: 500 })
  return NextResponse.json({ roles: ctx.roles, userId: ctx.user.id, campaigns: campaigns.data, issues: issues.data, expenses: expenses.data, budgets: budgets.data, tasks: tasks.data, members: members.data })
}

export async function POST(request: Request) {
  const ctx = await context()
  const failure = contextError(ctx)
  if (failure) return failure
  if ('error' in ctx) throw new Error('unreachable')
  const body = await request.json().catch(() => null)
  const action = z.enum(['campaign','issue','expense','budget','task']).safeParse(body?.action)
  if (!action.success) return NextResponse.json({ error: 'Aksi tidak valid.' }, { status: 400 })
  const parsed = createSchemas[action.data].safeParse(body?.data)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Input tidak valid.' }, { status: 400 })
  const leader = ctx.roles.some(r => ['admin','manager'].includes(r))
  if (action.data !== 'expense' && !leader) return NextResponse.json({ error: 'Hanya admin atau team leader yang dapat melakukan aksi ini.' }, { status: 403 })

  const org = ctx.organizationId
  let result
  if (action.data === 'campaign') { const d = createSchemas.campaign.parse(body.data); result = await ctx.supabase.from('campaigns').insert({ organization_id: org, name: d.name, objective: d.objective || null, start_date: d.startDate || null, end_date: d.endDate || null, created_by: ctx.user.id }).select().single() }
  else if (action.data === 'issue') { const d = createSchemas.issue.parse(body.data); result = await ctx.supabase.from('issues').insert({ organization_id: org, campaign_id: d.campaignId || null, title: d.title, description: d.description || null, category: d.category, severity: d.severity, reported_by: ctx.user.id }).select().single() }
  else if (action.data === 'expense') { const d = createSchemas.expense.parse(body.data); result = await ctx.supabase.from('expenses').insert({ organization_id: org, campaign_id: d.campaignId, budget_item_id: d.budgetItemId || null, transaction_date: d.transactionDate, amount: d.amount, vendor: d.vendor || null, purpose: d.purpose, status: 'submitted', submitted_by: ctx.user.id }).select().single() }
  else if (action.data === 'budget') { const d = createSchemas.budget.parse(body.data); result = await ctx.supabase.from('budget_items').insert({ organization_id: org, campaign_id: d.campaignId || null, category: d.category, item: d.item, unit: d.unit || null, volume: d.volume, unit_price: d.unitPrice, allocated_amount: Math.round(d.volume * d.unitPrice), source: 'manual' }).select().single() }
  else { const d = createSchemas.task.parse(body.data); result = await ctx.supabase.from('tasks').insert({ organization_id: org, campaign_id: d.campaignId || null, title: d.title, description: d.description || null, assignee_id: d.assigneeId || null, due_date: d.dueDate || null, priority: d.priority, status: 'planned', created_by: ctx.user.id }).select().single() }
  if (result.error) return NextResponse.json({ error: 'Data gagal disimpan.' }, { status: 500 })
  return NextResponse.json({ data: result.data }, { status: 201 })
}

export async function PATCH(request: Request) {
  const ctx = await context()
  const failure = contextError(ctx)
  if (failure) return failure
  if ('error' in ctx) throw new Error('unreachable')
  const body = await request.json().catch(() => null)
  const parsed = z.discriminatedUnion('action', [
    z.object({ action: z.literal('update_campaign'), id: uuid, data: createSchemas.campaign.extend({ status: z.enum(['planned','active','paused','completed','cancelled']) }) }),
    z.object({ action: z.literal('delete_campaign'), id: uuid }),
    z.object({ action: z.literal('update_task_status'), id: uuid, status: z.enum(['backlog','planned','in_progress','blocked','review','done']) }),
    z.object({ action: z.literal('update_issue_status'), id: uuid, status: z.enum(['open','investigating','resolved','closed']), note: z.string().trim().max(1000).optional() }),
    z.object({ action: z.literal('approve_expense'), id: uuid, note: z.string().trim().max(500).optional() }),
    z.object({ action: z.literal('reject_expense'), id: uuid, note: z.string().trim().min(3).max(500) }),
    z.object({ action: z.literal('resolve_issue'), id: uuid, note: z.string().trim().min(3).max(1000) }),
    z.object({ action: z.literal('edit_budget'), id: uuid, data: createSchemas.budget.omit({ campaignId: true }) }),
  ]).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Input tidak valid.' }, { status: 400 })
  const leader = ctx.roles.some(r => ['admin','manager'].includes(r))
  if (!leader) return NextResponse.json({ error: 'Hanya admin atau team leader yang diizinkan.' }, { status: 403 })

  let result
  if (parsed.data.action === 'delete_campaign') {
    const { error } = await ctx.supabase.from('campaigns').delete().eq('id',parsed.data.id).eq('organization_id',ctx.organizationId)
    if (error) return NextResponse.json({ error: 'Campaign masih dipakai atau gagal dihapus.' }, { status: 409 })
    return NextResponse.json({ deleted:true })
  } else if (parsed.data.action === 'update_campaign') {
    const d=parsed.data.data;result=await ctx.supabase.from('campaigns').update({name:d.name,objective:d.objective||null,start_date:d.startDate||null,end_date:d.endDate||null,status:d.status}).eq('id',parsed.data.id).eq('organization_id',ctx.organizationId).select().single()
  } else if (parsed.data.action === 'update_task_status') {
    result=await ctx.supabase.from('tasks').update({status:parsed.data.status}).eq('id',parsed.data.id).eq('organization_id',ctx.organizationId).select().single()
  } else if (parsed.data.action === 'update_issue_status') {
    if (['resolved','closed'].includes(parsed.data.status)&&!parsed.data.note) return NextResponse.json({error:'Resolution note wajib.'},{status:400})
    result=await ctx.supabase.from('issues').update({status:parsed.data.status,resolution_note:parsed.data.note||null}).eq('id',parsed.data.id).eq('organization_id',ctx.organizationId).select().single()
  } else if (parsed.data.action === 'approve_expense' || parsed.data.action === 'reject_expense') {
    const { data: expense } = await ctx.supabase.from('expenses').select('submitted_by,status').eq('id', parsed.data.id).eq('organization_id', ctx.organizationId).maybeSingle()
    if (!expense) return NextResponse.json({ error: 'Pengeluaran tidak ditemukan.' }, { status: 404 })
    if (expense.submitted_by === ctx.user.id) return NextResponse.json({ error: 'Pengaju tidak boleh menyetujui pengeluaran sendiri.' }, { status: 409 })
    if (expense.status !== 'submitted' && expense.status !== 'reviewed') return NextResponse.json({ error: 'Status pengeluaran tidak dapat diubah.' }, { status: 409 })
    result = await ctx.supabase.from('expenses').update({ status: parsed.data.action === 'approve_expense' ? 'approved' : 'rejected', approved_by: ctx.user.id, review_note: parsed.data.note || null }).eq('id', parsed.data.id).eq('organization_id', ctx.organizationId).select().single()
  } else if (parsed.data.action === 'resolve_issue') {
    result = await ctx.supabase.from('issues').update({ status: 'resolved', resolution_note: parsed.data.note }).eq('id', parsed.data.id).eq('organization_id', ctx.organizationId).select().single()
  } else {
    const d = parsed.data.data
    result = await ctx.supabase.from('budget_items').update({ category: d.category, item: d.item, unit: d.unit || null, volume: d.volume, unit_price: d.unitPrice, allocated_amount: Math.round(d.volume * d.unitPrice) }).eq('id', parsed.data.id).eq('organization_id', ctx.organizationId).select().single()
  }
  if (result.error) return NextResponse.json({ error: 'Perubahan gagal disimpan.' }, { status: 500 })
  return NextResponse.json({ data: result.data })
}
