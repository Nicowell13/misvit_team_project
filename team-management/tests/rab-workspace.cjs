/* eslint-disable @typescript-eslint/no-require-imports */
// Run: node tests/rab-workspace.cjs. Transport mocks; no database writes.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const id = '123e4567-e89b-42d3-a456-426614174000'
async function run(method, expenseError = null, schemaError = null) {
  const calls = []
  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id } } }) },
    from(table) {
      const query = { then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject) } }
      function result() {
        if (table === 'organization_members') return { data: { organization_id: id, roles: ['admin'] }, error: null }
        if (table === 'expenses') return { data: [], count: 0, error: expenseError }
        return { data: method === 'PATCH' ? { id } : [], error: table === 'budget_items' ? schemaError : null }
      }
      for (const name of ['select', 'eq', 'is', 'order', 'limit', 'maybeSingle', 'delete']) {
        query[name] = (...args) => { calls.push([table, name, ...args]); return query }
      }
      return query
    },
  }
  const exports = {}
  const boundaries = {
    'zod': require('zod'),
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    '@/lib/supabase/server': { createClient: async () => supabase },
  }
  const compiled = ts.transpileModule(fs.readFileSync(path.join(root, 'app/api/workspace/route.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  vm.runInNewContext(compiled, { exports, require: name => boundaries[name], AbortSignal })
  const response = await exports[method]({ json: async () => ({ action: 'delete_budget', id }) })
  return { response, calls }
}
;(async () => {
  const read = await run('GET')
  assert.equal(read.response.status, 200)
  assert.ok(read.calls.some(call => call[0] === 'budget_items' && call[1] === 'is' && call[2] === 'archived_at' && call[3] === null))
  const missing = await run('GET', null, { code: '42703', message: 'column archived_at does not exist' })
  assert.equal(missing.response.status, 503)
  const failed = await run('PATCH', { code: '08006' })
  assert.equal(failed.response.status, 503)
  assert.ok(!failed.calls.some(call => call[1] === 'delete'), 'expense lookup failure must prevent deletion')
  const deleted = await run('PATCH')
  assert.equal(deleted.response.status, 200)
  assert.ok(deleted.calls.some(call => call[1] === 'delete'))
  const ui = fs.readFileSync(path.join(root, 'components/workspace-pages.tsx'), 'utf8')
  assert.doesNotMatch(ui, /import rab from/)
  assert.match(ui, /\['approved', 'paid'\]/)
  console.log('PASS: active RAB filtering, missing archive schema, fail-closed deletion, approved/paid realization source')
})().catch(error => { console.error(error); process.exitCode = 1 })
