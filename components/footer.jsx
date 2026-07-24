export default function Footer() {
  const links = [
    { href: '/discover', label: 'Workspace' },
    { href: '/fund/setup', label: 'Fund setup' },
    { href: '/about', label: 'About' },
    { href: '/earliness', label: 'Earliness' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/privacy', label: 'Privacy' },
    { href: '/terms', label: 'Terms' },
    { href: '/claim', label: 'For founders' },
  ]

  return (
    <footer className="m-landing-section" style={{ background: 'transparent' }}>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="m-logo text-[12px]">M</div>
          <span className="text-[14px]" style={{ color: 'var(--ml-text)', fontFamily: 'var(--m-serif)' }}>Meridian</span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] font-medium" style={{ color: 'var(--ml-muted)' }}>
          {links.map(l => (
            <a key={l.href} href={l.href} className="transition hover:text-white" style={{ color: 'inherit' }}>
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
