import { runPerplexityQuery } from '@/lib/discover-research'
import { confidenceRank, entityId } from '@/lib/sourcing/entity-schema'
import { extractDomain } from '@/lib/url-utils'

function parseJsonLoose(text) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) return null
    try {
      return JSON.parse(m[0])
    } catch {
      return null
    }
  }
}

async function queryPersonToCompany(personName) {
  if (!process.env.PERPLEXITY_API_KEY || process.env.PERPLEXITY_API_KEY === 'your_key_here') {
    return { companyName: null, domain: null, confidence: 'none', reason: 'no_perplexity_key' }
  }
  const query = `Is "${personName}" currently a founder or co-founder of a startup company?
If yes, reply with ONLY JSON: {"companyName":"...","domain":"example.com or null","confidence":"high|medium|low"}
If unknown or not a founder, reply: {"companyName":null,"domain":null,"confidence":"none"}
Do not invent companies.`
  try {
    const raw = await runPerplexityQuery(query)
    const parsed = parseJsonLoose(raw)
    if (!parsed?.companyName) {
      return { companyName: null, domain: null, confidence: 'none', reason: 'not_found', raw: raw?.slice(0, 300) }
    }
    return {
      companyName: String(parsed.companyName).trim(),
      domain: parsed.domain ? extractDomain(parsed.domain) : null,
      confidence: parsed.confidence || 'low',
      raw: raw?.slice(0, 300),
    }
  } catch (err) {
    return { companyName: null, domain: null, confidence: 'none', reason: err.message }
  }
}

async function queryCompanyToFounder(companyName, domain) {
  if (!process.env.PERPLEXITY_API_KEY || process.env.PERPLEXITY_API_KEY === 'your_key_here') {
    return { founderName: null, confidence: 'none', reason: 'no_perplexity_key' }
  }
  const domainHint = domain ? ` (website ${domain})` : ''
  const query = `Who founded or co-founded the company "${companyName}"${domainHint}?
Reply with ONLY JSON: {"founderName":"Full Name or null","confidence":"high|medium|low"}
If unknown, founderName must be null. Do not invent names.`
  try {
    const raw = await runPerplexityQuery(query)
    const parsed = parseJsonLoose(raw)
    if (!parsed?.founderName) {
      return { founderName: null, confidence: 'none', reason: 'not_found', raw: raw?.slice(0, 300) }
    }
    return {
      founderName: String(parsed.founderName).trim(),
      confidence: parsed.confidence || 'low',
      raw: raw?.slice(0, 300),
    }
  } catch (err) {
    return { founderName: null, confidence: 'none', reason: err.message }
  }
}

function normalizeKeyPart(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 60)
}

export function dedupeByCompanyOrPerson(entities) {
  const map = new Map()
  const orphans = []

  for (const e of entities || []) {
    const domain = e.domain ? extractDomain(e.domain) : ''
    const companyKey = normalizeKeyPart(e.companyName)
    const personKey = normalizeKeyPart(e.personName)
    const key = domain
      ? `d:${domain}`
      : companyKey
        ? `c:${companyKey}`
        : personKey
          ? `p:${personKey}`
          : null

    if (!key) {
      orphans.push(e)
      continue
    }

    const prev = map.get(key)
    if (!prev) {
      map.set(key, { ...e })
      continue
    }

    const provenances = [...new Set([prev.provenance, e.provenance].filter(Boolean))]
    const sources = [...new Set([prev.source, e.source].filter(Boolean))]
    const better = confidenceRank(e.confidence) > confidenceRank(prev.confidence) ? e : prev
    const weaker = better === e ? prev : e

    map.set(key, {
      ...better,
      id: better.id || weaker.id || entityId('merged', key),
      type: (better.personName || weaker.personName) && (better.companyName || weaker.companyName)
        ? 'linked'
        : better.type,
      personName: better.personName || weaker.personName || null,
      companyName: better.companyName || weaker.companyName || null,
      domain: better.domain || weaker.domain || null,
      provenance: provenances.join(' · '),
      confidence: confidenceRank(e.confidence) >= confidenceRank(prev.confidence) ? e.confidence : prev.confidence,
      source: sources.length > 1 ? better.source : better.source,
      sourceMeta: {
        ...weaker.sourceMeta,
        ...better.sourceMeta,
        mergedSources: sources,
        mergedProvenance: provenances,
      },
    })
  }

  return [...map.values(), ...orphans]
}

/**
 * Fill missing person↔company halves via targeted Perplexity; then dedupe.
 * Never fabricates: failed lookups leave the entity partial.
 */
export async function resolveEntities(entities, { resolveMissing = true, concurrency = 2 } = {}) {
  const input = [...(entities || [])]
  const resolved = []

  async function resolveOne(entity) {
    if (!resolveMissing || entity.type === 'linked') {
      return entity
    }

    if (entity.type === 'person' && !entity.companyName) {
      const companyGuess = await queryPersonToCompany(entity.personName)
      const linked = Boolean(companyGuess?.companyName)
      return {
        ...entity,
        companyName: companyGuess?.companyName || null,
        domain: entity.domain || companyGuess?.domain || null,
        type: linked ? 'linked' : 'person',
        sourceMeta: {
          ...entity.sourceMeta,
          resolutionAttempted: true,
          resolutionResult: companyGuess,
        },
      }
    }

    if (entity.type === 'company' && !entity.personName) {
      const founderGuess = await queryCompanyToFounder(entity.companyName, entity.domain)
      const linked = Boolean(founderGuess?.founderName)
      return {
        ...entity,
        personName: founderGuess?.founderName || null,
        type: linked ? 'linked' : 'company',
        sourceMeta: {
          ...entity.sourceMeta,
          resolutionAttempted: true,
          resolutionResult: founderGuess,
        },
      }
    }

    return entity
  }

  for (let i = 0; i < input.length; i += concurrency) {
    const batch = input.slice(i, i + concurrency)
    const out = await Promise.all(batch.map(resolveOne))
    resolved.push(...out)
  }

  return dedupeByCompanyOrPerson(resolved)
}

export { queryPersonToCompany, queryCompanyToFounder }
