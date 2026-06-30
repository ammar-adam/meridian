import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { isServerPdfEnabled } from '@/lib/pdf-config'

describe('isServerPdfEnabled', () => {
  const prev = process.env.MERIDIAN_ENABLE_SERVER_PDF

  afterEach(() => {
    if (prev === undefined) delete process.env.MERIDIAN_ENABLE_SERVER_PDF
    else process.env.MERIDIAN_ENABLE_SERVER_PDF = prev
  })

  it('returns true when env flag is true', () => {
    process.env.MERIDIAN_ENABLE_SERVER_PDF = 'true'
    expect(isServerPdfEnabled()).toBe(true)
  })

  it('returns false when unset or false', () => {
    delete process.env.MERIDIAN_ENABLE_SERVER_PDF
    expect(isServerPdfEnabled()).toBe(false)
    process.env.MERIDIAN_ENABLE_SERVER_PDF = 'false'
    expect(isServerPdfEnabled()).toBe(false)
  })
})
