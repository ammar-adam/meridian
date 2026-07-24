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

          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 pb-16 pt-10 lg:pb-24">
            <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
              <div className="lg:col-span-5">
                <h1 className="m-landing-brand">Meridian</h1>
                <p className="m-landing-headline mt-6">
                  Community deal flow, with receipts.
                </p>
                <p className="m-landing-lead">
                  Surface early Canadian companies from incubators and cohorts —
                  founders, provenance, and dated proof — matched to your mandate.
                </p>
                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <Link href="/flow" className="m-btn-primary px-5 py-3 text-[14px]">
                    Open Deal Flow
                  </Link>
                  <Link href="/pilot" className="m-btn-ghost-landing">
                    See the proof
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-7">
                <WorkspacePreview />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-t py-16" style={{ borderColor: 'var(--m-border)', background: 'var(--m-surface)' }}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-xl">
            <p className="m-kicker mb-3">Brief a company</p>
            <h2 className="text-[1.75rem] tracking-tight" style={{ fontFamily: 'var(--m-serif)', color: 'var(--m-text)' }}>
              Already have a name? Generate a fund-native one-pager.
            </h2>
          </div>
          <div className="mt-8 max-w-xl">
            <HeroInput variant="landing" />
          </div>
        </div>
      </section>

      <section className="relative border-t py-20" style={{ borderColor: 'var(--m-border)', background: 'var(--m-bg)' }}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 max-w-xl">
            <p className="m-kicker mb-3">How it works</p>
            <h2 className="text-[1.75rem] tracking-tight" style={{ fontFamily: 'var(--m-serif)', color: 'var(--m-text)' }}>
              Mandate in. Receipts out.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed" style={{ color: 'var(--m-muted)' }}>
              Every company carries where we found it, when we first saw it, and —
              where checked — whether StartupHub had it at that time.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <Step num="01" title="Set your mandate" desc="Fund thesis or personal focus. Meridian watches Velocity, DMZ, CDL, and grants against it." />
            <Step num="02" title="Open Deal Flow" desc="Net-new companies with founders and domains. Community sources, not a Crunchbase scrape." />
            <Step num="03" title="Brief and decide" desc="One-pager against your thesis. Pursue or pass — signals compound on Thesis." />
          </div>
        </div>
      </section>

      <section className="relative border-t py-20" style={{ borderColor: 'var(--m-border)', background: 'var(--m-surface)' }}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 max-w-lg">
            <p className="m-kicker mb-3">The loop</p>
            <h2 className="text-[1.75rem] tracking-tight" style={{ fontFamily: 'var(--m-serif)', color: 'var(--m-text)' }}>
              Source → brief → signal
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Link href="/flow" className="group m-bento">
              <span className="m-bento-icon">Deal Flow</span>
              <h3 className="m-bento-title">What’s new this week</h3>
              <p className="m-bento-desc">Community companies matched to your mandate — the reason to open Meridian every Monday.</p>
              <span className="m-bento-link">Open Flow →</span>
            </Link>
            <Link href="/brief" className="group m-bento">
              <span className="m-bento-icon">Brief</span>
              <h3 className="m-bento-title">URL to one-pager</h3>
              <p className="m-bento-desc">Any company domain → fund-native memo you can forward.</p>
              <span className="m-bento-link">Generate a brief →</span>
            </Link>
            <Link href="/fund" className="group m-bento">
              <span className="m-bento-icon">Fund</span>
              <h3 className="m-bento-title">Your mandate</h3>
              <p className="m-bento-desc">Choose or add a fund. Every thesis band is specific to you.</p>
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
    <div>
      <div className="font-mono text-[11px] font-semibold tabular-nums" style={{ color: 'var(--m-accent)' }}>{num}</div>
      <h3 className="mt-3 text-[16px] font-semibold tracking-tight" style={{ fontFamily: 'var(--m-font)', color: 'var(--m-text)' }}>{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed" style={{ color: 'var(--m-muted)' }}>{desc}</p>
    </div>
  )
}
