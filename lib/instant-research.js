/** Scrape-only research body for instant briefs (no Perplexity). */
export function buildInstantResearch(scraped) {
  if (!scraped) return 'No website data available.'
  const title = scraped.ogTitle?.trim() || scraped.domain || 'Unknown company'
  const desc = scraped.ogDescription?.trim() || 'No public description on website.'
  return `Website-only research for ${scraped.domain || title} (no external web search).

Company name from site: ${title}
Website description: ${desc}
Domain: ${scraped.domain || 'unknown'}

Use this copy as primary source. Mark funding, team, and market size as Undisclosed when not stated on the site. Do not invent investors, founders, or dollar figures.`
}
