import {
  mergeMetricPreferences,
  getMetricDef,
  normalizeMetricPreferences,
} from '@/lib/metric-preferences'
import { FUNDING_METRICS, MARKET_METRICS } from '@/lib/confidence-enforcement'

const WEAK_VALUES = new Set(['', 'undisclosed', '—', '-', 'n/a', 'tbd', 'unknown', 'pending'])

function isWeakStatValue(val) {
  const v = (val ?? '').trim().toLowerCase()
  return !v || WEAK_VALUES.has(v) || v.includes('{{')
}

function formatMoney(num, unit = '') {
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(num % 1_000_000_000 === 0 ? 0 : 1)}B${unit}`
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1)}M${unit}`
  if (num >= 1_000) return `$${Math.round(num / 1_000)}K${unit}`
  return `$${num}${unit}`
}

function parseMoney(raw) {
  if (!raw) return null
  const m = raw.match(/\$\s*([\d,.]+)\s*([BMKbmk])?/i)
  if (!m) return null
  let n = parseFloat(m[1].replace(/,/g, ''))
  const u = (m[2] || '').toUpperCase()
  if (u === 'B') n *= 1_000_000_000
  else if (u === 'M') n *= 1_000_000
  else if (u === 'K') n *= 1_000
  return Number.isFinite(n) ? n : null
}

function firstMatch(text, patterns) {
  for (const { re, pick } of patterns) {
    const m = text.match(re)
    if (m) {
      const value = pick ? pick(m) : m[0].trim()
      if (value) return value
    }
  }
  return null
}

/** Extract verified signals from research + memo draft */
export function extractMetricSignals({ research = '', scraped = {}, memoData = {} } = {}) {
  const corpus = [
    research,
    memoData.MARKET_DESCRIPTION,
    memoData.PRODUCT_DESCRIPTION,
    scraped?.ogDescription,
    memoData.ROUND,
  ].filter(Boolean).join('\n')

  const signals = []

  function add(metricId, value, label, source) {
    if (!value || isWeakStatValue(value)) return
    signals.push({ metricId, value: String(value).trim(), label, source })
  }

  const arrVal = firstMatch(corpus, [
    { re: /ARR[:\s]+\$[\d,.]+[BMK]?/i, pick: m => m[0].replace(/^ARR[:\s]+/i, '').trim() },
    { re: /\$[\d,.]+[BMK]?\s+ARR/i, pick: m => m[0].replace(/\s+ARR/i, '').trim() },
    { re: /\$[\d,.]+[BMK]?\s+(?:in\s+)?(?:annual\s+)?recurring revenue/i, pick: m => m[0].split(/\s+(?:in\s+)?(?:annual\s+)?recurring/i)[0].trim() },
  ])
  if (arrVal) add('arr', arrVal, getMetricDef('arr').defaultLabel, 'company')

  const raisedVal = firstMatch(corpus, [
    { re: /(?:total\s+)?(?:funding|raised)[:\s]+\$[\d,.]+[BMK]?/i, pick: m => m[0].replace(/.*?\$/, '$').trim() },
    { re: /\$[\d,.]+[BMK]?\s+(?:in\s+)?total\s+(?:funding|raised)/i, pick: m => m[0].split(/\s+(?:in\s+)?total/i)[0].trim() },
    { re: /raised\s+\$[\d,.]+[BMK]?/i, pick: m => m[0].replace(/^raised\s+/i, '').trim() },
  ])
  if (raisedVal) add('total_raised', raisedVal, getMetricDef('total_raised').defaultLabel, 'company')

  const roundVal = firstMatch(corpus, [
    { re: /Series\s+[A-E][\w-]*(?:\s+\$[\d,.]+[BMK]?)?/i },
    { re: /Seed\s+(?:round\s+)?\$[\d,.]+[BMK]?/i },
  ])
  if (roundVal) add('last_round', roundVal, getMetricDef('last_round').defaultLabel, 'company')

  const valVal = firstMatch(corpus, [
    { re: /(?:post.?money\s+)?valuation[:\s]+\$[\d,.]+[BMK]?/i, pick: m => m[0].replace(/.*?\$/, '$').trim() },
    { re: /\$[\d,.]+[BMK]?\s+valuation/i, pick: m => m[0].replace(/\s+valuation/i, '').trim() },
  ])
  if (valVal) add('valuation', valVal, getMetricDef('valuation').defaultLabel, 'company')

  const tamVal = firstMatch(corpus, [
    { re: /\$[\d,.]+[BMK]?\s*(?:\+?\s*)?(?:TAM|SAM|market|market size|addressable)/i, pick: m => m[0].split(/\s+(?:TAM|SAM|market)/i)[0].trim() },
    { re: /(?:TAM|SAM|market size)[:\s]+\$[\d,.]+[BMK]?/i, pick: m => m[0].replace(/^.*?\$/, '$').trim() },
  ])
  if (tamVal) add('tam', tamVal, getMetricDef('tam').defaultLabel, 'market')

  const customerVal = firstMatch(corpus, [
    { re: /[\d,]+\+?\s+(?:enterprise\s+)?(?:customers|clients|companies|logos)/i },
    { re: /(?:serves|used by|trusted by)\s+[\d,]+\+?/i },
  ])
  if (customerVal) add('customer_traction', customerVal, getMetricDef('customer_traction').defaultLabel, 'proxy')

  const usersVal = firstMatch(corpus, [
    { re: /[\d,]+\+?\s+(?:active\s+)?users/i },
    { re: /[\d,]+\+?\s+(?:MAU|DAU)/i },
  ])
  if (usersVal) add('users', usersVal, getMetricDef('users').defaultLabel, 'proxy')

  const headcountVal = firstMatch(corpus, [
    { re: /[\d,]+\+?\s+employees/i },
    { re: /team of\s+[\d,]+/i, pick: m => m[0].replace(/^team of\s+/i, '').trim() },
  ])
  if (headcountVal) add('headcount', headcountVal, getMetricDef('headcount').defaultLabel, 'proxy')

  const foundedVal = firstMatch(corpus, [
    { re: /founded(?:\s+in)?\s+(20\d{2}|19\d{2})/i, pick: m => m[1] },
    { re: /since\s+(20\d{2}|19\d{2})/i, pick: m => m[1] },
  ])
  if (foundedVal) add('founded', foundedVal, getMetricDef('founded').defaultLabel, 'proxy')

  const growthVal = firstMatch(corpus, [
    { re: /[\d.]+%\s+(?:YoY|year[- ]over[- ]year|annual)\s+growth/i },
    { re: /growing\s+[\d.]+%/i },
  ])
  if (growthVal) add('growth', growthVal, getMetricDef('growth').defaultLabel, 'proxy')

  if (!isWeakStatValue(memoData.ROUND) && memoData.ROUND?.toLowerCase() !== 'undisclosed') {
    const existing = signals.find(s => s.metricId === 'last_round')
    if (!existing) add('last_round', memoData.ROUND, getMetricDef('last_round').defaultLabel, 'company')
  }

  const marketNums = [...corpus.matchAll(/\$[\d,.]+[BMK]?/gi)].map(m => m[0])
  if (!tamVal && marketNums.length) {
    const parsed = marketNums.map(parseMoney).filter(Boolean).sort((a, b) => b - a)
    if (parsed[0] >= 1_000_000_000) {
      add('tam', formatMoney(parsed[0]), getMetricDef('tam').defaultLabel, 'market')
    }
  }

  const deduped = []
  const seen = new Set()
  for (const s of signals) {
    const key = `${s.metricId}:${s.value.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(s)
  }
  return deduped
}

function pickSignalForMetric(metricId, signals, used) {
  const hit = signals.find(s => s.metricId === metricId && !used.has(s.metricId))
  if (hit) return hit

  const fallbacks = {
    arr: ['total_raised', 'growth', 'customer_traction'],
    last_round: ['total_raised', 'valuation'],
    total_raised: ['last_round', 'valuation'],
    valuation: ['last_round', 'total_raised'],
    customer_traction: ['users', 'headcount'],
    users: ['customer_traction', 'headcount'],
    tam: [],
    headcount: ['founded', 'customer_traction'],
    founded: ['headcount'],
    growth: ['arr', 'users'],
  }

  for (const alt of fallbacks[metricId] || []) {
    const s = signals.find(sig => sig.metricId === alt && !used.has(sig.metricId))
    if (s) return { ...s, label: getMetricDef(metricId)?.defaultLabel || s.label, fallback: true }
  }

  return null
}

function fillRemainingSlots(signals, used, count) {
  const filled = []
  for (const s of signals) {
    if (used.has(s.metricId)) continue
    filled.push(s)
    used.add(s.metricId)
    if (filled.length >= count) break
  }
  return filled
}

/** Build research corpus for stat extraction — exclude low-confidence pass content */
export function researchForStatExtraction(research, researchPasses) {
  if (!researchPasses?.length) return research
  const found = researchPasses
    .filter(p => p.confidence === 'found' && p.content && p.section !== 'team_escalation')
    .map(p => p.content)
    .join('\n\n')
  return found.trim() || research
}

/**
 * Apply preference-ordered stats to memoData; returns updated memo + slot metadata.
 */
export function applyStatFallbacks(memoData, {
  research,
  researchPasses,
  scraped,
  fundContext,
  learningContext,
} = {}) {
  if (!memoData) return { memoData, statMeta: [] }

  const statResearch = researchForStatExtraction(research, researchPasses)

  const preferences = mergeMetricPreferences(
    fundContext?.metricPreferences,
    learningContext?.inferredMetricBoosts,
  )

  const signals = extractMetricSignals({ research: statResearch, scraped, memoData })
  const fundingConfidence = researchPasses?.find(p => p.section === 'funding')?.confidence
  const marketConfidence = researchPasses?.find(p => p.section === 'market')?.confidence

  const filteredSignals = signals.filter(s => {
    if (fundingConfidence && fundingConfidence !== 'found' && FUNDING_METRICS.has(s.metricId)) {
      return false
    }
    if (marketConfidence && marketConfidence !== 'found' && MARKET_METRICS.has(s.metricId)) {
      return false
    }
    return true
  })
  const used = new Set()
  const statMeta = []
  const next = { ...memoData }

  const slots = [
    ['STAT_1_VALUE', 'STAT_1_LABEL'],
    ['STAT_2_VALUE', 'STAT_2_LABEL'],
    ['STAT_3_VALUE', 'STAT_3_LABEL'],
  ]

  const prefQueue = [...preferences]
  while (prefQueue.length < 3) {
    const extra = filteredSignals.find(s => !prefQueue.includes(s.metricId))
    if (!extra) break
    prefQueue.push(extra.metricId)
  }

  for (let i = 0; i < slots.length; i++) {
    const [valKey, labelKey] = slots[i]
    const currentWeak = isWeakStatValue(next[valKey])

    if (!currentWeak) {
      statMeta.push({ slot: i + 1, source: 'generated', metricId: null })
      continue
    }

    const prefId = prefQueue[i]
    let signal = prefId ? pickSignalForMetric(prefId, filteredSignals, used) : null

    if (!signal) {
      const extras = fillRemainingSlots(filteredSignals, used, 1)
      signal = extras[0] || null
    }

    if (signal) {
      used.add(signal.metricId)
      next[valKey] = signal.value
      next[labelKey] = signal.label
      statMeta.push({
        slot: i + 1,
        metricId: signal.metricId,
        source: signal.fallback ? 'fallback' : signal.source,
      })
    } else {
      statMeta.push({ slot: i + 1, source: 'missing', metricId: prefId || null })
    }
  }

  return { memoData: next, statMeta, preferences: normalizeMetricPreferences(preferences) }
}

export { isWeakStatValue }
