'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function InviteAccept({token,email}:{token:string;email:string}){
 const[error,setError]=useState('');const[busy,setBusy]=useState(true)
 const message=(value:string)=>value.includes('email_mismatch')?'Login dengan Gmail yang menerima undangan.':value.includes('invalid_or_expired')?'Link undangan tidak valid, sudah dipakai, atau kedaluwarsa.':`Undangan gagal diterima: ${value}`
 async function accept(){setBusy(true);setError('');const{error}=await createClient().rpc('accept_organization_invitation',{raw_token:token});if(error){setError(message(error.message));setBusy(false);return}window.location.replace('/dashboard')}
 useEffect(()=>{void createClient().rpc('accept_organization_invitation',{raw_token:token}).then(({error})=>{if(error){setError(message(error.message));setBusy(false);return}window.location.replace('/dashboard')})},[token])
 return <main className="grid min-h-screen place-items-center bg-slate-50 p-4"><section className="w-full max-w-md rounded-2xl border bg-white p-7 shadow-sm"><p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">MISVIT Team</p><h1 className="mt-2 text-2xl font-bold">Terima undangan</h1><p className="mt-2 text-sm text-slate-600">Login sebagai <b>{email}</b>. Pastikan Gmail ini sama dengan alamat yang diundang.</p>{error&&<p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={busy} onClick={accept} className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy?'Memproses undangan…':'Coba lagi'}</button></section></main>
}
