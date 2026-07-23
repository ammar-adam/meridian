export default function WorkspacePreview() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      <div className="m-product-frame">
        <div className="m-product-frame-chrome">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          </div>
          <span className="font-mono text-[11px] text-emerald-300/70">meridian.app/flow · Panache Ventures</span>
        </div>

        <div className="flex min-h-[368px]">
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

          <div className="min-w-0 flex-1 p-5" style={{ background: 'var(--m-bg-subtle)' }}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[13px] font-semibold text-white">Deal Flow</div>
                <div className="text-[11px] text-white/40">Canadian pre-seed · community sources</div>
              </div>
              <span className="m-stat-pill-success rounded-full border px-3 py-1 font-mono text-[11px]">12 new</span>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              <span className="m-stat-pill m-stat-pill-accent">87% community-sourced</span>
              <span className="m-stat-pill">50 verified misses</span>
            </div>

            {[
              { name: 'SCADABLE', founders: 'Ali Rahbar', src: 'Velocity', fit: 92, domain: 'scadable.com' },
              { name: 'Photon-IV', founders: 'Sanal Sina Kamal', src: 'Velocity', fit: 88, domain: 'photon-iv.com' },
              { name: 'Simantic', founders: 'Hong · Shahriar', src: 'Velocity', fit: 84, domain: 'simantic.dev' },
            ].map((row) => (
              <div
                key={row.name}
                className="mb-2 rounded-lg border px-3 py-2.5"
                style={{ borderColor: 'var(--m-border)', background: 'var(--m-surface)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-[13px] font-semibold text-white">{row.name}</div>
                      <span className="m-badge-high">{row.fit}</span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-white/40">Founders: {row.founders}</div>
                  </div>
                  <span className="shrink-0 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 font-mono text-[9px] font-medium text-emerald-300">
                    {row.src}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[10px] text-white/30">{row.domain}</div>
              </div>
            ))}

            <div className="mt-3 text-[10px] text-white/30">
              Provenance from cohort pages — not a Crunchbase scrape.
            </div>
          </div>
        </div>
      </div>

      <div className="m-product-glow" aria-hidden />
    </div>
  )
}
