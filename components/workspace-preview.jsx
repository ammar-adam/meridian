export default function WorkspacePreview() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      <div className="m-glass-panel">
        <div className="m-glass-panel-chrome">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
          </div>
          <span className="font-mono text-[11px] text-zinc-500">discover · canadian pre-seed</span>
        </div>

        <div className="flex min-h-[340px]">
          <div className="m-glass-sidebar">
            {['Discover', 'Brief', 'Library', 'Thesis'].map((label, i) => (
              <div key={label} className={`m-glass-nav-item ${i === 0 ? 'm-glass-nav-active' : ''}`}>
                {label.slice(0, 1)}
              </div>
            ))}
          </div>

          <div className="min-w-0 flex-1 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[11px] font-medium text-zinc-400">12 companies · incubator first</div>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-400">
                founders + domain
              </span>
            </div>

            {[
              { name: 'SCADABLE', founders: 'Ali Rahbar', src: 'Velocity', domain: 'scadable.com' },
              { name: 'Photon-IV', founders: 'Sanal Sina Kamal', src: 'Velocity', domain: 'photon-iv.com' },
              { name: 'Simantic', founders: 'Hong · Shahriar', src: 'Velocity', domain: 'simantic.dev' },
            ].map((row) => (
              <div key={row.name} className="mb-2 rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[13px] font-semibold text-zinc-100">{row.name}</div>
                    <div className="mt-0.5 text-[10px] text-zinc-500">Founders: {row.founders}</div>
                  </div>
                  <span className="shrink-0 rounded border border-emerald-500/30 px-1.5 py-0.5 font-mono text-[9px] text-emerald-400">
                    {row.src}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[10px] text-zinc-500">{row.domain}</div>
              </div>
            ))}

            <div className="mt-3 text-[10px] text-zinc-500">
              Provenance from cohort pages — not a Crunchbase scrape.
            </div>
          </div>
        </div>
      </div>

      <div className="m-glass-glow" aria-hidden />
    </div>
  )
}
