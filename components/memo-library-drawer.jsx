'use client'

export default function MemoLibraryDrawer({ open, library, onClose, onView }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l shadow-2xl" style={{ borderColor: 'var(--m-border)', background: 'var(--m-surface)' }}>
        <div className="flex items-center justify-between border-b px-6 py-5" style={{ borderColor: 'var(--m-border)' }}>
          <div>
            <h2 className="font-semibold text-white">Memo library</h2>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--m-muted-2)' }}>{library.length} saved</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white/5 hover:text-white" style={{ color: 'var(--m-muted-2)' }}>
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {library.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5" style={{ color: 'var(--m-muted-2)' }}>📄</div>
              <p className="text-sm" style={{ color: 'var(--m-muted)' }}>No saved memos yet.</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--m-muted-2)' }}>Generate your first memo to get started.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {library.map(entry => (
                <li key={entry.id}>
                  <button
                    onClick={() => onView(entry.id)}
                    className="group w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-white/20 hover:bg-white/10 hover:shadow-card"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-white">{entry.companyName}</div>
                      <span className="text-xs text-[color:var(--m-muted-2)] group-hover:text-meridian">Open →</span>
                    </div>
                    <div className="mt-1 text-xs" style={{ color: 'var(--m-muted-2)' }}>{entry.round} · {entry.date}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
