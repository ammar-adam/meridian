/**
 * One-shot helper: fetch Velocity company pages and print founders + Visit company href.
 * Does NOT write production data — review output then edit incubator-adapter.js.
 * node scripts/enrich-velocity-pages.mjs
 */
const SLUGS = [
  'worthington', 'hope', 'canopy', 'scadable', 'justmeds', 'photon-iv', 'simantic', 'gasner-healthtech',
  'anthum-ai', '02ai', 'existent', 'eventist', 'flomaru', 'itemiq',
  'applied-intelligence', 'one-of-one-ai', 'appfi', 'colver', 'innowind', 'jtcipher', 'tensorone',
  'cellect', 'newgen-health', 'patientcompanion', 'swish-solar', 'mapmate',
  'appify', '1-1', 'one-of-one', 'zero-two-ai', 'zerotwo-ai', 'jt-cipher',
]

function extractDomain(href) {
  if (!href) return null
  try {
    const u = new URL(href)
    if (/velocityincubator|linkedin\.com|facebook\.com|twitter\.com|x\.com/i.test(u.hostname)) return null
    return u.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
}

async function fetchPage(slug) {
  const url = `https://www.velocityincubator.com/company/${slug}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'MeridianEnrich/1.0 (research; local-dev)' },
    redirect: 'follow',
  })
  if (!res.ok) return { slug, status: res.status, ok: false }
  const html = await res.text()

  // Visit company link — common patterns
  const visitMatch =
    html.match(/Visit company[^<]*<\/a>/i)
    || html.match(/href="(https?:\/\/[^"]+)"[^>]*>\s*Visit company/i)
    || html.match(/<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>[\s\S]*?Visit company/i)

  let visitHref = null
  const hrefBefore = html.match(/href="(https?:\/\/[^"]+)"[^>]*>[\s\S]{0,80}Visit company/i)
  const hrefAfter = html.match(/Visit company[\s\S]{0,40}href="(https?:\/\/[^"]+)"/i)
  if (hrefBefore) visitHref = hrefBefore[1]
  else if (hrefAfter) visitHref = hrefAfter[1]

  // Also look for external website buttons
  if (!visitHref) {
    const ext = html.match(/class="[^"]*website[^"]*"[^>]*href="(https?:\/\/[^"]+)"/i)
      || html.match(/href="(https?:\/\/(?!www\.velocityincubator\.com)[^"]+)"[^>]*class="[^"]*button[^"]*"/i)
    if (ext) visitHref = ext[1]
  }

  // Founders section
  const founders = []
  const founderBlock = html.match(/Founders?<\/h[1-6]>[\s\S]{0,800}/i)
    || html.match(/Founders?[\s\S]{0,20}<\/[^>]+>[\s\S]{0,600}/i)
  const block = founderBlock?.[0] || ''
  const nameMatches = [...block.matchAll(/>([A-Z][a-zA-ZÀ-ÿ'.\-]+(?:\s+[A-Z][a-zA-ZÀ-ÿ'.\-]+)+)</g)]
  for (const m of nameMatches) {
    const n = m[1].trim()
    if (/Founder|Location|Status|Active|Sector|Year|Visit|LinkedIn|Companies/i.test(n)) continue
    if (n.split(/\s+/).length >= 2 && n.split(/\s+/).length <= 4) founders.push(n)
  }

  // Title / company name
  const title = html.match(/<h1[^>]*>([^<]+)</i)?.[1]?.trim() || slug

  return {
    slug,
    status: res.status,
    ok: true,
    title,
    founders: [...new Set(founders)],
    visitHref,
    domain: extractDomain(visitHref),
  }
}

const results = []
for (const slug of SLUGS) {
  try {
    const row = await fetchPage(slug)
    results.push(row)
    console.log(JSON.stringify(row))
  } catch (err) {
    console.log(JSON.stringify({ slug, ok: false, error: err.message }))
  }
}

const usable = results.filter(r => r.ok)
console.log('\n=== SUMMARY ===')
console.log('ok pages:', usable.length)
console.log('with founders:', usable.filter(r => r.founders?.length).length)
console.log('with domain:', usable.filter(r => r.domain).length)
