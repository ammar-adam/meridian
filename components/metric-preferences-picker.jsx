'use client'

import { METRIC_CATALOG, normalizeMetricPreferences } from '@/lib/metric-preferences'

export default function MetricPreferencesPicker({ value, onChange, compact = false }) {
  const selected = normalizeMetricPreferences(value)

  function toggle(id) {
    const next = selected.includes(id)
      ? selected.filter(x => x !== id)
      : selected.length >= 3
        ? [...selected.slice(1), id]
        : [...selected, id]
    onChange(normalizeMetricPreferences(next.length ? next : [id]))
  }

  return (
    <div className={compact ? '' : 'space-y-2'}>
      {!compact && (
        <>
          <p className="m-kicker">GP metrics on every brief</p>
          <p className="text-[12px]" style={{ color: 'var(--m-muted)' }}>
            Pick up to 3 — we fill stat slots in this order, with verified fallbacks when data is missing.
          </p>
        </>
      )}
      <div className="flex flex-wrap gap-2">
        {METRIC_CATALOG.map((metric) => {
          const active = selected.includes(metric.id)
          const order = active ? selected.indexOf(metric.id) + 1 : null
          return (
            <button
              key={metric.id}
              type="button"
              onClick={() => toggle(metric.id)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-medium ring-1 transition ${
                active
                  ? 'bg-emerald-500 text-[#04140d] ring-emerald-500'
                  : 'ring-white/10 hover:bg-white/5'
              }`}
              style={active ? undefined : { background: 'var(--m-surface-2)', color: 'var(--m-muted)' }}
            >
              {order ? `${order}. ` : ''}{metric.label}
            </button>
          )
        })}
      </div>
      {selected.length > 0 && (
        <p className="text-[11px]" style={{ color: 'var(--m-muted-2)' }}>
          Priority: {selected.map(id => METRIC_CATALOG.find(m => m.id === id)?.label).filter(Boolean).join(' → ')}
        </p>
      )}
    </div>
  )
}
