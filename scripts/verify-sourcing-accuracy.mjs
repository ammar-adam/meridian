/**
 * Accuracy sample across incubator / grant / domain_registry entities.
 * node --import ./scripts/alias-register.mjs scripts/verify-sourcing-accuracy.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
for (const line of fs.readFileSync(path.join(root, '.env.local'), 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i <= 0) continue
  const k = t.slice(0, i).trim()
  if (!process.env[k]) process.env[k] = t.slice(i + 1).trim()
}

const { runIncubatorAdapter } = await import('../lib/sourcing/incubator-adapter.js')
const { runGrantAdapter } = await import('../lib/sourcing/grant-adapter.js')
const { runDomainRegistryAdapter } = await import('../lib/sourcing/domain-registry-adapter.js')
const { runPerplexityQuery } = await import('../lib/discover-research.js')

function parseVerdict(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    const m = raw?.match(/\{[\s\S]*\}/)
    if (!m) return null
    try {
      return JSON.parse(m[0])
    } catch {
      return null
    }
  }
}

function pickSample(list, n, seed = 7) {
  const copy = [...list]
  // deterministic shuffle
  for (let i = copy.length - 1; i > 0; i--) {
    const j = (seed * (i + 3)) % (i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

const incubator = runIncubatorAdapter()
const grants = runGrantAdapter()
const registry = await runDomainRegistryAdapter({
  keywords: ['pay', 'finance', 'capital', 'tech', 'software', 'data', 'ai', 'digital'],
  sinceDate: '2023-01-01',
  limit: 100,
  concurrency: 20,
})

const sample = [
  ...pickSample(incubator.filter(e => e.companyName), 6, 11),
  ...pickSample(grants, 3, 13),
  ...pickSample(registry.entities, 4, 17),
].slice(0, 15)

console.log('=== Part 4 — Sourcing accuracy sample ===')
console.log('Sample size:', sample.length)

const verdicts = []
for (const e of sample) {
  const founders = e.personName ? ` Founder(s) claimed: ${e.personName}.` : ''
  const domain = e.domain ? ` Domain claimed: ${e.domain}.` : ''
  const query = `Verify this startup claim for due diligence.
Company: "${e.companyName}".${domain}${founders}
Source provenance: ${e.provenance}.
Reply ONLY JSON:
{"companyExists":true|false|null,"founderMatch":true|false|null,"verdict":"accurate"|"inaccurate"|"inconclusive","notes":"one short sentence"}
Use null when you cannot tell. Prefer inconclusive over guessing. Do not invent.`

  let raw = ''
  let err = null
  try {
    raw = await runPerplexityQuery(query)
  } catch (ex) {
    err = ex.message
  }
  const parsed = parseVerdict(raw) || {
    companyExists: null,
    founderMatch: null,
    verdict: err ? 'inconclusive' : 'inconclusive',
    notes: err || 'unparseable response',
  }

  const row = {
    companyName: e.companyName,
    source: e.source,
    provenance: e.provenance,
    personName: e.personName,
    domain: e.domain,
    ...parsed,
    raw: String(raw || '').slice(0, 280),
  }
  verdicts.push(row)
  console.log(`${e.companyName} [${e.source}] → ${row.verdict}`)
}

const counts = {
  accurate: verdicts.filter(v => v.verdict === 'accurate').length,
  inaccurate: verdicts.filter(v => v.verdict === 'inaccurate').length,
  inconclusive: verdicts.filter(v => v.verdict === 'inconclusive').length,
}

const out = {
  checkedAt: new Date().toISOString(),
  sampleSize: verdicts.length,
  counts,
  accurateRateExcludingInconclusive: (counts.accurate + counts.inaccurate)
    ? Number((counts.accurate / (counts.accurate + counts.inaccurate)).toFixed(3))
    : null,
  verdicts,
}

fs.writeFileSync(
  path.join(root, 'scripts/verify-output/sourcing-accuracy.json'),
  JSON.stringify(out, null, 2),
)

const md = `# Sourcing accuracy check

**Date:** ${out.checkedAt.slice(0, 10)}
**Sample:** ${out.sampleSize} entities across incubator / grant / domain_registry
**Method:** targeted Perplexity verification (exists? founder match?). Inconclusive is expected for stealth / thin web presence.

## Aggregate

| Verdict | Count |
|---------|-------|
| accurate | ${counts.accurate} |
| inaccurate | ${counts.inaccurate} |
| inconclusive | ${counts.inconclusive} |

**Accurate among decisive (accurate+inaccurate):** ${out.accurateRateExcludingInconclusive ?? 'n/a'}

## Per-entity

| Company | Source | Verdict | Notes |
|---------|--------|---------|-------|
${verdicts.map(v => `| ${v.companyName} | ${v.source} | **${v.verdict}** | ${(v.notes || '').replace(/\|/g, '/')} |`).join('\n')}

## Interpretation

- High **inconclusive** on incubator rows without domains is expected (early / low press) and does **not** by itself mean the cohort list is wrong — the falsifiable test already showed Meridian often has *more* structure than generic search.
- Any **inaccurate** rows should be treated as bugs (bad merge, wrong domain guess, or bad transcription) and fixed or removed.
`

fs.writeFileSync(path.join(root, 'docs/sourcing-accuracy-results.md'), md)
console.log('\nCounts:', counts)
console.log('Wrote docs/sourcing-accuracy-results.md')
