'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SAGARD_CONTEXT } from '@/lib/fund-context'
import { getMemoLibrary } from '@/lib/memo-library'

const STEPS = [
  { id: 'scrape', label: 'Reading company website', estimate: '~5s' },
  { id: 'research', label: 'Running deep research', estimate: '~60s' },
  { id: 'generate', label: 'Writing memo', estimate: '~15s' },
]

const SLOW_THRESHOLD_MS = 90_000

function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function stepProgress(stepStatus) {
  const done = STEPS.filter(s => stepStatus[s.id] === 'done').length
  const active = STEPS.some(s => stepStatus[s.id] === 'active')
  const base = (done / STEPS.length) * 100
  return active && done < STEPS.length ? Math.min(base + 8, 95) : base
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [stepStatus, setStepStatus] = useState({})
  const [error, setError] = useState('')
  const [slowWarning, setSlowWarning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [library, setLibrary] = useState([])
  const [apiStatus, setApiStatus] = useState(null)
  const router = useRouter()
  const abortRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(setApiStatus)
      .catch(() => setApiStatus({ ok: false, anthropic: false, perplexity: false }))
  }, [])

  useEffect(() => {
    if (!loading) {
      setElapsed(0)
      setSlowWarning(false)
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    const start = Date.now()
    timerRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - start) / 1000)
      setElapsed(secs)
      if (secs * 1000 >= SLOW_THRESHOLD_MS) setSlowWarning(true)
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [loading])

  function openLibrary() {
    setLibrary(getMemoLibrary())
    setLibraryOpen(true)
  }

  function viewMemo(id) {
    const entry = getMemoLibrary().find(e => e.id === id)
    if (!entry) return
    sessionStorage.setItem('memoData', JSON.stringify(entry.data))
    sessionStorage.setItem('memoSource', 'library')
    sessionStorage.setItem('memoId', entry.id)
    sessionStorage.removeItem('qualityGate')
    router.push('/memo')
  }

  function handleCancel() {
    abortRef.current?.abort()
    abortRef.current = null
    setLoading(false)
    setStepStatus({})
    setError('Generation cancelled.')
  }

  async function apiFetch(path, body, signal, onDone) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Request failed (${path})`)
    }
    onDone?.()
    return res.json()
  }

  async function handleGenerate(e) {
    e.preventDefault()
    if (!url.trim()) return

    abortRef.current = new AbortController()
    const { signal } = abortRef.current

    setLoading(true)
    setError('')
    setSlowWarning(false)
    setElapsed(0)
    setStepStatus({ scrape: 'active', research: 'active', generate: 'pending' })

    try {
      const scrapePromise = apiFetch(
        '/api/scrape',
        { url },
        signal,
        () => setStepStatus(s => ({ ...s, scrape: 'done' }))
      )

      const researchPromise = apiFetch(
        '/api/research',
        { url },
        signal,
        () => setStepStatus(s => ({ ...s, research: 'done' }))
      )

      const [scraped, { research }] = await Promise.all([scrapePromise, researchPromise])

      setStepStatus(s => ({ ...s, generate: 'active' }))

      const { memoData, qualityGate } = await apiFetch(
        '/api/generate',
        { research, scraped, fundContext: SAGARD_CONTEXT },
        signal,
        () => setStepStatus(s => ({ ...s, generate: 'done' }))
      )

      const memoId = `${memoData.COMPANY_NAME?.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`
      sessionStorage.setItem('memoData', JSON.stringify(memoData))
      sessionStorage.setItem('qualityGate', JSON.stringify(qualityGate))
      sessionStorage.setItem('memoSource', 'pipeline')
      sessionStorage.setItem('memoId', memoId)
      router.push('/memo')
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Generation cancelled.')
      } else {
        setError(err.message || 'Something went wrong')
      }
      setLoading(false)
      setStepStatus({})
    } finally {
      abortRef.current = null
    }
  }

  const progress = stepProgress(stepStatus)

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4">
      {!loading && (
        <button
          onClick={openLibrary}
          className="absolute right-4 top-4 rounded-lg p-2 text-stone-400 transition hover:bg-stone-200 hover:text-stone-600"
          title="Memo library"
          aria-label="Open memo library"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
          </svg>
        </button>
      )}

      {libraryOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setLibraryOpen(false)} />
          <div className="relative z-10 h-full w-80 overflow-y-auto bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-900">Saved memos</h2>
              <button onClick={() => setLibraryOpen(false)} className="text-stone-400 hover:text-stone-600">✕</button>
            </div>
            {library.length === 0 ? (
              <p className="text-xs text-stone-400">No saved memos yet.</p>
            ) : (
              <ul className="space-y-3">
                {library.map(entry => (
                  <li key={entry.id} className="rounded-lg border border-stone-200 p-3">
                    <div className="text-sm font-medium text-stone-900">{entry.companyName}</div>
                    <div className="text-xs text-stone-400">{entry.round} · {entry.date}</div>
                    <button
                      onClick={() => viewMemo(entry.id)}
                      className="mt-2 text-xs text-stone-600 underline hover:text-stone-900"
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

      {loading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-900">Generating memo</h2>
              <span className="font-mono text-xs text-stone-400">{formatElapsed(elapsed)}</span>
            </div>
            <p className="mb-5 truncate text-xs text-stone-500">{url}</p>

            <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-[#8B1A1A] transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <ul className="mb-6 space-y-3">
              {STEPS.map(step => {
                const status = stepStatus[step.id]
                return (
                  <li key={step.id} className="flex items-center gap-3">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                      status === 'done' ? 'bg-green-100 text-green-700' :
                      status === 'active' ? 'bg-[#8B1A1A]/10 text-[#8B1A1A]' :
                      'bg-stone-100 text-stone-400'
                    }`}>
                      {status === 'done' ? '✓' : status === 'active' ? '…' : '·'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs ${
                        status === 'active' ? 'font-medium text-stone-900' : 'text-stone-600'
                      }`}>
                        {step.label}
                      </div>
                      {status === 'active' && (
                        <div className="text-[10px] text-stone-400">{step.estimate}</div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>

            {slowWarning && (
              <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Research is taking longer than expected. Deep research can run up to 2 minutes — you can wait or cancel.
              </p>
            )}

            <button
              onClick={handleCancel}
              className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm text-stone-600 transition hover:border-stone-300 hover:bg-stone-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="mb-1 text-3xl font-semibold tracking-tight text-stone-900">
            Meridian
          </h1>
          <p className="text-sm text-stone-500">
            Investment memos in under 90 seconds
          </p>
        </div>

        <form onSubmit={handleGenerate} className="space-y-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste company URL — nationgraph.com"
            disabled={loading}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-sm shadow-sm outline-none transition focus:border-[#8B1A1A] focus:ring-2 focus:ring-[#8B1A1A]/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="w-full rounded-xl bg-[#8B1A1A] px-4 py-3.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#6d1414] disabled:opacity-50"
          >
            Generate memo
          </button>
        </form>

        {error && !loading && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700">
            {error}
          </p>
        )}

        {apiStatus && (!apiStatus.anthropic || !apiStatus.perplexity) && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
            API keys missing — add ANTHROPIC_API_KEY and PERPLEXITY_API_KEY to .env.local
          </p>
        )}

        <p className="mt-8 text-center text-xs text-stone-400">
          <a href="/memo" className="underline decoration-stone-300 hover:text-stone-600">
            View NationGraph demo memo
          </a>
        </p>
      </div>
    </main>
  )
}
