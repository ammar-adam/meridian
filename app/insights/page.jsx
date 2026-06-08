'use client'

import { useEffect, useState } from 'react'
import { getEditLog, getEditSummary } from '@/lib/edit-tracker'
import { generatePromptFeedback } from '@/lib/prompt-feedback'
import { SAGARD_CONTEXT } from '@/lib/fund-context'

export default function InsightsPage() {
  const [log, setLog] = useState([])
  const [summary, setSummary] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const editLog = getEditLog()
    const s = getEditSummary(SAGARD_CONTEXT.trackingId)
    setLog(editLog)
    setSummary(s)
    setFeedback(generatePromptFeedback(s, editLog.filter(
      e => (e.trackingId ?? e.fundName) === SAGARD_CONTEXT.trackingId || e.fundName === 'Sagard Holdings'
    )))
  }, [])

  async function copyFeedback() {
    await navigator.clipboard.writeText(feedback)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!summary) return null

  const maxSection = Math.max(...Object.values(summary.sectionCounts ?? {}), 1)

  return (
    <div className="mx-auto max-w-3xl p-8 font-mono text-sm">
      <div className="mb-6 flex items-start justify-between">
        <h1 className="text-lg font-bold">Edit Intelligence — Internal</h1>
        <a href="/" className="text-xs text-gray-400 underline hover:text-gray-600">← Home</a>
      </div>

      <div className="mb-8 rounded-lg bg-stone-50 p-5">
        <div className="mb-3 font-bold text-stone-900">{summary.fundName}</div>
        <div className="grid grid-cols-2 gap-4 text-xs text-stone-600">
          <div>Memos with outcomes: {summary.totalMemos}</div>
          <div>
            Pursue: {summary.pursueCount} · Pass: {summary.passCount}
          </div>
          <div>
            Pursue rate:{' '}
            {summary.pursueRate != null ? `${(summary.pursueRate * 100).toFixed(0)}%` : '—'}
          </div>
          <div>
            Thesis edit rate:{' '}
            {summary.thesisEditRate != null ? `${(summary.thesisEditRate * 100).toFixed(0)}%` : '—'}
          </div>
        </div>

        {Object.keys(summary.sectionCounts ?? {}).length > 0 && (
          <div className="mt-5">
            <div className="mb-2 text-xs font-bold text-stone-700">Corrections by section</div>
            {Object.entries(summary.sectionCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([section, count]) => (
                <div key={section} className="mb-1.5 flex items-center gap-2">
                  <span className="w-24 text-xs text-stone-500">{section}</span>
                  <div className="h-2 flex-1 rounded bg-stone-200">
                    <div
                      className="h-2 rounded bg-[#8B1A1A]"
                      style={{ width: `${(count / maxSection) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-xs text-stone-400">{count}</span>
                </div>
              ))}
          </div>
        )}

        <div className="mt-5">
          <div className="mb-2 text-xs font-bold text-stone-700">Most edited fields</div>
          {summary.mostEditedFields.length === 0 ? (
            <div className="text-xs text-stone-400">No field edits yet</div>
          ) : (
            summary.mostEditedFields.map(({ field, count }) => (
              <div key={field} className="text-xs text-stone-600">{field}: {count}</div>
            ))
          )}
        </div>
      </div>

      {summary.thesisEdits?.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 font-bold text-[#8B1A1A]">Thesis corrections — highest signal</h2>
          {summary.thesisEdits.map(entry => (
            <div key={entry.id} className="mb-4 rounded-lg border border-[#8B1A1A]/20 bg-[#8B1A1A]/5 p-4 text-xs">
              <div className="font-bold text-stone-800">{entry.companyName} — {entry.fieldName}</div>
              <div className="mt-2 line-through text-red-600">
                {entry.originalValue?.replace(/<[^>]+>/g, '')}
              </div>
              <div className="mt-1 text-green-700">{entry.newValue}</div>
              <div className="mt-2 text-stone-400">{entry.editedAt}</div>
            </div>
          ))}
        </div>
      )}

      {summary.outcomes?.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 font-bold">Pursue / pass log</h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-stone-400">
                <th className="pb-2">Company</th>
                <th className="pb-2">Outcome</th>
                <th className="pb-2">Edits</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {summary.outcomes.map(o => (
                <tr key={o.id} className="border-b border-stone-100">
                  <td className="py-2">{o.companyName}</td>
                  <td className={`py-2 font-bold ${o.newValue === 'pursue' ? 'text-green-700' : 'text-stone-500'}`}>
                    {o.newValue}
                  </td>
                  <td className="py-2 text-stone-400">{o.editCount ?? 0}</td>
                  <td className="py-2 text-stone-400">{o.editedAt?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold">Prompt tuning export</h2>
          <button
            onClick={copyFeedback}
            className="rounded border border-stone-200 px-3 py-1 text-xs hover:bg-stone-50"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="max-h-96 overflow-auto rounded-lg bg-stone-900 p-4 text-xs text-stone-300 whitespace-pre-wrap">
          {feedback}
        </pre>
      </div>

      <h2 className="mb-3 font-bold">All field edits</h2>
      {log.filter(e => e.fieldName !== '_outcome').length === 0 ? (
        <div className="text-stone-400">No edits logged yet. Review memos at /memo first.</div>
      ) : (
        log.filter(e => e.fieldName !== '_outcome').map(entry => (
          <div key={entry.id} className="mb-3 rounded border p-3 text-xs">
            <div className="font-bold">{entry.companyName} — {entry.fieldName}</div>
            <div className="mt-1 line-through text-red-500">
              {entry.originalValue?.replace(/<[^>]+>/g, '').slice(0, 120)}
            </div>
            <div className="mt-1 text-green-600">{entry.newValue?.slice(0, 120)}</div>
          </div>
        ))
      )}
    </div>
  )
}
