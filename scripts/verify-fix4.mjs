/**
 * Fix 3 UI + Fix 4 re-verification (memo edit, templates, Discover batch→library)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const outDir = path.join(root, 'scripts', 'verify-output')
fs.mkdirSync(outDir, { recursive: true })

const BASE = process.argv[2] || 'http://localhost:3000'

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } })
const page = await ctx.newPage()
page.on('dialog', d => d.accept())

// --- Fix 3: Outreach drawer email guesses ---
console.log('=== FIX 3: Outreach drawer UI ===')
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  localStorage.setItem('meridian_onboarding', JSON.stringify({ completedWelcome: true, sawDemo: true, briefCount: 1, dismissedFundPrompt: true }))
  const memoData = {
    COMPANY_NAME: 'Stripe',
    COMPANY_INITIAL: 'S',
    COMPANY_TAGLINE: 'Financial infrastructure for the internet',
    COMPANY_LOGO_URL: '',
    HERO_IMAGE_URL: '',
    ROUND: 'Late stage',
    DATE: 'July 2026',
    PRODUCT_DESCRIPTION: 'Payments and financial infrastructure platform.',
    MARKET_DESCRIPTION: 'Global digital payments market.',
    STAT_1_VALUE: 'Undisclosed',
    STAT_1_LABEL: 'Total raised',
    STAT_2_VALUE: '—',
    STAT_2_LABEL: 'Customers',
    STAT_3_VALUE: '—',
    STAT_3_LABEL: 'Market',
    DEFENSE_1_TITLE: 'Network',
    DEFENSE_1_TEXT: 'Scale effects.',
    DEFENSE_2_TITLE: 'Data',
    DEFENSE_2_TEXT: 'Transaction data moat.',
    TEAM_1_NAME: 'Patrick Collison',
    TEAM_1_ROLE: 'CEO',
    TEAM_1_BIO: 'Co-founder.',
    TEAM_1_INITIALS: 'PC',
    FUND_NAME: 'Sagard AI Fund',
    THESIS_HEADLINE: 'Stripe powers agentic commerce infrastructure.',
    THESIS_1_TEXT: 'Thesis one.',
    THESIS_2_TEXT: 'Thesis two.',
    THESIS_3_TEXT: 'Thesis three.',
  }
  sessionStorage.setItem('memoData', JSON.stringify(memoData))
  sessionStorage.setItem('memoSource', 'pipeline')
  sessionStorage.setItem('memoId', 'stripe_outreach_verify')
  sessionStorage.setItem('memoMeta', JSON.stringify({ companyDomain: 'stripe.com' }))
})
await page.goto(`${BASE}/memo`, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-field="THESIS_HEADLINE"]', { timeout: 15000 })
await page.getByRole('button', { name: 'Pursue' }).click({ timeout: 10000 })
await page.waitForTimeout(500)
await page.getByRole('button', { name: 'Draft outreach' }).click({ timeout: 10000 })
await page.waitForTimeout(2000)

const emailGuesses = await page.evaluate(() => {
  const box = document.querySelector('.border-amber-200')
  if (!box) return { found: false, text: document.body.innerText.slice(0, 500) }
  return { found: true, html: box.innerText }
})
console.log('Email guess UI:', JSON.stringify(emailGuesses, null, 2))
await page.screenshot({ path: path.join(outDir, 'fix3-outreach-drawer.png') })
await page.locator('button.m-btn-ghost').filter({ hasText: 'Close' }).click({ timeout: 5000 })

// --- Fix 4 Test 9: Inline memo edit ---
console.log('\n=== FIX 4 Test 9: Inline memo edit ===')
await page.evaluate(() => {
  localStorage.setItem('meridian_onboarding', JSON.stringify({ completedWelcome: true, sawDemo: true, briefCount: 5, dismissedFundPrompt: true }))
  localStorage.removeItem('meridian_edit_log')
})
const field = page.locator('[data-field="THESIS_HEADLINE"]')
await field.waitFor({ timeout: 10000 })
const editValue = 'EDITED VIA UI ' + Date.now()
await page.evaluate(({ selector, value }) => {
  const el = document.querySelector(selector)
  if (!el) throw new Error('field not found')
  el.focus()
  el.textContent = value
  el.dispatchEvent(new FocusEvent('blur', { bubbles: false }))
}, { selector: '[data-field="THESIS_HEADLINE"]', value: editValue })
await page.waitForTimeout(800)

const editLog = await page.evaluate(() => JSON.parse(localStorage.getItem('meridian_edit_log') || '[]').slice(0, 2))
console.log('Edit log (latest):', JSON.stringify(editLog, null, 2))

// --- Fix 4 Test 12: Template screenshots ---
console.log('\n=== FIX 4 Test 12: Template variants ===')
async function screenshotTemplate(templateId) {
  await page.evaluate((tid) => {
    const store = JSON.parse(localStorage.getItem('meridian_funds_store') || '{"funds":[],"activeFundId":null}')
    let fund = store.funds?.find(f => f.id === 'sagard_ai_fund')
    if (!fund) {
      fund = {
        id: 'sagard_ai_fund',
        fundName: 'Sagard AI Fund',
        memoTemplateId: tid,
        strategies: [{ id: 'primary', thesis: 'AI fund', portfolio: [] }],
        activeStrategyId: 'primary',
      }
      store.funds = [fund]
    } else {
      fund.memoTemplateId = tid
    }
    store.activeFundId = 'sagard_ai_fund'
    localStorage.setItem('meridian_funds_store', JSON.stringify(store))
    window.dispatchEvent(new Event('meridian-context-change'))
  }, templateId)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  const memoEl = page.locator('.memo-page').first()
  if (await memoEl.count()) {
    await memoEl.screenshot({ path: path.join(outDir, `fix12-template-${templateId}.png`) })
  } else {
    await page.screenshot({ path: path.join(outDir, `fix12-template-${templateId}.png`) })
  }
  const heroCount = await page.locator('.hero-image').count()
  console.log(`Template ${templateId}: .hero-image count=${heroCount}`)
}

await screenshotTemplate('default')
await screenshotTemplate('compact')

// --- Fix 4 Test 6: Discover batch → Library ---
console.log('\n=== FIX 4 Test 6: Discover batch → Library ===')
const thesis = 'Canadian pre-seed fintech founders'
const batchCompanies = [
  { name: 'Chimoney', domain: 'chimoney.io', stage: 'Seed', geography: 'Canada', fitScore: 80 },
  { name: 'Tuhk', domain: 'tuhk.com', stage: 'Seed', geography: 'Canada', fitScore: 75 },
  { name: 'Fintech Financial', domain: 'fintechfinancial.ca', stage: 'Seed', geography: 'Canada', fitScore: 70 },
]

await page.goto(`${BASE}/discover`, { waitUntil: 'domcontentloaded' })
await page.evaluate(({ thesis, batchCompanies }) => {
  localStorage.setItem('meridian_onboarding', JSON.stringify({ completedWelcome: true, sawDemo: true, briefCount: 5, dismissedFundPrompt: true }))
  localStorage.setItem('meridian_power_batch', '1')
  localStorage.removeItem('meridian_memo_library')
  const store = {
    funds: [{
      id: 'panache_ventures',
      fundName: 'Panache Ventures',
      activeStrategyId: 'primary',
      strategies: [{ id: 'primary', thesis: 'Canadian pre-seed/seed' }],
    }],
    activeFundId: 'panache_ventures',
  }
  localStorage.setItem('meridian_funds_store', JSON.stringify(store))
  localStorage.setItem('meridian_active_fund_id', 'panache_ventures')
  sessionStorage.setItem('meridian_last_source', JSON.stringify({
    thesis,
    companies: batchCompanies,
    meta: { parsed: {}, seedCount: 3 },
    fundId: 'panache_ventures',
    strategyId: 'primary',
    savedAt: new Date().toISOString(),
  }))
}, { thesis, batchCompanies })
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

await page.getByRole('button', { name: 'Brief top 3' }).click({ timeout: 15000 })
await page.waitForFunction(() => {
  const t = document.body.innerText
  const done = (t.match(/\bdone\b/gi) || []).length
  return t.includes('3 done') || done >= 3 || (t.includes('done') && t.includes('failed') && done >= 1)
}, { timeout: 600000 }).catch(async () => {
  console.log('Batch wait timeout — partial state:', await page.locator('body').innerText().then(t => t.slice(0, 800)))
})

await page.waitForTimeout(2000)
await page.goto(`${BASE}/library`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)

const library = await page.evaluate(() => {
  const raw = localStorage.getItem('meridian_memo_library')
  return raw ? JSON.parse(raw).map(e => ({ id: e.id, companyName: e.companyName, domain: e.companyDomain })) : []
})
console.log('Library entries after Discover batch:', JSON.stringify(library, null, 2))
const libraryText = await page.locator('main, .m-card, body').first().innerText()
console.log('Library page text snippet:', libraryText.slice(0, 600))
await page.screenshot({ path: path.join(outDir, 'fix6-library.png'), fullPage: true })

await browser.close()
console.log('\nScreenshots saved to scripts/verify-output/')
