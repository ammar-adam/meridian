const KEY = 'meridian_discover_demoted'

function hashThesis(thesis) {
  const t = (thesis || '').trim().toLowerCase()
  let h = 0
  for (let i = 0; i < t.length; i++) h = ((h << 5) - h) + t.charCodeAt(i)
  return `t_${h}`
}

function companyKey(company) {
  return (company.domain || company.name || '').toLowerCase().trim()
}

function loadAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

function saveAll(data) {
  localStorage.setItem(KEY, JSON.stringify(data))
  window.dispatchEvent(new Event('meridian-discover-change'))
}

export function getThesisKey(thesis) {
  return hashThesis(thesis)
}

export function getDemotedSet(thesis) {
  const key = hashThesis(thesis)
  return new Set(loadAll()[key] || [])
}

export function demoteCompany(thesis, company) {
  const thesisKey = hashThesis(thesis)
  const ck = companyKey(company)
  if (!ck) return

  const all = loadAll()
  const set = new Set(all[thesisKey] || [])
  set.add(ck)
  all[thesisKey] = [...set]
  saveAll(all)
}

export function restoreCompany(thesis, company) {
  const thesisKey = hashThesis(thesis)
  const ck = companyKey(company)
  const all = loadAll()
  const set = new Set(all[thesisKey] || [])
  set.delete(ck)
  all[thesisKey] = [...set]
  saveAll(all)
}

export function filterDemoted(companies, thesis) {
  const demoted = getDemotedSet(thesis)
  return companies.filter(c => !demoted.has(companyKey(c)))
}

export function isPowerBatchEnabled() {
  return localStorage.getItem('meridian_power_batch') === '1'
}

export function setPowerBatchEnabled(on) {
  localStorage.setItem('meridian_power_batch', on ? '1' : '0')
  window.dispatchEvent(new Event('meridian-discover-change'))
}
