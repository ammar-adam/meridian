'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import AuthBar from '@/components/auth-bar'

export default function Nav({ variant = 'default' }) {
  const pathname = usePathname()
  const inWorkspace = ['/discover', '/flow', '/brief', '/lists', '/library', '/thesis', '/fund'].some(
    p => pathname === p || pathname.startsWith(p + '/')
  )
  const isLanding = variant === 'landing'

  return (
    <header className={isLanding ? 'm-nav-landing' : 'm-nav-default'}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="m-logo">M</div>
          <span
            className="text-[15px] tracking-tight"
            style={{ fontFamily: 'var(--m-serif)', color: 'var(--m-text)' }}
          >
            Meridian
          </span>
        </Link>

        {!inWorkspace && (
          <div className="flex items-center gap-2">
            <AuthBar variant={isLanding ? 'landing' : 'default'} />
            {isLanding && (
              <>
                <Link href="/library" className="m-btn-ghost-landing hidden md:inline-flex">
                  Library
                </Link>
                <Link href="/discover" className="m-btn-ghost-landing hidden md:inline-flex">
                  Discover
                </Link>
              </>
            )}
            <Link href="/flow" className="m-btn-primary">
              Open Deal Flow
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
