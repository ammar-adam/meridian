/**
 * Download Sparticuz Chromium pack into public/ for Vercel serverless PDF.
 * Skips if file already exists (local cache / Vercel build cache).
 */
const fs = require('fs')
const path = require('path')
const https = require('https')

const PACK_URL =
  process.env.CHROMIUM_PACK_SOURCE_URL ||
  'https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar'

const dest = path.join(__dirname, '..', 'public', 'chromium-pack.tar')

if (fs.existsSync(dest) && fs.statSync(dest).size > 1_000_000) {
  console.log('[chromium-pack] already present, skipping download')
  process.exit(0)
}

fs.mkdirSync(path.dirname(dest), { recursive: true })

console.log('[chromium-pack] downloading', PACK_URL)

function download(url, redirects = 0) {
  if (redirects > 5) {
    console.error('[chromium-pack] too many redirects')
    process.exit(1)
  }

  https
    .get(url, { headers: { 'User-Agent': 'meridian-build' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        download(res.headers.location, redirects + 1)
        return
      }
      if (res.statusCode !== 200) {
        console.error('[chromium-pack] download failed:', res.statusCode)
        process.exit(1)
      }

      const file = fs.createWriteStream(dest)
      res.pipe(file)
      file.on('finish', () => {
        file.close()
        const size = fs.statSync(dest).size
        console.log('[chromium-pack] saved', dest, `(${Math.round(size / 1024 / 1024)} MB)`)
      })
    })
    .on('error', (err) => {
      console.error('[chromium-pack] error:', err.message)
      process.exit(1)
    })
}

download(PACK_URL)
