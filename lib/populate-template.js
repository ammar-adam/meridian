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

  return result
}
