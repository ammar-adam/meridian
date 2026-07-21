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
                <p className="m-landing-eyebrow">Community deal flow · before it&apos;s indexed</p>
                <h1 className="m-landing-brand">Meridian</h1>
                <p className="m-landing-headline mt-4">
                  Find early Canadian companies Harmonic still can&apos;t see — then brief them against your thesis.
                </p>
                <p className="m-landing-lead">
                  Velocity, DMZ, CDL, grants, and registry signals structured with founders and provenance. The memo is how you forward it.
                </p>
                <div className="mt-10 flex flex-wrap gap-3">
                  <Link href="/discover" className="m-btn-glow">
                    Open Discover
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

      <section className="relative border-t border-zinc-200/80 bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <h2 className="text-[28px] font-bold tracking-tight text-zinc-900 sm:text-[32px]">
              Data first. Memo second.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[16px] leading-relaxed text-zinc-500">
              Early deal flow lives on cohort pages and grant lists — not in US-centric startup APIs. Meridian structures it for your mandate.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <Step num="01" title="Choose your fund" desc="Pick a profile or drop your fund URL. Mandate and portfolio drive ranking and the thesis band." />
            <Step num="02" title="Discover or paste" desc="Thesis-ranked community companies with founders and provenance — or Brief any URL you already have." />
            <Step num="03" title="Forward the brief" desc="One-pager with a fund-native thesis band. Pursue or pass — Meridian learns what you bet on." />
          </div>
        </div>
      </section>

      <section className="relative border-t border-zinc-200/80 bg-zinc-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 max-w-lg">
            <h2 className="text-[28px] font-bold tracking-tight text-zinc-900 sm:text-[32px]">
              Source → brief → signal
            </h2>
            <p className="mt-3 text-[16px] leading-relaxed text-zinc-500">
              The product loop investors care about: community entities in, forwardable memo out, pursue/pass back in.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:grid-rows-2">
            <Link href="/discover" className="group m-bento m-bento-lg lg:col-span-7 lg:row-span-2">
              <span className="m-bento-icon">◈</span>
              <h3 className="m-bento-title">Discover</h3>
              <p className="m-bento-desc">Thesis search over incubators, grants, and registry signals — Canada-first when your mandate is.</p>
              <span className="m-bento-link">Run Discover →</span>
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
    <div className="text-center sm:text-left">
      <span className="font-mono text-[11px] font-medium text-zinc-400">{num}</span>
      <h3 className="mt-2 text-[17px] font-semibold text-zinc-900">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-zinc-500">{desc}</p>
    </div>
  )
}
