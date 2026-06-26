import { enforceRateLimit } from '@/lib/api-guard'
import { renderMemoHtml } from '@/lib/render-memo-html'
import { cacheGet, cacheSet, CACHE_TTL, stableHash } from '@/lib/server-cache'
import { isServerPdfEnabled } from '@/lib/pdf-config'

export const maxDuration = 120

export async function POST(req) {
  if (!isServerPdfEnabled()) {
    return Response.json({ error: 'Server PDF is disabled' }, { status: 503 })
  }

  const limited = await enforceRateLimit(req, 'pdf')
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
    const html = await renderMemoHtml(memoData)

    const { launchPdfBrowser } = await import('@/lib/pdf-browser')
    browser = await launchPdfBrowser()
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 20_000 })
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
