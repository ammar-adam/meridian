import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
const errors = []
page.on('pageerror', e => errors.push(e.message))
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  localStorage.setItem('meridian_onboarding', JSON.stringify({ completedWelcome: true }))
  sessionStorage.setItem('memoData', JSON.stringify({
    COMPANY_NAME: 'NationGraph', COMPANY_INITIAL: 'N', COMPANY_TAGLINE: 'test', HERO_IMAGE_URL: '',
    ROUND: 'A', DATE: 'June 2026', PRODUCT_DESCRIPTION: 'p', MARKET_DESCRIPTION: 'm',
    STAT_1_VALUE: '1', STAT_1_LABEL: 'a', STAT_2_VALUE: '2', STAT_2_LABEL: 'b',
    STAT_3_VALUE: '3', STAT_3_LABEL: 'c', DEFENSE_1_TITLE: 'd', DEFENSE_1_TEXT: 'e',
    DEFENSE_2_TITLE: 'f', DEFENSE_2_TEXT: 'g', TEAM_1_NAME: 'J', TEAM_1_ROLE: 'CEO',
    TEAM_1_BIO: 'bio', TEAM_1_INITIALS: 'J', FUND_NAME: 'Fund',
    THESIS_HEADLINE: 'Headline here', THESIS_1_TEXT: '1', THESIS_2_TEXT: '2', THESIS_3_TEXT: '3',
  }))
  sessionStorage.setItem('memoSource', 'pipeline')
  sessionStorage.setItem('memoId', 'test_memo_1')
})
await page.goto('http://localhost:3000/memo', { waitUntil: 'networkidle' })
for (let i = 0; i < 20; i++) {
  const n = await page.evaluate(() => document.querySelectorAll('[contenteditable=true]').length)
  console.log(`poll ${i}: editable=${n}`)
  if (n > 0) break
  await page.waitForTimeout(500)
}
console.log('errors:', errors.slice(0, 5))
await browser.close()
