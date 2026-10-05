import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    const providerError = searchParams.get('error_description') ?? 'OAuth callback tidak membawa authorization code.'
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(providerError)}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Supabase OAuth callback failed:', error.message)
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(error.message)}`)
  }

  const forwardedHost = request.headers.get('x-forwarded-host')
  if (process.env.NODE_ENV !== 'development' && forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
