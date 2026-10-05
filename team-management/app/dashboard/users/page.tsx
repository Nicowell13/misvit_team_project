import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminUsers } from '@/components/admin-users'

export default async function Page(){
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect('/auth/login')
 const{data:m}=await supabase.from('organization_members').select('roles').eq('user_id',user.id).limit(1).maybeSingle()
 if(!m||!(m.roles as string[]).includes('admin'))redirect('/dashboard')
 return <AdminUsers/>
}
