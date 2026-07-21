'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const STEPS = [
  { id: 'fund', label: 'Fund', href: '/fund', paths: ['/fund', '/fund/setup'] },
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
    <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-6 py-2">
      {STEPS.map((step, i) => {
        const isActive = i === active
        const isPast = active > i
        return (
          <div key={step.id} className="flex shrink-0 items-center">
            {i > 0 && (
              <span className={`mx-1.5 text-[10px] ${isPast ? 'text-zinc-400' : 'text-zinc-300'}`}>›</span>
            )}
            <Link
              href={step.href}
              className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition ${
                isActive
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              {step.label}
            </Link>
          </div>
        )
      })}
    </div>
  )
}
