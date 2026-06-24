'use client'

import { getPipelineContacts, importPipelineContacts } from '@/lib/pipeline-contacts'

export default function PipelineContactsPanel({ onBrief, contacts: contactsProp }) {
  const contacts = contactsProp ?? getPipelineContacts()
  if (!contacts.length) return null

  return (
    <div className="m-card overflow-hidden">
      <div className="m-card-header">
        <div>
          <p className="text-[13px] font-medium">From your pipeline</p>
          <p className="mt-0.5 text-[11px]" style={{ color: 'var(--m-muted)' }}>
            {contacts.length} imported — drop contacts or CSV anytime to add more
          </p>
        </div>
      </div>
      <ul className="divide-y" style={{ borderColor: 'var(--m-border)' }}>
        {contacts.slice(0, 8).map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">{c.name}</p>
              <p className="truncate font-mono text-[11px]" style={{ color: 'var(--m-muted)' }}>
                {c.domain || c.url || '—'}
              </p>
            </div>
            {(c.url || c.domain) && (
              <button
                type="button"
                onClick={() => onBrief?.(c)}
                className="m-btn-secondary m-btn-sm shrink-0"
              >
                Brief
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function mergePipelineIntoDiscover(companies, contacts) {
  if (!contacts?.length) return companies
  const seen = new Set(companies?.map(c => (c.domain || c.url || c.name).toLowerCase()) ?? [])
  const extra = contacts
    .filter(c => {
      const key = (c.domain || c.name).toLowerCase()
      return key && !seen.has(key)
    })
    .map(c => ({
      name: c.name,
      description: c.description || 'Imported from your pipeline',
      stage: 'Undisclosed',
      geography: '',
      sector: '',
      fitScore: 50,
      rationale: 'Already in your network — worth a first-pass brief',
      source: 'pipeline',
      domain: c.domain,
      url: c.url || (c.domain ? `https://${c.domain}` : ''),
    }))
  return [...extra, ...(companies || [])]
}

export { importPipelineContacts, getPipelineContacts }
