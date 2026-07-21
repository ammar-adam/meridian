'use client'

/**
 * Founder reachability actions — real channels only.
 * Emails shown are verified; pattern guesses never render.
 */
export default function ReachabilityActions({ reach, compact = false }) {
  if (!reach?.reachable && !reach?.founders?.length) return null

  const linkedin = reach.primaryLinkedIn
  const email = reach.primaryEmail

  const website = reach.website

  if (compact) {
    return (
      <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
        {linkedin && (
          <a
            href={linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sky-800 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            LinkedIn
          </a>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            className="font-medium text-zinc-700 hover:underline"
            title="Verified email"
            onClick={(e) => e.stopPropagation()}
          >
            {email}
          </a>
        )}
        {!linkedin && !email && website && (
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-zinc-700 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Website
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="mt-1.5 space-y-1">
      {(reach.founders || []).slice(0, 2).map((f) => (
        <div key={f.name} className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="font-medium text-zinc-800">{f.name}</span>
          {f.linkedinUrl && (
            <a
              href={f.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-800 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {f.linkedinKind === 'profile' ? 'Profile' : 'Find on LinkedIn'}
            </a>
          )}
          {f.emails?.[0] && (
            <a
              href={`mailto:${f.emails[0]}`}
              className="font-mono text-zinc-600 hover:underline"
              title="Verified email"
              onClick={(e) => e.stopPropagation()}
            >
              {f.emails[0]}
            </a>
          )}
        </div>
      ))}
    </div>
  )
}
