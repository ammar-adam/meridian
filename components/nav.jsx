'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import AuthBar from '@/components/auth-bar'

export default function Nav({ variant = 'default' }) {
  const pathname = usePathname()
  const inWorkspace = ['/discover', '/brief', '/lists', '/library', '/thesis', '/fund'].some(
    p => pathname === p || pathname.startsWith(p + '/')
  )
  const isLanding = variant === 'landing'

  return (
    <header className={isLanding ? 'm-nav-landing' : 'm-nav-default'}>
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className={isLanding ? 'm-logo m-logo-light' : 'm-logo'}>M</div>
          <span className={`text-[15px] font-semibold tracking-tight ${isLanding ? 'text-white' : ''}`}>
            Meridian
          </span>
        </Link>

        {!inWorkspace && (
          <div className="flex items-center gap-3">
            <AuthBar variant={isLanding ? 'landing' : 'default'} />
            {isLanding && (
              <>
                <Link href="/library" className="m-btn-ghost-landing hidden sm:inline-flex">
                  Library
                </Link>
                <Link href="/discover" className="m-btn-ghost-landing hidden sm:inline-flex">
                  Discover
                </Link>
                <Link href="/fund/setup" className="m-btn-ghost-landing hidden sm:inline-flex">
                  Setup
                </Link>
              </>
            )}
            <Link href="/brief" className={isLanding ? 'm-btn-glow' : 'm-btn-primary'}>
              Generate brief
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
