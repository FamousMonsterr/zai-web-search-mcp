// Client half of @local/zai-web-search-mcp.
//
// Renders a compact Z.ai quota indicator in the composer stats row (next to
// the context-used ring) that opens a zcode-style "Usage remaining" popover
// on hover: the 5-hour and weekly credit windows with colored progress bars
// and reset times, plus the monthly MCP tool call count. Data comes from the
// Host's /zai-quota route, which reads the real monitoring API with the
// stored ZAI_API_KEY; the key itself never reaches the browser. The chip
// only shows while the Harness's default model provider is "zai".
window.__ModuleLoader__.load({
  id: '@local/zai-web-search-mcp',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'zai-quota'
    const POLL_MS = 60_000
    const TICK_MS = 30_000

    let t = (key) => key

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

    /** "22:37" when the reset is today, otherwise "12 ноя". */
    function fmtResetAt(at) {
      if (!(at > 0)) return '—'
      const date = new Date(at)
      const now = new Date()
      const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
      return sameDay
        ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString([], { day: 'numeric', month: 'short' })
    }

    function toneOf(percent) {
      if (typeof percent !== 'number') return ''
      if (percent >= 90) return 'zaiq-critical'
      if (percent >= 60) return 'zaiq-warn'
      return ''
    }

    /** The small context-ring-style trigger: a circular arc of the 5-hour window. */
    function Ring({ percent, tone }) {
      const radius = 6
      const circumference = 2 * Math.PI * radius
      const clamped = Math.max(0, Math.min(100, percent ?? 0))
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
        strokeDasharray: `${(circumference * clamped) / 100} ${circumference}`,
        transform: 'rotate(-90 8 8)',
      }))
    }

    /** One quota column in the popover: label, bold value with reset time, colored bar. */
    function WindowColumn({ label, percent, resetAt, barClass }) {
      const tone = toneOf(percent)
      return h('div', { className: 'zaiq-col' },
        h('div', { className: 'zaiq-col-label' }, label),
        h('div', { className: 'zaiq-col-value' },
          h('span', { className: `zaiq-col-percent ${tone}`.trim() }, `${percent ?? 0}%`),
          h('span', { className: 'zaiq-col-dot' }, '·'),
          h('span', { className: 'zaiq-col-reset' }, fmtResetAt(resetAt)),
        ),
        h('div', { className: 'zaiq-bar' },
          h('div', { className: `${barClass} ${tone}`.trim(), style: { width: `${Math.max(2, Math.min(100, percent ?? 0))}%` } })),
      )
    }

    function QuotaChip() {
      const [data, setData] = React.useState(null)
      const [open, setOpen] = React.useState(false)
      const [, forceTick] = React.useReducer((x) => x + 1, 0)

      React.useEffect(() => {
        let alive = true
        const load = () => fetch('/zai-quota')
          .then((response) => {
            diag('quota-fetch-status', response.status)
            return response.ok ? response.json() : null
          })
          .then((snapshot) => {
            if (alive && snapshot !== null) {
              diag('quota-data', `ok=${snapshot.ok} zaiActive=${snapshot.zaiActive} windows=${snapshot.windows?.length}`)
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

      const usable = data !== null && data.ok === true && data.zaiActive !== false
      const fiveHour = usable ? data.windows.find((w) => w.kind === 'fiveHour') : undefined
      if (!usable || fiveHour === undefined) {
        setOpen(false)
        return null
      }
      const weekly = data.windows.find((w) => w.kind === 'weekly')
      const mcp = data.mcp ?? null
      const percent = typeof fiveHour.percent === 'number' ? fiveHour.percent : 0
      const tone = toneOf(percent)

      return h(React.Fragment, null,
        h(QuotaChipStyle),
        h('div', {
          className: 'zaiq-wrap',
          onMouseEnter: () => setOpen(true),
          onMouseLeave: () => setOpen(false),
        },
        open ? h('div', { className: 'zaiq-pop', role: 'dialog', 'aria-label': t('label') },
          h('div', { className: 'zaiq-pop-head' },
            h('span', { className: 'zaiq-pop-title' }, t('plan')),
            h('span', { className: 'zaiq-pop-level' }, typeof data.level === 'string' && data.level ? data.level.toUpperCase() : ''),
          ),
          h('div', { className: 'zaiq-pop-grid' },
            h(WindowColumn, { label: t('fiveHour'), percent: fiveHour.percent, resetAt: fiveHour.nextResetAt, barClass: 'zaiq-bar-fill-blue' }),
            weekly !== undefined
              ? h(WindowColumn, { label: t('weekly'), percent: weekly.percent, resetAt: weekly.nextResetAt, barClass: 'zaiq-bar-fill-green' })
              : null,
            h('div', { className: 'zaiq-col' },
              h('div', { className: 'zaiq-col-label' }, t('mcpMonth')),
              h('div', { className: 'zaiq-col-value' },
                h('span', { className: 'zaiq-col-percent zaiq-mcp-count' }, mcp !== null ? String(mcp.calls) : '—'),
                mcp !== null ? h('span', { className: 'zaiq-col-dot' }, '·') : null,
                mcp !== null ? h('span', { className: 'zaiq-col-reset' }, t('calls')) : null,
              ),
              h('div', { className: 'zaiq-mcp-note' }, t('mcpNote')),
            ),
          ),
          data.stale === true ? h('div', { className: 'zaiq-pop-stale' }, t('stale')) : null,
        ) : null,
        h('button', {
          type: 'button',
          className: `zaiq-trigger ${tone}`.trim(),
          onClick: () => setOpen((value) => !value),
          'aria-label': t('label'),
          'aria-expanded': open,
          title: t('label'),
        },
        h(Ring, { percent, tone }),
        h('span', { className: 'zaiq-trigger-text' }, `${percent}%`),
        )),
      )
    }

    function QuotaChipStyle() {
      return h('style', null, `
.zaiq-wrap{position:relative;display:flex;justify-content:flex-end;width:100%}
.zaiq-trigger{display:inline-flex;align-items:center;gap:5px;padding:1px 6px;border:none;background:transparent;border-radius:8px;color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:20px;cursor:default;font-family:inherit}
.zaiq-trigger:hover{background:var(--dsw-alias-bg-layer-2)}
.zaiq-trigger-text{font-variant-numeric:tabular-nums}
.zaiq-ring-track{stroke:var(--dsw-alias-border-l2)}
.zaiq-ring-arc{stroke:var(--dsw-alias-brand-primary)}
.zaiq-ring.zaiq-warn .zaiq-ring-arc{stroke:var(--dsw-alias-state-warn-primary)}
.zaiq-ring.zaiq-critical .zaiq-ring-arc{stroke:var(--dsw-alias-state-error-primary)}
.zaiq-trigger.zaiq-warn .zaiq-trigger-text{color:var(--dsw-alias-state-warn-primary)}
.zaiq-trigger.zaiq-critical .zaiq-trigger-text{color:var(--dsw-alias-state-error-primary)}
.zaiq-pop{position:absolute;bottom:calc(100% + 10px);right:0;z-index:60;min-width:330px;padding:14px 16px;border-radius:12px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-overlay);box-shadow:0 8px 28px rgba(15,23,42,.16);color:var(--dsw-alias-label-primary);text-align:left}
.zaiq-pop-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.zaiq-pop-title{font-size:14px;font-weight:600}
.zaiq-pop-level{font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;padding:2px 8px;border-radius:9999px;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}
.zaiq-pop-grid{display:flex;gap:20px}
.zaiq-col{flex:1;min-width:0}
.zaiq-col-label{font-size:12px;color:var(--dsw-alias-label-secondary);margin-bottom:6px;white-space:nowrap}
.zaiq-col-value{display:flex;align-items:baseline;gap:4px;margin-bottom:8px;white-space:nowrap}
.zaiq-col-percent{font-size:15px;font-weight:600;font-variant-numeric:tabular-nums}
.zaiq-col-percent.zaiq-warn{color:var(--dsw-alias-state-warn-primary)}
.zaiq-col-percent.zaiq-critical{color:var(--dsw-alias-state-error-primary)}
.zaiq-mcp-count{color:var(--dsw-alias-state-warn-primary)}
.zaiq-col-dot{color:var(--dsw-alias-label-secondary)}
.zaiq-col-reset{font-size:12px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.zaiq-bar{height:6px;border-radius:9999px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.zaiq-bar-fill-blue{height:100%;border-radius:9999px;background:var(--dsw-alias-brand-primary)}
.zaiq-bar-fill-green{height:100%;border-radius:9999px;background:var(--dsw-alias-state-success-primary)}
.zaiq-bar-fill-blue.zaiq-warn,.zaiq-bar-fill-green.zaiq-warn{background:var(--dsw-alias-state-warn-primary)}
.zaiq-bar-fill-blue.zaiq-critical,.zaiq-bar-fill-green.zaiq-critical{background:var(--dsw-alias-state-error-primary)}
.zaiq-mcp-note{font-size:11px;color:var(--dsw-alias-label-secondary);line-height:1.3}
.zaiq-pop-stale{margin-top:10px;font-size:11px;color:var(--dsw-alias-state-warn-primary)}
`)
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        diag('apply-started')
        try {
          ctx.locale.register(NS, 'ru', {
            label: 'Квота GLM Coding Plan (Z.ai)',
            plan: 'GLM Coding Plan',
            fiveHour: '5 часов',
            weekly: 'Неделя',
            mcpMonth: 'MCP · 30 дней',
            calls: 'вызовов',
            mcpNote: 'вызовы MCP-инструментов за 30 дней',
            stale: 'данные устарели — нет связи с Z.ai',
          })
          ctx.locale.register(NS, 'en', {
            label: 'GLM Coding Plan quota (Z.ai)',
            plan: 'GLM Coding Plan',
            fiveHour: '5 hours',
            weekly: 'Weekly',
            mcpMonth: 'MCP · 30 days',
            calls: 'calls',
            mcpNote: 'MCP tool calls in the last 30 days',
            stale: 'data is stale — Z.ai is unreachable',
          })
          t = ctx.locale.bind(NS)
          diag('locale-registered')
        } catch (error) {
          diag('locale-register-failed', error)
        }
        try {
          const entry = {
            id: 'zai-quota',
            order: 100,
            label: () => t('label'),
          }
          // Primary seat: ambient row below the composer card (the stats row).
          ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
            name: 'conversation.composer.dock', ...entry,
          }, QuotaChip))
          // Secondary seat: full-width row above the composer card, the seat
          // ui-goal proves renders with an open Session. Telemetry showed the
          // primary seat registered without mounting on some layouts.
          ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
            name: 'conversation.input.dock', ...entry, id: 'zai-quota-input',
          }, QuotaChip))
          diag('slot-registered')
        } catch (error) {
          diag('slot-register-failed', error)
        }
      },
    }
  },
})
