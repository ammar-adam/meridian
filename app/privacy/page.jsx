import Link from 'next/link'

export const metadata = { title: 'Privacy — Meridian' }

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <Link href="/" className="flex items-center gap-3">
        <div className="m-logo text-[12px]">M</div>
        <span className="text-[15px] font-semibold">Meridian</span>
      </Link>

      <p className="m-kicker mb-2 mt-10">Privacy</p>
      <h1 className="text-[28px] font-semibold tracking-tight text-[color:var(--m-text)]">
        What we store, in plain English
      </h1>
      <p className="mt-3 text-[13px]" style={{ color: 'var(--m-muted)' }}>
        Meridian is a pre-incorporation product of its founder. This is the honest,
        short version — no legalese theater.
      </p>

      <div className="mt-6 space-y-6 text-[15px] leading-relaxed" style={{ color: 'var(--m-muted)' }}>
        <section>
          <h2 className="text-[16px] font-semibold text-[color:var(--m-text)]">What we store</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Fund profiles you set up (fund name, website, thesis, portfolio list).</li>
            <li>Watches — the mandates you ask us to monitor.</li>
            <li>Memos and briefs you generate, and your pursue/pass outcomes.</li>
            <li>Founder claims (company name, your name, email, and what you tell us).</li>
            <li>Company records our sourcing finds on public pages, with their provenance.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-[color:var(--m-text)]">What we don&apos;t do</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>We do not sell your data. Not to anyone, not in aggregate.</li>
            <li>We do not share founder contact details submitted through claims.</li>
            <li>We do not mark anything &ldquo;verified&rdquo; without an actual check.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-[color:var(--m-text)]">Deletion</h2>
          <p className="mt-2">
            Want your fund profile, memos, or claim removed? Send a note through the{' '}
            <Link href="/claim" className="text-[color:var(--m-text)] underline">claim form</Link>{' '}
            mentioning &ldquo;data deletion&rdquo; and we&apos;ll delete it. Company
            records sourced from public pages can be corrected or annotated the same way.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-[color:var(--m-text)]">Third parties</h2>
          <p className="mt-2">
            We use hosted infrastructure (hosting, database, AI model APIs) to run the
            product. Content you submit for brief generation is processed by those
            providers under their terms; we don&apos;t use it to train anything.
          </p>
        </section>
      </div>

      <p className="mt-10 text-[12px]" style={{ color: 'var(--m-muted)' }}>
        See also <Link href="/terms" className="text-[color:var(--m-text)]/80 underline">Terms</Link> and{' '}
        <Link href="/about" className="text-[color:var(--m-text)]/80 underline">About</Link>.
      </p>
    </div>
  )
}
