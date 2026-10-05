'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, BrainCircuit, CheckSquare, CircleDollarSign, FileSpreadsheet, FileWarning, LayoutDashboard, LogOut, Menu, Megaphone, ReceiptText, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const navigation = [
  { href: '/dashboard', label: 'Ringkasan', icon: LayoutDashboard },
  { href: '/dashboard/campaigns', label: 'Campaign', icon: Megaphone },
  { href: '/dashboard/tasks', label: 'Task', icon: CheckSquare },
  { href: '/dashboard/budget', label: 'RAB & Budget', icon: CircleDollarSign },
  { href: '/dashboard/expenses', label: 'Pengeluaran', icon: ReceiptText },
  { href: '/dashboard/issues', label: 'Issue', icon: FileWarning },
  { href: '/dashboard/reports', label: 'Laporan', icon: BarChart3 },
  { href: '/dashboard/insights', label: 'AI Insights', icon: BrainCircuit },
  { href: '/dashboard/integrations', label: 'Integrasi', icon: FileSpreadsheet },
]

export function AppShell({ children, email, roles }: { children: React.ReactNode; email: string; roles: string[] }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  async function logout() {
    await createClient().auth.signOut()
    window.location.assign('/auth/login')
  }

  return <div className="min-h-screen bg-[#f6f7f9] text-slate-900">
    {open && <button className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" onClick={() => setOpen(false)} aria-label="Tutup navigasi" />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-20 items-center justify-between px-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-600 text-lg font-black text-white">M</span>
          <span><b className="block tracking-tight">MISVIT Team</b><small className="text-slate-500">Marketing workspace</small></span>
        </Link>
        <button className="lg:hidden" onClick={() => setOpen(false)}><X /></button>
      </div>
      <nav className="flex-1 space-y-1 px-4 py-4">
        {[...navigation,...(roles.includes('admin')?[{href:'/dashboard/users',label:'Add User',icon:UserPlus}]:[])].map(({href,label,icon:Icon}) => {
          const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
          return <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}><Icon size={19}/>{label}</Link>
        })}
      </nav>
      <div className="border-t border-slate-200 p-4">
        <p className="truncate px-3 text-sm font-medium">{email}</p>
        <p className="px-3 text-xs text-emerald-700">{roles.includes('admin')?'Administrator':roles.includes('manager')?'Team leader':'Member'}</p>
        <button onClick={logout} className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"><LogOut size={17}/>Keluar</button>
      </div>
    </aside>
    <div className="lg:pl-72">
      <header className="sticky top-0 z-20 flex h-16 items-center border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur lg:px-8">
        <button className="mr-4 lg:hidden" onClick={() => setOpen(true)}><Menu /></button>
        <div><p className="text-xs font-medium uppercase tracking-[.18em] text-emerald-700">PT Sains Kosmetik Indonesia</p><p className="text-sm text-slate-500">Pra-Akselerasi Startup 2026</p></div>
      </header>
      <main className="p-4 lg:p-8">{children}</main>
    </div>
  </div>
}

export function PageHeader({ title, description, action }: {title:string; description:string; action?:React.ReactNode}) {
  return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div>{action}</div>
}

export function Card({ children, className='' }: {children:React.ReactNode; className?:string}) { return <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</section> }
export function Badge({ children, tone='slate' }: {children:React.ReactNode; tone?:'slate'|'green'|'amber'|'red'|'blue'}) { const c={slate:'bg-slate-100 text-slate-700',green:'bg-emerald-50 text-emerald-700',amber:'bg-amber-50 text-amber-700',red:'bg-red-50 text-red-700',blue:'bg-blue-50 text-blue-700'}[tone]; return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${c}`}>{children}</span> }
export function Money({ value }: {value:number}) { return <>{new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(value)}</> }
