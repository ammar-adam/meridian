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
          <span className="font-mono text-[11px] text-zinc-500">nationgraph.com → brief</span>
        </div>

        <div className="flex min-h-[340px]">
          <div className="m-glass-sidebar">
            {['Brief', 'Library', 'Thesis', 'Discover'].map((label, i) => (
              <div key={label} className={`m-glass-nav-item ${i === 0 ? 'm-glass-nav-active' : ''}`}>
                {label.slice(0, 1)}
              </div>
            ))}
          </div>

          <div className="min-w-0 flex-1 p-5">
            <div className="rounded-md border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[15px] font-semibold text-zinc-100">NationGraph</div>
                  <div className="mt-0.5 text-[11px] text-zinc-500">Series A · June 2026</div>
                </div>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-400">
                  34s
                </span>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-zinc-400">
                AI-powered procurement intelligence for companies selling to government…
              </p>
            </div>

            <div className="mt-4 rounded-md bg-[#8B1A1A]/90 p-3">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-white/70">The Your Fund Angle</div>
              <div className="mt-1 text-[12px] font-medium leading-snug text-white">
                Predictive layer for govtech sales — enterprise distribution in a $160B market
              </div>
              <div className="mt-2 grid gap-1.5 text-[10px] text-white/80">
                <div>→ Portfolio overlap with SLED vendors</div>
                <div>→ Data moat compounds with usage</div>
                <div>→ Series A mandate fit</div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <span className="rounded-md border border-white/10 px-2.5 py-1 text-[10px] text-zinc-400">Pass</span>
              <span className="rounded-md bg-white px-2.5 py-1 text-[10px] font-medium text-zinc-900">Pursue</span>
            </div>
          </div>
        </div>
      </div>

      <div className="m-glass-glow" aria-hidden />
    </div>
  )
}
