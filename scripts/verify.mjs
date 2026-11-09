// Live verification of every Z.ai integration this plugin uses.
// Reads ZAI_API_KEY from $DSH_HOME/.credentials.yaml and never prints it.
//   node.exe scripts/verify.mjs            (dsh runtime node, or any Node >= 18)
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

const MCP = 'https://api.z.ai/api/mcp/web_search_prime/mcp'
let session = null
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

async function post(body) {
  const headers = {
    authorization: 'Bearer ' + key,
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
  }
  if (session) headers['mcp-session-id'] = session
  const r = await fetch(MCP, { method: 'POST', redirect: 'error', headers, body: JSON.stringify(body) })
  const s = r.headers.get('mcp-session-id')
  if (s) session = s
  if (!r.ok) throw new Error('HTTP ' + r.status + ': ' + (await r.text()).slice(0, 160))
  return parseJsonRpcMessage(await r.text())
}

// --- 1. MCP web_search_prime ---------------------------------------------------
try {
  const init = await post({ jsonrpc: '2.0', id: ++rpcId, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'verify', version: '1.0' } } })
  await post({ jsonrpc: '2.0', method: 'notifications/initialized' })
  const tools = await post({ jsonrpc: '2.0', id: ++rpcId, method: 'tools/list' })
  const names = (tools.result?.tools ?? []).map((t) => t.name)
  if (!names.includes('web_search_prime')) throw new Error('web_search_prime not offered; tools=' + JSON.stringify(names))
  const call = await post({ jsonrpc: '2.0', id: ++rpcId, method: 'tools/call', params: { name: 'web_search_prime', arguments: { search_query: 'z.ai glm-4.6' } } })
  const block = (call.result?.content ?? []).find((b) => b.type === 'text')
  let v = JSON.parse(block.text)
  if (typeof v === 'string') v = JSON.parse(v)
  console.log('[OK] 1/3 MCP server ' + (init.result?.serverInfo?.name ?? '?') + ': tools=' + JSON.stringify(names) + ', search returned ' + (Array.isArray(v) ? v.length : '?') + ' items')
} catch (e) {
  failures++
  console.log('[FAIL] 1/3 MCP web_search_prime: ' + e.message)
}

// --- 2. quota credit windows -----------------------------------------------------
try {
  const r = await fetch('https://api.z.ai/api/monitor/usage/quota/limit', { headers: { authorization: 'Bearer ' + key, accept: 'application/json' }, signal: AbortSignal.timeout(15000) })
  const p = await r.json()
  if (p.success !== true) throw new Error('success!=true')
  const parts = (p.data?.limits ?? []).map((l) => 'unit' + l.unit + 'n' + l.number + ' ' + l.currentValue + '/' + l.usage + ' (' + l.percentage + '%)')
  console.log('[OK] 2/3 quota API: level=' + (p.data?.level ?? '?') + ' | ' + parts.join(' | '))
} catch (e) {
  failures++
  console.log('[FAIL] 2/3 quota API: ' + e.message)
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
  console.log('[OK] 3/3 tool-usage API: ' + total + ' MCP calls in the last 30 days')
} catch (e) {
  failures++
  console.log('[FAIL] 3/3 tool-usage API: ' + e.message)
}

console.log('')
console.log(failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED')
process.exit(failures === 0 ? 0 : 1)
