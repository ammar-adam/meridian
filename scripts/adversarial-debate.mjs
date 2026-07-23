#!/usr/bin/env node
/**
 * Four-persona adversarial debate — scores prod + repo readiness.
 * Usage: node scripts/adversarial-debate.mjs [BASE_URL]
 * Exit 0 when average score ≥ 7.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { scoreAdversarialDebate, PERSONAS } from '../lib/adversarial-debate.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const BASE = (process.argv[2] || process.env.SMOKE_BASE_URL || 'https://meridian-eight-sandy.vercel.app').replace(/\/$/, '')
const MIN_SCORE = Number(process.env.DEBATE_MIN_SCORE || 7)

async function fetchJson(url, init) {
  try {
    const res = await fetch(url, { ...init, cache: 'no-store' })
    if (!res.ok) return { ok: false, status: res.status, data: null }
    return { ok: true, status: res.status, data: await res.json() }
  } catch (err) {
    return { ok: false, error: err.message, data: null }
  }
}

function fileExists(rel) {
  return fs.existsSync(path.join(ROOT, rel))
}

function geoFallbackInCode() {
  const src = fs.readFileSync(path.join(ROOT, 'lib/server/mandate-match.js'), 'utf8')
  return /usedGeoFallback\s*=\s*true/.test(src)
    || /geoKept\s*=\s*\[\.\.\.geoKept,\s*\.\.\.fallback\]/.test(src)
}

function landingHonest() {
  const src = fs.readFileSync(path.join(ROOT, 'app/page.jsx'), 'utf8')
  return !/Before public indexes|before Harmonic/i.test(src)
    && (/StartupHub|community/i.test(src))
}

function panacheDefaultInSeeds() {
  const src = fs.readFileSync(path.join(ROOT, 'lib/fund-seeds.js'), 'utf8')
  return src.includes('setActiveFundId(PANACHE_VENTURES.id)')
}

async function postLocked(route) {
  const res = await fetch(`${BASE}${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entityName: 'DebateProbe', outcome: 'pass' }),
  })
  return res.status === 401 || res.status === 403
}

async function runProbes() {
  const [health, benchmark, pilot, corpus, demoPage] = await Promise.all([
    fetchJson(`${BASE}/api/health`),
    fetchJson(`${BASE}/api/benchmark`),
    fetchJson(`${BASE}/api/pilot`),
    fetchJson(`${BASE}/api/corpus`),
    fetch(`${BASE}/demo`, { cache: 'no-store' }).then(r => ({ ok: r.ok, status: r.status })).catch(() => ({ ok: false })),
  ])

  const bench = benchmark.data
  const pilotData = pilot.data
  const verifiedMisses = bench?.stats?.verifiedMisses ?? pilotData?.metrics?.verifiedMiss ?? 0
  const entitiesChecked = bench?.stats?.entitiesChecked ?? pilotData?.metrics?.entitiesChecked ?? 0
  const companyRecords = bench?.stats?.companyRecords ?? corpus.data?.companyRecords ?? null

  const pilotVerified = pilotData?.headlineMetrics?.verifiedMisses ?? pilotData?.metrics?.verifiedMiss
  const benchVerified = bench?.stats?.verifiedMisses
  const pilotBenchmarkParity = benchVerified == null || pilotVerified == null
    ? false
    : pilotVerified === benchVerified
      || Math.abs(pilotVerified - benchVerified) <= 1

  let flowReturnsRows = false
  let briefReadyCount = 0
  try {
    const flowRes = await fetch(`${BASE}/api/flow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        thesis: 'Canadian pre-seed AI enterprise software founders',
        fundContext: {
          fundName: 'Panache Ventures',
          id: 'panache_ventures',
          mandate: { geographies: ['Canada'], stages: ['pre-seed', 'seed'] },
        },
      }),
    })
    const flow = await flowRes.json()
    flowReturnsRows = Array.isArray(flow.companies) && flow.companies.length > 0
    briefReadyCount = flow.meta?.briefReadyCount
      ?? flow.companies?.filter(c => c.domain && String(c.domain).includes('.')).length
      ?? 0
  } catch { /* optional */ }

  let scrapeOk = false
  try {
    const t0 = Date.now()
    const scrape = await fetch(`${BASE}/api/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://stripe.com' }),
    })
    scrapeOk = scrape.ok && Date.now() - t0 < 12000
  } catch { /* optional */ }

  const [outcomesLocked, claimLocked] = await Promise.all([
    postLocked('/api/outcomes'),
    postLocked('/api/claim'),
  ])

  return {
    healthOk: health.ok && health.data?.ok,
    coreFeatures: health.data?.features || {},
    corpusLive: corpus.ok && corpus.data?.ok,
    feedParity: Boolean(bench?.feedParity?.feedStats),
    companyRecords,
    entitiesChecked,
    verifiedMisses,
    pilotBenchmarkParity,
    flowReturnsRows,
    briefReadyCount,
    briefableFilter: fileExists('app/flow/page.jsx')
      && fs.readFileSync(path.join(ROOT, 'app/flow/page.jsx'), 'utf8').includes('briefableOnly'),
    scrapeOk,
    proofPdf: health.data?.features?.serverPdf === true,
    crmExport: fileExists('lib/crm-export.js'),
    flowDigest: health.data?.features?.flowDigest === true,
    hunterEnrichment: health.data?.features?.hunterEnrichment === true,
    outcomesLocked,
    claimLocked,
    geoFallbackInCode: geoFallbackInCode(),
    geoHonestEmpty: !geoFallbackInCode(),
    landingHonest: landingHonest(),
    clerkLive: health.data?.features?.auth === true,
    panacheDefault: panacheDefaultInSeeds(),
    watchMachinery: fileExists('lib/mandate-watch.js'),
    demoPage: demoPage.ok,
    handoffDoc: fileExists('docs/DEMO-HANDOFF.md'),
    preflightScript: fileExists('scripts/demo-preflight.sh'),
    pricingPage: fileExists('app/pricing/page.jsx'),
    allocatorSetup: fs.readFileSync(path.join(ROOT, 'app/fund/setup/page.jsx'), 'utf8').includes('personal'),
    claimsAuditPass: !fs.readFileSync(path.join(ROOT, 'lib/server/mandate-match.js'), 'utf8').includes('geoKept = [...geoKept, ...fallback]'),
  }
}

function printReport(result, probe) {
  console.log(`\nAdversarial debate — ${BASE}`)
  console.log(`Target: average ≥ ${MIN_SCORE}/10\n`)

  console.log('Persona averages:')
  for (const p of PERSONAS) {
    const s = result.personas[p]
    const mark = s >= MIN_SCORE ? '✓' : '!'
    console.log(`  ${mark} ${p.padEnd(10)} ${s.toFixed(1)}`)
  }

  console.log(`\nOverall average: ${result.average}/10 ${result.ready ? '— READY' : '— NOT READY'}\n`)

  console.log('Key probes:')
  console.log(`  companyRecords: ${probe.companyRecords ?? '—'}`)
  console.log(`  entitiesChecked: ${probe.entitiesChecked ?? '—'}`)
  console.log(`  verifiedMisses: ${probe.verifiedMisses ?? '—'}`)
  console.log(`  corpusLive: ${probe.corpusLive} · feedParity: ${probe.feedParity}`)
  console.log(`  pilot/benchmark parity: ${probe.pilotBenchmarkParity}`)
  console.log(`  auth locks (outcomes/claim): ${probe.outcomesLocked}/${probe.claimLocked}`)
  console.log(`  geo fallback removed: ${!probe.geoFallbackInCode}`)
}

async function main() {
  const probe = await runProbes()
  const result = scoreAdversarialDebate(probe)
  printReport(result, probe)

  if (!result.ready) {
    console.error(`\nBlocked: average ${result.average} < ${MIN_SCORE}. Fix amber personas above.`)
    process.exit(1)
  }
  console.log('\nDemo handoff approved — average score meets bar.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
