#!/usr/bin/env node
// Smoke test: run the plugin's apply() against a mock host ctx to catch any
// composition-time crash BEFORE shipping. Tests the same seams the harness
// provides (credentials, loader, tools, web, webServer). Run:
//   node scripts/smoke.mjs        (needs ZAI_API_KEY or a fake key; fake is fine)
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// syntax gate first
for (const f of ['index.js', 'client.js']) {
  execFileSync(process.execPath, ['--check', path.join(root, f)], { stdio: 'pipe' })
}
// conflict-marker gate
for (const f of ['index.js', 'client.js', 'cordis.patch.yml', 'mcp-server/server.json']) {
  const s = fs.readFileSync(path.join(root, f), 'utf8')
  if (/^<{7}|^={7}$|^>{7}/m.test(s)) { console.error(`FAIL: conflict markers in ${f}`); process.exit(1) }
}
console.log('[OK] syntax + no conflict markers')

function makeMockCtx() {
  const registered = { search: [], fetch: [], routes: [], effects: [] }
  const ctx = {
    logger: { error: () => {}, warn: () => {}, info: () => {} },
    credentials: { resolve: async () => ({ value: 'fake-test-key-not-real' }) },
    on: () => {},
    effect: (_fn, id) => registered.effects.push(id),
    get: () => undefined,
    loader: {
      import: async (name) => {
        if (name === '@deepseek-ai/dsh-web') return { WebError: class WebError extends Error { constructor(m, c) { super(m); this.code = c } } }
        if (name === '@deepseek-ai/dsh-mcp-client') return { apply: async () => {} }
        throw new Error(`unexpected loader import: ${name}`)
      },
    },
    web: {
      registerSearchProvider: (p) => registered.search.push(p),
      registerFetchProvider: (p) => registered.fetch.push(p),
    },
    webServer: { register: (r) => { registered.routes.push(r.path); return () => {} } },
    __registered: registered,
  }
  return ctx
}

const { apply, inject } = await import(path.join(root, 'index.js'))
if (!Array.isArray(inject)) { console.error('FAIL: missing inject export'); process.exit(1) }

const ctx = makeMockCtx()
try {
  await apply(ctx, {})
} catch (error) {
  console.error('FAIL: apply() threw:', error.message)
  process.exit(1)
}

const r = ctx.__registered
const okSearch = r.search.some((p) => p.id === 'zai-mcp')
const okFetch = r.fetch.some((p) => p.id === 'zai-reader')
const okRoutes = r.routes.includes('/zai-quota') && r.routes.includes('/zai-quota-diag')
if (!okSearch || !okFetch || !okRoutes) {
  console.error('FAIL: missing registrations', { search: r.search.map((p) => p.id), fetch: r.fetch.map((p) => p.id), routes: r.routes })
  process.exit(1)
}
console.log(`[OK] apply(): search provider zai-mcp, fetch provider zai-reader, routes ${r.routes.join(', ')}, effects ${r.effects.length}`)

// quota route returns parseable JSON without throwing
const quotaRoute = r.routes.includes('/zai-quota')
if (quotaRoute) console.log('[OK] /zai-quota route registered')

// client.js must not leak raw locale keys: every t('...') key used in JSX must exist in locale/en.json register or defaults
const clientSrc = fs.readFileSync(path.join(root, 'client.js'), 'utf8')
const used = new Set([...clientSrc.matchAll(/\bt\('([a-zA-Z]+)'\)/g)].map((m) => m[1]))
const registeredKeys = new Set([...clientSrc.matchAll(/^\s{4,12}([a-zA-Z']+): /gm)].map((m) => m[1]))
const missing = [...used].filter((k) => !registeredKeys.has(k) && k !== 'label')
if (missing.length > 0) { console.error('FAIL: t() keys missing from locale registers:', missing.join(', ')); process.exit(1) }
console.log('[OK] client locale keys all registered:', [...used].sort().join(', '))

console.log('SMOKE PASSED')
