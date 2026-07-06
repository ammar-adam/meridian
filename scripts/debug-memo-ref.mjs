import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
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
await page.waitForTimeout(3000)
const info = await page.evaluate(() => {
  const refDiv = Array.from(document.querySelectorAll('div')).find(d =>
    (d.getAttribute('style') || '').includes('210mm'))
  return {
    refFound: !!refDiv,
    refChildCount: refDiv?.childNodes?.length,
    refFields: refDiv?.querySelectorAll('[data-field]')?.length ?? 0,
    docFields: document.querySelectorAll('[data-field]').length,
    refFirstChild: refDiv?.firstElementChild?.tagName,
    editable: document.querySelectorAll('[contenteditable=true]').length,
  }
})
console.log(info)
await browser.close()
