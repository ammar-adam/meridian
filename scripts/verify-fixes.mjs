/**
 * Post-fix verification — run after dev server on PORT (default 3000)
 * node scripts/verify-fixes.mjs [baseUrl]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
for (const line of fs.readFileSync(path.join(root, '.env.local'), 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i <= 0) continue
  const k = t.slice(0, i).trim()
  if (!process.env[k]) process.env[k] = t.slice(i + 1).trim()
}

const BASE = process.argv[2] || 'http://localhost:3000'
const routes = ['/', '/brief', '/discover', '/library', '/thesis', '/lists', '/fund', '/fund/setup']

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext()
const page = await ctx.newPage()
const consoleErrors = []
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
page.on('pageerror', err => consoleErrors.push(err.message))

await page.goto(BASE, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(2000)

const seeds = await page.evaluate(() => {
  const store = JSON.parse(localStorage.getItem('meridian_funds_store') || 'null')
  return {
    store: store,
    seedMarker: localStorage.getItem('meridian_fund_seeds_applied'),
  }
})

const h1 = await page.locator('h1').first().textContent().catch(() => '')

console.log('=== FIX 1: Cold start ===')
console.log('Landing h1:', h1?.trim())
console.log('localStorage meridian_funds_store:', JSON.stringify(seeds.store, null, 2))
console.log('seedMarker:', seeds.seedMarker)

for (const route of routes) {
  const before = consoleErrors.length
  const resp = await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(600)
  const errs = consoleErrors.slice(before)
  const bad = errs.filter(e => !e.includes('hydration') && !/redirect loop/i.test(e))
  const hydration = errs.filter(e => /hydration|did not match/i.test(e))
  const clerkLoop = errs.filter(e => /redirect loop/i.test(e))
  const status = resp?.status() === 200 && !hydration.length && !clerkLoop.length ? ' OK' : ' ISSUES'
  console.log(`${route} -> HTTP ${resp?.status()}${status}${hydration.length ? ' HYDRATION: ' + hydration[0].slice(0, 80) : ''}${clerkLoop.length ? ' CLERK: ' + clerkLoop[0].slice(0, 80) : ''}${bad.length ? ' ERRORS: ' + bad.join(' | ') : ''}`)
}

console.log('Hydration warnings:', consoleErrors.filter(e => /hydration|did not match/i.test(e)).length)
console.log('Clerk redirect warnings:', consoleErrors.filter(e => /redirect loop/i.test(e)).length)
console.log('Fatal console errors:', [...new Set(consoleErrors)].filter(e => e.includes('set') || e.includes('500')))

// Fix 3: founder email API
console.log('\n=== FIX 3: Founder email API ===')
const emailRes = await fetch(`${BASE}/api/founder-email`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ founderName: 'Patrick Collison', domain: 'stripe.com' }),
})
const emailData = await emailRes.json()
console.log(JSON.stringify(emailData, null, 2))

await browser.close()
