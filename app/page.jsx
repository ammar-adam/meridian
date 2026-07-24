import Nav from '@/components/nav'
import Footer from '@/components/footer'
import HeroInput from '@/components/hero-input'
import WorkspacePreview from '@/components/workspace-preview'
import LandingBackground from '@/components/landing-background'

export default function LandingPage() {
  return (
    <div className="m-landing">
      <section className="relative flex min-h-[100svh] flex-col overflow-hidden">
        <LandingBackground />
        <div className="relative z-10 flex flex-1 flex-col">
          <Nav variant="landing" />

          <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-14 px-6 pb-20 pt-6 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-6">
              <span className="m-landing-eyebrow">
                <span className="m-landing-eyebrow-dot" />
                School ecosystems → fund mandates
              </span>
              <h1 className="m-landing-headline">
                Deal velocity,
                <br />
                <em>with receipts.</em>
              </h1>
              <p className="m-landing-lead">
                Match early campus companies to what your firm actually invests
                in — founders, provenance, and dated proof. Coverage starts in
                Canada, the US, and the UK and expands. We only claim what we
                can source.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <a href="/welcome?next=/flow" className="m-btn-invert">
                  Sign in →
                </a>
                <a href="/pilot" className="m-btn-ghost-landing">
                  See the proof
                </a>
              </div>
            </div>

            <div className="lg:col-span-6">
              <WorkspacePreview />
            </div>
          </div>
        </div>
      </section>

      <section className="m-landing-section py-14">
        <div className="mx-auto max-w-6xl px-6">
          <div className="m-proof-strip !border-0 !pt-0">
            <div>
              <div className="m-proof-stat">3×</div>
              <div className="m-proof-label">companies screened / week</div>
            </div>
            <div>
              <div className="m-proof-stat">50+</div>
              <div className="m-proof-label">verified index misses</div>
            </div>
            <div>
              <div className="m-proof-stat">&lt;60s</div>
              <div className="m-proof-label">URL → forwardable brief</div>
            </div>
          </div>
        </div>
      </section>

      <section className="m-landing-section py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-xl">
            <p className="m-kicker mb-3">Brief a company</p>
            <h2 className="m-landing-h2 text-[1.9rem]">
              Already have a name? Generate a firm-native one-pager.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed m-landing-sub">
              Drop a domain, a contact list, or a fund site — Meridian routes it
              to the right workflow.
            </p>
          </div>
          <div className="mt-8 max-w-xl">
            <HeroInput variant="landing" />
          </div>
        </div>
      </section>

      <section className="m-landing-section py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 max-w-xl">
            <p className="m-kicker mb-3">How it works</p>
            <h2 className="m-landing-h2 text-[2rem]">Mandate in. Receipts out.</h2>
            <p className="mt-3 text-[15px] leading-relaxed m-landing-sub">
              Every company carries where we found it, when we first saw it, and —
              where checked — whether the indexes had it at that time.
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            <Step
              num="01"
              title="Claim your firm"
              desc="Name the fund, family office, or angel book. Set the mandate Meridian will match against."
            />
            <Step
              num="02"
              title="Open Deal Flow"
              desc="Campus companies with founders and domains — dated incubator proof, ranked to your thesis."
            />
            <Step
              num="03"
              title="Brief and decide"
              desc="One-pager against your mandate. Pursue or pass — signals compound on Thesis."
            />
          </div>
        </div>
      </section>

      <section className="m-landing-section py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 max-w-lg">
            <p className="m-kicker mb-3">The loop</p>
            <h2 className="m-landing-h2 text-[2rem]">Source → brief → signal</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <a href="/welcome?next=/flow" className="group m-bento">
              <span className="m-bento-icon">Deal Flow</span>
              <h3 className="m-bento-title">What’s new this week</h3>
              <p className="m-bento-desc">
                Campus companies matched to your mandate — the reason to open
                Meridian every Monday.
              </p>
              <span className="m-bento-link">Sign in to Flow →</span>
            </a>
            <a href="/welcome?next=/brief" className="group m-bento">
              <span className="m-bento-icon">Brief</span>
              <h3 className="m-bento-title">URL to one-pager</h3>
              <p className="m-bento-desc">
                Any company domain → firm-native memo you can forward.
              </p>
              <span className="m-bento-link">Sign in to brief →</span>
            </a>
            <a href="/welcome?next=/flow" className="group m-bento">
              <span className="m-bento-icon">Your firm</span>
              <h3 className="m-bento-title">Your mandate</h3>
              <p className="m-bento-desc">
                Claim Meridian Ventures — or your real firm — then we match
                campus deal flow to that thesis.
              </p>
              <span className="m-bento-link">Set your firm →</span>
            </a>
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
      <div className="m-step-num">{num}</div>
      <h3 className="m-step-title">{title}</h3>
      <p className="m-step-desc">{desc}</p>
    </div>
  )
}
