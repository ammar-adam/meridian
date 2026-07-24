'use client'

/* External company favicons/OG images — dynamic URLs, not optimizable via next/image */
/* eslint-disable @next/next/no-img-element */

import { coverageLabel, coverageModeHint, scoreScrapeCoverage } from '@/lib/scrape-coverage'

export default function BriefPreview({ scraped, loading, className = '', researchMode = 'auto' }) {
  if (!scraped) return null

  const coverage = scoreScrapeCoverage(scraped)
  const badge = coverageLabel(coverage.level)
  const autoHint = researchMode === 'auto' ? coverageModeHint(coverage.level) : null
  const title = scraped.ogTitle || scraped.domain || 'Company'
  const initial = (title[0] || '?').toUpperCase()

  return (
    <div className={`overflow-hidden rounded-xl border ${className}`} style={{ borderColor: 'var(--m-border)', background: 'var(--m-surface)' }}>
      {scraped.ogImage ? (
        <div className="relative h-28 w-full bg-[color:var(--m-surface-2)]">
          <img src={scraped.ogImage} alt="" className="h-full w-full object-cover" />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium text-[color:var(--m-text)] backdrop-blur">Researching…</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-20 items-center justify-center bg-[color:var(--m-surface-2)]">
          {scraped.favicon ? (
            <img src={scraped.favicon} alt="" className="h-10 w-10 rounded-lg" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--m-accent)] text-lg font-semibold text-white">{initial}</span>
          )}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          {scraped.ogImage && scraped.favicon && (
            <img src={scraped.favicon} alt="" className="mt-0.5 h-8 w-8 shrink-0 rounded-md" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold">{title}</p>
            {scraped.domain && (
              <a
                href={`https://${scraped.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] hover:underline"
                style={{ color: 'var(--m-accent)' }}
                onClick={e => e.stopPropagation()}
              >
                {scraped.domain}
              </a>
            )}
            {scraped.ogDescription && (
              <p className="mt-2 line-clamp-3 text-[13px]" style={{ color: 'var(--m-muted)' }}>
                {scraped.ogDescription}
              </p>
            )}
          </div>
        </div>

        {autoHint && (
          <p className="mt-3 rounded-md border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-[11px] text-sky-200">
            {autoHint}
          </p>
        )}

        {badge && (
          <p className="mt-3 rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-200">
            <span className="font-medium">{badge}</span>
            {coverage.level === 'low' && ' — try Deep research or a better-documented company.'}
          </p>
        )}
      </div>
    </div>
  )
}
