import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { IntegrationsPage } from '@/components/intelligence-pages'
export default async function Page(){const s=await createClient();const{data:{user}}=await s.auth.getUser();if(!user)redirect('/auth/login');const{data:m}=await s.from('organization_members').select('roles').eq('user_id',user.id).limit(1).maybeSingle();if(!m||!(m.roles as string[]).includes('admin'))redirect('/dashboard');return <IntegrationsPage/>}
