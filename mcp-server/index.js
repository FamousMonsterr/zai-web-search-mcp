#!/usr/bin/env node
// Local stdio MCP server wrapping the official Z.ai (GLM Coding Plan) MCP
// endpoints so any MCP client gets web search / page reading / GitHub repo
// docs as native tools, authenticated by the user's own ZAI_API_KEY.
// Zero dependencies. Set ZAI_API_KEY in the environment before starting.
import { createInterface } from 'node:readline'

const KEY = process.env.ZAI_API_KEY ?? ''
// Start without a key so listing/introspection checks (tools/list) pass;
// tools/call returns a structured error until ZAI_API_KEY is provided.

const TOOLS = [
  {
    name: 'zai_web_search',
    description: 'Search the web with Z.ai web_search_prime (GLM Coding Plan). Returns titles, URLs and snippets.',
    inputSchema: { type: 'object', properties: { search_query: { type: 'string', description: 'Search query' } }, required: ['search_query'] },
    endpoint: 'https://api.z.ai/api/mcp/web_search_prime/mcp',
    tool: 'web_search_prime',
    args: (a) => ({ search_query: a.search_query }),
  },
  {
    name: 'zai_read_page',
    description: 'Fetch a webpage through the Z.ai webReader MCP server: title, main content (markdown) and metadata.',
    inputSchema: { type: 'object', properties: { url: { type: 'string', description: 'Page URL' } }, required: ['url'] },
    endpoint: 'https://api.z.ai/api/mcp/web_reader/mcp',
    tool: 'webReader',
    args: (a) => ({ url: a.url }),
  },
  {
    name: 'zai_github_search_doc',
    description: 'Search documentation, issues and PRs of a public GitHub repository through the Z.ai zread MCP server.',
    inputSchema: { type: 'object', properties: { repo: { type: 'string', description: 'owner/repo' }, query: { type: 'string', description: 'What to find' } }, required: ['repo', 'query'] },
    endpoint: 'https://api.z.ai/api/mcp/zread/mcp',
    tool: 'search_doc',
    args: (a) => a,
  },
]

const sessions = new Map()
let rpcId = 0

function parseJsonRpcMessage(text) {
  if (text.trim().length === 0) return { jsonrpc: '2.0', result: {} }
  const chunks = [...text.matchAll(/^data:\s*(.*)$/gm)].map((m) => m[1])
  const candidates = chunks.length > 0 ? chunks : [text]
  let message
  for (const chunk of candidates) {
    try { const p = JSON.parse(chunk); if (p && typeof p === 'object') message = p } catch { }
  }
  if (message === undefined) throw new Error('unparseable MCP response body')
  return message
}

async function callUpstream(tool, signal) {
  if (!KEY) throw new Error('ZAI_API_KEY environment variable is not set (https://z.ai/manage-apikey/apikey-list)')
  const headers = { authorization: `Bearer ${KEY}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream' }
  if (!sessions.has(tool.endpoint)) {
    const r = await fetch(tool.endpoint, { method: 'POST', headers: { ...headers }, body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'zai-coding-plan-mcp', version: '1.0.0' } } }), signal })
    const sid = r.headers.get('mcp-session-id')
    sessions.set(tool.endpoint, sid ?? '')
    await r.text()
    await fetch(tool.endpoint, { method: 'POST', headers: { ...(sid ? { 'mcp-session-id': sid } : {}), ...headers }, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) }).then((r) => r.text()).catch(() => { })
  }
  const sid = sessions.get(tool.endpoint)
  const r = await fetch(tool.endpoint, { method: 'POST', headers: { ...(sid ? { 'mcp-session-id': sid } : {}), ...headers }, body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method: 'tools/call', params: { name: tool.tool, arguments: tool.args } }), signal })
  if (!r.ok) throw new Error(`Z.ai endpoint returned HTTP ${r.status}`)
  return parseJsonRpcMessage(await r.text())
}

function textOf(message) {
  const block = (message.result?.content ?? []).find((b) => b.type === 'text' && typeof b.text === 'string')
  if (message.result?.isError === true || block === undefined) throw new Error('Z.ai tool returned an error result')
  return block.text
}

const rl = createInterface({ input: process.stdin })
const send = (obj) => process.stdout.write(JSON.stringify(obj) + '\n')

rl.on('line', (line) => {
  let msg
  try { msg = JSON.parse(line) } catch { return }
  const { id, method, params } = msg
  if (id === undefined) return
  if (method === 'initialize') {
    send({ jsonrpc: '2.0', id, result: { protocolVersion: params?.protocolVersion ?? '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'zai-coding-plan-mcp', version: '1.0.0' } } })
  } else if (method === 'tools/list') {
    send({ jsonrpc: '2.0', id, result: { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) } })
  } else if (method === 'tools/call') {
    const tool = TOOLS.find((t) => t.name === params?.name)
    if (!tool) { send({ jsonrpc: '2.0', id, error: { code: -32602, message: `unknown tool: ${params?.name}` } }); return }
    tool.args = tool.args(params?.arguments ?? {})
    callUpstream(tool)
      .then((message) => send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: textOf(message) }] } }))
      .catch((error) => send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true } }))
  } else {
    send({ jsonrpc: '2.0', id, error: { code: -32601, message: `method not found: ${method}` } })
  }
})
