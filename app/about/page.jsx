import Link from 'next/link'

export const metadata = { title: 'About — Meridian' }

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <Link href="/" className="flex items-center gap-3">
        <div className="m-logo text-[12px]">M</div>
        <span className="text-[15px] font-semibold">Meridian</span>
      </Link>

      <p className="m-kicker mb-2 mt-10">About</p>
      <h1 className="text-[28px] font-semibold tracking-tight text-zinc-900">
        Early deal flow you can check, not just believe
      </h1>

      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-zinc-600">
        <p>
          Meridian finds promising startups in the places they show up first — university
          incubators, accelerator cohorts, grant lists, new incorporations — and puts them
          in front of early-stage investors while the mainstream databases are still catching up —
          with dated receipts, not marketing claims.
        </p>
        <p>
          The difference is receipts. Every company row carries its provenance: where we
          saw it, when our server first recorded it, and — where we have run a dated index
          check — whether the mainstream databases had it at that time. When we have not
          checked something, we say so.
        </p>
        <p className="font-medium text-zinc-900">
          Our one rule: no fact without a receipt. We never claim a company is
          &ldquo;not in the databases&rdquo; without a dated, repeatable check behind it,
          and we never backdate when we first saw something.
        </p>
        <p>
          Meridian is an early-stage product — pre-incorporation, built and run by its
          founder. If your company is on our ledger, you can{' '}
          <Link href="/claim" className="text-zinc-900 underline">claim and correct your profile</Link>.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/flow" className="m-btn-primary">Open Deal Flow</Link>
        <Link href="/pricing" className="m-btn-secondary">Pricing</Link>
      </div>

      <p className="mt-10 text-[12px] text-zinc-500">
        Contact: submissions through the{' '}
        <Link href="/claim" className="text-zinc-800 underline">claim form</Link>{' '}
        reach the founder directly — questions, corrections, and data requests included.
      </p>
    </div>
  )
}
