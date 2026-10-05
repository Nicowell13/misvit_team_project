import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InviteAccept } from '@/components/invite-accept'

export default async function InvitePage({params}:{params:Promise<{token:string}>}){
  const {token}=await params
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) redirect(`/auth/login?next=${encodeURIComponent(`/invite/${token}`)}`)
  return <InviteAccept token={token} email={user.email??''}/>
}
