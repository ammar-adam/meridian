/** Fix 4: inline edit + lists batch → library */
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
page.on('dialog', d => d.accept())

await page.goto(BASE, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  localStorage.setItem('meridian_onboarding', JSON.stringify({ completedWelcome: true, briefCount: 5, dismissedFundPrompt: true }))
  localStorage.removeItem('meridian_edit_log')
  sessionStorage.setItem('memoData', JSON.stringify({
    COMPANY_NAME: 'NationGraph', COMPANY_INITIAL: 'N', COMPANY_TAGLINE: 'Govtech intelligence',
    HERO_IMAGE_URL: '', ROUND: 'Series A', DATE: 'June 2026',
    PRODUCT_DESCRIPTION: 'Procurement intelligence.', MARKET_DESCRIPTION: 'Govtech market.',
    STAT_1_VALUE: '$18M', STAT_1_LABEL: 'Raised', STAT_2_VALUE: '90K+', STAT_2_LABEL: 'Entities',
    STAT_3_VALUE: '$12B', STAT_3_LABEL: 'Market',
    DEFENSE_1_TITLE: 'Data', DEFENSE_1_TEXT: 'Moat.', DEFENSE_2_TITLE: 'Workflow', DEFENSE_2_TEXT: 'Lock-in.',
    TEAM_1_NAME: 'Josh Goldstein', TEAM_1_ROLE: 'CEO', TEAM_1_BIO: 'Founder.', TEAM_1_INITIALS: 'JG',
    FUND_NAME: 'Sagard AI Fund',
    THESIS_HEADLINE: 'NationGraph is predictive govtech intelligence.',
    THESIS_1_TEXT: 'One.', THESIS_2_TEXT: 'Two.', THESIS_3_TEXT: 'Three.',
  }))
  sessionStorage.setItem('memoSource', 'pipeline')
  sessionStorage.setItem('memoId', 'edit_verify_' + Date.now())
})

console.log('=== FIX 4 Test 9: Inline memo edit ===')
await page.goto(`${BASE}/memo`, { waitUntil: 'networkidle' })
await page.waitForFunction(() => document.querySelectorAll('[contenteditable=true]').length >= 1, null, { timeout: 30000 })
const field = page.locator('[data-field="THESIS_HEADLINE"]')
await field.click()
await page.keyboard.press('Control+A')
const editValue = 'EDITED VIA REAL UI ' + Date.now()
await page.keyboard.type(editValue)
await field.blur()
await page.waitForTimeout(1000)
const editLog = await page.evaluate(() => JSON.parse(localStorage.getItem('meridian_edit_log') || '[]').slice(0, 1))
console.log('Edit log:', JSON.stringify(editLog, null, 2))

console.log('\n=== FIX 4 Test 6: Lists batch (instant) → Library ===')
await page.goto(`${BASE}/lists`, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.removeItem('meridian_memo_library'))
await page.locator('textarea').fill('https://chimoney.io\nhttps://tuhk.com\nhttps://fintechfinancial.ca')
await page.getByRole('button', { name: /Instant/i }).click()
await page.getByRole('button', { name: /Generate 3 brief/i }).click()
await page.waitForFunction(() => {
  const t = document.body.innerText
  return /3 done|done.*done.*done/i.test(t) || (t.match(/\bdone\b/gi) || []).length >= 3
}, null, { timeout: 600000 }).catch(async () => {
  console.log('Batch state:', (await page.locator('body').innerText()).slice(0, 1500))
})
await page.waitForTimeout(2000)
await page.goto(`${BASE}/library`, { waitUntil: 'networkidle' })
const library = await page.evaluate(() => JSON.parse(localStorage.getItem('meridian_memo_library') || '[]').map(e => ({ id: e.id, companyName: e.companyName })))
console.log('Library entries:', JSON.stringify(library, null, 2))
await page.screenshot({ path: path.join(outDir, 'fix6-library-lists-batch.png'), fullPage: true })

await browser.close()
