import { describe, it, expect } from 'vitest'
import { companyKey, isRecordsEnabled } from '@/lib/server/company-records'

describe('companyKey', () => {
  it('prefers domain over name and strips www', () => {
    expect(companyKey({ name: 'Worthington', domain: 'www.worthington.ai' })).toBe('worthington.ai')
    expect(companyKey({ name: 'Worthington', domain: 'Worthington.AI' })).toBe('worthington.ai')
  })

  it('falls back to normalized name when no domain', () => {
    expect(companyKey({ name: '  Focal  Healthcare Inc.  ' })).toBe('focal healthcare inc.')
  })

  it('returns empty string for empty input', () => {
    expect(companyKey({})).toBe('')
    expect(companyKey()).toBe('')
  })
})

describe('isRecordsEnabled', () => {
  it('reflects DATABASE_URL presence', () => {
    const before = process.env.DATABASE_URL
    delete process.env.DATABASE_URL
    expect(isRecordsEnabled()).toBe(false)
    process.env.DATABASE_URL = 'postgresql://example'
    expect(isRecordsEnabled()).toBe(true)
    if (before === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = before
  })
})
