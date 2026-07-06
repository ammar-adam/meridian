/**
 * Cleanup pass verification — batch idempotency, hydration, clerk console
 * node scripts/verify-cleanup.mjs [baseUrl]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const BASE = process.argv[2] || 'http://localhost:3000'

async function runBatch(page, label) {
  await page.goto(`${BASE}/lists`, { waitUntil: 'networkidle' })
  await page.waitForSelector('textarea', { timeout: 60000 })
  await page.locator('textarea').fill('https://tuhk.com\nhttps://chimoney.io')
  await page.getByRole('button', { name: /Instant/i }).click()
  await page.getByRole('button', { name: /Generate 2 brief/i }).click()
  await page.waitForFunction(() => {
    const t = document.body.innerText
    return (t.match(/\bdone\b/gi) || []).length >= 2 || t.includes('2 done')
  }, null, { timeout: 600000 }).catch(() => {})
  await page.waitForTimeout(2000)
  const library = await page.evaluate(() => {
    const raw = localStorage.getItem('meridian_memo_library')
    return raw ? JSON.parse(raw) : []
  })
  console.log(`\n=== FIX A after ${label} ===`)
  console.log(JSON.stringify(
    library.map(e => ({ companyName: e.companyName, domain: e.companyDomain, fundId: e.fundId, id: e.id })),
    null,
    2,
  ))
  const counts = {}
  for (const e of library) {
    const key = `${e.companyDomain}|${e.fundId || 'guest'}`
    counts[key] = (counts[key] || 0) + 1
  }
  const dupes = Object.entries(counts).filter(([, n]) => n > 1)
  console.log('Duplicate domain+fund keys:', dupes.length ? dupes : 'none')
  return { library, dupes }
}

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext()
const page = await ctx.newPage()
page.on('dialog', d => d.accept())

const consoleMsgs = []
page.on('console', msg => consoleMsgs.push({ type: msg.type(), text: msg.text() }))

await page.goto(BASE, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  localStorage.setItem('meridian_onboarding', JSON.stringify({
    completedWelcome: true,
    briefCount: 5,
    dismissedFundPrompt: true,
  }))
  localStorage.removeItem('meridian_memo_library')
  const store = JSON.parse(localStorage.getItem('meridian_funds_store') || '{"funds":[]}')
  const panache = store.funds?.find(f => f.id === 'panache_ventures') || {
    id: 'panache_ventures',
    fundName: 'Panache Ventures',
    activeStrategyId: 'primary',
    strategies: [{ id: 'primary' }],
  }
  store.funds = [panache]
  store.activeFundId = 'panache_ventures'
  localStorage.setItem('meridian_funds_store', JSON.stringify(store))
})

const first = await runBatch(page, 'run 1')
const second = await runBatch(page, 'run 2')

console.log('\n=== FIX B — /fund/setup hydration ===')
const setupConsole = []
const setupPage = await ctx.newPage()
setupPage.on('console', msg => setupConsole.push({ type: msg.type(), text: msg.text() }))
await setupPage.goto(`${BASE}/fund/setup`, { waitUntil: 'networkidle' })
await setupPage.waitForTimeout(2000)
const hydration = setupConsole.filter(m => /hydration|did not match/i.test(m.text))
console.log('Hydration warnings:', hydration.length ? hydration : 'none')

console.log('\n=== FIX C — Clerk redirect loop ===')
const clerkWarnings = consoleMsgs
  .concat(setupConsole)
  .filter(m => /redirect loop/i.test(m.text))
console.log('Clerk warnings:', clerkWarnings.length ? clerkWarnings : 'none')

await browser.close()

if (second.dupes.length) process.exitCode = 1
if (hydration.length) process.exitCode = 1
if (clerkWarnings.length) process.exitCode = 1
