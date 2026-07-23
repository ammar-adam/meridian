import Link from 'next/link'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import HeroInput from '@/components/hero-input'
import WorkspacePreview from '@/components/workspace-preview'
import LandingBackground from '@/components/landing-background'

export default function LandingPage() {
  return (
    <div className="m-landing">
      <section className="relative flex min-h-[100svh] flex-col">
        <LandingBackground />
        <div className="relative z-10 flex flex-1 flex-col">
          <Nav variant="landing" />

          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 pb-20 pt-8 lg:pb-28">
            <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
              <div className="max-w-xl">
                <p className="m-landing-eyebrow">Early startup discovery · with dated proof</p>
                <h1 className="m-landing-brand">Meridian</h1>
                <p className="m-landing-headline mt-4">
                  We find promising startups in community sources first — with dated proof you can verify.
                </p>
                <p className="m-landing-lead">
                  Meridian watches the places new companies show up first — university incubators,
                  accelerator cohorts, grant lists — and shows you each one with founder contacts,
                  where we found it, and the date we found it. Tell us what you invest in; we&apos;ll
                  brief the ones that matter.
                </p>
                <div className="mt-10 flex flex-wrap gap-3">
                  <Link href="/flow" className="m-btn-glow">
                    Open Deal Flow
                  </Link>
                  <Link href="/pilot" className="m-btn-ghost-landing">
                    See pilot proof
                  </Link>
                  <Link href="/fund" className="m-btn-ghost-landing">
                    Choose your fund
                  </Link>
                </div>
                <div className="mt-8">
                  <p className="mb-2 text-[12px] text-zinc-500">Or brief a company you already know</p>
                  <HeroInput variant="landing" />
                </div>
              </div>

              <WorkspacePreview />
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-t py-20" style={{ borderColor: 'var(--m-border)', background: 'var(--m-bg-subtle)' }}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <p className="m-kicker mb-3">The data wedge</p>
            <h2 className="text-[28px] font-bold tracking-tight text-white sm:text-[32px]">
              Dated index checks — StartupHub live today; Harmonic next.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[16px] leading-relaxed" style={{ color: 'var(--m-muted)' }}>
              Every company we surface carries a receipt: the source page, the date our server
              first recorded it, and — where we&apos;ve run a dated StartupHub name search —
              whether the mainstream databases had it at that time. We only claim earliness
              when the ledger shows it; you can re-run the check yourself.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <Step num="01" title="Tell us what you invest in" desc="Your fund's focus — or just your own interests. Meridian watches community sources against it: Velocity, DMZ, CDL, grants." />
            <Step num="02" title="See what’s new" desc="Net-new companies with founders and domains between visits. Fresh cohort badges when data lands." />
            <Step num="03" title="Brief & decide" desc="One-pager screening brief against your focus. Pursue or pass — your signals compound." />
          </div>
        </div>
      </section>

      <section className="relative border-t py-24" style={{ borderColor: 'var(--m-border)', background: 'var(--m-bg)' }}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 max-w-lg">
            <p className="m-kicker mb-3">The loop</p>
            <h2 className="text-[28px] font-bold tracking-tight text-white sm:text-[32px]">
              Source → brief → signal
            </h2>
            <p className="mt-3 text-[16px] leading-relaxed" style={{ color: 'var(--m-muted)' }}>
              The product loop investors care about: community entities in, forwardable memo out, pursue/pass back in.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:grid-rows-2">
            <Link href="/flow" className="group m-bento m-bento-lg lg:col-span-7 lg:row-span-2">
              <span className="m-bento-icon">◈</span>
              <h3 className="m-bento-title">Deal Flow</h3>
              <p className="m-bento-desc">What’s new against what you invest in, from community sources — the reason to open Meridian every week.</p>
              <span className="m-bento-link">Open Flow →</span>
            </Link>

            <Link href="/brief" className="group m-bento lg:col-span-5">
              <span className="m-bento-icon">◎</span>
              <h3 className="m-bento-title">Brief</h3>
              <p className="m-bento-desc">Any company URL → fund-native one-pager (~30–75s).</p>
              <span className="m-bento-link">Generate a brief →</span>
            </Link>

            <Link href="/fund" className="group m-bento lg:col-span-5">
              <span className="m-bento-icon">◇</span>
              <h3 className="m-bento-title">Fund</h3>
              <p className="m-bento-desc">Choose or add your mandate. Every thesis band is fund-specific.</p>
              <span className="m-bento-link">Choose a fund →</span>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function Step({ num, title, desc }) {
  return (
    <div className="relative text-center sm:text-left">
      <span className="font-mono text-[12px] font-semibold text-emerald-400">{num}</span>
      <h3 className="mt-2 text-[17px] font-semibold text-white">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed" style={{ color: 'var(--m-muted)' }}>{desc}</p>
    </div>
  )
}
