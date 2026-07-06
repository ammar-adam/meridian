import { chromium } from 'playwright'
const BASE = 'http://localhost:3000'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.goto(`${BASE}/memo`, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.setItem('meridian_onboarding', JSON.stringify({ completedWelcome: true })))
const empty = await page.getByText('No brief loaded').isVisible().catch(() => false)
console.log('empty state:', empty)
if (empty) {
  await page.getByRole('button', { name: 'Open demo brief' }).click()
  await page.waitForTimeout(5000)
}
const fields = await page.evaluate(() => ({
  hasField: !!document.querySelector('[data-field="THESIS_HEADLINE"]'),
  contenteditable: document.querySelector('[data-field="THESIS_HEADLINE"]')?.getAttribute('contenteditable'),
  loading: document.body.innerText.includes('Loading'),
}))
console.log(fields)
await browser.close()
