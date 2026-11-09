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
const searchProviders = []
const appliedBridges = []

const mockCtx = {
  credentials: { resolve: async () => ({ value: key, source: 'test' }) },
  loader: { import: async () => ({ apply: async (_ctx, cfg) => { appliedBridges.push(cfg.serverName) } }) },
  web: {
    registerSearchProvider: (p) => { registeredProviders.push(p.id) },
    registerFetchProvider: (p) => { registeredProviders.push(p.id) },
  },
  webServer: { register: (route) => { routes[route.path] = route.handler; return () => {} } },
  logger: { error: (...a) => console.error('[logger]', ...a), warn: () => {}, info: () => {} },
  effect: () => () => {},
  on: () => () => {},
  get: (name) => {
    if (name === 'agentDefaultModel') {
      return { currentSelection: () => ({ provider: activeProvider, model: 'glm-5.3' }) }
    }
    return undefined
  },
}

async function callQuota() {
  const handler = routes['/zai-quota']
  if (typeof handler !== 'function') throw new Error('/zai-quota route not registered')
  let body = ''
  let status = 0
  const res = {
    writeHead: (code) => { status = code },
    end: (payload) => { body = payload ?? '' },
  }
  await handler({ method: 'GET' }, res)
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

  const failed = checks.filter((c) => !c.ok)
  console.log(failed.length === 0 ? `\nALL ${checks.length} CHECKS PASSED` : `\n${failed.length}/${checks.length} CHECKS FAILED`)
  process.exit(failed.length === 0 ? 0 : 1)
}

main().catch((error) => { console.error('TEST CRASH:', error); process.exit(1) })
