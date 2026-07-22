import Link from 'next/link'

export const metadata = { title: 'Pricing — Meridian' }

const TIERS = [
  {
    name: 'Analyst',
    price: '$99',
    blurb: 'For one investor screening on their own.',
    features: [
      'Community deal flow with dated receipts',
      'Coverage proof on every row',
      'Fund-native briefs & memos',
      'Founder reachability',
    ],
  },
  {
    name: 'Fund',
    price: '$299',
    blurb: 'For a fund running a shared pipeline.',
    featured: true,
    features: [
      'Everything in Analyst',
      'Weekly mandate digests',
      'CRM export (Affinity-ready CSV)',
      'Founder outreach drafts',
    ],
  },
  {
    name: 'Ecosystem',
    price: '$499',
    blurb: 'For platforms, LPs, and ecosystem teams.',
    features: [
      'Everything in Fund',
      'API access',
      'Custom sources (your incubators, your regions)',
      'Pilot support from the founder',
    ],
  },
]

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <Link href="/" className="flex items-center gap-3">
        <div className="m-logo text-[12px]">M</div>
        <span className="text-[15px] font-semibold">Meridian</span>
      </Link>

      <div className="mt-10 max-w-xl">
        <p className="m-kicker mb-2">Pricing</p>
        <h1 className="text-[28px] font-semibold tracking-tight text-zinc-900">
          Pay for deal flow you can verify
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-zinc-600">
          Per seat, per month. Every tier includes the same honest data — receipts,
          dated first-seen records, and checkable coverage claims.
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {TIERS.map(tier => (
          <div
            key={tier.name}
            className={`m-card m-card-pad flex flex-col ${tier.featured ? 'border-zinc-900' : ''}`}
          >
            <p className="m-kicker">{tier.name}</p>
            <p className="mt-2 text-[28px] font-semibold tracking-tight text-zinc-900">
              {tier.price}
              <span className="text-[13px] font-normal text-zinc-500"> /seat/mo</span>
            </p>
            <p className="mt-1 text-[13px] text-zinc-500">{tier.blurb}</p>
            <ul className="mt-4 flex-1 space-y-2 text-[13px] leading-relaxed text-zinc-600">
              {tier.features.map(f => (
                <li key={f} className="flex gap-2">
                  <span className="text-emerald-600">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800">
              Early access — first 10 funds onboard free for 60 days
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Link href="/fund/setup" className="m-btn-primary">
          Start free — set up your deal flow
        </Link>
        <p className="mt-3 text-[12px] text-zinc-500">
          No credit card during early access. Billing starts only after your free window,
          and only if you stay.
        </p>
      </div>
    </div>
  )
}
