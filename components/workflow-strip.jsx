'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const STEPS = [
  { id: 'fund', label: 'Fund', href: '/fund', paths: ['/fund', '/fund/setup'] },
  { id: 'flow', label: 'Flow', href: '/flow', paths: ['/flow'] },
  { id: 'discover', label: 'Discover', href: '/discover', paths: ['/discover'] },
  { id: 'brief', label: 'Brief', href: '/brief', paths: ['/brief'] },
  { id: 'review', label: 'Library', href: '/library', paths: ['/library', '/memo'] },
  { id: 'thesis', label: 'Thesis', href: '/thesis', paths: ['/thesis'] },
]

function stepIndex(pathname) {
  const i = STEPS.findIndex(s => s.paths.some(p => pathname === p || pathname.startsWith(p + '/')))
  return i >= 0 ? i : -1
}

export default function WorkflowStrip() {
  const pathname = usePathname()
  const active = stepIndex(pathname)

  return (
    <div
      className="flex shrink-0 items-center gap-1 overflow-x-auto border-b px-6 py-2"
      style={{ borderColor: 'var(--m-border)', background: 'var(--m-surface)' }}
    >
      {STEPS.map((step, i) => {
        const isActive = i === active
        const isPast = active > i
        return (
          <div key={step.id} className="flex shrink-0 items-center">
            {i > 0 && (
              <span className={`mx-1.5 text-[10px] ${isPast ? 'text-[color:var(--m-accent)]' : 'text-[color:var(--m-muted-2)]'}`}>›</span>
            )}
            <Link
              href={step.href}
              className={`px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wider transition ${
                isActive
                  ? 'bg-[color:var(--m-text)] text-[color:var(--m-bg)]'
                  : 'text-[color:var(--m-muted)] hover:bg-black/5 hover:text-[color:var(--m-text)]'
              }`}
              style={{ borderRadius: 'var(--m-radius-sm)' }}
            >
              {step.label}
            </Link>
          </div>
        )
      })}
    </div>
  )
}
