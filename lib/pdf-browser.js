/**
 * Launch Chromium for memo PDF export.
 * Vercel/Lambda: @sparticuz/chromium-min + self-hosted pack in /public
 * Local dev: full playwright package with bundled browser
 */

function resolveChromiumPackUrl() {
  const explicit = process.env.CHROMIUM_REMOTE_EXEC_PATH?.trim()
  if (explicit) return explicit

  const host =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    (process.env.NODE_ENV === 'development' ? 'localhost:3000' : '')

  if (host) {
    const origin = host.includes('://') ? host : `https://${host}`
    return `${origin.replace(/\/$/, '')}/chromium-pack.tar`
  }

  return 'https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar'
}

export async function launchPdfBrowser() {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)

  if (!isServerless) {
    const { chromium } = await import('playwright')
    return chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  }

  const [{ default: sparticuz }, { chromium }] = await Promise.all([
    import('@sparticuz/chromium-min'),
    import('playwright-core'),
  ])

  const packUrl = resolveChromiumPackUrl()
  const executablePath = await sparticuz.executablePath(packUrl)

  return chromium.launch({
    args: [...sparticuz.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    executablePath,
    headless: sparticuz.headless ?? true,
  })
}
