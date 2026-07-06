/** Capture browser console on auth-related routes — no redirect loop warnings */
import { chromium } from 'playwright'

const BASE = process.argv[2] || 'http://localhost:3000'
const routes = ['/', '/brief', '/sign-in', '/fund/setup']

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext()
const page = await ctx.newPage()
const msgs = []
page.on('console', msg => msgs.push({ type: msg.type(), text: msg.text() }))

for (const route of routes) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(2000)
}

const redirectLoops = msgs.filter(m => /redirect loop/i.test(m.text))
console.log('=== FIX C — Browser console (auth routes) ===')
for (const m of msgs) {
  if (/Clerk/i.test(m.text)) console.log(`[${m.type}] ${m.text}`)
}
console.log('\nRedirect loop warnings:', redirectLoops.length ? redirectLoops.map(m => m.text) : 'none')

await browser.close()
process.exitCode = redirectLoops.length ? 1 : 0
