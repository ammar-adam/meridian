import { enforceRateLimit } from '@/lib/api-guard'
import { buildProofPacket, proofPacketToText } from '@/lib/proof-packet'
import { renderProofHtml } from '@/lib/render-proof-html'
import { isServerPdfEnabled } from '@/lib/pdf-config'

export const maxDuration = 120

function sanitizeFilename(name) {
  return (name || 'proof').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 60)
}

/**
 * Build a proof packet for a Flow / Discover company row.
 * Body: { company, fundName?, thesis?, format?: 'json' | 'text' | 'pdf' }
 */
export async function POST(req) {
  const limited = await enforceRateLimit(req, 'source')
  if (limited) return limited

  const body = await req.json()
  const company = body.company
  if (!company?.name && !company?.companyName) {
    return Response.json({ error: 'company required' }, { status: 400 })
  }

  const origin = req.headers.get('origin')
    || process.env.NEXT_PUBLIC_APP_URL
    || 'https://meridian-mentor.vercel.app'

  const packet = buildProofPacket(company, {
    origin,
    fundName: body.fundName || body.fundContext?.fundName || '',
    thesis: body.thesis || body.fundContext?.thesis || '',
  })

  if (body.format === 'text') {
    return new Response(proofPacketToText(packet), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  if (body.format === 'pdf') {
    if (!isServerPdfEnabled()) {
      return Response.json({ error: 'Server PDF is disabled' }, { status: 503 })
    }
    let browser
    try {
      const html = renderProofHtml(packet)
      const { launchPdfBrowser } = await import('@/lib/pdf-browser')
      browser = await launchPdfBrowser()
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 20_000 })
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
      })
      await browser.close()
      browser = null
      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${sanitizeFilename(packet.company?.name)}-proof.pdf"`,
        },
      })
    } catch (err) {
      if (browser) await browser.close().catch(() => {})
      return Response.json({ error: 'Proof PDF failed', detail: err.message }, { status: 500 })
    }
  }

  return Response.json({ packet, text: proofPacketToText(packet) })
}
