import { notifySyncNeeded } from '@/lib/workspace-local'
import { reconcileLibraryOutcomes } from '@/lib/outcome-sync'

const EDITS_KEY = 'meridian_edit_log'

function persistEditLog(log) {
  localStorage.setItem(EDITS_KEY, JSON.stringify(log.slice(0, 500)))
  notifySyncNeeded()
}

function stripHtml(s) {
  return (s ?? '').replace(/<[^>]+>/g, '').trim()
}

/** Client-side: compact learning payload for the generate API */
export function buildLearningContext(trackingId) {
  const log = getEditLog()
  const scoped = log.filter(e => (e.trackingId ?? e.fundName) === trackingId)
  const edits = scoped.filter(e => e.fieldName !== '_outcome')
  const outcomes = scoped.filter(e => e.fieldName === '_outcome')

  const thesisCorrections = edits
    .filter(e => e.isThesisEdit)
    .slice(0, 6)
    .map(e => ({
      field: e.fieldName,
      company: e.companyName,
      claudeWrote: stripHtml(e.originalValue).slice(0, 180),
      analystFixed: e.newValue.slice(0, 180),
    }))

  const pursued = outcomes.filter(e => e.newValue === 'pursue').map(e => e.companyName)
  const passed = outcomes.filter(e => e.newValue === 'pass').map(e => e.companyName)

  if (!thesisCorrections.length && !pursued.length && !passed.length) return null

  return {
    trackingId,
    thesisCorrections,
    pursued: pursued.slice(0, 12),
    passed: passed.slice(0, 12),
    pursueRate: outcomes.length ? pursued.length / outcomes.length : null,
  }
}

export function logEdit({ memoId, companyName, fundName, trackingId, fieldName, originalValue, newValue }) {
  const log = getEditLog()
  const entry = {
    id: `${memoId}_${fieldName}_${Date.now()}`,
    memoId,
    companyName,
    fundName,
    trackingId,
    fieldName,
    originalValue,
    newValue,
    editedAt: new Date().toISOString(),
    section: inferSection(fieldName),
    isThesisEdit: fieldName.startsWith('THESIS'),
    delta: Math.abs(newValue.length - stripHtml(originalValue).length),
  }

  log.unshift(entry)
  persistEditLog(log)
  return entry
}

export function logDiscoverDemote({ companyName, thesis, trackingId, fundName }) {
  const log = getEditLog()
  const entry = {
    id: `demote_${companyName}_${Date.now()}`,
    memoId: null,
    companyName,
    fundName,
    trackingId,
    fieldName: '_demote',
    originalValue: thesis?.slice(0, 120) || '',
    newValue: companyName,
    editedAt: new Date().toISOString(),
    section: 'discover',
    isThesisEdit: false,
    delta: 0,
  }
  log.unshift(entry)
  persistEditLog(log)
  return entry
}

export function logOutcome({ memoId, companyName, fundName, trackingId, outcome, editCount = 0, source, reviewerName, shareId }) {
  const log = getEditLog()
  const entry = {
    id: `${memoId}_outcome_${Date.now()}`,
    memoId,
    companyName,
    fundName,
    trackingId,
    fieldName: '_outcome',
    originalValue: null,
    newValue: outcome,
    editCount,
    editedAt: new Date().toISOString(),
    section: 'outcome',
    isThesisEdit: false,
    delta: 0,
    source: source || 'local',
    reviewerName: reviewerName || null,
    shareId: shareId || null,
  }
  log.unshift(entry)
  persistEditLog(log)
  reconcileLibraryOutcomes()
  return entry
}

export function getEditLog() {
  try {
    return JSON.parse(localStorage.getItem(EDITS_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function getEditsForMemo(memoId) {
  return getEditLog().filter(e => e.memoId === memoId)
}

export function removeOutcome(memoId) {
  const log = getEditLog().filter(e => !(e.memoId === memoId && e.fieldName === '_outcome'))
  persistEditLog(log)
}

export function getOutcomeForMemo(memoId) {
  const entry = getEditLog().find(e => e.memoId === memoId && e.fieldName === '_outcome')
  return entry?.newValue ?? null
}

export function getEditSummary(trackingId) {
  const all = getEditLog()
  const log = all.filter(e => (e.trackingId ?? e.fundName) === trackingId && e.fieldName !== '_outcome')
  const fieldCounts = {}
  const sectionCounts = {}
  const thesisEdits = []

  for (const entry of log) {
    fieldCounts[entry.fieldName] = (fieldCounts[entry.fieldName] ?? 0) + 1
    sectionCounts[entry.section] = (sectionCounts[entry.section] ?? 0) + 1
    if (entry.isThesisEdit) thesisEdits.push(entry)
  }

  const outcomes = all.filter(e => (e.trackingId ?? e.fundName) === trackingId && e.fieldName === '_outcome')
  const pursueCount = outcomes.filter(e => e.newValue === 'pursue').length
  const uniqueMemoIds = new Set(outcomes.map(e => e.memoId))
  const memosWithEdits = new Set(log.map(e => e.memoId))

  return {
    trackingId,
    fundName: outcomes[0]?.fundName ?? log[0]?.fundName ?? trackingId,
    totalMemos: uniqueMemoIds.size || memosWithEdits.size,
    pursueCount,
    passCount: outcomes.filter(e => e.newValue === 'pass').length,
    pursueRate: outcomes.length ? pursueCount / outcomes.length : null,
    mostEditedFields: Object.entries(fieldCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([field, count]) => ({ field, count })),
    sectionCounts,
    thesisEdits,
    thesisEditCount: thesisEdits.length,
    thesisEditRate: uniqueMemoIds.size
      ? new Set(thesisEdits.map(e => e.memoId)).size / uniqueMemoIds.size
      : memosWithEdits.size
        ? new Set(thesisEdits.map(e => e.memoId)).size / memosWithEdits.size
        : null,
    outcomes,
  }
}

function inferSection(fieldName) {
  if (fieldName.startsWith('PRODUCT')) return 'product'
  if (fieldName.startsWith('MARKET') || fieldName.startsWith('STAT')) return 'market'
  if (fieldName.startsWith('DEFENSE')) return 'defensibility'
  if (fieldName.startsWith('TEAM')) return 'team'
  if (fieldName.startsWith('THESIS') || fieldName.startsWith('FUND_ANGLE')) return 'thesis'
  if (fieldName.startsWith('PORTFOLIO')) return 'portfolio'
  return 'other'
}
