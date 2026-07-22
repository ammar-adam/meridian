'use client'

import { buildDeepDiveLinks } from '@/lib/deep-dive-links'

/**
 * Outbound deep-dive links — Harmonic, Crunchbase, Google (pre-filled queries).
 */
export default function DeepDiveLinks({ company, compact = false }) {
  if (!company?.name && !company?.domain) return null
  const links = buildDeepDiveLinks(company)

  const btnClass = compact
    ? 'text-[10px] font-medium text-zinc-600 hover:text-zinc-900 hover:underline'
    : 'm-btn-ghost m-btn-sm text-[11px]'

  return (
    <div className={`flex flex-wrap gap-x-2 gap-y-0.5 ${compact ? 'mt-1' : 'mt-2'}`}>
      <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Deep dive</span>
      <a href={links.harmonic} target="_blank" rel="noopener noreferrer" className={btnClass}>
        Harmonic
      </a>
      <a href={links.crunchbase} target="_blank" rel="noopener noreferrer" className={btnClass}>
        Crunchbase
      </a>
      <a href={links.google} target="_blank" rel="noopener noreferrer" className={btnClass}>
        Google
      </a>
      {links.linkedin && (
        <a href={links.linkedin} target="_blank" rel="noopener noreferrer" className={btnClass}>
          LinkedIn
        </a>
      )}
    </div>
  )
}
