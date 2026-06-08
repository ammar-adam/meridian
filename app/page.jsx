'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SAGARD_CONTEXT } from '@/lib/fund-context'
import { getMemoLibrary } from '@/lib/memo-library'

const STEPS = [
  { id: 'scrape', label: 'Reading company website' },
  { id: 'research', label: 'Running deep research' },
  { id: 'generate', label: 'Writing memo' },
  { id: 'done', label: 'Done' },
]

const TIMEOUT_MS = 90_000

export default function Home() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [stepStatus, setStepStatus] = useState({})
  const [error, setError] = useState('')
  const [timeoutMsg, setTimeoutMsg] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [library, setLibrary] = useState([])
  const router = useRouter()

  function openLibrary() {
    setLibrary(getMemoLibrary())
    setLibraryOpen(true)
  }

  function viewMemo(id) {
    const entry = getMemoLibrary().find(e => e.id === id)
    if (!entry) return
    sessionStorage.setItem('memoData', JSON.stringify(entry.data))
    sessionStorage.setItem('memoSource', 'library')
    sessionStorage.removeItem('qualityGate')
    router.push('/memo')
  }

  async function handleGenerate(e) {
    e.preventDefault()
    if (!url.trim()) return

    setLoading(true)
    setError('')
    setTimeoutMsg(false)
    setStepStatus({ scrape: 'active', research: 'active', generate: 'pending' })

    const timeoutId = setTimeout(() => {
      setTimeoutMsg(true)
    }, TIMEOUT_MS)

    try {
      let scraped, research

      const scrapePromise = fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      }).then(async (res) => {
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Scrape failed')
        }
        setStepStatus(s => ({ ...s, scrape: 'done' }))
        return res.json()
      })

      const researchPromise = fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      }).then(async (res) => {
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Research failed')
        }
        setStepStatus(s => ({ ...s, research: 'done' }))
        return res.json()
      })

      ;[scraped, { research }] = await Promise.all([scrapePromise, researchPromise])

      setStepStatus(s => ({ ...s, generate: 'active' }))

      const generateRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          research,
          scraped,
          fundContext: SAGARD_CONTEXT,
        }),
      })

      if (!generateRes.ok) {
        const err = await generateRes.json()
        throw new Error(err.error || 'Generation failed')
      }

      const { memoData, qualityGate } = await generateRes.json()

      setStepStatus(s => ({ ...s, generate: 'done', done: 'done' }))

      sessionStorage.setItem('memoData', JSON.stringify(memoData))
      sessionStorage.setItem('qualityGate', JSON.stringify(qualityGate))
      sessionStorage.setItem('memoSource', 'pipeline')
      router.push('/memo')
    } catch (err) {
      setError(err.message || 'Something went wrong')
      setLoading(false)
      setStepStatus({})
    } finally {
      clearTimeout(timeoutId)
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <button
        onClick={openLibrary}
        className="absolute right-4 top-4 rounded p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
        title="Memo library"
        aria-label="Open memo library"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        </svg>
      </button>

      {libraryOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setLibraryOpen(false)} />
          <div className="relative z-10 h-full w-80 overflow-y-auto bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Saved memos</h2>
              <button onClick={() => setLibraryOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {library.length === 0 ? (
              <p className="text-xs text-gray-400">No saved memos yet.</p>
            ) : (
              <ul className="space-y-3">
                {library.map(entry => (
                  <li key={entry.id} className="rounded border border-gray-200 p-3">
                    <div className="text-sm font-medium text-gray-900">{entry.companyName}</div>
                    <div className="text-xs text-gray-400">{entry.round} · {entry.date}</div>
                    <button
                      onClick={() => viewMemo(entry.id)}
                      className="mt-2 text-xs text-gray-600 underline hover:text-gray-900"
                    >
                      View
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-gray-900">
          Meridian
        </h1>
        <p className="mb-8 text-sm text-gray-500">
          Paste a company URL. Get a one-page investment memo in under 90 seconds.
        </p>

        <form onSubmit={handleGenerate} className="space-y-4">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="nationgraph.com"
            disabled={loading}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? 'Generating…' : 'Generate'}
          </button>
        </form>

        {loading && (
          <ul className="mt-6 space-y-2">
            {STEPS.filter(s => s.id !== 'done').map(step => {
              const status = stepStatus[step.id]
              return (
                <li key={step.id} className="flex items-center gap-2 text-xs text-gray-500">
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    status === 'done' ? 'bg-green-500' :
                    status === 'active' ? 'bg-gray-900 animate-pulse' :
                    'bg-gray-300'
                  }`} />
                  {step.label}
                  {status === 'done' && <span className="text-gray-400">✓</span>}
                </li>
              )
            })}
          </ul>
        )}

        {timeoutMsg && loading && (
          <p className="mt-4 text-center text-xs text-amber-600">
            Research is taking longer than expected. You can wait or try again.
          </p>
        )}

        {error && (
          <p className="mt-4 text-center text-sm text-red-600">{error}</p>
        )}

        <p className="mt-8 text-center text-xs text-gray-400">
          <a href="/memo" className="underline hover:text-gray-600">
            View NationGraph demo memo
          </a>
        </p>
      </div>
    </main>
  )
}
