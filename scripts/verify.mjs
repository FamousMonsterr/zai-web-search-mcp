// Live verification of every Z.ai integration this plugin uses.
// Reads ZAI_API_KEY from $DSH_HOME/.credentials.yaml and never prints it.
//   node.exe scripts/verify.mjs            (dsh runtime node, or any Node >= 18)
// Checks:
//   1. MCP web_search_prime (initialize / tools/list / tools/call)
//   2. Quota credit windows API
//   3. Monthly MCP tool usage API
//   4. MCP web_reader (initialize / tools/list / tools/call webReader)
//   5. Vision MCP server over stdio (npx @z_ai/mcp-server; needs npx + Node >= 22)
//   6. MCP zread (initialize / tools/list for search_doc / read_file / get_repo_structure)
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const dshHome = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
const credPath = path.join(dshHome, '.credentials.yaml')
if (!fs.existsSync(credPath)) {
  console.log('FAIL: ' + credPath + ' not found - run the DeepSeek desktop app once.')
  process.exit(1)
}
const yaml = fs.readFileSync(credPath, 'utf8')
const m = yaml.match(/^\s*ZAI_API_KEY:\s*(\S+)/m)
if (!m) {
  console.log('FAIL: ZAI_API_KEY not configured in .credentials.yaml')
  process.exit(1)
}
const key = m[1]
console.log('key: loaded from credentials (length ' + key.length + '), value not printed')
console.log('')

const SEARCH_MCP = 'https://api.z.ai/api/mcp/web_search_prime/mcp'
const READER_MCP = 'https://api.z.ai/api/mcp/web_reader/mcp'
const ZREAD_MCP = 'https://api.z.ai/api/mcp/zread/mcp'
let rpcId = 0
let failures = 0

class McpEndpointError extends Error {}

// Same parser the plugin uses (index.js parseJsonRpcMessage).
function parseJsonRpcMessage(text) {
  if (text.trim().length === 0) return { jsonrpc: '2.0', result: {} }
  const chunks = [...text.matchAll(/^data:\s*(.*)$/gm)].map((x) => x[1])
  const candidates = chunks.length > 0 ? chunks : [text]
  let message
  for (const chunk of candidates) {
    try {
      const parsed = JSON.parse(chunk)
      if (parsed !== null && typeof parsed === 'object') message = parsed
    } catch { /* keep the last parseable data chunk */ }
  }
  if (message === undefined) throw new McpEndpointError('unparseable body')
  return message
}

// Streamable-HTTP MCP client with one session per endpoint.
function makeClient(endpoint) {
  const state = { session: null }
  async function post(body) {
    const headers = {
      authorization: 'Bearer ' + key,
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    }
    if (state.session) headers['mcp-session-id'] = state.session
    const r = await fetch(endpoint, { method: 'POST', redirect: 'error', headers, body: JSON.stringify(body) })
    const s = r.headers.get('mcp-session-id')
    if (s) state.session = s
    if (!r.ok) throw new Error('HTTP ' + r.status + ': ' + (await r.text()).slice(0, 160))
    return parseJsonRpcMessage(await r.text())
  }
  async function connect() {
    await post({ jsonrpc: '2.0', id: ++rpcId, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'verify', version: '1.0' } } })
    await post({ jsonrpc: '2.0', method: 'notifications/initialized' })
  }
  return { connect, post }
}

// A tool text block that is JSON, sometimes double-encoded; normalize once.
function parseTextPayload(text) {
  let v = JSON.parse(text)
  if (typeof v === 'string') v = JSON.parse(v)
  return v
}

// --- 1. MCP web_search_prime ---------------------------------------------------
try {
  const c = makeClient(SEARCH_MCP)
  await c.connect()
  const tools = await c.post({ jsonrpc: '2.0', id: ++rpcId, method: 'tools/list' })
  const names = (tools.result?.tools ?? []).map((t) => t.name)
  if (!names.includes('web_search_prime')) throw new Error('web_search_prime not offered; tools=' + JSON.stringify(names))
  const call = await c.post({ jsonrpc: '2.0', id: ++rpcId, method: 'tools/call', params: { name: 'web_search_prime', arguments: { search_query: 'z.ai glm-4.6' } } })
  const block = (call.result?.content ?? []).find((b) => b.type === 'text')
  const v = parseTextPayload(block.text)
  console.log('[OK] 1/6 MCP search server: tools=' + JSON.stringify(names) + ', search returned ' + (Array.isArray(v) ? v.length : '?') + ' items')
} catch (e) {
  failures++
  console.log('[FAIL] 1/6 MCP web_search_prime: ' + e.message)
}

// --- 2. quota credit windows -----------------------------------------------------
try {
  const r = await fetch('https://api.z.ai/api/monitor/usage/quota/limit', { headers: { authorization: 'Bearer ' + key, accept: 'application/json' }, signal: AbortSignal.timeout(15000) })
  const p = await r.json()
  if (p.success !== true) throw new Error('success!=true')
  const parts = (p.data?.limits ?? []).map((l) => 'unit' + l.unit + 'n' + l.number + ' ' + l.currentValue + '/' + l.usage + ' (' + l.percentage + '%)')
  console.log('[OK] 2/6 quota API: level=' + (p.data?.level ?? '?') + ' | ' + parts.join(' | '))
} catch (e) {
  failures++
  console.log('[FAIL] 2/6 quota API: ' + e.message)
}

// --- 3. monthly MCP tool usage ----------------------------------------------------
try {
  const pad = (x) => String(x).padStart(2, '0')
  const fmt = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
  const end = new Date()
  const start = new Date(end.getTime() - 30 * 24 * 3600 * 1000)
  const url = 'https://api.z.ai/api/monitor/usage/tool-usage?startTime=' + encodeURIComponent(fmt(start)) + '&endTime=' + encodeURIComponent(fmt(end))
  const r = await fetch(url, { headers: { authorization: 'Bearer ' + key, accept: 'application/json' }, signal: AbortSignal.timeout(15000) })
  const p = await r.json()
  const total = p?.data?.totalUsage?.totalSearchMcpCount
  if (p.success !== true || typeof total !== 'number') throw new Error('unexpected payload')
  console.log('[OK] 3/6 tool-usage API: ' + total + ' MCP calls in the last 30 days')
} catch (e) {
  failures++
  console.log('[FAIL] 3/6 tool-usage API: ' + e.message)
}

// --- 4. MCP web_reader ------------------------------------------------------------
try {
  const c = makeClient(READER_MCP)
  await c.connect()
  const tools = await c.post({ jsonrpc: '2.0', id: ++rpcId, method: 'tools/list' })
  const names = (tools.result?.tools ?? []).map((t) => t.name)
  if (!names.includes('webReader')) throw new Error('webReader not offered; tools=' + JSON.stringify(names))
  const call = await c.post({ jsonrpc: '2.0', id: ++rpcId, method: 'tools/call', params: { name: 'webReader', arguments: { url: 'https://example.com' } } })
  const block = (call.result?.content ?? []).find((b) => b.type === 'text')
  const v = parseTextPayload(block.text)
  if (typeof v?.content !== 'string' || v.content.length === 0) throw new Error('no content in reader payload: ' + JSON.stringify(Object.keys(v ?? {})))
  console.log('[OK] 4/6 MCP reader server: tools=' + JSON.stringify(names) + ', read "https://example.com" title=' + JSON.stringify(v.title) + ' content=' + v.content.length + ' chars')
} catch (e) {
  failures++
  console.log('[FAIL] 4/6 MCP web_reader: ' + e.message)
}

// --- 5. vision MCP server over stdio ----------------------------------------------
try {
  const { spawn } = await import('node:child_process')
  const child = spawn('npx', ['-y', '@z_ai/mcp-server@latest'], {
    env: { ...process.env, Z_AI_API_KEY: key, Z_AI_MODE: 'ZAI' },
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  let stderrTail = ''
  child.stderr.setEncoding('utf8').on('data', (chunk) => { stderrTail = (stderrTail + chunk).slice(-400) })
  const pending = new Map()
  let nextId = 0
  let buffer = ''
  child.stdout.setEncoding('utf8').on('data', (chunk) => {
    buffer += chunk
    let index
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index).trim()
      buffer = buffer.slice(index + 1)
      if (line.length === 0) continue
      try {
        const message = JSON.parse(line)
        if (message.id !== undefined && pending.has(message.id)) {
          pending.get(message.id)(message)
          pending.delete(message.id)
        }
      } catch { /* skip non-JSON noise */ }
    }
  })
  function request(method, params) {
    return new Promise((resolve, reject) => {
      const id = ++nextId
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(method + ' timed out')) }, 60000)
      pending.set(id, (message) => { clearTimeout(timer); resolve(message) })
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params: params ?? {} }) + '\n')
    })
  }
  try {
    const init = await Promise.race([
      (async () => {
        const r = await request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'verify', version: '1.0' } })
        child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n')
        return r
      })(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('spawn/negotiation timed out (cold npx cache? prewarm once: npx -y @z_ai/mcp-server@latest)')), 120000)),
    ])
    if (init.error) throw new Error('initialize failed: ' + JSON.stringify(init.error))
    const tools = await request('tools/list')
    const names = (tools.result?.tools ?? []).map((t) => t.name)
    if (!names.includes('analyze_image')) throw new Error('analyze_image not offered; tools=' + JSON.stringify(names))
    console.log('[OK] 5/6 vision MCP (stdio): server=' + JSON.stringify(init.result?.serverInfo ?? {}) + ', tools=' + JSON.stringify(names))
  } finally {
    for (const [id, resolve] of pending) { resolve({ error: { message: 'cancelled' } }); pending.delete(id) }
    child.kill()
  }
} catch (e) {
  failures++
  console.log('[FAIL] 5/6 vision MCP (stdio): ' + e.message + (stderrTail ? ' | stderr: ' + stderrTail.replace(/\s+/g, ' ').trim().slice(-200) : ''))
}

// --- 6. MCP zread -----------------------------------------------------------------
try {
  const c = makeClient(ZREAD_MCP)
  await c.connect()
  const tools = await c.post({ jsonrpc: '2.0', id: ++rpcId, method: 'tools/list' })
  const names = (tools.result?.tools ?? []).map((t) => t.name)
  const expected = ['search_doc', 'read_file', 'get_repo_structure']
  const missing = expected.filter((n) => !names.includes(n))
  if (missing.length > 0) throw new Error('missing tools ' + JSON.stringify(missing) + '; got ' + JSON.stringify(names))
  console.log('[OK] 6/6 MCP zread server: tools=' + JSON.stringify(names))
} catch (e) {
  failures++
  console.log('[FAIL] 6/6 MCP zread: ' + e.message)
}

console.log('')
console.log(failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED')
process.exit(failures === 0 ? 0 : 1)
