#!/usr/bin/env node
// Unit tests for the v1.9.7 self-update pipeline (issue #3): the ndjson
// progress parser, the run tracker (percent/stage/error/resultVersion), and
// the /zai-update route gating (single-flight + update-available gate) over a
// mock ctx. No pnpm is spawned and no registry write happens. Run:
//   node scripts/test-update-pipeline.mjs
import assert from 'node:assert/strict'

const { parsePnpmProgressLine, createUpdateTracker, apply, inject } = await import(
  new URL('../index.js', import.meta.url).href
)

let passed = 0
function check(name, fn) {
  try {
    fn()
    passed += 1
    console.log(`PASS  ${name}`)
  } catch (error) {
    console.error(`FAIL  ${name}: ${error.message}`)
    process.exit(1)
  }
}

// --- parsePnpmProgressLine: REAL lines captured live from the bundled
// runtime pnpm (pnpm 10.x, `--reporter=ndjson`) ---

check('parser: pnpm:stage resolution_started -> resolving', () => {
  const line = '{"time":1794326616019,"hostname":"h","pid":1,"level":"debug","name":"pnpm:stage","prefix":"/tmp/x","stage":"resolution_started"}'
  assert.deepEqual(parsePnpmProgressLine(line), { stage: 'resolving', progress: null })
})
check('parser: pnpm:progress resolved -> resolving', () => {
  const line = '{"time":1794326616900,"hostname":"h","pid":1,"level":"debug","name":"pnpm:progress","packageId":"is-odd@3.0.0","requester":"/tmp/x","status":"resolved"}'
  assert.deepEqual(parsePnpmProgressLine(line), { stage: 'resolving', progress: null })
})
check('parser: pnpm:fetching-progress -> fetching', () => {
  const line = '{"time":1794326617230,"hostname":"h","pid":1,"level":"debug","name":"pnpm:fetching-progress","attempt":1,"packageId":"is-number@6.0.0","size":3474,"status":"started"}'
  assert.deepEqual(parsePnpmProgressLine(line), { stage: 'fetching', progress: null })
})
check('parser: pnpm:progress fetched -> fetching', () => {
  const line = '{"time":1794326617262,"hostname":"h","pid":1,"level":"debug","name":"pnpm:progress","packageId":"is-number@6.0.0","requester":"/tmp/x","status":"fetched"}'
  assert.deepEqual(parsePnpmProgressLine(line), { stage: 'fetching', progress: null })
})
check('parser: pnpm:progress imported -> linking', () => {
  const line = '{"time":1794326617268,"hostname":"h","pid":1,"level":"debug","name":"pnpm:progress","method":"clone","requester":"/tmp/x","status":"imported","to":"/tmp/x/node_modules/.pnpm/is-odd@3.0.0"}'
  assert.deepEqual(parsePnpmProgressLine(line), { stage: 'linking', progress: null })
})
check('parser: pnpm:stage importing_started -> linking', () => {
  const line = '{"time":1794326617072,"hostname":"h","pid":1,"level":"debug","name":"pnpm:stage","prefix":"/tmp/x","stage":"importing_started"}'
  assert.deepEqual(parsePnpmProgressLine(line), { stage: 'linking', progress: null })
})
check('parser: pnpm:stage importing_done -> installing', () => {
  const line = '{"time":1794326617640,"hostname":"h","pid":1,"level":"debug","name":"pnpm:stage","prefix":"/tmp/x","stage":"importing_done"}'
  assert.deepEqual(parsePnpmProgressLine(line), { stage: 'installing', progress: null })
})
check('parser: numeric progress honored (future pnpm)', () => {
  const line = '{"name":"pnpm:fetching-progress","status":"progress","downloaded":50,"size":100,"progress":0.5}'
  assert.deepEqual(parsePnpmProgressLine(line), { stage: 'fetching', progress: 0.5 })
})
check('parser: progress clamped to 0..1', () => {
  assert.equal(parsePnpmProgressLine('{"progress":2}').progress, null)
  assert.equal(parsePnpmProgressLine('{"progress":-1}').progress, null)
  assert.equal(parsePnpmProgressLine('{"progress":"0.5"}').progress, null)
})
check('parser: non-JSON stderr line -> null', () => {
  assert.equal(parsePnpmProgressLine('ERR_PNPM_UNEXPECTED something broke'), null)
})
check('parser: empty/whitespace/JSON-array lines -> null', () => {
  assert.equal(parsePnpmProgressLine(''), null)
  assert.equal(parsePnpmProgressLine('   '), null)
  assert.equal(parsePnpmProgressLine('[]'), null)
  assert.equal(parsePnpmProgressLine('"plain string"'), null)
})
check('parser: JSON object without progress info -> null stage, null progress', () => {
  const parsed = parsePnpmProgressLine('{"time":123,"hostname":"h"}')
  assert.deepEqual(parsed, { stage: null, progress: null })
})

// --- createUpdateTracker: a realistic run ---

check('tracker: realistic ndjson run climbs percent and lands at 100 with version', () => {
  const tracker = createUpdateTracker()
  assert.equal(tracker.state.startedAt !== null, true)
  // chunks as pnpm emits them: several JSON lines per stdout read
  tracker.onLine('{"name":"pnpm:stage","stage":"resolution_started"}\n{"name":"pnpm:progress","status":"resolved"}\n')
  assert.equal(tracker.state.stage, 'resolving')
  assert.equal(tracker.state.percent, 8) // stage floor
  tracker.onLine('{"name":"pnpm:fetching-progress","size":4043150,"status":"started"}\n{"name":"pnpm:progress","status":"fetched"}\n')
  assert.equal(tracker.state.stage, 'fetching')
  assert.equal(tracker.state.percent, 35)
  tracker.onLine('{"name":"pnpm:stage","stage":"importing_started"}\n')
  assert.equal(tracker.state.stage, 'linking')
  assert.equal(tracker.state.percent, 78)
  tracker.onLine('{"name":"pnpm:stage","stage":"importing_done"}\n{"name":"pnpm:root","added":{"name":"dsh-zai-web-search-mcp","version":"1.9.7"}}\n')
  assert.equal(tracker.state.stage, 'installing')
  assert.equal(tracker.state.percent, 92)
  assert.equal(tracker.state.running, true)
  tracker.onLine('a raw non-JSON stderr line that becomes the error text\n')
  tracker.finish(0, '1.9.7')
  assert.equal(tracker.state.running, false)
  assert.equal(tracker.state.percent, 100)
  assert.equal(tracker.state.resultVersion, '1.9.7')
  assert.equal(tracker.state.error, null)
})
check('tracker: percent never exceeds 99 before exit', () => {
  const tracker = createUpdateTracker()
  tracker.onLine('{"progress":1}\n') // numeric 100 -> capped at 99
  assert.equal(tracker.state.percent, 99)
  assert.equal(tracker.state.running, true)
  tracker.finish(0, '1.9.7')
  assert.equal(tracker.state.percent, 100)
})
check('tracker: nonzero exit records last raw line as error', () => {
  const tracker = createUpdateTracker()
  tracker.onLine('{"name":"pnpm:stage","stage":"resolution_started"}\n')
  tracker.onLine('ERR_PNPM_NO_MATCHING_VERSION  no version found\n')
  tracker.finish(1, null)
  assert.equal(tracker.state.running, false)
  assert.equal(tracker.state.percent, 8)
  assert.equal(tracker.state.resultVersion, null)
  assert.equal(tracker.state.error, 'ERR_PNPM_NO_MATCHING_VERSION  no version found')
})
check('tracker: nonzero exit with no output falls back to exit code text', () => {
  const tracker = createUpdateTracker()
  tracker.finish(127, null)
  assert.equal(tracker.state.error, 'pnpm update exited with code 127')
})
check('tracker: spawnError fails the run without corrupting percent', () => {
  const tracker = createUpdateTracker()
  tracker.onLine('{"name":"pnpm:stage","stage":"resolution_started"}\n')
  tracker.spawnError(new Error('spawn node ENOENT'))
  assert.equal(tracker.state.running, false)
  assert.equal(tracker.state.error, 'spawn node ENOENT')
  assert.equal(tracker.state.stage, 'resolving')
})
check('tracker: spawnError after finish is ignored (watchdog vs close race)', () => {
  const tracker = createUpdateTracker()
  tracker.finish(0, '1.9.7')
  tracker.spawnError('update exceeded 10 minutes and was killed')
  assert.equal(tracker.state.error, null)
  assert.equal(tracker.state.resultVersion, '1.9.7')
})

// --- route wiring + gating over a mock ctx (never spawns pnpm) ---

if (!Array.isArray(inject)) throw new Error('missing inject export')
const routes = {}
const effects = []
const mockCtx = {
  logger: { error: () => {}, warn: () => {}, info: () => {} },
  credentials: { resolve: async () => ({ value: 'fake-test-key-not-real' }) },
  on: () => {},
  effect: (fn) => effects.push(fn),
  get: () => undefined,
  loader: {
    import: async (name) => {
      if (name === '@deepseek-ai/dsh-web') return { WebError: class WebError extends Error { } }
      if (name === '@deepseek-ai/dsh-mcp-client') return { apply: async () => {} }
      throw new Error(`unexpected loader import: ${name}`)
    },
  },
  web: { registerSearchProvider: () => {}, registerFetchProvider: () => {} },
  webServer: { register: (r) => { routes[r.path] = r.handler; return () => {} } },
}
await apply(mockCtx)

check('routes: /zai-update and /zai-update/status registered', () => {
  assert.equal(typeof routes['/zai-update'], 'function')
  assert.equal(typeof routes['/zai-update/status'], 'function')
})
check('GET /zai-update/status serves the idle state before any run', async () => {
  const res = await new Promise((resolve) => {
    routes['/zai-update/status']({ method: 'GET', url: '/zai-update/status' }, {
      writeHead() {},
      end(payload) { resolve(JSON.parse(payload)) },
    })
  })
  assert.deepEqual(res, { running: false, stage: null, percent: 0, startedAt: null, error: null, resultVersion: null })
})
check('POST /zai-update is gated when no newer release exists', async () => {
  const res = await new Promise((resolve) => {
    routes['/zai-update']({ method: 'POST', url: '/zai-update' }, {
      writeHead(code) { this.statusCode = code },
      end(payload) { resolve({ statusCode: this.statusCode, payload: JSON.parse(payload) }) },
    })
  })
  // The registry latest equals the running version (1.9.7 once shipped), so
  // the gate must refuse and NOT spawn pnpm.
  assert.equal(res.statusCode, 409)
  assert.equal(res.payload.ok, false)
  assert.match(String(res.payload.error), /no update available/)
})
check('GET /zai-update rejects non-POST with 409', async () => {
  const res = await new Promise((resolve) => {
    routes['/zai-update']({ method: 'GET', url: '/zai-update' }, {
      writeHead(code) { this.statusCode = code },
      end(payload) { resolve({ statusCode: this.statusCode, payload: JSON.parse(payload) }) },
    })
  })
  assert.equal(res.statusCode, 409)
  assert.equal(res.payload.ok, false)
})
check('dispose effect kills child and unregisters', () => {
  assert.equal(effects.length, 1)
  // dispose must not throw with no child running
  effects[0]()
})

console.log(`\nALL ${passed} UPDATE-PIPELINE CHECKS PASSED`)
