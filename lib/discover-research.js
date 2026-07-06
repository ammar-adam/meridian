import { MODELS } from '@/lib/api-models'
import {
  canadianQuerySuffix,
  isCanadianMandate,
  normalizeGeographies,
} from '@/lib/geography-utils'
import { fetchStealthFounderSignals } from '@/lib/evertrace'

export async function runPerplexityQuery(query) {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODELS.perplexitySearch,
      messages: [{ role: 'user', content: query }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Perplexity failed: ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

export function buildDiscoverResearchPlan(parsed, thesis, fundContext) {
  const year = new Date().getFullYear()
  const geos = normalizeGeographies(parsed?.geographies, fundContext)
  const geoLabel = geos.join(', ') || 'North America'
  const canadaSuffix = canadianQuerySuffix(geos, fundContext)
  const stages = parsed?.stages?.join(', ') || 'early-stage'
  const sectors = parsed?.sectors?.join(', ') || 'as described'

  const generalQuery = parsed?.perplexityQuery ?? `
    Find companies matching this investment thesis: ${thesis}
    Fund mandate: ${fundContext?.thesis || ''}
    Focus on: ${stages} companies in ${geoLabel}.
    Sectors: ${sectors}.
    Year: ${year}.
    List at least 20 specific companies. For each return: name, website domain, one-line description, funding stage, total raised, lead investors, HQ geography.
    ${canadaSuffix}
  `.trim()

  const plans = [{ id: 'general', label: 'General web research', query: generalQuery }]

  if (isCanadianMandate(geos, fundContext)) {
    plans.push({
      id: 'canadian_web',
      label: 'Canadian startup focus',
      query: `
        List 25+ real Canadian startups and scale-ups matching: ${thesis}
        Sectors: ${sectors}. Stages: ${stages}. Year ${year}.
        Include companies across Toronto, Montreal, Vancouver, Calgary, Waterloo, and other Canadian hubs.
        Prioritize under-the-radar companies a Canadian pre-seed/seed fund might not have seen on US-centric databases.
        For each: name, domain, description, stage, funding, investors, city/province.
        Only include companies with evidence of Canadian HQ or Canadian founding team.
      `.trim(),
    })

    plans.push({
      id: 'stealth_signal',
      label: 'Stealth / early signals (unverified)',
      unverified: true,
      query: `
        Find earliest-stage Canadian founder activity related to: ${thesis}
        Look for: recent Canadian incorporation filings, new .ca domain registrations tied to founders,
        stealth startups with minimal public presence, university spinouts, and pre-launch technical founders in Canada.
        Year ${year}. These are UNVERIFIED leads — include only if you have a concrete signal (domain, registry, GitHub, grant).
        For each: founder or company name, domain if known, signal type, city, one-line on what they're building.
        Mark uncertain leads clearly. Prefer pre-seed/seed over later stage.
      `.trim(),
    })
  }

  return plans
}

export async function runDiscoverResearch(plans) {
  const parallel = plans.filter(p => p.id === 'general' || p.id === 'canadian_web')
  const sequential = plans.filter(p => !parallel.includes(p))

  const parallelResults = await Promise.all(
    parallel.map(async (plan) => {
      try {
        const content = await runPerplexityQuery(plan.query)
        return { ...plan, content, ok: true }
      } catch (err) {
        console.error(`[discover-research] ${plan.id}:`, err.message)
        return { ...plan, content: '', ok: false, error: err.message }
      }
    }),
  )

  const seqResults = []
  for (const plan of sequential) {
    try {
      const content = await runPerplexityQuery(plan.query)
      seqResults.push({ ...plan, content, ok: true })
    } catch (err) {
      console.error(`[discover-research] ${plan.id}:`, err.message)
      seqResults.push({ ...plan, content: '', ok: false, error: err.message })
    }
  }

  return [...parallelResults, ...seqResults]
}

/** EverTrace + any future structured stealth APIs */
export async function fetchStructuredStealthSignals(parsed, thesis, fundContext) {
  const geos = normalizeGeographies(parsed?.geographies, fundContext)
  try {
    return await fetchStealthFounderSignals({
      thesis,
      geographies: geos,
      limit: 25,
    })
  } catch (err) {
    console.log('[discover-research] structured stealth:', err.message)
    return []
  }
}

export function formatResearchForRanker(researchResults) {
  return researchResults
    .filter(r => r.content?.trim())
    .map(r => `### ${r.label}${r.unverified ? ' (UNVERIFIED — treat as stealth signal)' : ''}\n${r.content}`)
    .join('\n\n')
}
