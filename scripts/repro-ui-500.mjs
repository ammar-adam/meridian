import { chromium } from 'playwright'

const BASE = process.argv[2] || 'http://localhost:3002'
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
    fundIds: store?.funds?.map(f => f.id) || [],
    fundNames: store?.funds?.map(f => f.fundName) || [],
    seedMarker: localStorage.getItem('meridian_fund_seeds_applied'),
  }
})

console.log('BASE', BASE)
console.log('SEEDS', JSON.stringify(seeds, null, 2))
console.log('LANDING_SNIPPET', (await page.locator('h1').first().textContent().catch(() => ''))?.slice(0, 120))

for (const route of routes) {
  const before = consoleErrors.length
  const resp = await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(800)
  console.log(route, 'status', resp?.status(), 'newErrors', consoleErrors.slice(before))
}

console.log('ALL_CONSOLE_ERRORS', [...new Set(consoleErrors)])
await browser.close()
