import { getEditLog } from '@/lib/edit-tracker'
import { getMemoLibrary, updateMemoMeta } from '@/lib/memo-library'

/** Sync pursue/pass from edit log (incl. GP share outcomes) into library rows */
export function reconcileLibraryOutcomes() {
  const log = getEditLog()
  const outcomes = log.filter(e => e.fieldName === '_outcome' && e.memoId)
  if (!outcomes.length) return 0

  let updated = 0
  const library = getMemoLibrary()
  const latestByMemo = new Map()

  for (const o of outcomes) {
    const prev = latestByMemo.get(o.memoId)
    if (!prev || (o.editedAt || '') > (prev.editedAt || '')) {
      latestByMemo.set(o.memoId, o)
    }
  }

  for (const [memoId, o] of latestByMemo) {
    const entry = library.find(e => e.id === memoId)
    if (!entry) continue
    const outcome = o.newValue === 'more_info' ? null : o.newValue
    const meta = {
      outcome: outcome || entry.outcome,
      gpOutcome: o.newValue,
      gpReviewer: o.reviewerName || null,
      outcomeSource: o.source || 'local',
      outcomeAt: o.editedAt,
    }
    if (
      entry.outcome !== meta.outcome ||
      entry.gpOutcome !== meta.gpOutcome ||
      entry.gpReviewer !== meta.gpReviewer
    ) {
      updateMemoMeta(memoId, meta)
      updated++
    }
  }

  if (updated > 0) {
    window.dispatchEvent(new Event('meridian-context-change'))
  }
  return updated
}

/** Poll share links for GP outcomes (guest creators without cloud edit sync) */
export async function syncShareOutcomesFromServer() {
  const library = getMemoLibrary()
  const pending = library.filter(e => e.lastShareId && !e.gpOutcome)
  if (!pending.length) return 0

  let synced = 0
  for (const entry of pending) {
    try {
      const res = await fetch(`/api/share/${entry.lastShareId}`, { cache: 'no-store' })
      if (!res.ok) continue
      const data = await res.json()
      const outcome = data?.meta?.outcome
      if (!outcome) continue

      const { logOutcome } = await import('@/lib/edit-tracker')
      logOutcome({
        memoId: entry.id,
        companyName: entry.companyName,
        fundName: entry.fundName,
        trackingId: entry.trackingId || 'guest',
        outcome,
        source: 'share',
        reviewerName: data.meta.reviewerName,
        shareId: entry.lastShareId,
      })
      synced++
    } catch { /* skip */ }
  }

  reconcileLibraryOutcomes()
  return synced
}

export function mergeEditLogs(local = [], remote = []) {
  const byId = new Map()
  for (const e of local) {
    if (e?.id) byId.set(e.id, e)
  }
  for (const e of remote) {
    if (!e?.id) continue
    const prev = byId.get(e.id)
    if (!prev || (e.editedAt || '') >= (prev.editedAt || '')) {
      byId.set(e.id, e)
    }
  }
  return [...byId.values()].sort((a, b) => (b.editedAt || '').localeCompare(a.editedAt || ''))
}

export function mergeMemoLibraries(local = [], remote = []) {
  const byId = new Map()
  for (const e of local) {
    if (e?.id) byId.set(e.id, e)
  }
  for (const e of remote) {
    if (!e?.id) continue
    const prev = byId.get(e.id)
    if (!prev || (e.savedAt || '') >= (prev.savedAt || '')) {
      byId.set(e.id, { ...prev, ...e })
    } else if (prev) {
      byId.set(e.id, { ...e, ...prev })
    }
  }

  const byDomainFund = new Map()
  const orphans = []
  for (const e of byId.values()) {
    if (!e.companyDomain) {
      orphans.push(e)
      continue
    }
    const key = `${e.companyDomain}|${e.fundId || 'guest'}`
    const prev = byDomainFund.get(key)
    if (!prev || (e.savedAt || '') >= (prev.savedAt || '')) {
      byDomainFund.set(key, e)
    }
  }

  return [...byDomainFund.values(), ...orphans]
    .sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''))
}
