/**
 * Compound every successful brief into the company graph.
 */

import { recordSighting } from '@/lib/server/company-records'
import { startJob, finishJob } from '@/lib/server/agent-jobs'

function pickName(memoData, scraped, domain) {
  return (
    memoData?.COMPANY_NAME
    || memoData?.companyName
    || scraped?.title
    || scraped?.name
    || domain
    || 'Unknown company'
  )
}

function pickAliases(memoData, scraped) {
  const raw = [
    memoData?.FORMER_NAMES,
    memoData?.ALIASES,
    scraped?.formerNames,
  ].filter(Boolean)
  const out = []
  for (const r of raw) {
    if (Array.isArray(r)) out.push(...r)
    else String(r).split(/[,;/]/).forEach(p => out.push(p.trim()))
  }
  return [...new Set(out.map(s => s.trim()).filter(Boolean))].slice(0, 8)
}

export async function ingestBriefCompany({
  url,
  scraped = {},
  memoData = {},
} = {}) {
  const domain = scraped.domain || null
  const name = pickName(memoData, scraped, domain)
  if (!name || (name === 'Unknown company' && !domain)) return null

  const aliases = pickAliases(memoData, scraped)
  const job = await startJob({
    type: 'company_research',
    trigger: domain || url || name,
    meta: { name, domain },
  })

  try {
    const row = await recordSighting({
      name,
      domain: domain || undefined,
      sourceType: 'brief',
      sourceId: 'brief',
      url: scraped.url || url || null,
      provenance: `Brief · researched ${new Date().toISOString().slice(0, 10)}${domain ? ` · ${domain}` : ''}`,
      oneLiner: memoData.ONE_LINER || memoData.THESIS_BAND || scraped.description || null,
      geography: memoData.GEOGRAPHY || scraped.geography || null,
      stage: memoData.STAGE || null,
      raw: {
        fromBrief: true,
        aliases,
        memoTemplate: memoData.TEMPLATE_ID || null,
      },
    })

    await finishJob(job.id, {
      status: row ? 'done' : 'skipped',
      summary: row
        ? `Ingested ${name}${domain ? ` (${domain})` : ''} → ${row.companyId}`
        : 'No database / skipped',
      meta: { companyId: row?.companyId, sightingId: row?.sightingId, aliases },
    })

    return { ...row, aliases, jobId: job.id }
  } catch (e) {
    await finishJob(job.id, { status: 'failed', summary: e.message })
    return null
  }
}
