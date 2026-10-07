import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const cookieStore = await cookies()
  // Cookie stores an encoded path; URLSearchParams already decodes query values.
  let cookieNext: string | undefined
  try {
    cookieNext = decodeURIComponent(cookieStore.get('misvit_auth_next')?.value ?? '')
  } catch {
    cookieNext = undefined // Malformed client cookie is not an admission credential.
  }
  const safePath = (value: string | null | undefined) =>
    value?.startsWith('/') && !/[\\\s\u0000-\u001f\u007f]|%5c|%0[ad]/i.test(value) && !value.startsWith('//') ? value : undefined
  const queryNext = safePath(searchParams.get('next'))
  const fallback = safePath(cookieNext)
  const inviteToken = (value: string | undefined) => value?.match(/^\/invite\/([A-Za-z0-9_-]+)$/)?.[1]
  const next = (!queryNext || queryNext === '/dashboard') && inviteToken(fallback)
    ? fallback! : queryNext ?? fallback ?? '/dashboard'
  const token = inviteToken(next) ?? null
  cookieStore.delete('misvit_auth_next')

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent('Login Google tidak selesai. Coba lagi.')}`)
  }

  const supabase = await createClient()
  const { data: session, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !session.user) {
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent('Login Google gagal. Coba lagi.')}`)
  }

  // Destination is routing only. Database validates membership, verified email and invitation.
  let admission
  try {
    admission = await supabase.rpc('admit_misvit_member', { raw_token: token })
      .abortSignal(AbortSignal.timeout(15_000))
  } catch {
    admission = { data: null, error: { code: 'NETWORK', message: '' } }
  }
  if (admission.error || !admission.data?.allowed) {
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) throw new Error('Failed to clear denied auth session')
    const dbError = admission.error
    const message = !dbError ? 'Akun tidak diundang oleh admin MISVIT.'
      : dbError.code === 'PGRST202' || dbError.code === '42883' ? 'Konfigurasi login belum siap. Admin perlu menjalankan SQL admission.'
      : dbError.message.includes('email_mismatch') ? 'Login dengan Gmail yang menerima undangan.'
      : dbError.message.includes('invalid_or_expired') ? 'Link undangan tidak valid, sudah dipakai, atau kedaluwarsa.'
      : dbError.message.includes('invitation_ambiguous') ? 'Ada beberapa undangan aktif. Gunakan link undangan admin.'
      : 'Akses akun gagal diperiksa. Coba lagi atau hubungi admin.'
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(message)}`)
  }

  // Invitation was consumed transactionally; do not accept it twice on InvitePage.
  return NextResponse.redirect(`${origin}${token || admission.data.accepted ? '/dashboard' : next}`)
}
