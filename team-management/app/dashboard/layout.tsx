import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/app-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: membership } = await supabase.from('organization_members').select('roles').eq('user_id', user.id).limit(1).maybeSingle()
  return <AppShell email={user.email ?? 'User'} roles={(membership?.roles ?? []) as string[]}>{children}</AppShell>
}
