'use client'

/**
 * In-app alerts for watch events returned from /api/flow.
 */
export default function FlowWatchAlerts({ watchEvents = [], webhooks = null }) {
  if (!watchEvents?.length) return null

  const serial = watchEvents.filter(e => e.type === 'serial_founder')
  const strong = watchEvents.filter(e => e.type === 'strong_match')
  const verified = watchEvents.filter(e => e.type === 'verified_miss')
  const fresh = watchEvents.filter(e => e.type === 'new_since_last_visit')

  const lines = []
  if (serial.length) {
    lines.push(`${serial.length} serial founder${serial.length === 1 ? '' : 's'} — ${serial.slice(0, 2).map(e => e.company).join(', ')}`)
  }
  if (strong.length) {
    lines.push(`${strong.length} strong match${strong.length === 1 ? '' : 'es'} (fit ≥ 80)`)
  }
  if (verified.length) {
    lines.push(`${verified.length} verified index miss${verified.length === 1 ? '' : 'es'}`)
  }
  if (fresh.length) {
    lines.push(`${fresh.length} new since last visit`)
  }

  if (!lines.length) return null

  return (
    <div className="mb-4 rounded-xl border border-[color:var(--m-accent-line)] bg-[color:var(--m-accent-soft)] px-4 py-3">
      <p className="text-[13px] font-semibold text-[color:var(--m-accent)]">Watch alerts</p>
      <ul className="mt-1 list-inside list-disc text-[13px] text-[color:var(--m-accent)]">
        {lines.map(line => <li key={line}>{line}</li>)}
      </ul>
      {webhooks?.dispatched > 0 && (
        <p className="mt-1 text-[11px] text-[color:var(--m-accent)]">
          Webhooks dispatched to {webhooks.dispatched} endpoint{webhooks.dispatched === 1 ? '' : 's'}
        </p>
      )}
    </div>
  )
}
