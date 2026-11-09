// Client half of @local/zai-web-search-mcp.
//
// Renders a compact Z.ai quota chip in the composer stats row (the
// conversation.composer.dock seat, right after the built-in activity/usage
// pills) that opens a zcode-style "Usage remaining" popover on hover: the
// 5-hour and weekly credit windows with colored progress bars and reset
// times, plus the monthly MCP tool call count. Data comes from the Host's
// /zai-quota route, which reads the real monitoring API with the stored
// ZAI_API_KEY; the key itself never reaches the browser.
//
// Mount contract notes (verified against this build's slot renderer):
// - Entries render through a per-entry SlotErrorBoundary that silently
//   abdicates a component whose render throws. The earlier version called
//   setOpen(false) unconditionally during render (a render-phase state
//   update loop) — the component threw "Too many re-renders" before any
//   effect ran, so the chip vanished with zero quota-fetch diagnostics.
//   Visibility is now purely derived; no setState during render.
// - Registration mirrors the built-in stat pills exactly: a generator
//   injection effect (yield per registration) plus the locale namespace;
//   `inject` is optional (undefined normalizes to empty props).
window.__ModuleLoader__.load({
  id: '@local/zai-web-search-mcp',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'zai-quota'
    const POLL_MS = 60_000
    const TICK_MS = 30_000

    /** Self-contained dictionaries: rendering never depends on the host
     * locale service resolving our namespace (ctx.locale.bind once returned
     * raw keys on a live page); the app language only picks the dict. */
    const DICTS = {
      en: {
        label: 'GLM Coding Plan quota remaining (Z.ai)',
        title: 'Quota remaining',
        fiveHour: '5-hour remaining',
        weekly: 'Weekly remaining',
        mcpMonth: 'Z.ai MCP',
        lastRefreshed: 'Last refreshed',
        calls: 'calls',
        mcpNote: 'MCP tool calls in the last 30 days',
        stale: 'data is stale — Z.ai is unreachable',
      },
      ru: {
        label: 'Остаток квоты GLM Coding Plan (Z.ai)',
        title: 'Остаток квоты',
        fiveHour: 'Остаток: 5 часов',
        weekly: 'Остаток: неделя',
        mcpMonth: 'Z.ai MCP',
        lastRefreshed: 'Обновлено',
        calls: 'вызовов',
        mcpNote: 'вызовы MCP-инструментов за 30 дней',
        stale: 'данные устарели — нет связи с Z.ai',
      },
      zh: {
        label: 'GLM Coding Plan 剩余额度 (Z.ai)',
        title: '剩余额度',
        fiveHour: '5 小时剩余',
        weekly: '每周剩余',
        mcpMonth: 'Z.ai MCP',
        lastRefreshed: '上次刷新',
        calls: '次调用',
        mcpNote: '过去 30 天的 MCP 工具调用次数',
        stale: '数据已过期 — 无法连接 Z.ai',
      },
    }
    let appLocale = 'en'
    let localeMissBeaconed = false
    /** Adopt any locale shape: 'ru', 'ru-RU', {active}, {active:{id}};
     * unknown codes fall back to English and report once to the diag route. */
    function pickLocale(value) {
      if (typeof value !== 'string' && value?.active !== undefined) value = typeof value.active === 'string' ? value.active : value.active?.id
      if (typeof value !== 'string' || value.length === 0) return
      const short = value.split('-')[0]
      if (DICTS[short] !== undefined) {
        appLocale = short
        return
      }
      if (!localeMissBeaconed) {
        localeMissBeaconed = true
        diag('locale-lookup-miss', value)
      }
    }
    let t = (key) => DICTS[appLocale][key] ?? DICTS.en[key] ?? key
    let renderBeaconed = false

    /** Lifecycle diagnostics: report milestones and failures to the Host route. */
    function diag(event, detail) {
      try {
        fetch('/zai-quota-diag', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ event, detail: detail === undefined ? null : String(detail) }),
        }).catch(() => {})
      } catch { /* diagnostics must never break the chip */ }
    }
    diag('module-script-executed')

    function fmtCredits(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
      if (value >= 10_000) return `${Math.round(value / 1000)}k`
      if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
      return String(Math.round(value))
    }

    /** "22:37" when the reset is today, otherwise "Nov 12"; follows the app
     * locale (the empty-locale [] form would silently use the OS locale and
     * leak Russian dates into the English/Chinese UI). */
    function fmtResetAt(at) {
      if (!(at > 0)) return '—'
      const date = new Date(at)
      const now = new Date()
      const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
      const locale = appLocale !== undefined && typeof appLocale === 'string' && appLocale.length > 0 ? [appLocale] : undefined
      return sameDay
        ? date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
    }

    /** zcode format: "Nov 9, 17:55" — short date, comma, 24h clock, app locale. */
    function fmtResetAt(at) {
      if (!(at > 0)) return '—'
      const date = new Date(at)
      const locale = appLocale !== undefined && typeof appLocale === 'string' && appLocale.length > 0 ? [appLocale] : undefined
      const day = date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
      const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })
      return `${day}, ${time}`
    }

    /** "11/9/26, 7:30 PM"-style freshness stamp for the popover footer. */
    function fmtRefreshed(at) {
      if (!(at > 0)) return '—'
      const locale = appLocale !== undefined && typeof appLocale === 'string' && appLocale.length > 0 ? [appLocale] : undefined
      return new Date(at).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })
    }

    /** zcode semantics: every shown percent is the REMAINING share. */
    function remainingPercent(w) {
      if (typeof w?.limit !== 'number' || w.limit <= 0) return null
      const remaining = typeof w.remaining === 'number' ? w.remaining : Math.max(0, w.limit - (w.used ?? 0))
      return Math.max(0, Math.min(100, Math.round((remaining / w.limit) * 100)))
    }

    /** Tone keys off the remaining share: little left = warning colors. */
    function toneOf(percent) {
      if (typeof percent !== 'number') return ''
      if (percent <= 10) return 'zaiq-critical'
      if (percent <= 40) return 'zaiq-warn'
      return ''
    }

    /** Provider skin from the host adapter: accent colors fall back to the
     * theme tokens when the adapter omits them. */
    function accentOf(skin, name, fallback) {
      const value = skin?.accent?.[name]
      return typeof value === 'string' && value.length > 0 ? value : fallback
    }

    /** The small context-ring-style trigger: a circular arc of the 5-hour window. */
    function Ring({ percent, tone, skin }) {
      const radius = 6
      const circumference = 2 * Math.PI * radius
      const clamped = Math.max(0, Math.min(100, percent ?? 0))
      const stroke = tone === 'zaiq-warn' ? 'var(--dsw-alias-state-warn-primary)'
        : tone === 'zaiq-critical' ? 'var(--dsw-alias-state-error-primary)'
          : accentOf(skin, 'ring', 'var(--dsw-alias-state-success-primary)')
      return h('svg', {
        className: `zaiq-ring ${tone}`.trim(),
        viewBox: '0 0 16 16',
        width: 14,
        height: 14,
        'aria-hidden': true,
      },
      h('circle', { cx: 8, cy: 8, r: radius, fill: 'none', className: 'zaiq-ring-track', strokeWidth: 2.5 }),
      h('circle', {
        cx: 8, cy: 8, r: radius, fill: 'none', className: 'zaiq-ring-arc', strokeWidth: 2.5,
        strokeLinecap: 'round',
        stroke,
        strokeDasharray: `${(circumference * clamped) / 100} ${circumference}`,
        transform: 'rotate(-90 8 8)',
      }))
    }

    /** One quota column in the popover: label, bold "99% Nov 9, 17:55", colored bar of the remaining share. */
    function WindowColumn({ label, percent, resetAt, skin, accentKey }) {
      const tone = toneOf(percent)
      const fill = tone === 'zaiq-warn' ? 'var(--dsw-alias-state-warn-primary)'
        : tone === 'zaiq-critical' ? 'var(--dsw-alias-state-error-primary)'
          : accentOf(skin, accentKey, 'var(--dsw-alias-brand-primary)')
      return h('div', { className: 'zaiq-col' },
        h('div', { className: 'zaiq-col-label' }, label),
        h('div', { className: 'zaiq-col-value' },
          h('span', { className: `zaiq-col-percent ${tone}`.trim() }, `${percent ?? 0}% `),
          h('span', { className: 'zaiq-col-reset' }, fmtResetAt(resetAt)),
        ),
        h('div', { className: 'zaiq-bar' },
          h('div', { style: { width: `${Math.max(2, Math.min(100, percent ?? 0))}%`, background: fill, height: '100%', borderRadius: '9999px' } })),
      )
    }

    function QuotaChip(props) {
      const [data, setData] = React.useState(null)
      const [open, setOpen] = React.useState(false)
      const [, forceTick] = React.useReducer((x) => x + 1, 0)
      const wrapRef = React.useRef(null)

      if (!renderBeaconed) {
        renderBeaconed = true
        diag('component-first-render')
        try {
          diag('chip-props', Object.keys(props ?? {}).join(',') || 'none')
          const sample = {}
          for (const key of Object.keys(props ?? {}).slice(0, 12)) {
            const value = props[key]
            sample[key] = typeof value === 'function' ? 'fn' : value === null || value === undefined ? String(value) : Array.isArray(value) ? `arr(${value.length})` : typeof value === 'object' ? `obj(${Object.keys(value).slice(0, 6).join('|')})` : String(value).slice(0, 40)
          }
          diag('chip-props-sample', JSON.stringify(sample))
        } catch (error) { diag('chip-props-failed', error) }
      }

      React.useEffect(() => {
        let alive = true
        const sessionId = typeof props?.sessionId === 'string' && props.sessionId.length > 0 ? props.sessionId : null
        const load = () => fetch(`/zai-quota${sessionId ? `?session=${encodeURIComponent(sessionId)}` : ''}`)
          .then((response) => {
            diag('quota-fetch-status', response.status)
            return response.ok ? response.json() : null
          })
          .then((snapshot) => {
            if (alive && snapshot !== null) {
              diag('quota-data', `ok=${snapshot.ok} provider=${snapshot.provider ?? '?'} supported=${snapshot.supported} windows=${snapshot.windows?.length}`)
              setData(snapshot)
            }
          })
          .catch((error) => diag('quota-fetch-error', error))
        load()
        const poll = setInterval(load, POLL_MS)
        const tick = setInterval(forceTick, TICK_MS)
        const onVisible = () => { if (document.visibilityState === 'visible') load() }
        document.addEventListener('visibilitychange', onVisible)
        return () => {
          alive = false
          clearInterval(poll)
          clearInterval(tick)
          document.removeEventListener('visibilitychange', onVisible)
        }
      }, [])

      // Purely derived visibility: no setState during render. The chip shows
      // only while the active default-model provider has a quota adapter
      // (host answers supported:false otherwise — e.g. a non-GLM model).
      const usable = data !== null && data.ok === true && data.supported !== false
      const fiveHour = usable ? data.windows.find((w) => w.kind === 'fiveHour') : undefined
      if (!usable || fiveHour === undefined) return null
      const weekly = usable ? data.windows.find((w) => w.kind === 'weekly') : undefined
      const mcp = data.mcp ?? null
      const skin = usable && data.skin ? data.skin : null
      const badgeTitle = typeof skin?.title === 'string' && skin.title.length > 0
        ? skin.title
        : (typeof data.level === 'string' && data.level ? data.level.toUpperCase() : '')
      const mcpColor = accentOf(skin, 'mcp', 'var(--dsw-alias-state-warn-primary)')
      const percent = remainingPercent(fiveHour) ?? 0
      const tone = toneOf(percent)
      const popoverOpen = open
      // Edge-flip (issue #2): anchor the popover to the left when the wrapper
      // sits too close to the viewport's left edge for a right-anchored panel.
      let flipLeft = false
      if (popoverOpen && wrapRef.current !== null && typeof wrapRef.current.getBoundingClientRect === 'function') {
        const rect = wrapRef.current.getBoundingClientRect()
        flipLeft = rect.left < 440
      }

      return h(React.Fragment, null,
        h(QuotaChipStyle),
        h('div', {
          className: 'zaiq-wrap',
          ref: wrapRef,
          onMouseEnter: () => setOpen(true),
          onMouseLeave: () => setOpen(false),
        },
        popoverOpen ? h('div', { className: `zaiq-pop${flipLeft ? ' zaiq-pop-left' : ''}`, role: 'dialog', 'aria-label': t('label') },
          h('div', { className: 'zaiq-pop-head' },
            h('span', { className: 'zaiq-pop-title' }, t('title')),
            h('span', { className: 'zaiq-pop-level' }, badgeTitle),
          ),
          h('div', { className: 'zaiq-pop-grid' },
            h(WindowColumn, { label: t('fiveHour'), percent: remainingPercent(fiveHour), resetAt: fiveHour.nextResetAt, skin, accentKey: 'fiveHour' }),
            weekly !== undefined
              ? h(WindowColumn, { label: t('weekly'), percent: remainingPercent(weekly), resetAt: weekly.nextResetAt, skin, accentKey: 'weekly' })
              : null,
            h('div', { className: 'zaiq-col' },
              h('div', { className: 'zaiq-col-label' }, t('mcpMonth')),
              h('div', { className: 'zaiq-col-value' },
                h('span', { className: 'zaiq-col-percent', style: { color: mcpColor } }, mcp !== null ? String(mcp.calls) : '—'),
                mcp !== null ? h('span', { className: 'zaiq-col-reset' }, ` ${t('calls')}`) : null,
              ),
              h('div', { className: 'zaiq-mcp-note' }, t('mcpNote')),
            ),
          ),
          h('div', { className: 'zaiq-pop-foot' },
            h('span', null, `${t('lastRefreshed')}: ${fmtRefreshed(data.fetchedAt)}`),
            data.stale === true ? h('span', { className: 'zaiq-pop-stale' }, t('stale')) : null,
          ),
        ) : null,
        h('button', {
          type: 'button',
          className: `zaiq-trigger ${tone}`.trim(),
          onClick: () => setOpen((value) => !value),
          'aria-label': t('label'),
          'aria-expanded': popoverOpen,
          title: t('label'),
        },
        h(Ring, { percent, tone, skin }),
        h('span', { className: 'zaiq-trigger-text' }, `${percent}%`),
        )),
      )
    }

    function QuotaChipStyle() {
      return h('style', null, `
.zaiq-wrap{position:relative;display:inline-flex;justify-content:flex-end}
.zaiq-trigger{display:inline-flex;align-items:center;gap:5px;padding:1px 6px;border:none;background:transparent;border-radius:8px;color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:20px;cursor:default;font-family:inherit}
.zaiq-trigger:hover{background:var(--dsw-alias-bg-layer-2)}
.zaiq-trigger-text{font-variant-numeric:tabular-nums}
.zaiq-ring-track{stroke:var(--dsw-alias-border-l2)}
.zaiq-ring-arc{stroke:var(--dsw-alias-state-success-primary)}
.zaiq-ring.zaiq-warn .zaiq-ring-arc{stroke:var(--dsw-alias-state-warn-primary)}
.zaiq-ring.zaiq-critical .zaiq-ring-arc{stroke:var(--dsw-alias-state-error-primary)}
.zaiq-trigger.zaiq-warn .zaiq-trigger-text{color:var(--dsw-alias-state-warn-primary)}
.zaiq-trigger.zaiq-critical .zaiq-trigger-text{color:var(--dsw-alias-state-error-primary)}
.zaiq-pop{position:absolute;bottom:calc(100% + 10px);right:0;z-index:60;width:max-content;min-width:280px;max-width:min(420px,calc(100vw - 32px));padding:14px 16px;border-radius:12px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-overlay);box-shadow:0 8px 28px rgba(15,23,42,.16);color:var(--dsw-alias-label-primary);text-align:left}
.zaiq-pop.zaiq-pop-left{left:0;right:auto}
.zaiq-pop-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.zaiq-pop-title{font-size:14px;font-weight:600}
.zaiq-pop-level{font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;padding:2px 8px;border-radius:9999px;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}
.zaiq-pop-grid{display:flex;gap:20px}
.zaiq-col{flex:1;min-width:0}
.zaiq-col-label{font-size:12px;color:var(--dsw-alias-label-secondary);margin-bottom:6px;white-space:normal;overflow-wrap:break-word}
.zaiq-col-value{display:flex;align-items:baseline;gap:4px;margin-bottom:8px;white-space:nowrap}
.zaiq-col-percent{font-size:15px;font-weight:600;font-variant-numeric:tabular-nums}
.zaiq-col-percent.zaiq-warn{color:var(--dsw-alias-state-warn-primary)}
.zaiq-col-percent.zaiq-critical{color:var(--dsw-alias-state-error-primary)}
.zaiq-mcp-count{color:var(--dsw-alias-state-warn-primary)}
.zaiq-col-dot{color:var(--dsw-alias-label-secondary)}
.zaiq-col-reset{font-size:12px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.zaiq-bar{height:6px;border-radius:9999px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.zaiq-mcp-note{font-size:11px;color:var(--dsw-alias-label-secondary);line-height:1.3}
.zaiq-pop-foot{margin-top:12px;display:flex;justify-content:space-between;align-items:baseline;gap:12px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.zaiq-pop-stale{font-size:11px;color:var(--dsw-alias-state-warn-primary)}
`)
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        diag('apply-started')
        try {
          pickLocale(ctx.locale.getLocale())
          ctx.on('locale/change', (snapshot) => { pickLocale(snapshot) })
          for (const [lang, dict] of Object.entries(DICTS)) ctx.locale.register(NS, lang, dict)
          diag(`locale-ready app=${appLocale}`)
        } catch (error) {
          diag('locale-register-failed', error)
        }
        try {
          // Exactly the built-in stat pills' pattern (activity order 0,
          // usage order 1): generator injection effect, locale namespace,
          // explicit empty props provider. Order 2 places the chip right
          // after the usage pill in the same stats row.
          const chipInject = () => ({})
          ctx.slots.inject('conversation.composer.dock', function* () {
            yield ctx.slots.register({
              name: 'conversation.composer.dock',
              id: 'zai-quota',
              order: 2,
              locale: NS,
              inject: chipInject,
            }, QuotaChip)
          })
          diag('slot-registered')
        } catch (error) {
          diag('slot-register-failed', error)
        }
      },
    }
  },
})
