'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import WorkspaceShell from '@/components/workspace-shell'
import WorkspacePage, { WorkspaceSection } from '@/components/workspace-page'
import PageLoader from '@/components/page-loader'
import { getFundProfile, getActiveStrategy, setActiveFundId } from '@/lib/fund-profile'
import { PANACHE_VENTURES } from '@/lib/fund-seeds'

function StatusRow({ ok, label, detail, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b py-3 last:border-0" style={{ borderColor: 'var(--m-border)' }}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 shrink-0 rounded-full ${ok ? 'bg-emerald-400' : ok === false ? 'bg-amber-400' : 'bg-white/20'}`}
            aria-hidden
          />
          <span className="text-[14px] font-medium text-white">{label}</span>
        </div>
        {detail && <p className="mt-1 pl-4 text-[13px] leading-relaxed" style={{ color: 'var(--m-muted)' }}>{detail}</p>}
      </div>
      {action}
    </div>
  )
}

function Beat({ n, title, detail, href, hrefLabel }) {
  return (
    <li className="flex gap-3 text-[14px]">
      <span className="font-mono text-[11px] text-zinc-400">{String(n).padStart(2, '0')}</span>
      <div>
        <div className="font-medium text-white">{title}</div>
        <div className="mt-0.5 text-[13px]" style={{ color: 'var(--m-muted)' }}>{detail}</div>
        {href && (
          <Link href={href} className="mt-1 inline-block text-[13px] font-medium text-emerald-400 hover:underline">
            {hrefLabel || 'Open →'}
          </Link>
        )}
      </div>
    </li>
  )
}

export default function DemoPage() {
  const [health, setHealth] = useState(null)
  const [benchmark, setBenchmark] = useState(null)
  const [corpus, setCorpus] = useState(null)
  const [fund, setFund] = useState(null)
  const [warming, setWarming] = useState(false)
  const [warmMsg, setWarmMsg] = useState('')

  const refreshLocal = useCallback(() => {
    setFund(getFundProfile())
  }, [])

  const loadRemote = useCallback(async () => {
    const [h, b, c] = await Promise.all([
      fetch('/api/health').then(r => r.json()).catch(() => null),
      fetch('/api/benchmark').then(r => r.json()).catch(() => null),
      fetch('/api/corpus').then(r => (r.ok ? r.json() : null)).catch(() => null),
    ])
    setHealth(h)
    setBenchmark(b?.enabled ? b : null)
    setCorpus(c?.ok ? c : (b?.stats?.companyRecords != null ? {
      ok: true,
      companyRecords: b.stats.companyRecords,
      via: 'benchmark',
    } : null))
  }, [])

  useEffect(() => {
    refreshLocal()
    loadRemote()
    window.addEventListener('meridian-context-change', refreshLocal)
    return () => window.removeEventListener('meridian-context-change', refreshLocal)
  }, [refreshLocal, loadRemote])

  async function warmCorpus() {
    setWarming(true)
    setWarmMsg('Pumping corpus (30–90s)…')
    try {
      let res = await fetch('/api/corpus?force=1')
      if (!res.ok) res = await fetch('/api/pilot')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const records = data.companyRecords ?? data.headlineMetrics?.companyRecords ?? data.bulkFill?.after
      setCorpus(data.ok || data.headlineMetrics ? {
        ok: true,
        companyRecords: records,
        delta: data.delta ?? data.bulkFill?.delta,
      } : data)
      setWarmMsg(`Done — ${records ?? '—'} company records (+${data.delta ?? data.bulkFill?.delta ?? 0} this run)`)
      await loadRemote()
    } catch (err) {
      setWarmMsg(err.message || 'Corpus pump failed — try again in a minute')
    } finally {
      setWarming(false)
    }
  }

  function activatePanache() {
    setActiveFundId(PANACHE_VENTURES.id)
    refreshLocal()
  }

  const strategy = fund ? getActiveStrategy(fund) : null
  const coreOk = health?.features?.aiGeneration
    && health?.features?.deepResearch
    && health?.features?.persistence
  const panacheActive = fund?.id === PANACHE_VENTURES.id
  const hasThesis = Boolean(strategy?.thesis?.trim())
  const records = corpus?.companyRecords ?? benchmark?.stats?.companyRecords
  const feedParity = Boolean(benchmark?.feedParity?.feedStats)
  const deployCurrent = feedParity || Boolean(benchmark?.stats?.companyRecords != null)

  const readyCount = useMemo(() => {
    let n = 0
    if (coreOk) n += 1
    if (panacheActive && hasThesis) n += 1
    if (records != null && records >= 200) n += 1
    if (health?.features?.serverPdf) n += 1
    if (deployCurrent) n += 1
    return n
  }, [coreOk, panacheActive, hasThesis, records, health, deployCurrent])

  const demoReady = coreOk && panacheActive && hasThesis && (records == null || records >= 150)

  if (!health) {
    return (
      <WorkspaceShell title="Demo checklist" subtitle="Preflight before you record">
        <PageLoader />
      </WorkspaceShell>
    )
  }

  return (
    <WorkspaceShell
      title="Demo checklist"
      subtitle={demoReady ? 'Ready to record' : 'Fix amber items, then record'}
      actions={(
        <Link href="/flow" className="m-btn-primary m-btn-sm">
          Start on Deal Flow
        </Link>
      )}
    >
      <WorkspacePage width="medium">
        <div className={`mb-6 rounded-xl border px-4 py-3 ${demoReady ? 'border-emerald-400/30 bg-emerald-400/10' : 'border-amber-400/30 bg-amber-400/10'}`}>
          <p className={`text-[13px] font-semibold ${demoReady ? 'text-emerald-200' : 'text-amber-200'}`}>
            {demoReady ? 'Green light — open Deal Flow and hit record.' : `${readyCount}/5 checks passing — see below.`}
          </p>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--m-muted)' }}>
            Prod: {typeof window !== 'undefined' ? window.location.origin : 'meridian-eight-sandy.vercel.app'}
            {' · '}
            Script: repo file <code className="rounded bg-white/10 px-1 text-white/80">docs/investor-demo-film.md</code>
          </p>
        </div>

        <WorkspaceSection title="Preflight" description="Run once after pasting env vars on Vercel (or locally in .env.local).">
          <div className="m-card px-4">
            <StatusRow
              ok={coreOk}
              label="Core stack"
              detail={[
                health.features?.aiGeneration ? 'Claude' : 'Claude off',
                health.features?.deepResearch ? 'Perplexity' : 'Perplexity off',
                health.features?.persistence ? 'Database' : 'DATABASE_URL missing',
                health.features?.indexChecks ? 'StartupHub' : 'STARTUPHUB_API_KEY missing',
              ].join(' · ')}
            />
            <StatusRow
              ok={panacheActive && hasThesis}
              label="Panache mandate active"
              detail={
                panacheActive && hasThesis
                  ? `${fund.fundName} — Canada pre-seed/seed thesis loaded`
                  : panacheActive
                    ? 'Panache selected but thesis empty — open Fund settings'
                    : `Active fund is ${fund?.fundName || 'none'} — switch to Panache for the Canada story`
              }
              action={!panacheActive && (
                <button type="button" onClick={activatePanache} className="m-btn-secondary m-btn-sm">
                  Activate Panache
                </button>
              )}
            />
            <StatusRow
              ok={records == null ? null : records >= 200}
              label="Corpus depth"
              detail={
                records != null
                  ? `${records} company records${records < 200 ? ' — run warm-up below before recording' : ''}`
                  : 'Unknown — warm corpus or open Coverage proof'
              }
              action={(
                <button type="button" onClick={warmCorpus} disabled={warming} className="m-btn-ghost m-btn-sm">
                  {warming ? 'Warming…' : 'Warm corpus'}
                </button>
              )}
            />
            {warmMsg && <p className="pb-3 pl-4 font-mono text-[11px] text-zinc-500">{warmMsg}</p>}
            <StatusRow
              ok={health.features?.serverPdf}
              label="Proof PDF export"
              detail={health.features?.serverPdf ? 'Server PDF on — Flow row actions can download proof packet' : 'MERIDIAN_ENABLE_SERVER_PDF or redeploy needed'}
            />
            <StatusRow
              ok={deployCurrent}
              label="Latest deploy"
              detail={
                deployCurrent
                  ? 'feedParity + /api/corpus live — benchmark matches Flow digest'
                  : !feedParity && corpus == null
                    ? 'Prod lagging main — push/redeploy, then re-run warm corpus'
                    : !feedParity
                      ? 'feedParity missing from /api/benchmark'
                      : '/api/corpus not deployed yet'
              }
              action={(
                <button type="button" onClick={loadRemote} className="m-btn-ghost m-btn-sm">
                  Re-check
                </button>
              )}
            />
            <StatusRow
              ok={health.features?.auth ? true : null}
              label="Clerk (optional polish)"
              detail={
                health.features?.auth
                  ? 'Live keys — no dev banner'
                  : 'pk_test is fine for demo; pk_live removes the yellow dev banner'
              }
            />
          </div>
        </WorkspaceSection>

        <WorkspaceSection title="5-minute beat sheet" description="Flow-first investor film — talk over loading states.">
          <ol className="space-y-3">
            <Beat
              n={1}
              title="Deal Flow — mandate watch"
              detail="Panache active, Watch mandate clicked. Filter Community. Point at founders + provenance badges."
              href="/flow"
              hrefLabel="Open Deal Flow →"
            />
            <Beat
              n={2}
              title="Proof on one row"
              detail="Download proof PDF or Copy proof. Mention falsifiable index checks, not PitchBook replacement."
              href="/flow"
            />
            <Beat
              n={3}
              title="CRM export"
              detail="Export CSV (Affinity-ready) or CRM copy on a strong row — ops handoff without retyping."
              href="/flow"
            />
            <Beat
              n={4}
              title="Brief close"
              detail="Brief on a domain-ready row. Talk over thesis-band drafting (~10s). Pursue in memo."
              href="/flow"
            />
            <Beat
              n={5}
              title="Coverage proof + earliness"
              detail="Pilot page for measured wedge stats; optional Earliness tab for index miss receipts."
              href="/pilot"
              hrefLabel="Open Coverage proof →"
            />
          </ol>
        </WorkspaceSection>

        <WorkspaceSection title="Env vars (minimum)" description="Paste on Vercel → Settings → Environment Variables → redeploy.">
          <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/60 p-4 font-mono text-[12px] leading-relaxed text-emerald-200">
{`DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
PERPLEXITY_API_KEY=pplx-...
STARTUPHUB_API_KEY=...

# Optional — cleaner demo
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
HUNTER_API_KEY=...          # Flow email enrich button
CRON_SECRET=...             # operator curls only`}
          </pre>
          <p className="mt-3 text-[13px] text-zinc-600">
            Copy template: <code className="rounded bg-zinc-100 px-1">.env.demo</code> in repo root.
            Terminal: <code className="rounded bg-zinc-100 px-1">npm run debate</code> (must avg ≥ 7) ·{' '}
            <code className="rounded bg-zinc-100 px-1">./scripts/demo-preflight.sh</code>
          </p>
        </WorkspaceSection>

        <WorkspaceSection title="Honest numbers" description="Say what is measured; do not over-claim.">
          <ul className="list-disc space-y-2 pl-5 text-[13px] text-zinc-600">
            <li>Community-sourced companies with founder lines and cohort provenance — not a full national registry.</li>
            <li>Verified index misses are checkable rows in Coverage proof — cite the count on screen, not a round marketing number.</li>
            <li>Corpus is growing via StartupHub + incubators (~300 today, target 1500) — say &quot;live corpus, measured daily&quot; not &quot;we have PitchBook.&quot;</li>
            <li>Do not open Team or claim EverTrace / WHOIS / Corporations Canada live coverage.</li>
          </ul>
        </WorkspaceSection>

        <WorkspaceSection title="Reset browser state (optional)" description="If a prior demo left the wrong fund or empty Flow.">
          <p className="text-[13px] text-zinc-600">
            DevTools → Application → Local Storage → clear <code className="rounded bg-zinc-100 px-1">meridian_funds_store</code>
            {' '}and reload — Panache re-seeds automatically.
          </p>
        </WorkspaceSection>
      </WorkspacePage>
    </WorkspaceShell>
  )
}
