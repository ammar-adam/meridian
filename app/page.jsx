'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SAGARD_CONTEXT } from '@/lib/fund-context'

export default function Home() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleGenerate(e) {
    e.preventDefault()
    if (!url.trim()) return

    setLoading(true)
    setError('')
    setStep('Scraping & researching…')

    try {
      const [scrapeRes, researchRes] = await Promise.all([
        fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        }),
        fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        }),
      ])

      if (!scrapeRes.ok) {
        const err = await scrapeRes.json()
        throw new Error(err.error || 'Scrape failed')
      }
      if (!researchRes.ok) {
        const err = await researchRes.json()
        throw new Error(err.error || 'Research failed')
      }

      const scraped = await scrapeRes.json()
      const { research } = await researchRes.json()

      setStep('Generating memo…')

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

      const { memoData } = await generateRes.json()
      sessionStorage.setItem('memoData', JSON.stringify(memoData))
      router.push('/memo')
    } catch (err) {
      setError(err.message || 'Something went wrong')
      setLoading(false)
      setStep('')
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
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

        {step && (
          <p className="mt-4 text-center text-xs text-gray-400">{step}</p>
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
