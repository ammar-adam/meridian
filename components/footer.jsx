import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t" style={{ borderColor: 'var(--m-border)', background: 'var(--m-bg)' }}>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="m-logo text-[12px]">M</div>
          <span className="text-[13px]" style={{ color: 'var(--m-muted)' }}>Meridian</span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] font-medium" style={{ color: 'var(--m-muted)' }}>
          <Link href="/discover" className="transition hover:text-white">Workspace</Link>
          <Link href="/fund/setup" className="transition hover:text-white">Fund setup</Link>
          <Link href="/about" className="transition hover:text-white">About</Link>
          <Link href="/earliness" className="transition hover:text-white">Earliness</Link>
          <Link href="/pricing" className="transition hover:text-white">Pricing</Link>
          <Link href="/privacy" className="transition hover:text-white">Privacy</Link>
          <Link href="/terms" className="transition hover:text-white">Terms</Link>
          <Link href="/claim" className="transition hover:text-white">For founders</Link>
        </div>
      </div>
    </footer>
  )
}
