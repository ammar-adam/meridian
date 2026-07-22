import { describe, it, expect } from 'vitest'
import {
  hasBriefableDomain,
  hasIdentifiedFounder,
  isFlowReady,
  canAutogenBrief,
  filterFlowFeed,
} from '@/lib/flow-quality'

describe('flow-quality', () => {
  it('detects briefable domains', () => {
    expect(hasBriefableDomain({ domain: 'acme.com' })).toBe(true)
    expect(hasBriefableDomain({ url: 'https://beta.io' })).toBe(true)
    expect(hasBriefableDomain({ name: 'No site' })).toBe(false)
  })

  it('detects identified founders', () => {
    expect(hasIdentifiedFounder({ personName: 'Ada Lovelace' })).toBe(true)
    expect(hasIdentifiedFounder({ founders: ['Grace Hopper'] })).toBe(true)
    expect(hasIdentifiedFounder({ name: 'Stealth Co' })).toBe(false)
  })

  it('gates autogen on domain only', () => {
    expect(canAutogenBrief({ domain: 'acme.com', personName: 'Founder' })).toBe(true)
    expect(canAutogenBrief({ personName: 'Founder only' })).toBe(false)
    expect(isFlowReady({ personName: 'Founder only' })).toBe(true)
  })

  it('filters thin rows from default feed', () => {
    const rows = [
      { name: 'A', domain: 'a.com' },
      { name: 'B', personName: 'Bob' },
      { name: 'C' },
    ]
    const { companies, hiddenCount } = filterFlowFeed(rows)
    expect(companies).toHaveLength(2)
    expect(hiddenCount).toBe(1)
  })
})
