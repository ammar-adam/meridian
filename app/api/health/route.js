import { isClerkEnabled } from '@/lib/auth-server'
import { isDbEnabled } from '@/lib/db/workspace'
import { isShareEnabled } from '@/lib/share-store'

export async function GET() {
  const pdfEnabled = process.env.MERIDIAN_ENABLE_SERVER_PDF === 'true'
  const db = isDbEnabled()
  const clerk = isClerkEnabled()

  return Response.json({
    ok: true,
    anthropic: !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_key_here',
    perplexity: !!process.env.PERPLEXITY_API_KEY && process.env.PERPLEXITY_API_KEY !== 'your_key_here',
    pitchbook: !!process.env.PITCHBOOK_API_KEY && process.env.PITCHBOOK_API_KEY !== 'your_key_here',
    database: db,
    clerk,
    features: {
      serverPdf: pdfEnabled,
      shareLinks: isShareEnabled(),
      cloudSync: db && clerk,
    },
  })
}
