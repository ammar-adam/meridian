import { describe, it, expect } from 'vitest'
import { flagSerialFounders } from '@/lib/server/founder-graph'
import { parseScoutCandidates } from '@/lib/sourcing/scout-parse'

describe('flagSerialFounders', () => {
  it('returns empty when no person has 2+ companies', () => {
    expect(flagSerialFounders([
      { personId: 'ada lovelace', companyId: 'acme.ai', companyName: 'Acme' },
      { personId: 'grace hopper', companyId: 'beta.io', companyName: 'Beta' },
    ])).toEqual({})
  })

  it('flags all companies for a serial founder', () => {
    const flags = flagSerialFounders([
      { personId: 'ada lovelace', companyId: 'acme.ai', companyName: 'Acme' },
      { personId: 'ada lovelace', companyId: 'beta.io', companyName: 'Beta' },
      { personId: 'grace hopper', companyId: 'gamma.co', companyName: 'Gamma' },
    ])
    expect(flags['acme.ai']).toEqual({ serial: true, priorCompanies: ['Beta'] })
    expect(flags['beta.io']).toEqual({ serial: true, priorCompanies: ['Acme'] })
    expect(flags['gamma.co']).toBeUndefined()
  })

  it('dedupes duplicate links', () => {
    const flags = flagSerialFounders([
      { personId: 'x', companyId: 'a', companyName: 'A' },
      { personId: 'x', companyId: 'a', companyName: 'A' },
      { personId: 'x', companyId: 'b', companyName: 'B' },
    ])
    expect(flags.a.priorCompanies).toEqual(['B'])
  })
})

describe('parseScoutCandidates', () => {
  it('extracts names and domains from bullet lines', () => {
    const text = `
Here are recent startups:
- Worthington (worthington.ai) — AI underwriting for SMBs
- Focal Healthcare — radiology AI, no domain yet
- not a company line without capitals enough maybe
`
    const out = parseScoutCandidates(text)
    expect(out.some(c => c.name === 'Worthington' && c.domain === 'worthington.ai')).toBe(true)
    expect(out.some(c => c.name.includes('Focal'))).toBe(true)
  })
})
