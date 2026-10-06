import { useEffect, useMemo, useRef, useState } from 'react'
import type { ContributionDay, Contributions } from '../api/types'
import { PROFILE } from '../data/resume'

const CELL = 10
const GAP = 3
const STEP = CELL + GAP
const TOP = 16 // month label row
const LEVELS = ['#18181b', '#0e4429', '#006d32', '#26a641', '#39d353']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
/** 'YYYY-MM-DD' as a local calendar date (no timezone shift). */
const parseYmd = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

/** Fill gaps so the calendar always spans a full year ending today (or the last provided day). */
function normalize(days: ContributionDay[] | undefined): ContributionDay[] {
  const counts = new Map<string, number>()
  for (const d of days ?? []) counts.set(d.date, (counts.get(d.date) ?? 0) + Math.max(0, d.count | 0))
  const sorted = [...counts.keys()].sort()
  const end = sorted.length ? parseYmd(sorted[sorted.length - 1]) : new Date()
  const start = sorted.length ? parseYmd(sorted[0]) : new Date(end.getFullYear(), end.getMonth(), end.getDate() - 364)
  const out: ContributionDay[] = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) out.push({ date: ymd(d), count: counts.get(ymd(d)) ?? 0 })
  return out
}

/** GitHub-style 0-4 levels relative to the busiest day (sqrt keeps light days visible next to a spike). */
function levelFn(days: ContributionDay[]) {
  const max = days.reduce((m, d) => Math.max(m, d.count), 0)
  if (max <= 0) return () => 0
  return (c: number) => (c <= 0 ? 0 : Math.min(4, Math.max(1, Math.ceil(Math.sqrt(c / max) * 4))))
}

const fmtDay = (s: string) => parseYmd(s).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
const fmtShort = (s: string) => parseYmd(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

export function ContributionGraph({ data, loading }: { data: Contributions | undefined; loading: boolean }) {
  const unavailable = !loading && !data
  const days = useMemo(() => normalize(data?.days), [data])
  const total = data ? (Number.isFinite(data.total) ? data.total : days.reduce((s, d) => s + d.count, 0)) : 0
  const level = useMemo(() => levelFn(days), [days])
  const empty = !loading && !!data && total === 0

  const { cells, months, width, height } = useMemo(() => {
    const first = days.length ? parseYmd(days[0].date) : new Date()
    const offset = first.getDay() // Sunday-first rows, like GitHub
    const cells = days.map((d, i) => {
      const idx = i + offset
      return { ...d, x: Math.floor(idx / 7) * STEP, y: TOP + (idx % 7) * STEP }
    })
    const months: { x: number; label: string }[] = []
    let lastM = -1
    cells.forEach((c) => {
      const dt = parseYmd(c.date)
      if (dt.getMonth() !== lastM && dt.getDate() <= 7) {
        if (!months.length || c.x - months[months.length - 1].x >= STEP * 3) months.push({ x: c.x, label: MONTHS[dt.getMonth()] })
        lastM = dt.getMonth()
      }
    })
    const weeks = Math.ceil((days.length + offset) / 7)
    return { cells, months, width: weeks * STEP - GAP, height: TOP + 7 * STEP - GAP }
  }, [days])

  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // on narrow screens, show the most recent weeks first
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [width])

  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement
    const date = target.getAttribute('data-date')
    if (!date || !wrapRef.current) return setTip(null)
    const count = Number(target.getAttribute('data-count'))
    const r = target.getBoundingClientRect()
    const wr = wrapRef.current.getBoundingClientRect()
    setTip({
      x: r.left - wr.left + r.width / 2,
      y: r.top - wr.top,
      text: `${count === 0 ? 'No' : count} contribution${count === 1 ? '' : 's'} on ${fmtDay(date)}`,
    })
  }

  const activeDays = days.filter((d) => d.count > 0)
  const active = activeDays.length
  const busiest = activeDays.reduce<ContributionDay | null>((b, d) => (!b || d.count > b.count ? d : b), null)
  const lastActive = activeDays.length ? activeDays[activeDays.length - 1] : null
  const summary = loading
    ? 'Loading contribution calendar'
    : unavailable
      ? 'Contribution calendar unavailable'
      : `${total} contributions in the last year across ${active} active days`

  return (
    <figure className="px-4 pt-4 pb-3">
      <div ref={wrapRef} className="relative">
        <div ref={scroller} className="no-scrollbar overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className={`block w-full min-w-[640px] ${loading ? 'animate-pulse' : ''} ${unavailable || empty ? 'opacity-50' : ''}`}
            role="img"
            aria-label={summary}
            onMouseMove={onMove}
            onMouseLeave={() => setTip(null)}
          >
            {months.map((m) => (
              <text key={`${m.x}-${m.label}`} x={m.x} y={10} className="fill-zinc-400 font-mono" fontSize={9}>
                {m.label}
              </text>
            ))}
            {cells.map((c) => {
              const lv = loading || unavailable ? 0 : level(c.count)
              return (
                <rect
                  key={c.date}
                  x={c.x}
                  y={c.y}
                  width={CELL}
                  height={CELL}
                  rx={2}
                  fill={LEVELS[lv]}
                  stroke={lv === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.06)'}
                  strokeWidth={1}
                  data-date={loading || unavailable ? undefined : c.date}
                  data-count={c.count}
                  className="transition-[fill] duration-300 hover:brightness-150"
                />
              )
            })}
          </svg>
        </div>
        {(unavailable || empty) && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center pt-4">
            <p className="pointer-events-auto rounded-md border border-border bg-bg/90 px-3 py-2 text-center text-sm text-muted shadow-lg backdrop-blur">
              {unavailable ? 'GitHub isn’t sharing the calendar right now.' : 'A quiet year so far. These squares fill in as I ship.'}{' '}
              <a className="link-underline text-fg" href={PROFILE.github} target="_blank" rel="noopener noreferrer">
                View profile
              </a>
            </p>
          </div>
        )}
        {tip && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-zinc-900 px-2 py-1 font-mono text-[11px] whitespace-nowrap text-zinc-200 shadow-xl"
            style={{ left: tip.x, top: tip.y - 6 }}
            role="presentation"
          >
            {tip.text}
          </div>
        )}
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-muted">
        <span>
          {loading ? (
            <span className="inline-block h-4 w-64 animate-pulse rounded bg-zinc-800 align-middle" />
          ) : unavailable ? (
            <>Contribution data unavailable.</>
          ) : (
            <>
              <span className="text-fg tabular-nums">{total.toLocaleString()}</span> contribution{total === 1 ? '' : 's'}
              {days.length > 0 && (
                <>
                  , {fmtShort(days[0].date)} – {fmtShort(days[days.length - 1].date)}
                </>
              )}
              . Source:{' '}
              <a className="link-underline text-zinc-200" href={PROFILE.github} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </>
          )}
        </span>
        <span className="flex items-center gap-1 font-mono text-xs text-subtle" aria-hidden="true">
          Less
          {LEVELS.map((c) => (
            <span key={c} className="size-2.5 rounded-[2px] border border-white/5" style={{ background: c }} />
          ))}
          More
        </span>
      </figcaption>
      {!loading && !unavailable && active > 0 && (
        <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-subtle">
          <span>
            active days <span className="text-zinc-300">{active}</span>
          </span>
          {busiest && (
            <span>
              busiest <span className="text-zinc-300">{busiest.count}</span> on {fmtShort(busiest.date)}
            </span>
          )}
          {lastActive && (
            <span>
              last active <span className="text-zinc-300">{fmtShort(lastActive.date)}</span>
            </span>
          )}
        </p>
      )}
    </figure>
  )
}
