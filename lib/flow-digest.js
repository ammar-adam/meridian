/**
 * Monday deal-flow digest — the paid habit artifact.
 * Builds a human-readable digest from annotated Flow companies.
 */

export function buildFlowDigest({
  fundName = 'Your fund',
  thesis = '',
  companies = [],
  generatedAt = new Date().toISOString(),
} = {}) {
  const list = companies || []
  const fresh = list.filter(c => c.isFresh || c.isNew || c.coverage?.status === 'community_first')
  const newOnes = list.filter(c => c.isNew)
  const community = list.filter(c => c.coverage?.status === 'community_first' || c.notInHarmonicLikely)
  const reachable = list.filter(c => c.reach?.reachable)
  const top = [...list]
    .sort((a, b) => {
      const sa = (a.isNew ? 300 : 0) + (a.isFresh ? 100 : 0) + (a.fitScore || 0)
      const sb = (b.isNew ? 300 : 0) + (b.isFresh ? 100 : 0) + (b.fitScore || 0)
      return sb - sa
    })
    .slice(0, 8)

  const dateLabel = new Date(generatedAt).toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
  })

  const lines = [
    `Meridian Deal Flow — ${fundName}`,
    dateLabel,
    '',
    thesis ? `Mandate: ${thesis.trim().slice(0, 220)}${thesis.trim().length > 220 ? '…' : ''}` : null,
    '',
    `This week: ${list.length} community companies · ${newOnes.length} new · ${fresh.length} fresh · ${community.length} before public indexes · ${reachable.length} reachable founders`,
    '',
    'Top for your thesis:',
  ].filter(v => v !== null)

  for (const c of top) {
    const flags = [
      c.isNew ? 'NEW' : null,
      c.coverage?.notInHarmonicLikely ? 'community-first' : null,
      c.reach?.reachable ? 'reachable' : null,
      c.cohortDate ? `cohort ${c.cohortDate}` : null,
    ].filter(Boolean).join(' · ')
    const founders = c.personName ? ` · ${c.personName}` : ''
    const domain = c.domain ? ` · ${c.domain}` : ''
    lines.push(`• ${c.name}${domain}${founders}${flags ? ` [${flags}]` : ''}`)
    if (c.coverage?.label) lines.push(`    ${c.coverage.label}${c.provenance ? ` — ${c.provenance}` : ''}`)
    if (c.reach?.primaryLinkedIn) lines.push(`    LinkedIn: ${c.reach.primaryLinkedIn}`)
    if (c.reach?.primaryEmail) lines.push(`    Email guess: ${c.reach.primaryEmail}`)
  }

  lines.push('')
  lines.push('Open Deal Flow → https://meridian-eight-sandy.vercel.app/flow')
  lines.push('Brief what matters. Pursue/pass compounds the thesis band.')

  const text = lines.join('\n')
  const nCount = newOnes.length || fresh.length || community.length
  const subject = `${nCount} new for your mandate — ${fundName}`

  return {
    subject,
    text,
    markdown: text,
    stats: {
      total: list.length,
      newCount: newOnes.length,
      freshCount: fresh.length,
      communityFirst: community.length,
      reachable: reachable.length,
    },
    top: top.map(c => ({
      name: c.name,
      domain: c.domain || null,
      cohortDate: c.cohortDate || null,
      coverage: c.coverage?.label || null,
      reachable: Boolean(c.reach?.reachable),
    })),
    generatedAt,
  }
}

export function digestMailto(digest, to = '') {
  const subject = encodeURIComponent(digest.subject)
  const body = encodeURIComponent(digest.text)
  return `mailto:${to}?subject=${subject}&body=${body}`
}
