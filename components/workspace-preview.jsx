export default function WorkspacePreview() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      <div className="m-product-frame">
        {/* Case-file header strip */}
        <div className="m-product-frame-chrome">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--m-muted)' }}>
            Case file
          </span>
          <span className="font-mono text-[11px]" style={{ color: 'var(--m-accent)' }}>Panache Ventures · Deal Flow</span>
        </div>

        <div className="flex min-h-[372px]">
          <div className="m-product-sidebar">
            {[
              { label: 'Flow', active: true },
              { label: 'Brief', active: false },
              { label: 'Lib', active: false },
              { label: 'Thesis', active: false },
            ].map(({ label, active }) => (
              <div key={label} className={`m-product-nav-item ${active ? 'm-product-nav-active' : ''}`}>
                {label.slice(0, 1)}
              </div>
            ))}
          </div>

          <div className="min-w-0 flex-1 p-5" style={{ background: 'var(--m-surface)' }}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-serif text-[15px] font-semibold" style={{ color: 'var(--m-text)' }}>Deal Flow</div>
                <div className="font-mono text-[10px]" style={{ color: 'var(--m-muted-2)' }}>Canadian pre-seed · community sources</div>
              </div>
              <span className="m-stat-pill m-stat-pill-success">12 new</span>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              <span className="m-stat-pill m-stat-pill-accent">87% community-sourced</span>
              <span className="m-stat-pill">50 verified misses</span>
            </div>

            {[
              { name: 'SCADABLE', founders: 'Ali Rahbar', date: '2026-05-12', fit: 92, domain: 'scadable.com', stamp: true },
              { name: 'Photon-IV', founders: 'Sanal Sina Kamal', date: '2026-05-09', fit: 88, domain: 'photon-iv.com', stamp: true },
              { name: 'Simantic', founders: 'Hong · Shahriar', date: '2026-04-28', fit: 84, domain: 'simantic.dev', stamp: false },
            ].map((row) => (
              <div
                key={row.name}
                className="mb-2 border-l-2 py-2 pl-3"
                style={{ borderColor: 'var(--m-border-strong)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-[13px] font-semibold" style={{ color: 'var(--m-text)' }}>{row.name}</div>
                      <span className="m-badge-high">{row.fit}</span>
                    </div>
                    <div className="mt-0.5 text-[10px]" style={{ color: 'var(--m-muted)' }}>Founders: {row.founders}</div>
                    <div className="mt-0.5 font-mono text-[9px]" style={{ color: 'var(--m-muted-2)' }}>
                      first seen {row.date} · {row.domain}
                    </div>
                  </div>
                  {row.stamp && <span className="m-stamp shrink-0">Not in index</span>}
                </div>
              </div>
            ))}

            <div className="mt-3 font-mono text-[9px]" style={{ color: 'var(--m-muted-2)' }}>
              Provenance cited from cohort pages — re-runnable index checks.
            </div>
          </div>
        </div>
      </div>

      <div className="m-product-glow" aria-hidden />
    </div>
  )
}
