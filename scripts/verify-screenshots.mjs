import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const outDir = path.join(root, 'scripts', 'verify-output')
fs.mkdirSync(outDir, { recursive: true })
const BASE = process.argv[2] || 'http://localhost:3000'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

await page.goto(BASE)
await page.evaluate(() => {
  localStorage.setItem('meridian_onboarding', JSON.stringify({ completedWelcome: true }))
  sessionStorage.setItem('memoData', JSON.stringify({
    COMPANY_NAME: 'Stripe', COMPANY_INITIAL: 'S', COMPANY_TAGLINE: 'Payments',
    HERO_IMAGE_URL: 'https://stripe.com/img/v3/home/social.png', ROUND: 'Late', DATE: 'July 2026',
    PRODUCT_DESCRIPTION: 'Payments.', MARKET_DESCRIPTION: 'Global payments.',
    STAT_1_VALUE: '—', STAT_1_LABEL: 'Raised', STAT_2_VALUE: '—', STAT_2_LABEL: 'Customers',
    STAT_3_VALUE: '—', STAT_3_LABEL: 'Market',
    DEFENSE_1_TITLE: 'A', DEFENSE_1_TEXT: 'B.', DEFENSE_2_TITLE: 'C', DEFENSE_2_TEXT: 'D.',
    TEAM_1_NAME: 'Patrick', TEAM_1_ROLE: 'CEO', TEAM_1_BIO: 'Founder.', TEAM_1_INITIALS: 'P',
    FUND_NAME: 'Sagard AI Fund', THESIS_HEADLINE: 'Stripe thesis headline.',
    THESIS_1_TEXT: '1', THESIS_2_TEXT: '2', THESIS_3_TEXT: '3',
  }))
  sessionStorage.setItem('memoSource', 'pipeline')
  sessionStorage.setItem('memoId', 'template_shot')
})

for (const tid of ['default', 'compact']) {
  await page.evaluate((templateId) => {
    const store = JSON.parse(localStorage.getItem('meridian_funds_store') || '{"funds":[]}')
    let fund = store.funds?.find(f => f.id === 'sagard_ai_fund')
    if (!fund) {
      fund = { id: 'sagard_ai_fund', fundName: 'Sagard', strategies: [{ id: 'primary' }], activeStrategyId: 'primary' }
      store.funds = [fund]
    }
    fund.memoTemplateId = templateId
    store.activeFundId = 'sagard_ai_fund'
    localStorage.setItem('meridian_funds_store', JSON.stringify(store))
  }, tid)
  await page.goto(`${BASE}/memo`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const heroBg = await page.evaluate(() => {
    const hero = document.querySelector('.hero')
    return hero ? getComputedStyle(hero).backgroundImage : 'missing'
  })
  console.log(`Template ${tid} hero background:`, heroBg.slice(0, 80))
  const ref = page.locator('div').filter({ has: page.locator('[data-field="THESIS_HEADLINE"]') }).first()
  await ref.screenshot({ path: path.join(outDir, `fix12-${tid}.png`) })
}

await page.goto(`${BASE}/library`, { waitUntil: 'networkidle' })
await page.screenshot({ path: path.join(outDir, 'fix6-library.png'), fullPage: true })
await browser.close()
console.log('Screenshots written to scripts/verify-output/')
