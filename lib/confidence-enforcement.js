import { normalizeMetricPreferences, getMetricDef } from '@/lib/metric-preferences'

/**
 * Programmatically strip stat values that correspond to low-confidence
 * research sections — confidence must be enforced in code, not only in prompts.
 */
const FUNDING_METRICS = new Set(['total_raised', 'last_round', 'valuation'])
const MARKET_METRICS = new Set(['tam'])

function stripHtml(s) {
  return (s ?? '').replace(/<[^>]+>/g, '').trim()
}

function isDollarValue(val) {
  return /^\$[\d,.]+[BMK]?\+?$/i.test(stripHtml(val))
}

function isStageOnly(val) {
  return /^(pre-?seed|seed|series\s+[a-z0-9]+)$/i.test(stripHtml(val))
}

function statSlotIsFunding(label = '') {
  return /total\s+raised|funding|raised|last\s+round|valuation/i.test(label)
}

function statSlotIsMarket(label = '') {
  return /tam|market|addressable|sam/i.test(label)
}

export function enforceConfidenceOnStats(memoData, researchPasses = [], options = {}) {
  if (!memoData || !researchPasses?.length) return memoData

  const prefs = normalizeMetricPreferences(
    options.metricPreferences || ['total_raised', 'customer_traction', 'tam'],
  )

  const fundingConfidence = researchPasses.find(p => p.section === 'funding')?.confidence
  const marketConfidence = researchPasses.find(p => p.section === 'market')?.confidence

  if (fundingConfidence && fundingConfidence !== 'found') {
    for (let i = 0; i < 3; i++) {
      const prefId = prefs[i]
      const n = i + 1
      const label = memoData[`STAT_${n}_LABEL`] || ''
      const value = stripHtml(memoData[`STAT_${n}_VALUE`])

      if (FUNDING_METRICS.has(prefId) || statSlotIsFunding(label)) {
        if (prefId === 'last_round' && isStageOnly(value)) {
          memoData[`STAT_${n}_VALUE`] = value
        } else {
          memoData[`STAT_${n}_VALUE`] = 'Undisclosed'
        }
        if (FUNDING_METRICS.has(prefId)) {
          memoData[`STAT_${n}_LABEL`] = getMetricDef(prefId)?.defaultLabel || label
        }
      } else if (isDollarValue(value) && /raised|funding|round|valuation/i.test(label)) {
        memoData[`STAT_${n}_VALUE`] = 'Undisclosed'
      }
    }

    if (memoData.TOTAL_RAISED && isDollarValue(memoData.TOTAL_RAISED)) {
      memoData.TOTAL_RAISED = 'Undisclosed'
    }
    if (memoData.LEAD_INVESTOR && !/undisclosed/i.test(memoData.LEAD_INVESTOR)) {
      memoData.LEAD_INVESTOR = 'Undisclosed'
    }

    const round = stripHtml(memoData.ROUND)
    if (round && !isStageOnly(round) && isDollarValue(round)) {
      memoData.ROUND = 'Undisclosed'
    }
  }

  if (marketConfidence && marketConfidence !== 'found') {
    for (let i = 0; i < 3; i++) {
      const prefId = prefs[i]
      const n = i + 1
      const label = memoData[`STAT_${n}_LABEL`] || ''
      const value = stripHtml(memoData[`STAT_${n}_VALUE`])

      if (MARKET_METRICS.has(prefId) || statSlotIsMarket(label)) {
        if (isDollarValue(value) || MARKET_METRICS.has(prefId)) {
          memoData[`STAT_${n}_VALUE`] = 'Undisclosed'
          const base = getMetricDef('tam')?.defaultLabel || label.replace(/\s*\(.*\)\s*$/, '')
          memoData[`STAT_${n}_LABEL`] = `${base} (unverified — industry estimate)`
        }
      }
    }
  }

  return memoData
}

export { FUNDING_METRICS, MARKET_METRICS }
