import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t" style={{ borderColor: 'var(--m-border-strong)', background: 'var(--m-bg)' }}>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="m-logo text-[12px]">M</div>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--m-muted)' }}>Meridian · File 001</span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[12px]" style={{ color: 'var(--m-muted)' }}>
          <Link href="/discover" className="uppercase tracking-wider transition hover:text-[color:var(--m-text)]">Workspace</Link>
          <Link href="/fund/setup" className="uppercase tracking-wider transition hover:text-[color:var(--m-text)]">Fund setup</Link>
          <Link href="/about" className="uppercase tracking-wider transition hover:text-[color:var(--m-text)]">About</Link>
          <Link href="/earliness" className="uppercase tracking-wider transition hover:text-[color:var(--m-text)]">Earliness</Link>
          <Link href="/pricing" className="uppercase tracking-wider transition hover:text-[color:var(--m-text)]">Pricing</Link>
          <Link href="/privacy" className="uppercase tracking-wider transition hover:text-[color:var(--m-text)]">Privacy</Link>
          <Link href="/terms" className="uppercase tracking-wider transition hover:text-[color:var(--m-text)]">Terms</Link>
          <Link href="/claim" className="uppercase tracking-wider transition hover:text-[color:var(--m-text)]">For founders</Link>
        </div>
      </div>
    </footer>
  )
}
