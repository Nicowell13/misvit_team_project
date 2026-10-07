/* eslint-disable @typescript-eslint/no-require-imports */
// Run: node tests/auth-admission.cjs. Mock only Next/Supabase boundaries.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const source = fs.readFileSync(path.join(root, 'app/api/auth/callback/route.ts'), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
async function callback(next, cookie, reply = { data: { allowed: true, accepted: true }, error: null }) {
  const calls = []; let signedOut = false; let cleared = false
  const supabase = {
    auth: {
      exchangeCodeForSession: async () => ({ data: { user: { id: 'test-user' } }, error: null }),
      signOut: async () => { signedOut = true; return { error: null } },
    },
    rpc: (name, args) => { calls.push({ name, args }); return { abortSignal: () => Promise.resolve(reply) } },
    from: () => ({ select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }),
  }
  const exports = {}
  const boundaries = {
    '@/lib/supabase/server': { createClient: async () => supabase },
    'next/headers': { cookies: async () => ({ get: () => cookie === undefined ? undefined : { value: cookie }, delete: () => { cleared = true } }) },
    'next/server': { NextResponse: { redirect: url => url } },
  }
  vm.runInNewContext(compiled, { exports, require: name => { assert.ok(name in boundaries, name); return boundaries[name] }, URL, console, process: { env: { NODE_ENV: 'development' } }, AbortSignal })
  const query = new URLSearchParams({ code: 'test-code' }); if (next !== undefined) query.set('next', next)
  const result = await exports.GET(new Request(`https://app.example/api/auth/callback?${query}`))
  return { result, calls, signedOut, cleared }
}
;(async () => {
  const token = 'test_token'
  for (const next of [undefined, '/dashboard']) {
    const r = await callback(next, encodeURIComponent(`/invite/${token}`))
    assert.equal(r.calls[0]?.name, 'admit_misvit_member', 'encoded invite must use DB-backed admission')
    assert.equal(r.calls[0]?.args.raw_token, token, 'cookie fallback must preserve token')
    assert.equal(r.result, 'https://app.example/dashboard', 'callback accepts invite once, avoids second page acceptance')
    assert.ok(r.cleared)
  }
  const direct = await callback('/invite/test_token')
  assert.equal(direct.calls[0]?.args.raw_token, token)
  for (const unsafe of ['//evil.example', '/\\evil.example', '/%5cevil.example', '/dashboard\n']) {
    assert.equal((await callback(unsafe)).result, 'https://app.example/dashboard')
  }
  assert.equal((await callback(undefined, '%broken')).calls[0]?.args.raw_token, null)
  assert.equal((await callback('/dashboard')).calls[0]?.args.raw_token, null, 'lost token requires email-bound DB admission')
  const member = await callback('/dashboard', undefined, { data: { allowed: true }, error: null })
  assert.equal(member.result, 'https://app.example/dashboard'); assert.equal(member.signedOut, false)
  for (const message of ['invitation_email_mismatch', 'invitation_invalid_or_expired', 'invitation_ambiguous']) {
    const denied = await callback('/invite/test_token', undefined, { data: null, error: { code: 'P0001', message } })
    assert.ok(denied.signedOut); assert.match(denied.result, /auth\/login\?error=/)
    assert.doesNotMatch(decodeURIComponent(denied.result), /belum siap/)
  }
  const denied = await callback('/invite/spoof', undefined, { data: { allowed: false }, error: null })
  assert.ok(denied.signedOut); assert.match(decodeURIComponent(denied.result), /Akun tidak diundang/)
  const missing = await callback('/dashboard', undefined, { data: null, error: { code: 'PGRST202', message: 'missing RPC' } })
  assert.ok(missing.signedOut); assert.match(decodeURIComponent(missing.result), /belum siap/)
  const outage = await callback('/dashboard', undefined, { data: null, error: { code: '08006', message: 'connection failed' } })
  assert.ok(outage.signedOut); assert.match(decodeURIComponent(outage.result), /gagal diperiksa/)
  // Exercise actual middleware with only transport/session boundaries mocked.
  const middleware = ts.transpileModule(fs.readFileSync(path.join(root, 'lib/supabase/middleware.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const middlewareExports = {}
  const savedCookies = []
  vm.runInNewContext(middleware, {
    exports: middlewareExports, process: { env: {} },
    require: name => name === '@supabase/ssr' ? { createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) } : { NextResponse: {
      next: () => ({ cookies: { getAll: () => [] } }),
      redirect: url => ({ url: url.toString(), cookies: { set: cookie => savedCookies.push(cookie) } }),
    } },
  })
  const url = new URL('https://app.example/invite/test_token?source=admin')
  const request = { nextUrl: { pathname: url.pathname, clone: () => new URL(url) }, cookies: { getAll: () => [] } }
  const redirect = await middlewareExports.updateSession(request)
  assert.equal(new URL(redirect.url).searchParams.get('next'), '/invite/test_token?source=admin')
  // SQL contract checks, NOT database execution. Real email/locking/RLS checks need Supabase.
  const sql = fs.readFileSync(path.join(root, 'supabase/migrations/20261006000016_secure_auth_admission.sql'), 'utf8')
  assert.match(sql, /FROM auth\.users[\s\S]*email_confirmed_at IS NOT NULL/)
  assert.doesNotMatch(sql, /FROM public\.profiles/)
  assert.match(sql, /accepted_at IS NULL AND expires_at > now\(\)/)
  assert.match(sql, /FOR UPDATE/)
  assert.match(sql, /slug = 'misvit-marketing'/)
  assert.match(sql, /invited_by[\s\S]*'admin' = ANY/)
  assert.match(sql, /invitation_email_mismatch/)
  assert.match(sql, /invitation_ambiguous/)
  assert.match(sql, /ON CONFLICT \(email\) DO UPDATE/)
  assert.match(sql, /FROM auth\.users WHERE lower\(trim\(email\)\) = admin_email/)
  assert.match(sql, /ARRAY\['admin'\]::TEXT\[\]/)
  assert.match(sql, /existing\.roles \|\| EXCLUDED\.roles/)
  assert.match(sql, /INSERT INTO public\.audit_logs/)
  assert.doesNotMatch(sql, /EXCEPTION WHEN[\s\S]*NULL/)
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.admit_misvit_member\(TEXT\) FROM PUBLIC, anon/)
  console.log('PASS: callback admission, invite/cookie fallback, spoofing, denials, missing RPC/outage; SQL contracts (not DB execution)')
})().catch(error => { console.error(error); process.exitCode = 1 })
