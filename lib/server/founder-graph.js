/**
 * Founder graph v0 — serial-founder flags from company↔person links.
 * Pure helpers; no DB required (docs/build-plan-slices.md Slice B).
 */

/**
 * @param {Array<{ personId: string, companyId: string, companyName?: string }>} links
 * @returns {{ [companyId: string]: { serial: true, priorCompanies: string[] } }}
 */
export function flagSerialFounders(links = []) {
  const byPerson = new Map()
  for (const link of links) {
    const personId = String(link?.personId || '').trim()
    const companyId = String(link?.companyId || '').trim()
    if (!personId || !companyId) continue
    if (!byPerson.has(personId)) byPerson.set(personId, [])
    const rows = byPerson.get(personId)
    if (!rows.some(r => r.companyId === companyId)) {
      rows.push({
        companyId,
        companyName: link.companyName || companyId,
      })
    }
  }

  /** @type {{ [companyId: string]: { serial: true, priorCompanies: string[] } }} */
  const flags = {}
  for (const companies of byPerson.values()) {
    if (companies.length < 2) continue
    for (const c of companies) {
      const prior = companies
        .filter(o => o.companyId !== c.companyId)
        .map(o => o.companyName)
      if (!flags[c.companyId]) {
        flags[c.companyId] = { serial: true, priorCompanies: [] }
      }
      for (const name of prior) {
        if (!flags[c.companyId].priorCompanies.includes(name)) {
          flags[c.companyId].priorCompanies.push(name)
        }
      }
    }
  }
  return flags
}

/**
 * DB-backed wrapper: load company_people for the given company ids and flag.
 * Returns {} when DATABASE_URL is missing or on error.
 */
export async function getSerialFounderFlags(companyIds = []) {
  const ids = [...new Set((companyIds || []).map(id => String(id || '').trim()).filter(Boolean))]
  if (!ids.length) return {}

  try {
    const { neon } = await import('@neondatabase/serverless')
    const url = process.env.DATABASE_URL?.trim()
    if (!url) return {}
    const sql = neon(url, { fetchOptions: { cache: 'no-store' } })
    const rows = await sql`
      SELECT cp.person_id AS "personId", cp.company_id AS "companyId", c.name AS "companyName"
      FROM company_people cp
      JOIN people p ON p.id = cp.person_id
      LEFT JOIN companies c ON c.id = cp.company_id
      WHERE cp.company_id = ANY(${ids})
    `
    const personIds = [...new Set(rows.map(r => r.personId))]
    if (!personIds.length) return {}
    const allLinks = await sql`
      SELECT cp.person_id AS "personId", cp.company_id AS "companyId", c.name AS "companyName"
      FROM company_people cp
      LEFT JOIN companies c ON c.id = cp.company_id
      WHERE cp.person_id = ANY(${personIds})
    `
    const flags = flagSerialFounders(allLinks)
    const out = {}
    for (const id of ids) {
      if (flags[id]) out[id] = flags[id]
    }
    return out
  } catch (e) {
    console.error('[founder-graph] getSerialFounderFlags:', e.message)
    return {}
  }
}
