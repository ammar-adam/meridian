import Link from 'next/link'

export const metadata = { title: 'Terms — Meridian' }

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <Link href="/" className="flex items-center gap-3">
        <div className="m-logo text-[12px]">M</div>
        <span className="text-[15px] font-semibold">Meridian</span>
      </Link>

      <p className="m-kicker mb-2 mt-10">Terms of use</p>
      <h1 className="text-[28px] font-semibold tracking-tight text-white">
        Short, honest terms for an early product
      </h1>
      <p className="mt-3 text-[13px]" style={{ color: 'var(--m-muted)' }}>
        Meridian is offered by Meridian — a pre-incorporation product of its founder.
        These terms are deliberately short; when the company incorporates, they will be
        replaced with a proper agreement and you&apos;ll be told.
      </p>

      <div className="mt-6 space-y-6 text-[15px] leading-relaxed" style={{ color: 'var(--m-muted)' }}>
        <section>
          <h2 className="text-[16px] font-semibold text-white">The deal</h2>
          <p className="mt-2">
            Meridian surfaces early-stage companies from community sources with dated
            provenance, and generates screening briefs. You can use it to research and
            screen deals. Don&apos;t use it to spam founders, scrape our data for resale,
            or attack the service.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-white">Not investment advice</h2>
          <p className="mt-2">
            Nothing here is investment advice or a recommendation. Briefs are
            AI-assisted summaries of sourced material — verify before you wire money.
            Where a fact has a receipt, we show it; where it doesn&apos;t, treat it as a lead.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-white">Your content</h2>
          <p className="mt-2">
            Fund profiles, theses, memos, and claims stay yours. You give us permission
            to store and process them to run the product — that&apos;s it. Founders can
            correct or remove their company&apos;s record via the{' '}
            <Link href="/claim" className="text-white underline">claim form</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-white">Early-access reality</h2>
          <p className="mt-2">
            The product is in early access: things may break, coverage is still growing,
            and we may change features. We won&apos;t silently change pricing on an active
            subscription. Either of us can end the arrangement at any time; on request we
            delete your data (see <Link href="/privacy" className="text-white underline">Privacy</Link>).
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-white">Liability, plainly</h2>
          <p className="mt-2">
            To the maximum extent the law allows, Meridian is provided as-is and we are
            not liable for investment outcomes or indirect damages. If we ever owe you
            something, it&apos;s capped at what you paid us in the previous 12 months.
          </p>
        </section>
      </div>

      <p className="mt-10 text-[12px]" style={{ color: 'var(--m-muted)' }}>
        Questions? Reach the founder through the{' '}
        <Link href="/claim" className="text-white/80 underline">claim form</Link>.
      </p>
    </div>
  )
}
