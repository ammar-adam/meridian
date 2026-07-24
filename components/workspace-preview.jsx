export default function WorkspacePreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
      <div className="m-product-frame">
        <div className="m-product-frame-chrome">
          <div className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: 'var(--m-border-strong)' }} />
            <span className="h-2 w-2 rounded-full" style={{ background: 'var(--m-border-strong)' }} />
            <span className="h-2 w-2 rounded-full" style={{ background: 'var(--m-border-strong)' }} />
          </div>
          <span className="font-mono text-[11px]" style={{ color: 'var(--m-muted)' }}>
            meridian.app/flow · Panache Ventures
          </span>
        </div>

        <div className="flex min-h-[360px]">
          <div className="m-product-sidebar">
            {[
              { label: 'F', active: true },
              { label: 'B', active: false },
              { label: 'L', active: false },
              { label: 'T', active: false },
            ].map(({ label, active }) => (
              <div key={label} className={`m-product-nav-item ${active ? 'm-product-nav-active' : ''}`}>
                {label}
              </div>
            ))}
          </div>

          <div className="min-w-0 flex-1 p-5" style={{ background: 'var(--m-bg)' }}>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <div className="text-[15px] font-semibold" style={{ color: 'var(--m-text)' }}>Deal Flow</div>
                <div className="text-[12px]" style={{ color: 'var(--m-muted)' }}>Canadian pre-seed · community sources</div>
              </div>
              <span className="m-stat-pill-success">12 new</span>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              <span className="m-stat-pill m-stat-pill-accent">87% community</span>
              <span className="m-stat-pill">50 verified misses</span>
            </div>

            {[
              { name: 'SCADABLE', founders: 'Ali Rahbar', src: 'Velocity', fit: 92, domain: 'scadable.com' },
              { name: 'Photon-IV', founders: 'Sanal Sina Kamal', src: 'Velocity', fit: 88, domain: 'photon-iv.com' },
              { name: 'Simantic', founders: 'Hong · Shahriar', src: 'Velocity', fit: 84, domain: 'simantic.dev' },
            ].map((row) => (
              <div
                key={row.name}
                className="mb-2 border px-3 py-2.5"
                style={{
                  borderColor: 'var(--m-border)',
                  background: 'var(--m-surface)',
                  borderRadius: 'var(--m-radius-sm)',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-[13px] font-semibold" style={{ color: 'var(--m-text)' }}>{row.name}</div>
                      <span className="m-badge-high">{row.fit}</span>
                    </div>
                    <div className="mt-0.5 text-[11px]" style={{ color: 'var(--m-muted)' }}>
                      Founders: {row.founders}
                    </div>
                  </div>
                  <span
                    className="shrink-0 px-1.5 py-0.5 font-mono text-[9px] font-medium"
                    style={{
                      borderRadius: 'var(--m-radius-sm)',
                      border: '1px solid var(--m-accent-line)',
                      background: 'var(--m-accent-soft)',
                      color: 'var(--m-accent)',
                    }}
                  >
                    {row.src}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[10px]" style={{ color: 'var(--m-muted-2)' }}>{row.domain}</div>
              </div>
            ))}

            <div className="mt-3 text-[11px]" style={{ color: 'var(--m-muted-2)' }}>
              Provenance from cohort pages — not a Crunchbase scrape.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
