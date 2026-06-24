/**
 * PitchBook company search. Requires PITCHBOOK_API_KEY (PB-Token).
 * Returns [] if not configured — Perplexity fills the gap.
 */
export function isPitchbookConfigured() {
  const apiKey = process.env.PITCHBOOK_API_KEY
  return Boolean(apiKey && apiKey !== 'your_key_here')
}

/** Lightweight auth check for /api/health */
export async function verifyPitchbook() {
  if (!isPitchbookConfigured()) {
    return { configured: false, ok: false }
  }

  try {
    const res = await fetch('https://api.pitchbook.com/account/credits', {
      headers: {
        Authorization: `PB-Token ${process.env.PITCHBOOK_API_KEY}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    })
    return { configured: true, ok: res.ok, status: res.status }
  } catch (e) {
    console.error('[pitchbook] verify error:', e.message)
    return { configured: true, ok: false }
  }
}

export async function searchPitchbook(params) {
  const apiKey = process.env.PITCHBOOK_API_KEY
  if (!isPitchbookConfigured()) {
    console.log('[pitchbook] API key not configured, skipping')
    return []
  }

  const searchParams = new URLSearchParams()
  if (params.pitchbookQuery) searchParams.set('keywords', params.pitchbookQuery)
  if (params.sectors?.[0]) searchParams.set('industry', params.sectors[0])
  if (params.stages?.[0]) searchParams.set('stage', params.stages[0])
  if (params.geographies?.[0]) searchParams.set('region', params.geographies[0])
  if (params.fundingMin) searchParams.set('fundingMin', String(params.fundingMin))
  if (params.fundingMax) searchParams.set('fundingMax', String(params.fundingMax))
  if (params.foundedAfter) searchParams.set('foundedAfter', String(params.foundedAfter))
  searchParams.set('limit', '50')

  try {
    const res = await fetch(`https://api.pitchbook.com/companies/search?${searchParams}`, {
      headers: {
        Authorization: `PB-Token ${apiKey}`,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[pitchbook] search failed:', res.status, err)
      return []
    }

    const data = await res.json()
    const items = data.items ?? data.results ?? data.companies ?? data.data ?? []

    return items.map(normalizePitchbookCompany).filter(Boolean)
  } catch (e) {
    console.error('[pitchbook] error:', e.message)
    return []
  }
}

function normalizePitchbookCompany(item) {
  const name = item.companyName ?? item.name ?? item.legalName
  if (!name) return null

  const domain = item.website ?? item.domain ?? item.url ?? ''
  const url = domain.startsWith('http') ? domain : domain ? `https://${domain}` : ''

  return {
    name,
    description: item.description ?? item.businessDescription ?? item.tagline ?? '',
    stage: item.lastFinancingStage ?? item.stage ?? item.financingStatus ?? 'Undisclosed',
    geography: item.hqLocation ?? item.region ?? item.country ?? '',
    sector: item.primaryIndustry ?? item.industry ?? item.sector ?? '',
    domain: domain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    url: url || (domain ? `https://${domain}` : ''),
    totalRaised: item.totalRaised ?? item.totalFunding ?? '',
    investors: item.leadInvestors ?? item.investors ?? '',
    source: 'pitchbook',
    foundedYear: item.yearFounded ?? item.founded ?? null,
  }
}
