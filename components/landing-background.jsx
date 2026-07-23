'use client'

export default function LandingBackground() {
  return (
    <div className="m-landing-bg" aria-hidden>
      <div className="m-landing-gradient" />
      <div className="m-landing-grid" />
      <div className="m-landing-grain" />
      {/* Ghost classification watermark */}
      <div
        className="absolute -right-10 top-[18%] select-none font-mono text-[13vw] font-bold leading-none tracking-tighter"
        style={{ color: 'rgba(26,26,23,0.035)' }}
      >
        FILE&nbsp;001
      </div>
    </div>
  )
}
