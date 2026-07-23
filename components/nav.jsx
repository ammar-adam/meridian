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
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="m-logo">M</div>
          <span className="text-[15px] font-semibold tracking-tight text-slate-900">
            Meridian
          </span>
        </Link>

        {!inWorkspace && (
          <div className="flex items-center gap-3">
            <AuthBar variant={isLanding ? 'landing' : 'default'} />
            {isLanding && (
              <>
                <Link href="/library" className="m-btn-ghost-landing hidden md:inline-flex">
                  Library
                </Link>
                <Link href="/discover" className="m-btn-ghost-landing hidden md:inline-flex">
                  Discover
                </Link>
                <Link href="/fund/setup" className="m-btn-ghost-landing hidden md:inline-flex">
                  Setup
                </Link>
              </>
            )}
            <Link href="/flow" className={isLanding ? 'm-btn-glow' : 'm-btn-primary'}>
              Open Deal Flow
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
