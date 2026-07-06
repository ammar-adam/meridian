/**
 * Hypermode with funding:not_found — uses generateOnly + prefetched passes
 * (same failure mode as validation Test 3 when Perplexity returns not_found).
 */
const BASE = process.argv[2] || 'http://localhost:3000'
const PANACHE = {
  id: 'panache_ventures',
  fundName: 'Panache Ventures',
  fundFooterName: 'Panache Ventures',
  strategyId: 'primary',
  thesis: 'Panache backs Canadian pre-seed/seed founders.',
  portfolio: [{ name: 'Neo Financial' }, { name: 'Hopper' }],
  metricPreferences: ['total_raised', 'customer_traction', 'tam'],
}

function strip(s) {
  return (s ?? '').replace(/<[^>]+>/g, '').trim()
}

const scraped = await fetch(`${BASE}/api/scrape`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://www.hypermode.com' }),
}).then(r => r.json())

const prefetchedResearch = {
  passes: [
    { section: 'product', confidence: 'found', content: scraped?.ogDescription || 'Hypermode builds AI agent infrastructure.' },
    {
      section: 'funding',
      confidence: 'not_found',
      content: 'Lead investors and total funding are not publicly disclosed. No verified round size in public sources.',
    },
    { section: 'team', confidence: 'partial', content: 'Kevin Van Gundy is associated with Hypermode leadership.' },
    {
      section: 'market',
      confidence: 'partial',
      content: 'The AI agent infrastructure market is often cited at tens of billions industry-wide, but company-specific TAM is unverified.',
    },
  ],
}

const result = await fetch(`${BASE}/api/brief`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://www.hypermode.com',
    fundContext: PANACHE,
    researchMode: 'quick',
    forceRegenerate: true,
    generateOnly: true,
    scraped,
    prefetchedResearch,
  }),
}).then(r => r.json())

console.log('=== FIX 2: hypermode funding:not_found (generateOnly) ===')
console.log('passConfidences:', result.researchPasses?.map(p => `${p.section}:${p.confidence}`).join(', '))
console.log('STAT_1_VALUE:', strip(result.memoData?.STAT_1_VALUE))
console.log('STAT_1_LABEL:', strip(result.memoData?.STAT_1_LABEL))
console.log('STAT_3_VALUE:', strip(result.memoData?.STAT_3_VALUE))
console.log('STAT_3_LABEL:', strip(result.memoData?.STAT_3_LABEL))
console.log('ROUND:', strip(result.memoData?.ROUND))
console.log('LEAD_INVESTOR:', strip(result.memoData?.LEAD_INVESTOR))
console.log('TOTAL_RAISED:', strip(result.memoData?.TOTAL_RAISED))
