const SOURCE_KEY = 'meridian_last_source'
const PENDING_THESIS_KEY = 'meridian_pending_thesis'

export function saveSourceResults(thesis, companies, meta, fundId, strategyId) {
  sessionStorage.setItem(SOURCE_KEY, JSON.stringify({
    thesis,
    companies,
    meta,
    fundId: fundId || null,
    strategyId: strategyId || null,
    savedAt: new Date().toISOString(),
  }))
}

export function loadSourceResults() {
  try {
    const raw = sessionStorage.getItem(SOURCE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setPendingThesis(thesis, autoRun = false) {
  sessionStorage.setItem(PENDING_THESIS_KEY, JSON.stringify({ thesis, autoRun }))
}

export function consumePendingThesis() {
  try {
    const raw = sessionStorage.getItem(PENDING_THESIS_KEY)
    if (!raw) return null
    sessionStorage.removeItem(PENDING_THESIS_KEY)
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function buildSourceContext(saved, company) {
  if (!saved) return null
  return {
    thesis: saved.thesis,
    parsed: saved.meta?.parsed,
    fitScore: company?.fitScore,
    rationale: company?.rationale,
    companyName: company?.name,
    fundId: saved.fundId,
    strategyId: saved.strategyId,
  }
}
