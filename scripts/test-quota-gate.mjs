// Pre-push integration test for @local/zai-web-search-mcp v1.9.0:
// drives the real apply() with a mock Cordis ctx, then exercises the
// registered /zai-quota route handler against the live Z.ai monitoring API
// (key read from the credential store, never printed).
const fs = await import('node:fs')
const os = await import('node:os')
const path = await import('node:path')

const key = (() => {
  const text = fs.readFileSync(path.join(os.homedir(), '.dsh', '.credentials.yaml'), 'utf8')
  const m = text.match(/^\s{2}ZAI_API_KEY:\s*(\S+)\s*$/m)
  return m ? m[1] : ''
})()
if (key.length === 0) { console.error('FAIL: ZAI_API_KEY not found'); process.exit(1) }

let activeProvider = 'zai'
const routes = {}
const registeredProviders = []
const fetchProviders = []
const appliedBridges = []
const listeners = {}

const mockCtx = {
  credentials: { resolve: async () => ({ value: key, source: 'test' }) },
  loader: { import: async () => ({ apply: async (_ctx, cfg) => { appliedBridges.push(cfg.serverName) } }) },
  web: {
    registerSearchProvider: (p) => { registeredProviders.push(p.id) },
    registerFetchProvider: (p) => { fetchProviders.push(p) },
  },
  webServer: { register: (route) => { routes[route.path] = route.handler; return () => {} } },
  logger: { error: (...a) => console.error('[logger]', ...a), warn: () => {}, info: () => {} },
  effect: () => () => {},
  on: (name, cb) => { (listeners[name] ??= []).push(cb); return () => {} },
  get: (name) => {
    if (name === 'agentDefaultModel') {
      return { currentSelection: () => ({ provider: activeProvider, model: 'glm-5.3' }) }
    }
    return undefined
  },
}

async function fireAgentRequest(sessionId, provider) {
  const cbs = listeners['agent/request'] ?? []
  if (cbs.length === 0) throw new Error('agent/request listener not registered')
  for (const cb of cbs) {
    const config = await cb({ agent: { session: { id: sessionId } } }, async () => ({ provider }))
    if (config.provider !== provider) throw new Error('agent/request chain broke: config not returned')
  }
}

async function callQuota(sessionId) {
  const handler = routes['/zai-quota']
  if (typeof handler !== 'function') throw new Error('/zai-quota route not registered')
  let body = ''
  let status = 0
  const res = {
    writeHead: (code) => { status = code },
    end: (payload) => { body = payload ?? '' },
  }
  const url = sessionId ? `/zai-quota?session=${encodeURIComponent(sessionId)}` : '/zai-quota'
  await handler({ method: 'GET', url }, res)
  return { status, json: JSON.parse(body) }
}

async function main() {
  const mod = await import('file:///E:/AI/zai-web-search-mcp/index.js')
  await mod.apply(mockCtx)

  const checks = []
  const check = (name, ok, detail = '') => {
    checks.push({ name, ok })
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`)
  }

  check('apply: no throw; bridges mounted', appliedBridges.length >= 4, appliedBridges.join(','))
  check('apply: search provider registered', registeredProviders.includes('zai-mcp'))

  // Case 7: fetch provider (web_fetch through the Z.ai reader) - live
  const reader = fetchProviders.find((p) => p.id === 'zai-reader')
  check('reader: fetch provider registered', reader !== undefined)
  if (reader !== undefined) {
    const fetched = await reader.fetch({ url: 'https://example.com' }, undefined)
    const bodyText = typeof fetched?.body?.content === 'string' ? fetched.body.content : ''
    check('reader: live webReader returns content', fetched?.statusCode === 200 && bodyText.length > 50, `status=${fetched?.statusCode} bytes=${bodyText.length}`)
  }
  check('apply: /zai-quota route registered', typeof routes['/zai-quota'] === 'function')

  // Case 1: provider 'zai' -> supported, live API, windows
  const t0 = Date.now()
  const r1 = await callQuota()
  check('zai: ok=true supported=true', r1.json.ok === true && r1.json.supported === true, `provider=${r1.json.provider}`)
  check('zai: two credit windows', Array.isArray(r1.json.windows) && r1.json.windows.length === 2, (r1.json.windows || []).map((w) => w.kind).join(','))
  check('zai: level present', typeof r1.json.level === 'string', String(r1.json.level))
  check('zai: mcp calls counter', r1.json.mcp !== null && typeof r1.json.mcp.calls === 'number', `calls=${r1.json.mcp ? r1.json.mcp.calls : 'null'}`)
  check('zai: HTTP 200', r1.status === 200)
  console.log(`      (live fetch took ${Date.now() - t0}ms)`)

  // Case 2: cache - second call fast and same fetchedAt
  const r2 = await callQuota()
  check('zai: TTL cache serves same snapshot', r2.json.fetchedAt === r1.json.fetchedAt)

  // Case 2b: skin model - title + accent colors ride along
  check('zai: skin.title', r1.json.skin?.title === 'GLM Coding Plan', String(r1.json.skin?.title))
  check('zai: skin.accent has 4 colors',
    ['ring', 'fiveHour', 'weekly', 'mcp'].every((k) => typeof r1.json.skin?.accent?.[k] === 'string' && r1.json.skin.accent[k].startsWith('#')),
    JSON.stringify(r1.json.skin?.accent))

  // Case 3: unsupported provider -> chip null, no API call (fast)
  activeProvider = 'deepseek-official'
  const t1 = Date.now()
  const r3 = await callQuota()
  const dt = Date.now() - t1
  check('other provider: ok=false supported=false chip=null',
    r3.json.ok === false && r3.json.supported === false && r3.json.chip === null, `provider=${r3.json.provider}`)
  check('other provider: no skin served', r3.json.skin === undefined || r3.json.skin === null)
  check('other provider: answers without network (<50ms)', dt < 50, `${dt}ms`)

  // Case 4: provider unreadable (service absent) -> unsupported
  mockCtx.get = () => undefined
  const r4 = await callQuota()
  check('no provider service: supported=false chip=null', r4.json.supported === false && r4.json.chip === null)

  // Case 5: SESSION-scoped gating - a session on a local provider hides the
  // chip even while the profile default stays zai; a zai session keeps it.
  mockCtx.get = (name) => name === 'agentDefaultModel' ? { currentSelection: () => ({ provider: 'zai', model: 'glm-5.3' }) } : undefined
  await fireAgentRequest('session-local-111', 'cybervulkan')
  const r5 = await callQuota('session-local-111')
  check('session on local provider: supported=false chip=null (default still zai)',
    r5.json.supported === false && r5.json.chip === null, `provider=${r5.json.provider}`)
  const r5b = await callQuota()
  check('no session param: falls back to default zai', r5b.json.supported === true, `provider=${r5b.json.provider}`)
  await fireAgentRequest('session-glm-222', 'zai')
  const r5c = await callQuota('session-glm-222')
  check('session on zai: supported=true windows present', r5c.json.supported === true && r5c.json.windows?.length === 2)
  const r5d = await callQuota('session-unknown-333')
  check('unknown session id: falls back to default (zai chip stays)',
    r5d.json.supported === true && r5d.json.provider === 'zai', `provider=${r5d.json.provider}`)

  // Case 6: release notification rides along (live registry check)
  const pkgVersion = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version
  check('update: current matches package version', r1.json.update?.current === pkgVersion, `${r1.json.update?.current} vs ${pkgVersion}`)
  check('update: latest resolved from registry', typeof r1.json.update?.latest === 'string', String(r1.json.update?.latest))
  check('update: dev/unreleased never flags available', r1.json.update?.available === false)

  const failed = checks.filter((c) => !c.ok)
  console.log(failed.length === 0 ? `\nALL ${checks.length} CHECKS PASSED` : `\n${failed.length}/${checks.length} CHECKS FAILED`)
  process.exit(failed.length === 0 ? 0 : 1)
}

main().catch((error) => { console.error('TEST CRASH:', error); process.exit(1) })
