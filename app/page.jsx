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
                <p className="m-landing-eyebrow">First-pass briefs in under a minute</p>
                <h1 className="m-landing-headline">
                  Paste a URL. Get a memo your GP can forward.
                </h1>
                <p className="m-landing-lead">
                  Fund-native thesis band, not another generic AI summary. Pursue or pass — Meridian learns what you actually bet on.
                </p>
                <div className="mt-10">
                  <HeroInput variant="landing" />
                </div>
                <p className="mt-4 text-[13px] text-zinc-500">
                  <Link href="/fund/setup" className="text-zinc-400 transition hover:text-white">
                    Choose or set up your fund →
                  </Link>
                </p>
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
              Three steps. Under a minute.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[16px] leading-relaxed text-zinc-500">
              Built for deal velocity — the memo a GP forwards without rewriting the thesis band.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <Step num="01" title="Choose your fund" desc="Pick a seeded profile or drop your fund URL. Mandate and portfolio drive every thesis band." />
            <Step num="02" title="Paste any company" desc="Your URL, your deal. No preset companies — Brief any site you care about." />
            <Step num="03" title="Review & signal" desc="Inline edits, pursue or pass. Every signal trains the thesis band on your next brief." />
          </div>
        </div>
      </section>

      <section className="relative border-t border-zinc-200/80 bg-zinc-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 max-w-lg">
            <h2 className="text-[28px] font-bold tracking-tight text-zinc-900 sm:text-[32px]">
              Fund first. Then the company.
            </h2>
            <p className="mt-3 text-[16px] leading-relaxed text-zinc-500">
              Select your mandate, paste a company URL or run Discover, then pursue or pass.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:grid-rows-2">
            <Link href="/fund" className="group m-bento m-bento-lg lg:col-span-7 lg:row-span-2">
              <span className="m-bento-icon">◇</span>
              <h3 className="m-bento-title">Fund</h3>
              <p className="m-bento-desc">Choose Sagard, Panache, or add your own. Thesis and portfolio shape every memo.</p>
              <span className="m-bento-link">Choose a fund →</span>
            </Link>

            <Link href="/brief" className="group m-bento lg:col-span-5">
              <span className="m-bento-icon">◎</span>
              <h3 className="m-bento-title">Brief</h3>
              <p className="m-bento-desc">Paste any company URL → fund-native one-pager (~30–75s).</p>
              <span className="m-bento-link">Generate a brief →</span>
            </Link>

            <Link href="/discover" className="group m-bento lg:col-span-5">
              <span className="m-bento-icon">◈</span>
              <h3 className="m-bento-title">Discover</h3>
              <p className="m-bento-desc">Thesis search for new names against your mandate — community-sourced when Canada applies.</p>
              <span className="m-bento-link">Search →</span>
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
