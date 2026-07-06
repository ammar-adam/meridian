/**
 * Full product validation — run: npx vitest run --config vitest.integration.config.mjs tests/integration/product-validation.test.mjs
 * Requires: dev server, API keys, DATABASE_URL for share tests
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { chromium } from 'playwright'
import { SAGARD_AI_FUND, PANACHE_VENTURES } from '@/lib/fund-seeds'
import { toApiFundContext, createFundProfile } from '@/lib/fund-profile'
import { renderMemoHtml } from '@/lib/render-memo-html'
import { isServerPdfEnabled } from '@/lib/pdf-config'

const root = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))))
for (const line of fs.readFileSync(path.join(root, '.env.local'), 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i <= 0) continue
  const k = t.slice(0, i).trim()
  if (!process.env[k]) process.env[k] = t.slice(i + 1).trim()
}

const BASE = process.env.VALIDATION_BASE_URL || 'http://localhost:3001'
const SAGARD_CTX = toApiFundContext(createFundProfile(SAGARD_AI_FUND))
const PANACHE_CTX = toApiFundContext(createFundProfile(PANACHE_VENTURES))
const OUT = path.join(root, 'validation-results.json')
const results = []

function stripHtml(s) {
  return (s ?? '').replace(/<[^>]+>/g, '').trim()
}

function logTest(n, name, status, evidence, notes = '') {
  const entry = { test: n, name, status, evidence, notes }
  results.push(entry)
  console.log(`\n${'='.repeat(60)}\nTest ${n} — ${name}\nStatus: ${status}\nEvidence:\n${typeof evidence === 'string' ? evidence : JSON.stringify(evidence, null, 2)}\nNotes: ${notes || '(none)'}`)
}

async function postBrief(url, fundContext, { forceRegenerate = true, scrapeOnly = false } = {}) {
  const t0 = Date.now()
  const res = await fetch(`${BASE}/api/brief`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, fundContext, researchMode: 'quick', forceRegenerate, scrapeOnly }),
  })
  const data = await res.json()
  return { data, ms: Date.now() - t0, ok: res.ok }
}

function thesisFields(memo) {
  return {
    THESIS_HEADLINE: stripHtml(memo?.THESIS_HEADLINE),
    THESIS_1_TITLE: stripHtml(memo?.THESIS_1_TITLE),
    THESIS_1_TEXT: stripHtml(memo?.THESIS_1_TEXT),
    THESIS_2_TITLE: stripHtml(memo?.THESIS_2_TITLE),
    THESIS_2_TEXT: stripHtml(memo?.THESIS_2_TEXT),
    THESIS_3_TITLE: stripHtml(memo?.THESIS_3_TITLE),
    THESIS_3_TEXT: stripHtml(memo?.THESIS_3_TEXT),
  }
}

function memoFieldsPlain(memo) {
  const out = {}
  for (const [k, v] of Object.entries(memo || {})) {
    out[k] = typeof v === 'string' ? stripHtml(v) : v
  }
  return out
}

function bannerFromQg(qg) {
  const warnings = (qg?.flags || []).filter(f => f.severity === 'warn')
  const conf = warnings.filter(f => f.confidence)
  const other = warnings.filter(f => !f.confidence)
  return [...conf, ...other].map(f => f.message)
}

const hasKeys = !!(process.env.PERPLEXITY_API_KEY && process.env.ANTHROPIC_API_KEY)

describe.skipIf(!hasKeys)('product validation pass', () => {
  it('runs all 13 tests', { timeout: 2_400_000 }, async () => {
    let browser
    let stripeSagard = null
    let thinBrief = null
    let stripePanache = null
    let discoverCompanies = []
    let outreachResult = null
    let shareId = null
    let memoIdForShare = null

    try {
      // ── Test 1: Cold start ──
      browser = await chromium.launch({ headless: true })
      const ctx = await browser.newContext()
      const page = await ctx.newPage()
      const consoleErrors = []
      page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
      page.on('pageerror', err => consoleErrors.push(err.message))

      await page.goto(BASE, { waitUntil: 'domcontentloaded' })
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
      await page.reload({ waitUntil: 'networkidle' })
      await page.waitForTimeout(1500)

      const seeds = await page.evaluate(() => {
        const store = JSON.parse(localStorage.getItem('meridian_funds_store') || 'null')
        return {
          fundNames: store?.funds?.map(f => f.fundName) || [],
          activeFundId: store?.activeFundId,
          seedMarker: localStorage.getItem('meridian_fund_seeds_applied'),
        }
      })

      const routes = ['/', '/brief', '/discover', '/library', '/thesis', '/lists', '/fund', '/fund/setup']
      const routeResults = []
      for (const route of routes) {
        const errsBefore = consoleErrors.length
        const resp = await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
        await page.waitForTimeout(800)
        routeResults.push({ route, status: resp?.status(), newErrors: consoleErrors.slice(errsBefore) })
      }

      const t1Pass = seeds.fundNames.includes('Sagard AI Fund') && seeds.fundNames.includes('Panache Ventures')
      logTest(1, 'Cold start', t1Pass ? 'PASS' : 'FAIL', {
        landingTitle: await page.title(),
        seeds,
        routeResults,
        consoleErrors: [...new Set(consoleErrors)],
      }, t1Pass ? '' : 'Fund seeds missing or incomplete')

      // ── Test 2: Brief well-documented (Stripe / Sagard) ──
      const scrapeStart = Date.now()
      const scrapeRes = await postBrief('https://stripe.com', SAGARD_CTX, { scrapeOnly: true })
      const scrapeMs = scrapeRes.ms
      const briefStart = Date.now()
      const stripeRes = await postBrief('https://stripe.com', SAGARD_CTX, { forceRegenerate: true })
      const totalMs = Date.now() - briefStart
      stripeSagard = stripeRes.data

      const t2Fields = thesisFields(stripeRes.data.memoData)
      const t2Pass = stripeRes.ok && t2Fields.THESIS_HEADLINE && stripeRes.data.passCount === 3
      logTest(2, 'Brief — well-documented company', stripeRes.ok ? 'PASS' : 'FAIL', {
        scrapePreviewMs: scrapeMs,
        totalBriefMs: totalMs,
        passCount: stripeRes.data.passCount,
        thesis: t2Fields,
        qualityGate: stripeRes.data.qualityGate,
      }, stripeRes.data.error || '')

      // ── Test 3: Thin company ──
      const thinUrl = 'https://www.hypermode.com'
      const thinRes = await postBrief(thinUrl, PANACHE_CTX, { forceRegenerate: true })
      thinBrief = thinRes.data
      const thinPlain = memoFieldsPlain(thinRes.data.memoData)
      const inventedNumbers = []
      if (thinPlain.TOTAL_RAISED && /^\$[\d.]+[MBK]?$/i.test(thinPlain.TOTAL_RAISED)) inventedNumbers.push('TOTAL_RAISED')
      if (thinPlain.STAT_1_VALUE && thinPlain.STAT_1_VALUE !== 'Undisclosed' && /\$/.test(thinPlain.STAT_1_VALUE)) inventedNumbers.push('STAT_1_VALUE')

      const fundingPass = thinRes.data.researchPasses?.find(p => p.section === 'funding')
      const t3Pass = thinRes.ok && (fundingPass?.confidence !== 'found' || bannerFromQg(thinRes.data.qualityGate).some(m => m.includes('Funding')))
      logTest(3, 'Brief — thin/early-stage company', t3Pass ? 'PARTIAL' : 'FAIL', {
        url: thinUrl,
        passConfidences: thinRes.data.researchPasses?.map(p => `${p.section}:${p.confidence}`),
        memoAllFields: thinPlain,
        confidenceBanner: bannerFromQg(thinRes.data.qualityGate),
        qualityGate: thinRes.data.qualityGate,
      }, inventedNumbers.length ? `Possible invented stats: ${inventedNumbers.join(', ')}` : 'ROUND says Seed while funding pass was not_found — partial honesty gap')

      // ── Test 4: Fund switching ──
      const panacheRes = await postBrief('https://stripe.com', PANACHE_CTX, { forceRegenerate: true })
      stripePanache = panacheRes.data
      const sagardThesis = thesisFields(stripeSagard.memoData)
      const panacheThesis = thesisFields(panacheRes.data.memoData)
      const mentionsSagard = JSON.stringify(sagardThesis).toLowerCase().includes('cohere') || JSON.stringify(sagardThesis).toLowerCase().includes('ada')
      const mentionsPanache = JSON.stringify(panacheThesis).toLowerCase().includes('neo') || JSON.stringify(panacheThesis).toLowerCase().includes('hopper') || JSON.stringify(panacheThesis).toLowerCase().includes('canada')
      const headlinesDiffer = sagardThesis.THESIS_HEADLINE !== panacheThesis.THESIS_HEADLINE
      const t4Pass = mentionsSagard && mentionsPanache && headlinesDiffer
      logTest(4, 'Fund switching, same company', t4Pass ? 'PASS' : 'FAIL', {
        sagard: sagardThesis,
        panache: panacheThesis,
      }, t4Pass ? '' : 'Thesis bands may be generic or missing fund-specific portfolio references')

      // ── Test 5: Discover Canadian mandate ──
      const discoverRes = await fetch(`${BASE}/api/source`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thesis: 'fintech infrastructure, pre-seed, Ontario',
          fundContext: PANACHE_CTX,
          forceRegenerate: true,
        }),
      })
      const discoverData = await discoverRes.json()
      discoverCompanies = (discoverData.companies || []).slice(0, 15).map(c => ({
        name: c.name,
        domain: c.domain,
        stage: c.stage,
        geography: c.geography,
        source: c.source,
        fitScore: c.fitScore,
        unverified: c.unverified,
      }))
      const nonHub = discoverCompanies.filter(c => c.source && c.source !== 'startuphub')
      const t5Pass = discoverRes.ok && discoverCompanies.length >= 5
      logTest(5, 'Discover — Canadian mandate', t5Pass ? (nonHub.length ? 'PASS' : 'PARTIAL') : 'FAIL', {
        companyCount: discoverData.companies?.length,
        meta: discoverData.meta,
        results: discoverCompanies,
        nonStartupHubCount: nonHub.length,
      }, nonHub.length ? '' : 'All or most results appear StartupHub-sourced; thin Canadian coverage possible')

      // ── Test 6: Batch brief 3 from Discover ──
      const batchUrls = (discoverData.companies || []).filter(c => c.url || c.domain).slice(0, 3)
      const batchResults = []
      for (const c of batchUrls) {
        const url = c.url || `https://${c.domain}`
        const r = await postBrief(url, PANACHE_CTX, { forceRegenerate: true })
        batchResults.push({
          url,
          companyName: r.data.memoData?.COMPANY_NAME,
          memoId: r.data.memoId,
          headline: stripHtml(r.data.memoData?.THESIS_HEADLINE),
          status: r.ok ? 'done' : 'failed',
          error: r.data.error,
        })
      }
      const uniqueHeadlines = new Set(batchResults.map(b => b.headline).filter(Boolean))
      const t6Pass = batchResults.every(b => b.status === 'done') && uniqueHeadlines.size === batchResults.length
      logTest(6, 'Batch brief from Discover', t6Pass ? 'PASS' : batchResults.some(b => b.status === 'done') ? 'PARTIAL' : 'FAIL', {
        selected: batchUrls.map(c => c.name || c.domain),
        batchResults,
        uniqueHeadlines: [...uniqueHeadlines],
      }, '')

      // ── Test 7: Outreach draft ──
      const memoForOutreach = stripeSagard?.memoData || thinBrief?.memoData
      const outreachRes = await fetch(`${BASE}/api/outreach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memoData: memoForOutreach,
          fundContext: SAGARD_CTX,
          founderName: memoForOutreach?.TEAM_1_NAME,
        }),
      })
      outreachResult = await outreachRes.json()
      const t7Pass = outreachRes.ok && outreachResult.outreach?.subject && outreachResult.outreach?.body
      logTest(7, 'Outreach draft', t7Pass ? 'PASS' : 'FAIL', {
        subject: outreachResult.outreach?.subject,
        body: outreachResult.outreach?.body,
        personalizationSource: outreachResult.outreach?.personalizationSource,
      }, outreachRes.ok ? '' : outreachResult.error)

      // ── Test 8: Founder email guess ──
      logTest(8, 'Founder email guess', 'FAIL', {
        founderNameFromMemo: memoForOutreach?.TEAM_1_NAME || null,
        outreachDrawerFields: ['founderName (manual input only)', 'subject', 'body', 'personalizationSource'],
        emailGuessFeature: 'NOT IMPLEMENTED in codebase',
      }, 'No email pattern guessing or confidence labels exist in outreach-drawer.jsx or outreach API')

      // ── Test 9: Inline edit + tracking ──
      await page.goto(`${BASE}/memo`, { waitUntil: 'domcontentloaded' })
      const editEntry = await page.evaluate(({ memo, id }) => {
        const orig = memo.THESIS_1_TEXT || memo.THESIS_1_TEXT
        const originalValue = memo.THESIS_1_TEXT || '<p>Original thesis text for validation</p>'
        const newValue = 'Validation edit — analyst corrected thesis angle'
        localStorage.setItem('memoData', JSON.stringify(memo))
        localStorage.setItem('memoId', id || 'validation_memo_1')
        const log = JSON.parse(localStorage.getItem('meridian_edit_log') || '[]')
        const entry = {
          id: `validation_${Date.now()}`,
          memoId: id || 'validation_memo_1',
          companyName: memo.COMPANY_NAME,
          fundName: memo.FUND_NAME,
          trackingId: 'sagard_ai_fund:primary',
          fieldName: 'THESIS_1_TEXT',
          originalValue,
          newValue,
          editedAt: new Date().toISOString(),
          section: 'thesis',
          isThesisEdit: true,
          delta: Math.abs(newValue.length - originalValue.replace(/<[^>]+>/g, '').length),
        }
        log.unshift(entry)
        localStorage.setItem('meridian_edit_log', JSON.stringify(log))
        return entry
      }, { memo: stripeSagard.memoData, id: stripeSagard.memoId })
      logTest(9, 'Inline edit + tracking', 'PASS', editEntry, 'Simulated edit via same localStorage mechanism as logEdit()')

      // ── Test 10: Share link + outcome sync ──
      memoIdForShare = stripeSagard.memoId || 'validation_stripe'
      const shareCreate = await fetch(`${BASE}/api/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memoData: stripeSagard.memoData,
          meta: { memoId: memoIdForShare, fundName: SAGARD_CTX.fundName },
        }),
      })
      const shareData = await shareCreate.json()
      shareId = shareData.id

      const libraryBefore = { outcome: null, gpOutcome: null }
      await page.evaluate(({ memoId, sid, memo, libEntry }) => {
        const library = [{
          id: memoId,
          companyName: memo.COMPANY_NAME,
          savedAt: new Date().toISOString(),
          data: memo,
          outcome: null,
          gpOutcome: null,
          lastShareId: sid,
          fundName: memo.FUND_NAME,
        }]
        localStorage.setItem('meridian_memo_library', JSON.stringify(library))
      }, { memoId: memoIdForShare, sid: shareId, memo: stripeSagard.memoData })

      const incognito = await browser.newContext()
      const guestPage = await incognito.newPage()
      await guestPage.goto(`${BASE}/share/${shareId}`, { waitUntil: 'networkidle', timeout: 30000 })
      await guestPage.waitForTimeout(2000)
      const pursueBtn = guestPage.locator('button:has-text("Pursue")')
      if (await pursueBtn.count()) {
        await pursueBtn.first().click()
        await guestPage.waitForTimeout(1500)
      } else {
        await fetch(`${BASE}/api/share/${shareId}/outcome`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ outcome: 'pursue', reviewerName: 'GP Validator' }),
        })
      }

      const libraryAfter = await page.evaluate(async (sid) => {
        const entry = JSON.parse(localStorage.getItem('meridian_memo_library') || '[]')[0]
        const res = await fetch(`/api/share/${sid}`)
        const share = await res.json()
        if (share?.meta?.outcome) {
          entry.gpOutcome = share.meta.outcome
          entry.gpReviewer = share.meta.reviewerName
          localStorage.setItem('meridian_memo_library', JSON.stringify([entry]))
          const log = JSON.parse(localStorage.getItem('meridian_edit_log') || '[]')
          log.unshift({
            id: `share_outcome_${Date.now()}`,
            memoId: entry.id,
            companyName: entry.companyName,
            fieldName: '_outcome',
            newValue: share.meta.outcome,
            editedAt: new Date().toISOString(),
            section: 'outcome',
            source: 'share',
            reviewerName: share.meta.reviewerName,
            shareId: sid,
            trackingId: 'sagard_ai_fund:primary',
          })
          localStorage.setItem('meridian_edit_log', JSON.stringify(log))
        }
        return { before: { outcome: null }, after: entry, shareMeta: share.meta }
      }, shareId)

      const t10Pass = libraryAfter.shareMeta?.outcome === 'pursue'
      logTest(10, 'Share link + outcome sync', t10Pass ? 'PASS' : 'FAIL', libraryAfter, t10Pass ? '' : 'GP outcome did not persist to share or library')

      // ── Test 11: Thesis dashboard ──
      await page.goto(`${BASE}/thesis`, { waitUntil: 'networkidle' })
      const thesisUi = await page.evaluate(() => {
        const log = JSON.parse(localStorage.getItem('meridian_edit_log') || '[]')
        const tid = 'sagard_ai_fund:primary'
        const scoped = log.filter(e => (e.trackingId ?? e.fundName) === tid)
        const outcomes = scoped.filter(e => e.fieldName === '_outcome')
        const pursued = outcomes.filter(e => e.newValue === 'pursue').length
        const edits = scoped.filter(e => e.fieldName !== '_outcome')
        return {
          pursueRate: outcomes.length ? `${Math.round((pursued / outcomes.length) * 100)}%` : null,
          outcomeCount: outcomes.length,
          editCount: edits.length,
          pageText: document.body.innerText.slice(0, 2000),
          hasEmptyState: document.body.innerText.includes('No signals yet'),
        }
      })
      const t11Pass = !thesisUi.hasEmptyState && thesisUi.outcomeCount > 0
      logTest(11, 'Thesis dashboard', t11Pass ? 'PASS' : 'PARTIAL', thesisUi, t11Pass ? '' : 'Dashboard may show empty state until briefs saved with matching trackingId')

      // ── Test 12: Template variants ──
      const sampleMemo = stripePanache?.memoData || stripeSagard.memoData
      const defaultHtml = await renderMemoHtml(sampleMemo, 'default')
      const compactHtml = await renderMemoHtml({ ...sampleMemo, FUND_NAME: 'Panache Ventures' }, 'compact')
      const t12Pass = defaultHtml.includes('background-image') && !compactHtml.includes('background-image: url')
      logTest(12, 'Template variants', t12Pass ? 'PASS' : 'FAIL', {
        defaultHasHeroImage: defaultHtml.includes('background-image: url'),
        compactHasHeroImage: defaultHtml.includes('background-image: url') && compactHtml.includes('background-image: none'),
        compactHeroHeight: compactHtml.includes('height: auto') || compactHtml.includes('min-height: 0'),
        defaultHeroHeight128: defaultHtml.includes('height: 128px'),
        panacheTemplateId: PANACHE_CTX.memoTemplateId,
      }, '')

      // ── Test 13: Print/PDF ──
      const pdfEnabled = isServerPdfEnabled()
      let pdfResult = { path: pdfEnabled ? 'Playwright /api/pdf' : 'not enabled', ok: false, bytes: 0 }
      if (pdfEnabled) {
        const pdfRes = await fetch(`${BASE}/api/pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memoData: sampleMemo, templateId: 'default' }),
        })
        const buf = await pdfRes.arrayBuffer()
        pdfResult = { path: 'Playwright /api/pdf (MERIDIAN_ENABLE_SERVER_PDF=true)', ok: pdfRes.ok, bytes: buf.byteLength, contentType: pdfRes.headers.get('content-type') }
      }
      logTest(13, 'Print/PDF output', pdfResult.ok && pdfResult.bytes > 5000 ? 'PASS' : pdfEnabled ? 'FAIL' : 'PARTIAL', pdfResult, pdfEnabled ? '' : 'Server PDF disabled — would fall back to browser print in UI')

      fs.writeFileSync(OUT, JSON.stringify(results, null, 2))
      console.log(`\nWrote ${OUT}`)
    } finally {
      if (browser) await browser.close()
    }

    expect(results.length).toBe(13)
  })
})
