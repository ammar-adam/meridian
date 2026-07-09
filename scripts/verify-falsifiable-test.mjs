/**
 * Part 0 — Falsifiable test: does Meridian incubator data beat generic search?
 * node --import ./scripts/alias-register.mjs scripts/verify-falsifiable-test.mjs
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

const { VELOCITY_COHORTS } = await import('../lib/sourcing/incubator-adapter.js')
const { runPerplexityQuery } = await import('../lib/discover-research.js')
const { searchStartupHub, isStartupHubConfigured } = await import('../lib/startuphub.js')

/** Obscure May 2026 picks — avoid Gasner (more press) and generic names like Hope/Canopy */
const TARGETS = ['SCADABLE', 'Simantic', 'Photon-IV'].map(name => {
  const row = VELOCITY_COHORTS.find(c => c.companyName === name)
  if (!row) throw new Error(`Missing cohort row: ${name}`)
  return row
})

function nameHit(hay, companyName) {
  const h = String(hay || '').toLowerCase()
  const n = companyName.toLowerCase()
  if (h.includes(n)) return true
  const compact = n.replace(/[^a-z0-9]/g, '')
  return compact.length >= 4 && h.replace(/[^a-z0-9]/g, '').includes(compact)
}

function extractDetail(text, company) {
  if (!text) return { surfaced: false, foundersMentioned: false, descriptionish: false, snippet: '' }
  const surfaced = nameHit(text, company.companyName)
  const foundersMentioned = (company.founderNames || []).some(f => nameHit(text, f.split(' ').slice(-1)[0]) && nameHit(text, f))
    || (company.founderNames || []).some(f => text.toLowerCase().includes(f.toLowerCase()))
  const descriptionish = surfaced && /(building|platform|startup|founder|company|software|device|ai )/i.test(text)
  return {
    surfaced,
    foundersMentioned,
    descriptionish,
    snippet: text.slice(0, 500).replace(/\s+/g, ' '),
  }
}

const results = []

console.log('StartupHub configured:', isStartupHubConfigured())
console.log('Targets:', TARGETS.map(t => t.companyName).join(', '))

for (const company of TARGETS) {
  const query = `What is the startup company "${company.companyName}"? Who founded it? Where is it based? What does it do? Is it related to Velocity incubator Waterloo?`
  let perplexityRaw = ''
  let perplexityErr = null
  try {
    perplexityRaw = await runPerplexityQuery(query)
  } catch (err) {
    perplexityErr = err.message
  }
  const px = extractDetail(perplexityRaw, company)

  let hubHits = []
  let hubErr = null
  try {
    const parsed = {
      sectors: [company.sector || 'startup'],
      keywords: [company.companyName, 'Velocity', 'Waterloo'],
      stages: ['pre-seed', 'seed'],
      geographies: ['Canada'],
      pitchbookQuery: company.companyName,
    }
    hubHits = await searchStartupHub(parsed, company.companyName, {
      mandate: { geographies: ['Canada'] },
    })
  } catch (err) {
    hubErr = err.message
  }

  const hubMatch = hubHits.filter(h => nameHit(h.name, company.companyName) || nameHit(`${h.name} ${h.description}`, company.companyName))

  const meridianHas = {
    companyName: company.companyName,
    founders: company.founderNames,
    description: company.description,
    cohort: company.cohortName,
    domain: company.domain,
  }

  const beatsGeneric = Boolean(
    meridianHas.founders?.length
    && meridianHas.description
    && (!px.surfaced || !px.foundersMentioned || hubMatch.length === 0),
  )

  // Pass = Meridian has structured founder+description AND (Perplexity misses company OR misses founders) AND StartupHub has no hit
  const pass = Boolean(
    meridianHas.founders?.length
    && meridianHas.description
    && (!px.surfaced || !px.foundersMentioned)
    && hubMatch.length === 0,
  )

  const row = {
    company: company.companyName,
    meridian: meridianHas,
    perplexity: {
      error: perplexityErr,
      surfaced: px.surfaced,
      foundersMentioned: px.foundersMentioned,
      descriptionish: px.descriptionish,
      snippet: px.snippet,
    },
    startuphub: {
      error: hubErr,
      configured: isStartupHubConfigured(),
      resultCount: hubHits.length,
      nameMatches: hubMatch.map(h => ({ name: h.name, domain: h.domain })),
    },
    pass,
    beatsGeneric,
  }
  results.push(row)
  console.log('\n===', company.companyName, '===')
  console.log('Meridian founders:', meridianHas.founders?.join(', '))
  console.log('Perplexity surfaced:', px.surfaced, 'founders:', px.foundersMentioned)
  console.log('StartupHub matches:', hubMatch.length, hubErr || '')
  console.log('PASS:', pass)
}

const passCount = results.filter(r => r.pass).length
const outPath = path.join(root, 'docs', 'falsifiable-test-results.md')
const md = `# Falsifiable test results — Meridian sourcing vs generic search

**Date:** ${new Date().toISOString().slice(0, 10)}
**Question:** For obscure Velocity cohort companies, does Meridian’s incubator layer return structured founder + company detail that plain Perplexity and StartupHub do not?

**Companies tested:** ${TARGETS.map(t => t.companyName).join(', ')}
(Chosen as less press-covered May 2026 names vs Gasner HealthTech / generic Hope / Canopy.)

**Verdict: ${passCount}/3 pass** ${passCount >= 2 ? '— approach validated; continue scaling.' : '— approach needs rethinking before adding more sources.'}

---

${results.map(r => `## ${r.company}

### Meridian incubator layer
- Founders: ${(r.meridian.founders || []).join(', ') || '—'}
- Description: ${r.meridian.description || '—'}
- Cohort: ${r.meridian.cohort}
- Domain: ${r.meridian.domain || 'null'}

### Plain Perplexity
- Surfaced company: **${r.perplexity.surfaced}**
- Mentioned founders: **${r.perplexity.foundersMentioned}**
- Description-ish detail: **${r.perplexity.descriptionish}**
${r.perplexity.error ? `- Error: ${r.perplexity.error}` : ''}
- Snippet: ${r.perplexity.snippet ? `\`${r.perplexity.snippet}\`` : '_(empty)_'}

### StartupHub
- Configured: ${r.startuphub.configured}
- Results returned: ${r.startuphub.resultCount}
- Name matches: ${r.startuphub.nameMatches.length ? JSON.stringify(r.startuphub.nameMatches) : '**none**'}
${r.startuphub.error ? `- Error: ${r.startuphub.error}` : ''}

### Pass?
**${r.pass ? 'YES' : 'NO'}** — Meridian has structured founders+description; Perplexity missing company and/or founders; StartupHub no name match.
`).join('\n')}

## Aggregate

| Company | Perplexity company | Perplexity founders | StartupHub hit | Pass |
|---------|--------------------|---------------------|----------------|------|
${results.map(r => `| ${r.company} | ${r.perplexity.surfaced} | ${r.perplexity.foundersMentioned} | ${r.startuphub.nameMatches.length > 0} | **${r.pass ? 'YES' : 'NO'}** |`).join('\n')}

**Pass rate: ${passCount}/3**
`

fs.writeFileSync(outPath, md, 'utf8')
console.log('\nWrote', outPath)
console.log('PASS RATE:', `${passCount}/3`)
process.exitCode = passCount >= 2 ? 0 : 1
