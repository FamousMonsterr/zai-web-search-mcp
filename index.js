// Host plugin: web search, page reading, and vision through the Z.ai MCP
// servers (GLM Coding Plan), authenticated by the ZAI_API_KEY credential
// stored inside the Harness ($DSH_HOME/.credentials.yaml).
//
// Surfaces sharing one key reference:
//   1. A ctx.web search provider (id "zai-mcp") selected as the built-in
//      web_search backend.
//   2. The dsh-mcp-client bridge mounting the server's own tool as
//      mcp__zai__web_search_prime.
//   3. A quota service reading the real Z.ai monitoring API (the same data
//      zcode shows) and serving it to the Web client on /zai-quota: the
//      5-hour and weekly credit windows plus the monthly MCP tool usage.
//   4. A ctx.web fetch provider (id "zai-reader") over the "web_reader" MCP
//      server, selected as the built-in web_fetch backend, plus the same
//      server's tool mounted as mcp__zai-reader__webReader.
//   5. The local Z.ai vision MCP server (stdio via npx @z_ai/mcp-server)
//      bridged as mcp__zai-vision__<name> tools for image and video
//      understanding; works for text-only models because the server does
//      the vision server-side and returns text.
//   6. The Zread MCP server (GitHub repository docs search, structure and
//      file reading) bridged as mcp__zai-zread__<name> tools.
//
// Config cannot carry the key: dsh-mcp-client takes literal string headers,
// and Loader !!js config expressions are synchronous, so this plugin resolves
// the credential asynchronously through the public ctx.credentials seam and
// keeps it out of configuration files and conversation text.

/** Credential reference (environment-variable style name) holding the Z.ai API key. */
const API_KEY_REF = 'ZAI_API_KEY'

/** GLM Coding Plan web-search MCP endpoint (streamable HTTP). */
const MCP_URL = 'https://api.z.ai/api/mcp/web_search_prime/mcp'

/** Local server namespace for the MCP bridge: tools appear as mcp__zai__<rawName>. */
const SERVER_NAME = 'zai'

/** GLM Coding Plan web-reader MCP endpoint (streamable HTTP). */
const READER_MCP_URL = 'https://api.z.ai/api/mcp/web_reader/mcp'

/** Namespace for the reader bridge: the tool appears as mcp__zai-reader__webReader. */
const READER_SERVER_NAME = 'zai-reader'

/** Raw reader tool name on the server. */
const READER_TOOL_NAME = 'webReader'

/** Reader body cap in characters, mirroring the built-in http provider's default. */
const READER_MAX_CHARS = 100_000

/** Local vision MCP server: stdio child spawned through npx (needs Node >= 22 on PATH). */
const VISION_SERVER_NAME = 'zai-vision'
const VISION_NPX_PACKAGE = '@z_ai/mcp-server@latest'

/** Zread MCP endpoint (GitHub repository docs, structure and file reading). */
const ZREAD_MCP_URL = 'https://api.z.ai/api/mcp/zread/mcp'

/** Namespace for the zread bridge: tools appear as mcp__zai-zread__<rawName>. */
const ZREAD_SERVER_NAME = 'zai-zread'

/** Z.ai monitoring API serving the real Coding Plan quota (same data zcode shows). */
const QUOTA_URL = 'https://api.z.ai/api/monitor/usage/quota/limit'
/** Monthly MCP tool usage on the same monitoring API. */
const QUOTA_TOOL_URL = 'https://api.z.ai/api/monitor/usage/tool-usage'
/** How long one quota response stays fresh for readers. */
const QUOTA_TTL_MS = 60_000
/** Background refresh cadence keeping the cache warm for the status chip. */
const QUOTA_BACKGROUND_MS = 5 * 60_000
/** Shared quota endpoint this plugin serves the Web client on. */
const QUOTA_ROUTE_PATH = '/zai-quota'
/** Client lifecycle diagnostics collector for the status chip (temporary). */
const DIAG_ROUTE_PATH = '/zai-quota-diag'

/** Id this plugin's search provider registers under on ctx.web. */
export const PROVIDER_ID = 'zai-mcp'

/** Raw tool name on the server (the docs' "webSearchPrime" is not the wire name). */
const TOOL_NAME = 'web_search_prime'

const PROTOCOL_VERSION = '2025-06-18'
const CLIENT_INFO = { name: 'dsh-zai-web-search', version: '1.8.1' }
/** Retried once per search: a streamable-HTTP session the server dropped. */
const SESSION_LOST_HTTP = new Set([400, 404])

export const inject = ['credentials', 'loader', 'tools', 'web', 'webServer']

export async function apply(ctx) {
  const [dshWeb, mcpClient] = await Promise.all([
    ctx.loader.import('@deepseek-ai/dsh-web', () => []),
    ctx.loader.import('@deepseek-ai/dsh-mcp-client', () => []),
  ])
  const { WebError } = dshWeb

  const credential = await ctx.credentials.resolve(API_KEY_REF)
  if (credential === undefined || credential.value.length === 0) {
    throw new Error(
      `zai-web-search-mcp: credential ${API_KEY_REF} is not configured. ` +
      'Store it in the Harness credentials (the Models/credentials surface writes $DSH_HOME/.credentials.yaml), then reload this plugin.',
    )
  }
  let apiKey = credential.value
  const invalidateQuota = startQuotaService(ctx, () => apiKey)
  ctx.on('credentials/reference-updated', (ref) => {
    if (String(ref) !== API_KEY_REF) return
    void ctx.credentials.resolve(API_KEY_REF).then((next) => {
      if (next !== undefined && next.value.length > 0) {
        apiKey = next.value
        invalidateQuota()
      }
    }, () => {})
  }, { global: true })

  ctx.web.registerSearchProvider(new ZaiMcpSearch({
    endpoint: MCP_URL,
    toolName: TOOL_NAME,
    getApiKey: () => apiKey,
    WebError,
  }))

  // The standalone MCP tool bridge. Startup failures stay non-fatal so the
  // web_search provider above survives a transient endpoint outage; the
  // bridge logs and reconnects on its own schedule.
  try {
    await mcpClient.apply(ctx, {
      serverName: SERVER_NAME,
      transport: 'streamable-http',
      url: MCP_URL,
      headers: { Authorization: `Bearer ${apiKey}` },
      failOnStartupError: false,
    })
  } catch (error) {
    ctx.logger.error(`zai-web-search-mcp: MCP tool bridge failed to start (web_search keeps working): ${String(error)}`)
  }

  // The web-reader fetch provider (selected as the built-in web_fetch backend
  // by this bundle's patch: fetchProvider "zai-reader"). Same session shape
  // as the search provider, over the webReader tool.
  ctx.web.registerFetchProvider(new ZaiReaderFetch({
    endpoint: READER_MCP_URL,
    toolName: READER_TOOL_NAME,
    getApiKey: () => apiKey,
    WebError,
  }))

  // Reader MCP tool bridge: mcp__zai-reader__webReader. Non-fatal like the
  // search bridge; the fetch provider above keeps working either way.
  try {
    await mcpClient.apply(ctx, {
      serverName: READER_SERVER_NAME,
      transport: 'streamable-http',
      url: READER_MCP_URL,
      headers: { Authorization: `Bearer ${apiKey}` },
      failOnStartupError: false,
    })
  } catch (error) {
    ctx.logger.error(`zai-web-search-mcp: reader MCP tool bridge failed to start (web_fetch keeps working): ${String(error)}`)
  }

  // Vision MCP tool bridge: mcp__zai-vision__<name>. A stdio child through
  // npx, so it needs Node >= 22 and npx on the host PATH; a cold npx cache
  // can exceed the SDK's negotiation timeout, in which case the bridge fails
  // non-fatal and reconnects (prewarm once: Z_AI_API_KEY=... npx -y
  // @z_ai/mcp-server@latest). The child snapshots the key at spawn time, so
  // a rotated key reaches it after the plugin reloads.
  try {
    await mcpClient.apply(ctx, {
      serverName: VISION_SERVER_NAME,
      transport: 'stdio',
      command: 'npx',
      args: ['-y', VISION_NPX_PACKAGE],
      env: { Z_AI_API_KEY: apiKey, Z_AI_MODE: 'ZAI' },
      failOnStartupError: false,
    })
  } catch (error) {
    ctx.logger.error(`zai-web-search-mcp: vision MCP bridge failed to start (search, reader and quota keep working): ${String(error)}`)
  }

  // Zread MCP tool bridge: mcp__zai-zread__search_doc / read_file /
  // get_repo_structure over public GitHub repositories. Non-fatal like the
  // other bridges; nothing else in the plugin depends on it.
  try {
    await mcpClient.apply(ctx, {
      serverName: ZREAD_SERVER_NAME,
      transport: 'streamable-http',
      url: ZREAD_MCP_URL,
      headers: { Authorization: `Bearer ${apiKey}` },
      failOnStartupError: false,
    })
  } catch (error) {
    ctx.logger.error(`zai-web-search-mcp: zread MCP bridge failed to start (everything else keeps working): ${String(error)}`)
  }
}

/**
 * Poll the Z.ai monitoring API for the real Coding Plan quota — the credit
 * windows plus the monthly MCP tool usage — and serve it to the Web client on
 * one same-origin route. The key never reaches the browser: only the parsed
 * snapshot leaves the Host. The snapshot also reports whether the Harness's
 * default model provider is "zai", so the client can show the chip only when
 * the subscription is the active provider.
 * @param ctx - plugin context providing webServer and effect scoping.
 * @param getApiKey - current ZAI_API_KEY value (refreshes with the credential).
 * @returns invalidation callback clearing the cache after a key change.
 */
function startQuotaService(ctx, getApiKey) {
  let cached = null
  let fetchedAt = 0
  let inflight = null

  /** `yyyy-MM-dd HH:mm:ss` in local time, the format the monitoring API wants. */
  function apiTimestamp(date) {
    const pad = (value) => String(value).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  }

  async function fetchCreditWindows() {
    const response = await fetch(QUOTA_URL, {
      headers: { authorization: `Bearer ${getApiKey()}`, accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) throw new Error(`Z.ai quota API returned HTTP ${response.status}`)
    const payload = await response.json()
    const limits = payload?.data?.limits
    if (payload?.success !== true || !Array.isArray(limits)) {
      throw new Error('Z.ai quota API returned an unexpected payload')
    }
    // Window kinds per the monitoring API: unit 3 counts hours (number 5 ->
    // the 5-hour credit window), unit 6 counts weeks (number 1 -> weekly).
    const windows = limits.map((limit) => ({
      kind: limit.unit === 3 && limit.number === 5 ? 'fiveHour' : limit.unit === 6 ? 'weekly' : `u${limit.unit}n${limit.number}`,
      used: limit.currentValue,
      limit: limit.usage,
      remaining: limit.remaining,
      percent: limit.percentage,
      nextResetAt: limit.nextResetTime,
    }))
    return { level: payload.data.level ?? null, windows }
  }

  async function fetchMonthlyToolUsage() {
    const end = new Date()
    const start = new Date(end.getTime() - 30 * 24 * 3600 * 1000)
    const url = `${QUOTA_TOOL_URL}?startTime=${encodeURIComponent(apiTimestamp(start))}&endTime=${encodeURIComponent(apiTimestamp(end))}`
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${getApiKey()}`, accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) throw new Error(`Z.ai tool usage API returned HTTP ${response.status}`)
    const payload = await response.json()
    const total = payload?.data?.totalUsage?.totalSearchMcpCount
    if (payload?.success !== true || typeof total !== 'number') {
      throw new Error('Z.ai tool usage API returned an unexpected payload')
    }
    return { calls: total, since: start.getTime(), until: end.getTime() }
  }

  async function fetchQuota() {
    const [creditResult, toolResult] = await Promise.allSettled([fetchCreditWindows(), fetchMonthlyToolUsage()])
    if (creditResult.status !== 'fulfilled') throw creditResult.reason
    const mcp = toolResult.status === 'fulfilled' ? toolResult.value : null
    return {
      ok: true,
      level: creditResult.value.level,
      windows: creditResult.value.windows,
      mcp,
      fetchedAt: Date.now(),
    }
  }

  async function snapshot() {
    if (cached !== null && Date.now() - fetchedAt < QUOTA_TTL_MS) return withProviderFlag(cached)
    inflight ??= fetchQuota().then(
      (value) => {
        cached = value
        fetchedAt = Date.now()
        return withProviderFlag(value)
      },
      (error) => {
        const message = String(error instanceof Error ? error.message : error)
        if (cached !== null) return withProviderFlag({ ...cached, stale: true, error: message })
        return { ok: false, error: message, fetchedAt: Date.now() }
      },
    ).finally(() => { inflight = null })
    return inflight
  }

  /** Whether the Harness's default model provider is the Z.ai subscription. */
  function withProviderFlag(snapshotValue) {
    let provider = null
    let graphDebug
    try {
      const selection = ctx.get('agentDefaultModel')?.currentSelection?.()
      provider = typeof selection?.provider === 'string' && selection.provider.length > 0 ? selection.provider : null
    } catch { /* the default-model service is optional */ }
    try {
      const graph = ctx.get('clientModules')?.graph?.()
      graphDebug = {
        hasService: graph !== undefined,
        entryCount: graph?.entries?.length ?? null,
        includesThisPackage: graph?.entries?.some((entry) => entry.id === '@local/zai-web-search-mcp' || entry.id === 'dsh-zai-web-search-mcp') === true,
      }
    } catch (error) {
      graphDebug = { error: String(error instanceof Error ? error.message : error) }
    }
    return { ...snapshotValue, defaultProvider: provider, zaiActive: provider === 'zai', graphDebug }
  }

  const diag = []
  const disposeDiagRoute = ctx.webServer.register({
    kind: 'exact',
    path: DIAG_ROUTE_PATH,
    async handler(request, response) {
      if (request.method === 'POST') {
        let raw = ''
        request.on('data', (chunk) => { raw += chunk; if (raw.length > 4096) request.destroy() })
        request.on('end', () => {
          try {
            const parsed = JSON.parse(raw)
            diag.push({ at: new Date().toISOString(), ...(typeof parsed === 'object' && parsed !== null ? parsed : { message: String(parsed) }) })
            if (diag.length > 60) diag.splice(0, diag.length - 60)
          } catch { /* ignore malformed diagnostics */ }
          response.writeHead(204)
          response.end()
        })
        return
      }
      const body = JSON.stringify({ diag, note: 'client lifecycle diagnostics; empty means the client module never ran' })
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
      response.end(body)
    },
  })

  const disposeRoute = ctx.webServer.register({
    kind: 'exact',
    path: QUOTA_ROUTE_PATH,
    async handler(_request, response) {
      const body = JSON.stringify(await snapshot())
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
      response.end(body)
    },
  })

  const timer = setInterval(() => { void snapshot() }, QUOTA_BACKGROUND_MS)
  timer.unref?.()
  ctx.effect(() => () => {
    clearInterval(timer)
    disposeRoute()
    disposeDiagRoute()
  }, 'zai-quota')

  return () => {
    cached = null
    fetchedAt = 0
  }
}

/** A search provider over the Z.ai streamable-HTTP MCP endpoint. */
class ZaiMcpSearch {
  constructor({ endpoint, toolName, getApiKey, WebError }) {
    this.endpoint = endpoint
    this.toolName = toolName
    this.getApiKey = getApiKey
    this.WebError = WebError
    this.sessionId = undefined
    this.lastRpcId = 0
  }

  id = PROVIDER_ID

  available() {
    return this.getApiKey().length > 0
  }

  async search(request, signal) {
    // One automatic retry for transient endpoint failures (a 5xx from the
    // monitoring MCP happens server-side and clears on a second attempt).
    for (let attempt = 0; ; attempt++) {
      try {
        const items = await this.withLiveSession(signal, async () => await this.callTool(request.query, signal))
        return this.mapSources(items)
      } catch (error) {
        if (error instanceof this.WebError) throw error
        if (isAbortLike(error, signal)) {
          throw new this.WebError('Z.ai search aborted', 'WEB_ABORTED', { cause: signal?.aborted === true ? signal.reason : error })
        }
        const authRejected = error instanceof McpHttpError && (error.status === 401 || error.status === 403)
        if (attempt === 0 && !authRejected) {
          await new Promise((resolve, reject) => {
            const timer = setTimeout(resolve, 800)
            signal?.addEventListener('abort', () => { clearTimeout(timer); reject(searchAbortedLike(this.WebError, signal)) }, { once: true })
          }).catch(() => { })
          continue
        }
        throw new this.WebError(describeFailure(error, this.endpoint), 'WEB_PROVIDER_ERROR', { cause: error })
      }
    }
  }

  /** Run one operation against a live MCP session, re-initializing once when the server dropped it. */
  async withLiveSession(signal, operation) {
    for (let attempt = 0; ; attempt++) {
      if (this.sessionId === undefined) await this.initialize(signal)
      try {
        return await operation()
      } catch (error) {
        if (attempt === 0 && error instanceof McpSessionLost) {
          this.sessionId = undefined
          continue
        }
        throw error
      }
    }
  }

  async initialize(signal) {
    await this.post({
      body: {
        jsonrpc: '2.0',
        id: this.nextRpcId(),
        method: 'initialize',
        params: { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: CLIENT_INFO },
      },
      signal,
    })
    await this.post({
      body: { jsonrpc: '2.0', method: 'notifications/initialized' },
      signal,
    })
  }

  async callTool(query, signal) {
    const message = await this.post({
      body: {
        jsonrpc: '2.0',
        id: this.nextRpcId(),
        method: 'tools/call',
        params: { name: this.toolName, arguments: { search_query: query } },
      },
      signal,
    })
    if (message.error !== undefined) {
      if (/-32\d\d\d|session/i.test(String(message.error.message ?? message.error.code))) throw new McpSessionLost(message.error.message)
      throw new McpEndpointError(`MCP tools/call failed: ${JSON.stringify(message.error)}`)
    }
    const result = message.result
    const block = (result?.content ?? []).find((b) => b.type === 'text' && typeof b.text === 'string')
    if (result?.isError === true || block === undefined) {
      const detail = block !== undefined ? `: ${block.text.slice(0, 300)}` : ''
      throw new McpEndpointError(`Z.ai search tool returned an error result${detail}`)
    }
    return parseTextPayload(block.text)
  }

  /** One MCP POST: JSON or SSE body, session header capture, typed transport errors. */
  async post({ body, signal }) {
    const headers = {
      authorization: `Bearer ${this.getApiKey()}`,
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    }
    if (this.sessionId !== undefined) headers['mcp-session-id'] = this.sessionId
    let response
    try {
      response = await fetch(this.endpoint, {
        method: 'POST',
        redirect: 'error',
        headers,
        body: JSON.stringify(body),
        ...(signal !== undefined ? { signal } : {}),
      })
    } catch (error) {
      throw new McpTransportError(error)
    }
    const session = response.headers.get('mcp-session-id')
    if (session !== null && session.length > 0) this.sessionId = session
    if (!response.ok) {
      let detail = ''
      try {
        detail = (await response.text()).replace(/\s+/g, ' ').slice(0, 200)
      } catch { /* an unreadable error body adds nothing */ }
      if (SESSION_LOST_HTTP.has(response.status)) throw new McpSessionLost(`HTTP ${response.status}${detail ? `: ${detail}` : ''}`)
      throw new McpHttpError(response.status, `Z.ai MCP endpoint returned HTTP ${response.status}${detail ? `: ${detail}` : ''}`)
    }
    const text = await response.text()
    return parseJsonRpcMessage(text)
  }

  /** Map the server's {title, link, content, refer} items onto the seam's sources. */
  mapSources(items) {
    const seen = new Set()
    const sources = []
    for (const item of Array.isArray(items) ? items : []) {
      const url = typeof item?.link === 'string' ? item.link : undefined
      if (url === undefined || url.length === 0 || seen.has(url)) continue
      seen.add(url)
      sources.push({
        url,
        ...(typeof item.title === 'string' && item.title.length > 0 ? { title: item.title } : {}),
        ...(typeof item.content === 'string' && item.content.length > 0 ? { snippet: item.content } : {}),
      })
    }
    return { sources, truncated: false }
  }

  nextRpcId() {
    this.lastRpcId += 1
    return this.lastRpcId
  }
}

/**
 * A fetch provider over the Z.ai web-reader MCP endpoint: calls the
 * webReader tool and maps its {title, url, content, ...} payload onto the
 * seam's WebFetchResult as a text body (the tool's markdown content). When
 * the patch selects it (fetchProvider "zai-reader"), the built-in web_fetch
 * tool reads through Z.ai server-side — anti-scraping bypass and structured
 * extraction — instead of the anonymous local HTTP provider.
 */
class ZaiReaderFetch {
  constructor({ endpoint, toolName, getApiKey, WebError }) {
    this.endpoint = endpoint
    this.toolName = toolName
    this.getApiKey = getApiKey
    this.WebError = WebError
    this.sessionId = undefined
    this.lastRpcId = 0
  }

  id = READER_PROVIDER_ID

  available() {
    return this.getApiKey().length > 0
  }

  async fetch(request, signal) {
    try {
      return await this.withLiveSession(signal, async () => await this.callTool(request.url, signal))
    } catch (error) {
      if (error instanceof this.WebError) throw error
      if (isAbortLike(error, signal)) {
        throw new this.WebError('Z.ai reader aborted', 'WEB_ABORTED', { cause: signal?.aborted === true ? signal.reason : error })
      }
      throw new this.WebError(describeReaderFailure(error, this.endpoint), 'WEB_PROVIDER_ERROR', { cause: error })
    }
  }

  /** Run one operation against a live MCP session, re-initializing once when the server dropped it. */
  async withLiveSession(signal, operation) {
    for (let attempt = 0; ; attempt++) {
      if (this.sessionId === undefined) await this.initialize(signal)
      try {
        return await operation()
      } catch (error) {
        if (attempt === 0 && error instanceof McpSessionLost) {
          this.sessionId = undefined
          continue
        }
        throw error
      }
    }
  }

  async initialize(signal) {
    await this.post({
      body: {
        jsonrpc: '2.0',
        id: this.nextRpcId(),
        method: 'initialize',
        params: { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: CLIENT_INFO },
      },
      signal,
    })
    await this.post({
      body: { jsonrpc: '2.0', method: 'notifications/initialized' },
      signal,
    })
  }

  async callTool(url, signal) {
    const message = await this.post({
      body: {
        jsonrpc: '2.0',
        id: this.nextRpcId(),
        method: 'tools/call',
        params: { name: this.toolName, arguments: { url } },
      },
      signal,
    })
    if (message.error !== undefined) {
      if (/-32\d\d\d|session/i.test(String(message.error.message ?? message.error.code))) throw new McpSessionLost(message.error.message)
      throw new McpEndpointError(`MCP tools/call failed: ${JSON.stringify(message.error)}`)
    }
    const result = message.result
    const block = (result?.content ?? []).find((b) => b.type === 'text' && typeof b.text === 'string')
    if (result?.isError === true || block === undefined) {
      const detail = block !== undefined ? `: ${block.text.slice(0, 300)}` : ''
      throw new McpEndpointError(`Z.ai reader tool returned an error result${detail}`)
    }
    const payload = parseJsonObjectPayload(block.text)
    const content = typeof payload?.content === 'string' ? payload.content : ''
    if (content.length === 0) throw new McpEndpointError('Z.ai reader tool returned no page content')
    const truncated = content.length > READER_MAX_CHARS
    return {
      url: typeof payload?.url === 'string' && payload.url.length > 0 ? payload.url : url,
      statusCode: 200,
      body: { kind: 'text', content: truncated ? content.slice(0, READER_MAX_CHARS) : content },
      truncated,
    }
  }

  /** One MCP POST: JSON or SSE body, session header capture, typed transport errors. */
  async post({ body, signal }) {
    const headers = {
      authorization: `Bearer ${this.getApiKey()}`,
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    }
    if (this.sessionId !== undefined) headers['mcp-session-id'] = this.sessionId
    let response
    try {
      response = await fetch(this.endpoint, {
        method: 'POST',
        redirect: 'error',
        headers,
        body: JSON.stringify(body),
        ...(signal !== undefined ? { signal } : {}),
      })
    } catch (error) {
      throw new McpTransportError(error)
    }
    const session = response.headers.get('mcp-session-id')
    if (session !== null && session.length > 0) this.sessionId = session
    if (!response.ok) {
      let detail = ''
      try {
        detail = (await response.text()).replace(/\s+/g, ' ').slice(0, 200)
      } catch { /* an unreadable error body adds nothing */ }
      if (SESSION_LOST_HTTP.has(response.status)) throw new McpSessionLost(`HTTP ${response.status}${detail ? `: ${detail}` : ''}`)
      throw new McpHttpError(response.status, `Z.ai MCP endpoint returned HTTP ${response.status}${detail ? `: ${detail}` : ''}`)
    }
    const text = await response.text()
    return parseJsonRpcMessage(text)
  }

  nextRpcId() {
    this.lastRpcId += 1
    return this.lastRpcId
  }
}

/** The tool's text payload is JSON, sometimes double-encoded; normalize to an array. */
function parseTextPayload(text) {
  let value = JSON.parse(text)
  if (typeof value === 'string') value = JSON.parse(value)
  if (!Array.isArray(value)) throw new McpEndpointError('Z.ai search tool returned an unexpected payload shape')
  return value
}

/** A tool's text payload that is one JSON object, sometimes double-encoded. */
function parseJsonObjectPayload(text) {
  let value = JSON.parse(text)
  if (typeof value === 'string') value = JSON.parse(value)
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new McpEndpointError('Z.ai reader tool returned an unexpected payload shape')
  }
  return value
}

/** Parse one JSON-RPC message from a JSON or text/event-stream response body. */
function parseJsonRpcMessage(text) {
  if (text.trim().length === 0) return { jsonrpc: '2.0', result: {} }
  const chunks = [...text.matchAll(/^data:\s*(.*)$/gm)].map((match) => match[1])
  const candidates = chunks.length > 0 ? chunks : [text]
  let message
  for (const chunk of candidates) {
    try {
      const parsed = JSON.parse(chunk)
      if (parsed !== null && typeof parsed === 'object') message = parsed
    } catch { /* keep the last parseable data chunk */
    }
  }
  if (message === undefined) throw new McpEndpointError('Z.ai MCP endpoint returned an unparseable body')
  return message
}

/** A streamable-HTTP session the server no longer knows; retried once. */
class McpSessionLost extends Error {}

/** Any other MCP transport or protocol failure. */
class McpEndpointError extends Error {
  constructor(message, cause) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'McpEndpointError'
  }
}

class McpHttpError extends McpEndpointError {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

class McpTransportError extends Error {
  constructor(cause) {
    super(String(cause), { cause })
    this.name = 'McpTransportError'
  }
}

/** Id this plugin's fetch provider registers under on ctx.web. */
export const READER_PROVIDER_ID = 'zai-reader'

/** Render one reader failure with recovery guidance for the model and user. */
function describeReaderFailure(error, endpoint) {
  if (error instanceof McpHttpError && (error.status === 401 || error.status === 403)) {
    return `Z.ai rejected the ${API_KEY_REF} credential (HTTP ${error.status}); guide the user to check the stored key, then retry`
  }
  const detail = error instanceof Error ? error.message : String(error)
  return `Z.ai web reader failed: ${detail}\n\nThe read used the MCP endpoint ${JSON.stringify(endpoint)} with the ${API_KEY_REF} Harness credential; the built-in anonymous "http" fetch provider stays registered and can be re-selected with fetchProvider "http" in this bundle's patch.`
}

/** Render one provider failure with recovery guidance for the model and user. */
function describeFailure(error, endpoint) {
  if (error instanceof McpHttpError && (error.status === 401 || error.status === 403)) {
    return `Z.ai rejected the ${API_KEY_REF} credential (HTTP ${error.status}); guide the user to check the stored key, then retry`
  }
  const detail = error instanceof Error ? error.message : String(error)
  return `Z.ai web search failed: ${detail}\n\nThe search used the MCP endpoint ${JSON.stringify(endpoint)} with the ${API_KEY_REF} Harness credential.`
}

/** True when the error chain is a fetch/AbortSignal abort of this search. */
function isAbortLike(error, signal) {
  if (signal?.aborted === true) return true
  for (let candidate = error; candidate !== undefined && candidate !== null; candidate = candidate.cause) {
    if (candidate instanceof DOMException && candidate.name === 'AbortError') return true
  }
  return false
}

/** The seam's cancellation error for the retry path's abort race. */
function searchAbortedLike(WebError, signal) {
  return new WebError('Z.ai search aborted', 'WEB_ABORTED', { cause: signal?.aborted === true ? signal.reason : undefined })
}
