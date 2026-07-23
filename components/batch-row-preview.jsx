'use client'

/* External favicons from arbitrary company domains */
/* eslint-disable @next/next/no-img-element */

export default function BatchRowPreview({ scraped, loading }) {
  if (!scraped) {
    return (
      <div className="flex h-10 w-24 items-center justify-center rounded bg-[color:var(--m-surface-2)]">
        {loading ? <span className="text-[10px]" style={{ color: 'var(--m-muted)' }}>…</span> : <span className="text-[10px]" style={{ color: 'var(--m-muted-2)' }}>—</span>}
      </div>
    )
  }

  const title = scraped.ogTitle || scraped.domain || '?'
  const initial = (title[0] || '?').toUpperCase()

  return (
    <div className="flex max-w-[140px] items-center gap-2">
      {scraped.favicon ? (
        <img src={scraped.favicon} alt="" className="h-8 w-8 shrink-0 rounded-md ring-1 ring-[color:var(--m-border)]" style={{ background: 'var(--m-surface)' }} />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[color:var(--m-surface-3)] text-[11px] font-semibold text-[color:var(--m-text)]">
          {initial}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium leading-tight">{title}</p>
        {loading && <p className="text-[10px]" style={{ color: 'var(--m-muted)' }}>Researching…</p>}
      </div>
    </div>
  )
}
