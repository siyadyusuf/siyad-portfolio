/** Format an ISO UTC timestamp in the viewer's local time zone. */
export function formatLocalDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

export function formatLocalDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const pad = (n: number) => String(n).padStart(2, '0')

/** ISO UTC -> value for <input type="datetime-local"> in local time ("YYYY-MM-DDTHH:mm"). */
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** <input type="datetime-local"> value (local time) -> ISO 8601 UTC string. */
export function localInputToIso(value: string): string {
  const d = new Date(value) // parsed as local time
  return d.toISOString()
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const abs = Math.abs(diff)
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 365 * 864e5],
    ['month', 30 * 864e5],
    ['week', 7 * 864e5],
    ['day', 864e5],
    ['hour', 36e5],
    ['minute', 6e4],
  ]
  for (const [unit, ms] of units) if (abs >= ms) return rtf.format(-Math.round(diff / ms), unit)
  return 'just now'
}
