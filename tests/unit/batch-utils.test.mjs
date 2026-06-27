import { describe, it, expect } from 'vitest'
import {
  parseUrlList,
  jobHasPending,
  recalculateBatchCounts,
  recoverInterruptedBatchRows,
  normalizeJobForResume,
} from '@/lib/batch-utils'

describe('batch-utils', () => {
  it('parseUrlList dedupes and caps at 50', () => {
    const text = 'stripe.com\nhttps://stripe.com\nanthropic.com'
    const urls = parseUrlList(text)
    expect(urls).toHaveLength(2)
    expect(urls[0]).toBe('https://stripe.com')
  })

  it('jobHasPending detects researching rows', () => {
    expect(jobHasPending({ results: [{ status: 'done' }, { status: 'researching' }] })).toBe(true)
    expect(jobHasPending({ results: [{ status: 'done' }, { status: 'failed' }] })).toBe(false)
  })

  it('recoverInterruptedBatchRows resets researching to pending', () => {
    const job = recoverInterruptedBatchRows({
      urls: ['https://a.com', 'https://b.com'],
      results: [
        { url: 'https://a.com', status: 'done' },
        { url: 'https://b.com', status: 'researching' },
      ],
    })
    expect(job.results[1].status).toBe('pending')
    expect(job.status).toBe('running')
  })

  it('normalizeJobForResume can reset failed rows', () => {
    const job = normalizeJobForResume({
      urls: ['https://a.com'],
      results: [{ url: 'https://a.com', status: 'failed', error: 'x' }],
    }, { resetFailed: true })
    expect(job.results[0].status).toBe('pending')
  })

  it('recalculateBatchCounts aggregates statuses', () => {
    const counts = recalculateBatchCounts([
      { status: 'done' },
      { status: 'failed' },
      { status: 'skipped' },
    ])
    expect(counts).toEqual({ completed: 1, failed: 1, skipped: 1, total: 3, current: null })
  })
})
