export default function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="m-loader h-screen" style={{ background: 'var(--m-bg)' }}>
      <div className="m-loader-bar"><div /></div>
      <p className="font-mono text-[11px]" style={{ color: 'var(--m-muted)' }}>{label}</p>
    </div>
  )
}
