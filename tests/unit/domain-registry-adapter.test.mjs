import { describe, it, expect } from 'vitest'
import {
  looksLikeStartupCandidate,
  formatRegistryProvenance,
  prioritizeRegistryCandidates,
} from '@/lib/sourcing/domain-registry-adapter'

describe('domain-registry-adapter filters', () => {
  it('drops foundations and charities', () => {
    expect(looksLikeStartupCandidate('Doris Baird Foundation')).toBe(false)
    expect(looksLikeStartupCandidate('St Mary Church Society')).toBe(false)
  })

  it('drops known brand collisions', () => {
    expect(looksLikeStartupCandidate('DataCore Tech Corp.')).toBe(false)
  })

  it('keeps plausible startup names', () => {
    expect(looksLikeStartupCandidate('Photon IV Labs Inc')).toBe(true)
    expect(looksLikeStartupCandidate('Access2Pay')).toBe(true)
  })

  it('formats honest incorporation provenance', () => {
    expect(formatRegistryProvenance({
      incorporationDate: '2025-11-02',
      province: 'ON',
      domain: 'example.ca',
    })).toBe('Incorporated 2025-11-02 · ON · live domain example.ca')
  })

  it('prioritizeRegistryCandidates filters non-startups before sort', () => {
    const out = prioritizeRegistryCandidates([
      { name: 'Doris Baird Foundation', incorporationTs: 9 },
      { name: 'Fintech Pay Labs', incorporationTs: 5 },
    ], ['fintech', 'pay'])
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('Fintech Pay Labs')
  })
})
