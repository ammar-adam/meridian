import { describe, it, expect } from 'vitest'
import { runGenerate } from '@/lib/generate-core'
import { loadEnvLocal, repoRootFrom } from '../lib/load-env-local.mjs'

const root = repoRootFrom(import.meta.url)
loadEnvLocal(root)

const PANACHE = {
  id: 'panache_ventures',
  fundName: 'Panache Ventures',
  fundFooterName: 'Panache Ventures',
  strategyId: 'primary',
  thesis: 'Panache backs Canadian pre-seed/seed founders.',
  portfolio: [{ name: 'Neo Financial' }, { name: 'Hopper' }],
  thesisInstructions: 'Each thesis point must name a portfolio company.',
  metricPreferences: ['total_raised', 'customer_traction', 'tam'],
}

describe.skipIf(!process.env.ANTHROPIC_API_KEY)('confidence enforcement live', () => {
  it('strips funding stats when funding pass is not_found (hypermode)', { timeout: 300_000 }, async () => {
    const researchPasses = [
      { section: 'product', confidence: 'found', content: 'Hypermode builds AI agents.' },
      {
        section: 'funding',
        confidence: 'not_found',
        content: 'Lead investors are not publicly disclosed. Total amount unclear from public sources.',
      },
      { section: 'team', confidence: 'partial', content: 'Kevin Van Gundy founded Hypermode.' },
    ]
    const scraped = {
      domain: 'hypermode.com',
      ogTitle: 'Hypermode',
      ogDescription: 'AI agent platform',
      favicon: '',
    }

    const { memoData } = await runGenerate({
      research: researchPasses.map(p => `## ${p.section}\n${p.content}`).join('\n\n'),
      researchPasses,
      scraped,
      fundContext: PANACHE,
      forceRegenerate: true,
      researchMode: 'quick',
    })

    console.log('LIVE_ENFORCEMENT', {
      fundingConfidence: 'not_found',
      STAT_1_VALUE: memoData.STAT_1_VALUE,
      STAT_1_LABEL: memoData.STAT_1_LABEL,
      STAT_2_VALUE: memoData.STAT_2_VALUE,
      STAT_3_VALUE: memoData.STAT_3_VALUE,
      ROUND: memoData.ROUND,
      LEAD_INVESTOR: memoData.LEAD_INVESTOR,
    })

    expect(memoData.STAT_1_VALUE).toBe('Undisclosed')
    expect(memoData.STAT_1_LABEL?.toLowerCase()).toContain('raised')
  })
})
