'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import DeviceOnlyNotice from '@/components/device-only-notice'
import GpValidationCard from '@/components/gp-validation-card'
import WorkspaceShell from '@/components/workspace-shell'
import WorkspacePage, { WorkspaceSection } from '@/components/workspace-page'
import EmptyState from '@/components/empty-state'
import { StrategySwitcher } from '@/components/context-switcher'
import { getEditLog, getEditSummary } from '@/lib/edit-tracker'
import { getStatEditInsight } from '@/lib/metric-preferences'
import { generatePromptFeedback } from '@/lib/prompt-feedback'
import { getLearningPreview } from '@/lib/learning-preview'
import { getFundProfile, getActiveStrategy, getTrackingId } from '@/lib/fund-profile'
import { inferRevealedPreference } from '@/lib/behavioral-rank'
import { GUEST_FUND_API_CONTEXT } from '@/lib/fund-defaults'

export default function ThesisPage() {
  const [summary, setSummary] = useState(null)
  const [showDev, setShowDev] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [copied, setCopied] = useState(false)
  const [contextLabel, setContextLabel] = useState('')
  const [trackingId, setTrackingId] = useState('')
  const [statedMandate, setStatedMandate] = useState('')

  function loadSummary() {
    const profile = getFundProfile()
    const strategy = getActiveStrategy(profile)
    const tid = profile && strategy ? getTrackingId(profile, strategy) : 'guest'
    setTrackingId(tid)
    setContextLabel(
      profile
        ? strategy && strategy.name !== 'Primary'
          ? `${profile.fundName} · ${strategy.name}`
          : profile.fundName
        : ''
    )
    setStatedMandate(strategy?.thesis || profile?.thesis || GUEST_FUND_API_CONTEXT.thesis)
    const s = getEditSummary(tid)
    setSummary(s)
    setFeedback(generatePromptFeedback(s, getEditLog().filter(e => (e.trackingId ?? e.fundName) === tid)))
  }

  useEffect(() => {
    loadSummary()
    window.addEventListener('meridian-context-change', loadSummary)
    return () => window.removeEventListener('meridian-context-change', loadSummary)
  }, [])

  async function copyFeedback() {
    await navigator.clipboard.writeText(feedback)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const maxSection = Math.max(...Object.values(summary?.sectionCounts ?? {}), 1)
  const learning = trackingId ? getLearningPreview(trackingId) : null
  const revealed = inferRevealedPreference(trackingId || 'guest')
  const statInsight = trackingId ? getStatEditInsight(getEditLog(), trackingId) : null

  return (
    <WorkspaceShell
      title="Thesis"
      subtitle={contextLabel ? `Signals for ${contextLabel}` : 'Signals from team review'}
      actions={<StrategySwitcher onChange={loadSummary} />}
    >
      <WorkspacePage width="medium">
        <DeviceOnlyNotice className="mb-4" />
        <GpValidationCard />
        {!summary || summary.totalMemos === 0 ? (
          <EmptyState
            title="No signals yet for this strategy"
            description="Log pursue or pass on memos under this fund strategy. Meridian uses those signals to sharpen the thesis band on the next brief."
            primaryHref="/discover"
            primaryLabel="Discover companies"
            secondaryHref="/brief"
            secondaryLabel="Brief a URL"
            steps={[
              { label: 'Discover or Brief', desc: 'Source companies against your mandate' },
              { label: 'Pursue or pass', desc: 'Close the loop on every memo' },
              { label: 'Watch it learn', desc: 'Pursue rate and preferences show up here' },
            ]}
          />
        ) : (
          <>
            {statInsight && (
              <div className="m-card m-card-pad mb-6 border-violet-400/30 bg-violet-400/10">
                <p className="m-kicker mb-1">Metric preferences learning</p>
                <p className="text-[13px] leading-relaxed text-violet-200">{statInsight.message}</p>
                <Link href="/fund" className="mt-2 inline-block text-[12px] font-medium text-violet-300 hover:underline">
                  Adjust metric priorities →
                </Link>
              </div>
            )}

            {learning && (
              <div className="m-card m-card-pad mb-6 border-emerald-400/30 bg-emerald-400/10">
                <p className="text-[13px] font-medium text-emerald-200">Applied to your next briefs</p>
                <p className="mt-1 text-[12px] text-emerald-200">
                  Meridian uses {learning.signalCount} signal{learning.signalCount !== 1 ? 's' : ''} from your reviews ({learning.summary}) when generating the thesis band.
                </p>
                <Link href="/brief" className="mt-3 inline-block text-[12px] font-medium text-emerald-300 hover:underline">
                  Generate another brief →
                </Link>
              </div>
            )}

            {revealed && (
              <div className="m-card m-card-pad mb-6">
                <p className="m-kicker mb-2">Revealed preference</p>
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--m-muted)' }}>
                  {revealed.summary}
                </p>
                <p className="mt-3 text-[12px]" style={{ color: 'var(--m-muted-2)' }}>
                  Stated mandate: {statedMandate.slice(0, 200)}…
                </p>
              </div>
            )}

            <div className="m-card m-card-pad mb-6">
              <p className="m-kicker mb-3">{contextLabel}</p>
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                <Stat label="Reviewed" value={summary.totalMemos} />
                <Stat label="Pursue rate" value={summary.pursueRate != null ? `${(summary.pursueRate * 100).toFixed(0)}%` : '—'} />
                <Stat label="Pursue" value={summary.pursueCount} />
                <Stat label="Pass" value={summary.passCount} />
              </div>
              <p className="mt-4 text-[12px]" style={{ color: 'var(--m-muted)' }}>
                Thesis edit rate: {summary.thesisEditRate != null ? `${(summary.thesisEditRate * 100).toFixed(0)}%` : '—'}
              </p>
            </div>

            {Object.keys(summary.sectionCounts ?? {}).length > 0 && (
              <WorkspaceSection title="Corrections by section">
                {Object.entries(summary.sectionCounts).sort(([, a], [, b]) => b - a).map(([section, count]) => (
                  <div key={section} className="mb-2 flex items-center gap-3">
                    <span className="w-20 text-[10px] font-medium uppercase" style={{ color: 'var(--m-muted)' }}>{section}</span>
                    <div className="h-1 flex-1 rounded-full" style={{ background: 'var(--m-border)' }}>
                      <div className="h-1 rounded-full" style={{ width: `${(count / maxSection) * 100}%`, background: 'var(--m-text)' }} />
                    </div>
                    <span className="w-6 text-[10px] tabular-nums" style={{ color: 'var(--m-muted)' }}>{count}</span>
                  </div>
                ))}
              </WorkspaceSection>
            )}

            {summary.thesisEdits?.length > 0 && (
              <WorkspaceSection title="Thesis corrections">
                {summary.thesisEdits.slice(0, 6).map(entry => (
                  <div key={entry.id} className="mb-3 rounded-md border p-3 text-[12px]" style={{ borderColor: 'var(--m-border)', background: 'var(--m-surface-2)' }}>
                    <div className="font-medium">{entry.companyName} · {entry.fieldName}</div>
                    <div className="mt-1 line-through opacity-60">{entry.originalValue?.replace(/<[^>]+>/g, '').slice(0, 160)}</div>
                    <div className="mt-1">{entry.newValue?.slice(0, 160)}</div>
                  </div>
                ))}
              </WorkspaceSection>
            )}

            {summary.outcomes?.length > 0 && (
              <WorkspaceSection title="Outcomes" bare>
                <div className="m-table-wrap">
                  <table className="m-table !min-w-0">
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Outcome</th>
                        <th>Edits</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.outcomes.map(o => (
                        <tr key={o.id}>
                          <td>{o.companyName}</td>
                          <td className={o.newValue === 'pursue' ? 'font-medium text-emerald-300' : ''} style={o.newValue !== 'pursue' ? { color: 'var(--m-muted)' } : undefined}>{o.newValue}</td>
                          <td className="text-[13px] tabular-nums" style={{ color: 'var(--m-muted)' }}>{o.editCount ?? 0}</td>
                          <td className="text-[13px] tabular-nums" style={{ color: 'var(--m-muted)' }}>{o.editedAt?.slice(0, 10)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </WorkspaceSection>
            )}

            <button onClick={() => setShowDev(!showDev)} className="m-btn-ghost m-btn-sm mt-4">
              {showDev ? 'Hide' : 'Show'} developer tools
            </button>
            {showDev && (
              <div className="m-card m-card-pad mt-3">
                <div className="mb-2 flex justify-between">
                  <span className="m-kicker">Prompt export · {trackingId}</span>
                  <button onClick={copyFeedback} className="m-btn-secondary m-btn-sm">{copied ? 'Copied' : 'Copy'}</button>
                </div>
                <pre className="max-h-48 overflow-auto rounded-md p-3 font-mono text-[10px]" style={{ background: 'var(--m-surface-2)', color: 'var(--m-muted)' }}>{feedback}</pre>
              </div>
            )}
          </>
        )}
      </WorkspacePage>
    </WorkspaceShell>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="m-stat-value">{value}</div>
      <div className="m-stat-label">{label}</div>
    </div>
  )
}
