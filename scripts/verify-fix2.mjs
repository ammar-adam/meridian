import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const SAGARD = {
  id: 'sagard_ai_fund',
  fundName: 'Sagard AI Fund',
  fundFooterName: 'Sagard AI Fund',
  strategyId: 'primary',
  thesis: 'Sagard AI Fund backs commercial-stage AI companies.',
  portfolio: [{ name: 'Cohere', description: 'Enterprise LLM' }, { name: 'Ada', description: 'AI support' }],
  thesisInstructions: 'Reference portfolio companies in every thesis point.',
  metricPreferences: ['total_raised', 'customer_traction', 'tam'],
}
const PANACHE = {
  id: 'panache_ventures',
  fundName: 'Panache Ventures',
  fundFooterName: 'Panache Ventures',
  strategyId: 'primary',
  thesis: 'Panache backs Canadian pre-seed/seed founders.',
  portfolio: [{ name: 'Neo Financial' }, { name: 'Hopper' }, { name: 'Vention' }],
  thesisInstructions: 'Reference portfolio companies in every thesis point.',
  metricPreferences: ['total_raised', 'customer_traction', 'tam'],
}

const BASE = process.argv[2] || 'http://localhost:3000'

function strip(s) {
  return (s ?? '').replace(/<[^>]+>/g, '').trim()
}

console.log('=== FIX 2: hypermode.com (Panache, Quick) ===')
const hyper = await fetch(`${BASE}/api/brief`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://www.hypermode.com', fundContext: PANACHE, researchMode: 'quick', forceRegenerate: true }),
}).then(r => r.json())

console.log('passConfidences:', hyper.researchPasses?.map(p => `${p.section}:${p.confidence}`).join(', '))
console.log('STAT_1_VALUE:', strip(hyper.memoData?.STAT_1_VALUE))
console.log('STAT_1_LABEL:', strip(hyper.memoData?.STAT_1_LABEL))
console.log('STAT_3_VALUE:', strip(hyper.memoData?.STAT_3_VALUE))
console.log('STAT_3_LABEL:', strip(hyper.memoData?.STAT_3_LABEL))
console.log('ROUND:', strip(hyper.memoData?.ROUND))
console.log('LEAD_INVESTOR:', strip(hyper.memoData?.LEAD_INVESTOR))
console.log('TOTAL_RAISED:', strip(hyper.memoData?.TOTAL_RAISED))

console.log('\n=== FIX 2: stripe.com (Sagard, Quick) — thesis 2/3 ===')
const stripe = await fetch(`${BASE}/api/brief`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://stripe.com', fundContext: SAGARD, researchMode: 'quick', forceRegenerate: true }),
}).then(r => r.json())

console.log('THESIS_2_TEXT:', strip(stripe.memoData?.THESIS_2_TEXT))
console.log('THESIS_3_TEXT:', strip(stripe.memoData?.THESIS_3_TEXT))
console.log('qualityGate thesis flags:', stripe.qualityGate?.flags?.filter(f => f.field?.startsWith('THESIS')).map(f => f.message))
