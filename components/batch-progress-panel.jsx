'use client'

import Link from 'next/link'

export default function BatchProgressPanel({ progress, running, onCancel }) {
  if (!progress) return null

  const skipped = progress.skipped ?? 0
  const pct = progress.total
    ? Math.round(((progress.completed + progress.failed + skipped) / progress.total) * 100)
    : 0

  const results = progress.results ?? []

  return (
    <div className="m-card mb-4 overflow-hidden">
      <div className="m-card-header">
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-medium">{running ? 'Briefing…' : 'Batch complete'}</div>
          <div className="mt-0.5 font-mono text-[10px]" style={{ color: 'var(--m-muted)' }}>
            {progress.completed} done · {skipped} skipped · {progress.failed} failed · {progress.total} total
            {progress.current && running && ` · ${progress.current}`}
          </div>
        </div>
        {running && (
          <button onClick={onCancel} className="m-btn-ghost m-btn-sm">Cancel</button>
        )}
      </div>

      <div className="px-5 py-3">
        <div className="h-0.5 overflow-hidden rounded-full" style={{ background: 'var(--m-border)' }}>
          <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: 'var(--m-text)' }} />
        </div>
      </div>

      {results.length > 0 && (
        <ul className="max-h-36 overflow-y-auto border-t px-5 py-2" style={{ borderColor: 'var(--m-border)' }}>
          {results.map((r, i) => (
            <li key={i} className="flex items-center justify-between py-1.5 text-[11px]">
              <span className="truncate">{r.company?.name || r.companyName || '—'}</span>
              <span className={`ml-2 shrink-0 font-mono ${
                r.status === 'done' ? 'text-[color:var(--m-forest)]' :
                r.status === 'failed' ? 'text-red-800' : ''
              }`} style={{ color: r.status === 'skipped' ? 'var(--m-muted)' : undefined }}>
                {r.status === 'done' ? 'saved' : r.status === 'failed' ? (r.error?.slice(0, 32) || 'failed') : r.reason === 'existing_brief' ? 'in library' : 'skip'}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!running && progress.completed > 0 && (
        <div className="border-t px-5 py-2" style={{ borderColor: 'var(--m-border)' }}>
          <Link href="/library" className="text-[11px] font-medium hover:underline">Open library →</Link>
        </div>
      )}
    </div>
  )
}
