'use client'

export default function MemoLibraryDrawer({ open, library, onClose, onView }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-stone-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <h2 className="font-semibold text-stone-900">Memo library</h2>
            <p className="mt-0.5 text-xs text-stone-400">{library.length} saved</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {library.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100 text-stone-400">📄</div>
              <p className="text-sm text-stone-500">No saved memos yet.</p>
              <p className="mt-1 text-xs text-stone-400">Generate your first memo to get started.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {library.map(entry => (
                <li key={entry.id}>
                  <button
                    onClick={() => onView(entry.id)}
                    className="group w-full rounded-xl border border-stone-100 bg-stone-50/50 p-4 text-left transition hover:border-stone-200 hover:bg-white hover:shadow-card"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-stone-900">{entry.companyName}</div>
                      <span className="text-xs text-stone-300 group-hover:text-meridian">Open →</span>
                    </div>
                    <div className="mt-1 text-xs text-stone-400">{entry.round} · {entry.date}</div>
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
