import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')

/**
 * Phrases that assert unearned exclusivity / index absence outside receipt
 * components. Keep pragmatic — honest hedging ("we do not assert") is fine.
 */
const BANNED_UI_PHRASES = [
  'Before public indexes',
  'before public indexes',
  'Not in Harmonic',
  'verified not-in-index',
  'Pre-index',
]

/** Files allowed to contain receipt/ledger claim language. */
const ALLOWLIST = [
  'components/coverage-proof.jsx',
  'lib/freshness-ledger.js',
  'lib/coverage-proof.js',
  'app/earliness/',
  'docs/',
  'tests/',
]

function isAllowlisted(relPath) {
  const normalized = relPath.replace(/\\/g, '/')
  return ALLOWLIST.some(prefix =>
    normalized === prefix
    || normalized.startsWith(prefix)
    || normalized.endsWith(prefix)
  )
}

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue
      walk(full, exts, out)
    } else if (exts.some(e => entry.name.endsWith(e))) {
      out.push(full)
    }
  }
  return out
}

describe('claims audit', () => {
  it('does not ship INDEX_TEST_REGISTRY in freshness-ledger.js', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/freshness-ledger.js'), 'utf8')
    expect(src).not.toMatch(/INDEX_TEST_REGISTRY/)
  })

  it('bans unearned exclusivity phrases outside receipt/ledger allowlist', () => {
    const files = [
      ...walk(path.join(ROOT, 'components'), ['.jsx', '.js']),
      ...walk(path.join(ROOT, 'app'), ['.jsx', '.js']),
      ...walk(path.join(ROOT, 'lib'), ['.js']).filter(f =>
        /proof|digest|freshness|reachability|pilot/i.test(path.basename(f))
      ),
    ]

    const violations = []
    for (const file of files) {
      const rel = path.relative(ROOT, file).replace(/\\/g, '/')
      if (isAllowlisted(rel)) continue
      const src = fs.readFileSync(file, 'utf8')
      const lower = src.toLowerCase()
      for (const phrase of BANNED_UI_PHRASES) {
        if (lower.includes(phrase.toLowerCase())) {
          violations.push(`${rel}: "${phrase}"`)
        }
      }
    }

    expect(violations, `Unearned claim phrases found:\n${violations.join('\n')}`).toEqual([])
  })
})
