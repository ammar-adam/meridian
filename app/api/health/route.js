import { isClerkEnabled } from '@/lib/auth-server'
import { isDbEnabled } from '@/lib/db/workspace'
import { isShareEnabled } from '@/lib/share-store'
import { isPitchbookConfigured, verifyPitchbook } from '@/lib/pitchbook'
import { isServerPdfEnabled } from '@/lib/pdf-config'

export async function GET() {
  const pdfEnabled = isServerPdfEnabled()
  const db = isDbEnabled()
  const clerk = isClerkEnabled()
  const pitchbookConfigured = isPitchbookConfigured()
  const pitchbookStatus = pitchbookConfigured ? await verifyPitchbook() : { configured: false, ok: false }

  return Response.json({
    ok: true,
    anthropic: !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_key_here',
    perplexity: !!process.env.PERPLEXITY_API_KEY && process.env.PERPLEXITY_API_KEY !== 'your_key_here',
    pitchbook: pitchbookConfigured && pitchbookStatus.ok,
    pitchbookConfigured,
    database: db,
    clerk,
    features: {
      serverPdf: pdfEnabled,
      shareLinks: isShareEnabled(),
      cloudSync: db && clerk,
    },
  })
}
