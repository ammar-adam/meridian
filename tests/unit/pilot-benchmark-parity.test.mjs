import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { buildPilotCaseStudy } from '../../lib/pilot-case.js'

describe('pilot benchmark parity', () => {
  it('buildPilotCaseStudy exposes verifiedMiss from ledger summary when present', () => {
    const study = buildPilotCaseStudy()
    expect(study.metrics).toHaveProperty('verifiedMiss')
    expect(typeof study.metrics.verifiedMiss).toBe('number')
  })

  it('pilot API merges benchmark verifiedMisses over incubator ledger', () => {
    const pilotSrc = fs.readFileSync(path.join(process.cwd(), 'app/api/pilot/route.js'), 'utf8')
    expect(pilotSrc).toMatch(/study\.metrics\.verifiedMiss\s*=\s*bench\.verifiedMisses/)
    expect(pilotSrc).toContain('headlineMetrics')
  })
})
