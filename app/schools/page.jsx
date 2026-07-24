'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import WorkspaceShell from '@/components/workspace-shell'
import WorkspacePage, { WorkspaceSection } from '@/components/workspace-page'
import PageLoader from '@/components/page-loader'

export default function SchoolsPage() {
  const [data, setData] = useState(null)
  const [emerging, setEmerging] = useState(null)
  const [jobs, setJobs] = useState([])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [lastScout, setLastScout] = useState(null)

  function refresh() {
    fetch('/api/schools').then(r => r.json()).then(setData).catch(e => setError(e.message))
    fetch('/api/schools/emerging').then(r => r.json()).then(setEmerging).catch(() => {})
    fetch('/api/jobs?limit=12').then(r => r.json()).then(d => setJobs(d.jobs || [])).catch(() => {})
  }

  useEffect(() => { refresh() }, [])

  async function scoutSchool(schoolId) {
    setBusy(schoolId)
    setError('')
    try {
      const res = await fetch('/api/schools/scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Scout failed')
      setLastScout(json)
      refresh()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  async function runEmerging() {
    setBusy('emerging')
    try {
      const res = await fetch('/api/schools/emerging', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Discovery failed')
      setEmerging(json)
      refresh()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  if (!data && !error) {
    return (
      <WorkspaceShell title="Schools" subtitle="Ecosystems → mandates">
        <PageLoader />
      </WorkspaceShell>
    )
  }

  const coverage = data?.coverage

  return (
    <WorkspaceShell
      title="Schools"
      subtitle="Tier-1 CA / US / UK · emerging expands over time"
      actions={(
        <div className="flex gap-2">
          <button type="button" className="m-btn-secondary m-btn-sm" disabled={!!busy} onClick={runEmerging}>
            {busy === 'emerging' ? 'Discovering…' : 'Find emerging'}
          </button>
          <Link href="/pilot" className="m-btn-ghost m-btn-sm">Coverage proof</Link>
        </div>
      )}
    >
      <WorkspacePage width="wide">
        <div className="m-flow-hero mb-6">
          <p className="m-kicker mb-1">Vision</p>
          <h2 className="text-[20px] font-semibold tracking-tight" style={{ color: 'var(--m-text)' }}>
            School ecosystems connected to fund mandates
          </h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed" style={{ color: 'var(--m-muted)' }}>
            {data?.pitch || 'We only claim what we can date and source. Research and scout jobs run under the hood — not a chat product.'}
          </p>
          {coverage && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="m-stat-pill m-stat-pill-accent">{coverage.tier1} Tier-1</span>
              <span className="m-stat-pill">CA {coverage.byCountry?.CA || 0}</span>
              <span className="m-stat-pill">US {coverage.byCountry?.US || 0}</span>
              <span className="m-stat-pill">UK {coverage.byCountry?.UK || 0}</span>
              <span className="m-stat-pill">{coverage.withSources} with birthing sources</span>
              <span className="m-stat-pill">{coverage.universitySources} university source pages</span>
            </div>
          )}
        </div>

        {error && <p className="m-alert-error mb-4">{error}</p>}
        {lastScout && (
          <p className="m-alert-warn mb-4">
            Scouted {lastScout.schoolName}: {lastScout.newSightings} sightings
            {lastScout.perplexity ? '' : ' (source registration — add PERPLEXITY_API_KEY for live company scout)'}
          </p>
        )}

        <WorkspaceSection title="Tier-1 schools" description="Watch / scout a campus ecosystem. Results write into the company graph with provenance.">
          <div className="m-table-wrap">
            <table className="m-table !min-w-0">
              <thead>
                <tr>
                  <th>School</th>
                  <th>Country</th>
                  <th>Sources</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(data?.schools || []).map(s => (
                  <tr key={s.id}>
                    <td className="font-medium">{s.name}</td>
                    <td className="font-mono text-[12px]">{s.country}</td>
                    <td className="text-[13px]" style={{ color: 'var(--m-muted)' }}>{s.sourceCount}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="m-btn-primary m-btn-sm"
                        disabled={!!busy}
                        onClick={() => scoutSchool(s.id)}
                      >
                        {busy === s.id ? 'Scouting…' : 'Scout'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </WorkspaceSection>

        <WorkspaceSection
          title="Emerging proposals"
          description="University sources outside Tier-1 coverage — candidates for the next Waterloo."
        >
          {(emerging?.proposals || []).length === 0 ? (
            <p className="text-[13px]" style={{ color: 'var(--m-muted)' }}>
              Run “Find emerging” to propose schools from registered university sources.
            </p>
          ) : (
            <ul className="space-y-2">
              {(emerging.proposals || []).slice(0, 10).map(p => (
                <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b py-2" style={{ borderColor: 'var(--m-border)' }}>
                  <div>
                    <div className="text-[14px] font-medium">{p.name}</div>
                    <div className="text-[12px]" style={{ color: 'var(--m-muted)' }}>
                      {p.country} · heat {p.heat}
                      {p.sources ? ` · ${p.sources.length} sources` : ''}
                    </div>
                  </div>
                  <span className="m-badge-mid">emerging</span>
                </li>
              ))}
            </ul>
          )}
        </WorkspaceSection>

        <WorkspaceSection title="Recent jobs" description="Internal log — research, scout, coverage. Not advertised as agents.">
          {jobs.length === 0 ? (
            <p className="text-[13px]" style={{ color: 'var(--m-muted)' }}>No jobs yet. Scout a school or generate a brief.</p>
          ) : (
            <ul className="space-y-2 font-mono text-[12px]">
              {jobs.map(j => (
                <li key={j.id} className="flex flex-wrap gap-x-3 gap-y-1" style={{ color: 'var(--m-muted)' }}>
                  <span style={{ color: 'var(--m-text)' }}>{j.type}</span>
                  <span>{j.status}</span>
                  <span className="truncate">{j.summary || j.trigger}</span>
                </li>
              ))}
            </ul>
          )}
        </WorkspaceSection>
      </WorkspacePage>
    </WorkspaceShell>
  )
}
