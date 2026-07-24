'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import AuthBar from '@/components/auth-bar'

export default function Nav({ variant = 'default' }) {
  const pathname = usePathname()
  const inWorkspace = ['/discover', '/flow', '/brief', '/lists', '/library', '/thesis', '/fund', '/schools'].some(
    p => pathname === p || pathname.startsWith(p + '/')
  )
  const isLanding = variant === 'landing'
  // Native anchors on landing so clicks work before hydration.
  const A = isLanding ? 'a' : Link

  return (
    <header className={isLanding ? 'm-nav-landing' : 'm-nav-default'}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <A href="/" className="flex items-center gap-2.5">
          <div className="m-logo">M</div>
          <span
            className="text-[16px] tracking-tight"
            style={{ fontFamily: 'var(--m-serif)', color: isLanding ? 'var(--ml-text)' : 'var(--m-text)' }}
          >
            Meridian
          </span>
        </A>

        {!inWorkspace && (
          <div className="flex items-center gap-2">
            <AuthBar variant={isLanding ? 'landing' : 'default'} />
            <A href="/welcome?next=/flow" className={isLanding ? 'm-btn-invert' : 'm-btn-primary'}>
              Get started
            </A>
          </div>
        )}
      </div>
    </header>
  )
}
