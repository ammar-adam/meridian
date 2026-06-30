/**
 * Normalize memo JSON for HTML template rendering.
 * Claude sometimes returns PORTFOLIO_ITEMS as an array of objects — coerce to HTML.
 */

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function portfolioItemHtml(item) {
  if (!item) return ''
  if (typeof item === 'string') {
    return item.includes('<div') ? item : ''
  }
  const name = item.name || item.company || item.companyName || ''
  if (!name) return ''
  const fund = item.fund || item.fundName || ''
  const initial = (name[0] || '?').toUpperCase()
  return `<div class="portfolio-item"><div class="portco-logo-fallback">${escapeHtml(initial)}</div><div><div class="portfolio-company">${escapeHtml(name)}</div><div class="portfolio-fund">${escapeHtml(fund)}</div></div></div>`
}

function normalizePortfolioItems(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    return value.map(portfolioItemHtml).filter(Boolean).join('')
  }
  if (typeof value === 'object') {
    return portfolioItemHtml(value)
  }
  return String(value)
}

function normalizePortfolioIntro(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'object' ? item.name || item.company : String(item)))
      .filter(Boolean)
      .join(', ')
  }
  if (typeof value === 'object') {
    return value.text || value.intro || value.name || ''
  }
  return String(value)
}

function normalizeFieldValue(key, value) {
  if (value === null || value === undefined) return ''
  if (key === 'PORTFOLIO_ITEMS') return normalizePortfolioItems(value)
  if (key === 'PORTFOLIO_INTRO') return normalizePortfolioIntro(value)
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === 'object' ? item.name || item.company || '' : String(item)))
        .filter(Boolean)
        .join(', ')
    }
    return value.name || value.text || ''
  }
  return String(value)
}

/** Coerce memo fields to strings safe for {{VAR}} replacement */
export function normalizeMemoForRender(data) {
  if (!data || typeof data !== 'object') return data
  const out = { ...data }
  for (const [key, value] of Object.entries(out)) {
    out[key] = normalizeFieldValue(key, value)
  }
  return out
}
