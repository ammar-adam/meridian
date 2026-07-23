export default function WorkspacePreview() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      <div className="m-product-frame">
        <div className="m-product-frame-chrome">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <span className="font-mono text-[11px] text-slate-500">meridian.app/flow · Panache Ventures</span>
        </div>

        <div className="flex min-h-[360px]">
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

          <div className="min-w-0 flex-1 bg-slate-50/50 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[13px] font-semibold text-slate-900">Deal Flow</div>
                <div className="text-[11px] text-slate-500">Canadian pre-seed · community sources</div>
              </div>
              <span className="m-stat-pill-success">12 new</span>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              <span className="m-stat-pill m-stat-pill-accent">87% community-sourced</span>
              <span className="m-stat-pill">64% direct-reach</span>
            </div>

            {[
              { name: 'SCADABLE', founders: 'Ali Rahbar', src: 'Velocity', fit: 92, domain: 'scadable.com' },
              { name: 'Photon-IV', founders: 'Sanal Sina Kamal', src: 'Velocity', fit: 88, domain: 'photon-iv.com' },
              { name: 'Simantic', founders: 'Hong · Shahriar', src: 'Velocity', fit: 84, domain: 'simantic.dev' },
            ].map((row) => (
              <div
                key={row.name}
                className="mb-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-[13px] font-semibold text-slate-900">{row.name}</div>
                      <span className="m-badge-high">{row.fit}</span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500">Founders: {row.founders}</div>
                  </div>
                  <span className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-mono text-[9px] font-medium text-emerald-700">
                    {row.src}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[10px] text-slate-400">{row.domain}</div>
              </div>
            ))}

            <div className="mt-3 text-[10px] text-slate-400">
              Provenance from cohort pages — not a Crunchbase scrape.
            </div>
          </div>
        </div>
      </div>

      <div className="m-product-glow" aria-hidden />
    </div>
  )
}
