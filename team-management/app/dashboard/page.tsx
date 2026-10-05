import Link from 'next/link'
import { ArrowUpRight, CheckCircle2, Clock3, WalletCards } from 'lucide-react'
import rab from '@/lib/rab-data.json'
import { Badge, Card, Money, PageHeader } from '@/components/app-shell'

const categories = rab.filter(x => x.category !== 'Rekapitulasi')
const total = categories.reduce((n,x)=>n+x.total,0)
const items = categories.reduce((n,x)=>n+x.items.length,0)

export default function DashboardPage() {
  return <>
    <PageHeader title="Dashboard marketing" description="Kontrol campaign, pekerjaan tim, dan pertanggungjawaban RAB dalam satu tempat." action={<Link href="/dashboard/budget" className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Buka RAB</Link>}/>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card><p className="text-sm text-slate-500">Campaign aktif</p><p className="mt-3 text-3xl font-bold">1</p><Badge tone="green">Pra-Akselerasi 2026</Badge></Card>
      <Card><p className="text-sm text-slate-500">Total RAB terisi</p><p className="mt-3 text-2xl font-bold"><Money value={total}/></p><p className="mt-2 text-xs text-slate-500">{items} item anggaran</p></Card>
      <Card><p className="text-sm text-slate-500">Task berjalan</p><p className="mt-3 text-3xl font-bold">6</p><p className="mt-2 text-xs text-amber-700">2 perlu review</p></Card>
      <Card><p className="text-sm text-slate-500">Realisasi tercatat</p><p className="mt-3 text-3xl font-bold">0%</p><p className="mt-2 text-xs text-slate-500">Belum ada expense approved</p></Card>
    </div>

    <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_.8fr]">
      <Card>
        <div className="mb-5 flex items-center justify-between"><div><h2 className="font-semibold">Alokasi RAB utama</h2><p className="text-sm text-slate-500">Dihitung dari file RAB yang diunggah</p></div><Link href="/dashboard/budget" className="text-sm font-semibold text-emerald-700">Detail <ArrowUpRight className="inline" size={15}/></Link></div>
        <div className="space-y-4">{categories.filter(x=>x.total>0).sort((a,b)=>b.total-a.total).map(x=><div key={x.category}><div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="capitalize">{x.category.replace(/^\d+\.\s*/, '')}</span><b><Money value={x.total}/></b></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{width:`${Math.max(3,x.total/total*100)}%`}}/></div></div>)}</div>
      </Card>
      <Card>
        <h2 className="font-semibold">Prioritas minggu ini</h2><div className="mt-4 space-y-4">
          {[['Finalisasi struktur RAB','Hari ini',Clock3,'amber'],['Setup campaign & KPI','Besok',WalletCards,'blue'],['Validasi bukti pengeluaran','Belum ada',CheckCircle2,'green']].map(([t,s,I,tone])=><div key={String(t)} className="flex items-start gap-3"><span className="rounded-xl bg-slate-50 p-2"><I size={18}/></span><div className="min-w-0 flex-1"><p className="text-sm font-medium">{String(t)}</p><Badge tone={tone as 'amber'|'blue'|'green'}>{String(s)}</Badge></div></div>)}
        </div>
      </Card>
    </div>
  </>
}
