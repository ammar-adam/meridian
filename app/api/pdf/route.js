import { enforceRateLimit } from '@/lib/api-guard'
import { renderMemoHtml } from '@/lib/render-memo-html'
import { cacheGet, cacheSet, CACHE_TTL, stableHash } from '@/lib/server-cache'

export const maxDuration = 60

export async function POST(req) {
  const limited = enforceRateLimit(req, 'pdf')
  if (limited) return limited

  const { memoData } = await req.json()
  if (!memoData?.COMPANY_NAME) {
    return Response.json({ error: 'memoData is required' }, { status: 400 })
  }

  const cacheKey = `pdf:${stableHash(memoData)}`
  const cached = await cacheGet(cacheKey)
  if (cached?.buffer) {
    const buf = Buffer.from(cached.buffer, 'base64')
    return new Response(buf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${sanitizeFilename(memoData.COMPANY_NAME)}.pdf"`,
        'X-Meridian-Cached': '1',
      },
    })
  }

  let browser
  try {
    const { chromium } = await import('playwright')
    const html = await renderMemoHtml(memoData)

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle' })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })
    await browser.close()
    browser = null

    await cacheSet(cacheKey, { buffer: pdfBuffer.toString('base64') }, CACHE_TTL.scrape)

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${sanitizeFilename(memoData.COMPANY_NAME)}.pdf"`,
      },
    })
  } catch (err) {
    if (browser) await browser.close().catch(() => {})
    console.error('[pdf] error:', err.message)
    return Response.json(
      { error: 'PDF generation failed. Use browser Print as fallback.', detail: err.message },
      { status: 500 }
    )
  }
}

function sanitizeFilename(name) {
  return (name || 'memo').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 60)
}
