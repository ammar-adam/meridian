import { describe, it, expect } from 'vitest'
import {
  parseExtractedJson,
  validateExtractedCompanies,
  htmlToVisibleText,
} from '@/lib/server/extractor'

describe('parseExtractedJson', () => {
  it('parses bare JSON', () => {
    const out = parseExtractedJson('{"companies":[{"name":"Acme"}]}')
    expect(out.companies[0].name).toBe('Acme')
  })

  it('strips markdown fences', () => {
    const raw = '```json\n{"companies":[{"name":"Beta Labs"}]}\n```'
    expect(parseExtractedJson(raw).companies[0].name).toBe('Beta Labs')
  })

  it('carves JSON out of prose', () => {
    const raw = 'Here you go:\n{"companies":[{"name":"Gamma"}]}\nThanks!'
    expect(parseExtractedJson(raw).companies[0].name).toBe('Gamma')
  })

  it('tolerates trailing commas', () => {
    const raw = '{"companies":[{"name":"Delta",}],}'
    expect(parseExtractedJson(raw).companies[0].name).toBe('Delta')
  })

  it('returns null on garbage', () => {
    expect(parseExtractedJson('not json at all')).toBeNull()
  })
})

describe('validateExtractedCompanies', () => {
  it('requires name and marks missing domain as candidate', () => {
    const companies = validateExtractedCompanies({
      companies: [
        { name: 'Worthington', domain: 'worthington.ai', founders: ['Ada'] },
        { name: 'No Domain Co', evidence_quote: 'joined Velocity' },
        { name: '' },
        { domain: 'orphan.com' },
      ],
    })
    expect(companies).toHaveLength(2)
    expect(companies[0].candidate).toBe(false)
    expect(companies[0].domain).toBe('worthington.ai')
    expect(companies[1].candidate).toBe(true)
    expect(companies[1].domain).toBeNull()
  })

  it('normalizes domain URLs to hostnames', () => {
    const [c] = validateExtractedCompanies({
      companies: [{ name: 'X', domain: 'https://www.Example.COM/path' }],
    })
    expect(c.domain).toBe('example.com')
  })
})

describe('htmlToVisibleText', () => {
  it('strips scripts and tags', () => {
    const text = htmlToVisibleText('<html><script>evil()</script><p>Hello <b>World</b></p></html>')
    expect(text).toBe('Hello World')
    expect(text).not.toMatch(/evil/)
  })
})
