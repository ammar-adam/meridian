import { normalizeMemoForRender } from '@/lib/memo-render'

export function populateTemplate(html, data) {
  const safe = normalizeMemoForRender(data)
  let result = html
  for (const [key, value] of Object.entries(safe)) {
    result = result.replaceAll(`{{${key}}}`, value ?? '')
  }

  if (!data.COMPANY_LOGO_URL) {
    result = result.replace(
      /<img[^>]*class="company-logo-img"[^>]*\/>/,
      ''
    )
    result = result.replace(
      'id="logo-fallback" style="display:none;"',
      'id="logo-fallback" style="display:flex;"'
    )
  }

  if (!data.FUND_LOGO_URL) {
    result = result.replace(
      /<img[^>]*class="fund-logo-img"[^>]*\/>/,
      ''
    )
  }

  // Receipt strip renders only when provenance exists — no empty chrome.
  if (!data.RECEIPT_LINE) {
    result = result.replace(/<div class="receipt-strip">[\s\S]*?<\/div>\n?/, '')
  }

  // Never ship unresolved {{PLACEHOLDER}} artifacts.
  result = result.replace(/\{\{[A-Z0-9_]+\}\}/g, '')

  return result
}
