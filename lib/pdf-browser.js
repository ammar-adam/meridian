/**
 * Launch Chromium for memo PDF export.
 * Vercel/Lambda: @sparticuz/chromium + playwright-core
 * Local dev: full playwright package with bundled browser
 */
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
    import('@sparticuz/chromium'),
    import('playwright-core'),
  ])

  const executablePath = await sparticuz.executablePath()
  if (executablePath) {
    const libPath = process.env.LD_LIBRARY_PATH
    process.env.LD_LIBRARY_PATH = libPath ? `${libPath}:${executablePath}` : executablePath
  }

  return chromium.launch({
    args: [...sparticuz.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    executablePath,
    headless: sparticuz.headless ?? true,
  })
}
