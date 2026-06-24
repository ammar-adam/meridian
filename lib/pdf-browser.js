/**
 * Launch Chromium for memo PDF export.
 * Vercel/Lambda: @sparticuz/chromium-min + remote pack tarball + playwright-core
 * Local dev: full playwright package with bundled browser
 */

const CHROMIUM_PACK_URL =
  process.env.CHROMIUM_REMOTE_EXEC_PATH ||
  'https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.tar.br'

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

  const executablePath = await sparticuz.executablePath(CHROMIUM_PACK_URL)

  return chromium.launch({
    args: [...sparticuz.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    executablePath,
    headless: sparticuz.headless ?? true,
  })
}
