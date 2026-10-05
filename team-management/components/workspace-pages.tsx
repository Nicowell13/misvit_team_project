'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import rab from '@/lib/rab-data.json'
import { Badge, Card, Money, PageHeader } from '@/components/app-shell'

type Campaign={id:string;name:string;objective:string|null;status:string}
type Issue={id:string;title:string;category:string;severity:string;status:string;description:string|null}
type Expense={id:string;purpose:string;amount:number;vendor:string|null;transaction_date:string;status:string;submitted_by:string;review_note:string|null}
type Budget={id:string;category:string;item:string;unit:string|null;volume:number;unit_price:number;allocated_amount:number}
type Workspace={roles:string[];userId:string;campaigns:Campaign[];issues:Issue[];expenses:Expense[];budgets:Budget[]}
type BudgetDisplayItem={id?:string;no?:number;item:string;unit:string|null;volume:number|string|null;unit_price?:number;unitPrice?:number|string|null;allocated_amount?:number;amount?:number|null}
type BudgetCategoryGroup={name:string;total:number;items:BudgetDisplayItem[]}

const button='rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50'
const input='w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500'

function Modal({title,children,onClose}:{title:string;children:React.ReactNode;onClose:()=>void}){return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="dialog" aria-modal="true"><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button onClick={onClose} aria-label="Tutup" className="rounded-lg px-3 py-1 hover:bg-slate-100">×</button></div>{children}</div></div>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block text-sm font-medium">{label}<span className="mt-1 block">{children}</span></label>}
function useWorkspace(){const [data,setData]=useState<Workspace|null>(null);const [error,setError]=useState('');const load=useCallback(async()=>{const r=await fetch('/api/workspace');const b=await r.json();if(!r.ok){setError(b.error||'Data gagal dimuat');return}setData(b)},[]);useEffect(()=>{void fetch('/api/workspace').then(async r=>({r,b:await r.json()})).then(({r,b})=>{if(!r.ok)setError(b.error||'Data gagal dimuat');else setData(b)})},[]);return{data,error,load}}
async function mutate(method:'POST'|'PATCH',body:unknown){const r=await fetch('/api/workspace',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const b=await r.json();if(!r.ok)throw new Error(b.error||'Aksi gagal');return b}
function FormError({value}:{value:string}){return value?<p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{value}</p>:null}

export function CampaignsWorkspace(){const{data,error,load}=useWorkspace();const[open,setOpen]=useState(false);const[formError,setFormError]=useState('');async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setFormError('');const f=new FormData(e.currentTarget);try{await mutate('POST',{action:'campaign',data:{name:f.get('name'),objective:f.get('objective')||undefined,startDate:f.get('startDate')||undefined,endDate:f.get('endDate')||undefined}});setOpen(false);load()}catch(x){setFormError(x instanceof Error?x.message:'Gagal')}}return <><PageHeader title="Campaign" description="Plan, target, kanal, PIC, dan progres campaign." action={<button className={button} onClick={()=>setOpen(true)}>Tambah campaign</button>}/><FormError value={error}/><div className="space-y-4">{data?.campaigns.map(c=><Card key={c.id}><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold">{c.name}</h2><p className="mt-1 text-sm text-slate-500">{c.objective||'Belum ada objective.'}</p></div><Badge tone={c.status==='active'?'green':'slate'}>{c.status}</Badge></div></Card>)}{data&&data.campaigns.length===0&&<Card><p className="py-10 text-center text-sm text-slate-500">Belum ada campaign.</p></Card>}</div>{open&&<Modal title="Tambah campaign" onClose={()=>setOpen(false)}><form onSubmit={submit} className="space-y-4"><FormError value={formError}/><Field label="Nama campaign"><input className={input} name="name" required minLength={3}/></Field><Field label="Objective"><textarea className={input} name="objective" rows={3}/></Field><div className="grid grid-cols-2 gap-3"><Field label="Mulai"><input className={input} type="date" name="startDate"/></Field><Field label="Selesai"><input className={input} type="date" name="endDate"/></Field></div><button className={`${button} w-full`}>Simpan campaign</button></form></Modal>}</>}

export function IssuesWorkspace(){const{data,error,load}=useWorkspace();const[open,setOpen]=useState(false);const[formError,setFormError]=useState('');async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);try{await mutate('POST',{action:'issue',data:{campaignId:f.get('campaignId')||undefined,title:f.get('title'),description:f.get('description')||undefined,category:f.get('category'),severity:f.get('severity')}});setOpen(false);load()}catch(x){setFormError(x instanceof Error?x.message:'Gagal')}}async function resolve(id:string){const note=window.prompt('Resolution note:');if(!note)return;try{await mutate('PATCH',{action:'resolve_issue',id,note});load()}catch(x){window.alert(x instanceof Error?x.message:'Gagal')}}return <><PageHeader title="Issue reporting" description="Catat blocker, dampak, PIC penyelesaian, dan resolution note." action={<button className={button} onClick={()=>setOpen(true)}>Laporkan issue</button>}/><FormError value={error}/><div className="space-y-4">{data?.issues.map(i=><Card key={i.id}><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><div className="flex gap-2"><Badge tone={i.severity==='critical'?'red':'amber'}>{i.severity}</Badge><Badge>{i.status}</Badge></div><h2 className="mt-3 font-semibold">{i.title}</h2><p className="text-sm text-slate-500">{i.category} · {i.description}</p></div>{i.status==='open'&&<button className={button} onClick={()=>resolve(i.id)}>Tandai selesai</button>}</div></Card>)}{data&&data.issues.length===0&&<Card><p className="py-10 text-center text-sm text-slate-500">Tidak ada issue terbuka.</p></Card>}</div>{open&&<Modal title="Laporkan issue" onClose={()=>setOpen(false)}><form onSubmit={submit} className="space-y-4"><FormError value={formError}/><Field label="Judul"><input className={input} name="title" required/></Field><Field label="Kategori"><input className={input} name="category" required placeholder="Operasional, campaign, vendor…"/></Field><Field label="Campaign"><select className={input} name="campaignId"><option value="">Tanpa campaign</option>{data?.campaigns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Severity"><select className={input} name="severity"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></Field><Field label="Deskripsi"><textarea className={input} name="description" rows={3}/></Field><button className={`${button} w-full`}>Simpan issue</button></form></Modal>}</>}

export function ExpensesWorkspace(){const{data,error,load}=useWorkspace();const[open,setOpen]=useState(false);const[formError,setFormError]=useState('');const leader=data?.roles.some(r=>['admin','manager'].includes(r));async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);try{await mutate('POST',{action:'expense',data:{campaignId:f.get('campaignId'),budgetItemId:f.get('budgetItemId')||undefined,transactionDate:f.get('transactionDate'),amount:f.get('amount'),vendor:f.get('vendor')||undefined,purpose:f.get('purpose')}});setOpen(false);load()}catch(x){setFormError(x instanceof Error?x.message:'Gagal')}}async function review(id:string,action:'approve_expense'|'reject_expense'){const note=action==='reject_expense'?window.prompt('Alasan penolakan:'):window.prompt('Catatan approval (opsional):')||undefined;if(action==='reject_expense'&&!note)return;try{await mutate('PATCH',{action,id,note});load()}catch(x){window.alert(x instanceof Error?x.message:'Gagal')}}return <><PageHeader title="Pengeluaran" description="Ajukan, review, dan approve pertanggungjawaban budget." action={<button className={button} onClick={()=>setOpen(true)}>Ajukan pengeluaran</button>}/><FormError value={error}/><div className="space-y-4">{data?.expenses.map(e=><Card key={e.id}><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><div className="flex gap-2"><Badge tone={e.status==='approved'?'green':e.status==='rejected'?'red':'amber'}>{e.status}</Badge><span className="font-bold"><Money value={e.amount}/></span></div><h2 className="mt-3 font-semibold">{e.purpose}</h2><p className="text-sm text-slate-500">{e.vendor||'Tanpa vendor'} · {e.transaction_date}</p></div>{leader&&['submitted','reviewed'].includes(e.status)&&e.submitted_by!==data.userId&&<div className="flex gap-2"><button className="rounded-xl border px-4 py-2 text-sm" onClick={()=>review(e.id,'reject_expense')}>Tolak</button><button className={button} onClick={()=>review(e.id,'approve_expense')}>Approve</button></div>}</div></Card>)}{data&&data.expenses.length===0&&<Card><p className="py-10 text-center text-sm text-slate-500">Belum ada pengeluaran.</p></Card>}</div>{open&&<Modal title="Ajukan pengeluaran" onClose={()=>setOpen(false)}><form onSubmit={submit} className="space-y-4"><FormError value={formError}/><Field label="Campaign"><select className={input} name="campaignId" required><option value="">Pilih campaign</option>{data?.campaigns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Item RAB"><select className={input} name="budgetItemId"><option value="">Tanpa item RAB</option>{data?.budgets.map(b=><option key={b.id} value={b.id}>{b.item}</option>)}</select></Field><div className="grid grid-cols-2 gap-3"><Field label="Tanggal"><input className={input} type="date" name="transactionDate" required/></Field><Field label="Nominal"><input className={input} type="number" name="amount" min="1" required/></Field></div><Field label="Vendor"><input className={input} name="vendor"/></Field><Field label="Tujuan"><textarea className={input} name="purpose" required rows={3}/></Field><button className={`${button} w-full`}>Ajukan</button></form></Modal>}</>}

export function BudgetWorkspace() {
  const { data, error, load } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)
  const [formError, setFormError] = useState('')
  const leader = data?.roles.some(role => ['admin', 'manager'].includes(role))
  const localCategories = rab.filter(category => category.category !== 'Rekapitulasi')
  const localTotal = localCategories.reduce((total, category) => total + category.total, 0)
  const hasDatabaseBudgets = Boolean(data?.budgets.length)
  const dbTotal = data?.budgets.reduce((total, budget) => total + budget.allocated_amount, 0) ?? 0
  const categories: BudgetCategoryGroup[] = hasDatabaseBudgets
    ? Array.from(
        data!.budgets.reduce((groups, budget) => {
          const group = groups.get(budget.category) ?? { items: [], total: 0 }
          group.items.push({
            id: budget.id,
            item: budget.item,
            unit: budget.unit,
            volume: budget.volume,
            unit_price: budget.unit_price,
            allocated_amount: budget.allocated_amount,
          })
          group.total += budget.allocated_amount
          groups.set(budget.category, group)
          return groups
        }, new Map<string, { items: BudgetDisplayItem[]; total: number }>()),
        ([name, group]) => ({ name, ...group }),
      ).sort((a, b) => a.name.localeCompare(b.name, 'id', { numeric: true, sensitivity: 'base' }))
    : localCategories.map(category => ({
        name: category.category,
        total: category.total,
        items: category.items.map(item => ({
          no: item.no,
          item: item.item,
          unit: item.unit,
          volume: item.volume,
          unitPrice: item.unitPrice,
          amount: item.amount,
        })),
      }))

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const fields = {
      category: form.get('category'),
      item: form.get('item'),
      unit: form.get('unit') || undefined,
      volume: form.get('volume'),
      unitPrice: form.get('unitPrice'),
    }
    try {
      if (editing) {
        await mutate('PATCH', { action: 'edit_budget', id: editing.id, data: fields })
      } else {
        await mutate('POST', {
          action: 'budget',
          data: { ...fields, campaignId: form.get('campaignId') || undefined },
        })
      }
      setOpen(false)
      setEditing(null)
      load()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Gagal')
    }
  }

  function displayNumber(value: number | string | null) {
    if (value === null || value === '' || (typeof value === 'string' && value.startsWith('='))) return '—'
    return typeof value === 'number' ? new Intl.NumberFormat('id-ID').format(value) : value
  }

  return <>
    <PageHeader
      title="RAB & budget"
      description="Pantau total anggaran per kategori dan kelola item RAB."
      action={leader
        ? <button className={button} onClick={() => { setEditing(null); setOpen(true) }}>Tambah item</button>
        : <Badge>Read only</Badge>}
    />
    <FormError value={error} />
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <Card>
        <p className="text-sm text-slate-500">Total RAB acuan</p>
        <p className="mt-2 text-2xl font-bold"><Money value={localTotal} /></p>
        <p className="mt-1 text-xs text-slate-500">Anggaran referensi awal</p>
      </Card>
      <Card>
        <p className="text-sm text-slate-500">Total alokasi database</p>
        <p className="mt-2 text-2xl font-bold"><Money value={dbTotal} /></p>
        <p className="mt-1 text-xs text-slate-500">Dari {data?.budgets.length ?? 0} item tersimpan</p>
      </Card>
      <Card>
        <p className="text-sm text-slate-500">Kategori terpantau</p>
        <p className="mt-2 text-2xl font-bold">{categories.length}</p>
        <p className="mt-1 text-xs text-slate-500">{hasDatabaseBudgets ? 'Berdasarkan item database' : 'Berdasarkan RAB acuan'}</p>
      </Card>
    </div>

    {categories.length > 0 && (
      <div className="space-y-5">
        {!hasDatabaseBudgets && (
          <p className="text-sm text-slate-500">
            Menampilkan rincian RAB acuan. Tambahkan item untuk mulai mencatat alokasi database.
          </p>
        )}
        {categories.map(category => {
          const percentage = (category.total / (hasDatabaseBudgets ? dbTotal : localTotal)) * 100 || 0
          return (
            <Card key={category.name} className="overflow-hidden p-0">
              <div className="border-b border-slate-100 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-slate-900">{category.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">{category.items.length} item</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total kategori</p>
                    <p className="mt-1 text-lg font-bold text-emerald-700"><Money value={category.total} /></p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <div
                    className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-label={`Porsi anggaran ${category.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(percentage)}
                  >
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(percentage, 100)}%` }} />
                  </div>
                  <span className="w-12 text-right text-xs text-slate-500">{percentage.toFixed(1)}%</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3">Item</th>
                      <th className="px-3 py-3">Volume</th>
                      <th className="px-3 py-3">Harga satuan</th>
                      <th className="px-5 py-3 text-right">Jumlah</th>
                      {hasDatabaseBudgets && leader && <th className="px-5 py-3 text-right">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {category.items.map(item => (
                      <tr key={item.id ?? `${category.name}-${item.no}`} className="border-t border-slate-100">
                        <td className="px-5 py-3 font-medium text-slate-800">{item.item}</td>
                        <td className="px-3 py-3 text-slate-600">
                          {displayNumber(item.volume)}{item.unit ? ` ${item.unit}` : ''}
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          {item.unit_price !== undefined
                            ? <Money value={item.unit_price} />
                            : item.unitPrice === null || item.unitPrice === undefined ? '—' : displayNumber(item.unitPrice)}
                        </td>
                        <td className="px-5 py-3 text-right font-medium">
                          {item.allocated_amount !== undefined
                            ? <Money value={item.allocated_amount} />
                            : item.amount === null || item.amount === undefined ? '—' : <Money value={item.amount} />}
                        </td>
                        {hasDatabaseBudgets && leader && (
                          <td className="px-5 py-3 text-right">
                            <button
                              className="font-semibold text-emerald-700 hover:text-emerald-900"
                              onClick={() => {
                                const budget = data?.budgets.find(candidate => candidate.id === item.id)
                                if (budget) { setEditing(budget); setOpen(true) }
                              }}
                            >
                              Edit
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    <tr className="border-t border-slate-200 bg-slate-50/70">
                      <td colSpan={3} className="px-5 py-3 font-semibold">Total {category.name}</td>
                      <td className="px-5 py-3 text-right font-bold"><Money value={category.total} /></td>
                      {hasDatabaseBudgets && leader && <td />}
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )
        })}
      </div>
    )}
    {data && categories.length === 0 && (
      <Card><p className="py-10 text-center text-sm text-slate-500">Belum ada kategori RAB.</p></Card>
    )}
    {open && (
      <Modal
        title={editing ? 'Edit item RAB' : 'Tambah item RAB'}
        onClose={() => { setOpen(false); setEditing(null) }}
      >
        <form onSubmit={submit} className="space-y-4">
          <FormError value={formError} />
          {!editing && (
            <Field label="Campaign">
              <select className={input} name="campaignId">
                <option value="">Tanpa campaign</option>
                {data?.campaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Kategori"><input className={input} name="category" required defaultValue={editing?.category} /></Field>
          <Field label="Item"><input className={input} name="item" required defaultValue={editing?.item} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Unit"><input className={input} name="unit" defaultValue={editing?.unit || ''} /></Field>
            <Field label="Volume"><input className={input} type="number" step="any" min="0" name="volume" required defaultValue={editing?.volume ?? 0} /></Field>
            <Field label="Harga unit"><input className={input} type="number" min="0" name="unitPrice" required defaultValue={editing?.unit_price ?? 0} /></Field>
          </div>
          <button className={`${button} w-full`}>Simpan item</button>
        </form>
      </Modal>
    )}
  </>
}
