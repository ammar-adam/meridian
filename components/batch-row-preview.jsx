'use client'

export default function BatchRowPreview({ scraped, loading }) {
  if (!scraped) {
    return (
      <div className="flex h-10 w-24 items-center justify-center rounded bg-zinc-100">
        {loading ? <span className="text-[10px] text-zinc-500">…</span> : <span className="text-[10px] text-zinc-400">—</span>}
      </div>
    )
  }

  const title = scraped.ogTitle || scraped.domain || '?'
  const initial = (title[0] || '?').toUpperCase()

  return (
    <div className="flex max-w-[140px] items-center gap-2">
      {scraped.favicon ? (
        <img src={scraped.favicon} alt="" className="h-8 w-8 shrink-0 rounded-md bg-white ring-1 ring-zinc-200" />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-[11px] font-semibold text-white">
          {initial}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium leading-tight">{title}</p>
        {loading && <p className="text-[10px] text-zinc-500">Researching…</p>}
      </div>
    </div>
  )
}
