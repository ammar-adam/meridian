import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="m-logo text-[12px]">M</div>
          <span className="text-[13px] text-zinc-500">Meridian</span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] font-medium text-zinc-500">
          <Link href="/discover" className="transition hover:text-zinc-900">Workspace</Link>
          <Link href="/fund/setup" className="transition hover:text-zinc-900">Fund setup</Link>
          <Link href="/about" className="transition hover:text-zinc-900">About</Link>
          <Link href="/earliness" className="transition hover:text-zinc-900">Earliness</Link>
          <Link href="/pricing" className="transition hover:text-zinc-900">Pricing</Link>
          <Link href="/privacy" className="transition hover:text-zinc-900">Privacy</Link>
          <Link href="/terms" className="transition hover:text-zinc-900">Terms</Link>
          <Link href="/claim" className="transition hover:text-zinc-900">For founders</Link>
        </div>
      </div>
    </footer>
  )
}
