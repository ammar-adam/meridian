/**
 * Product Hunt GraphQL adapter — today's launches as sourced entities.
 * Graceful skip when PRODUCT_HUNT_TOKEN is missing.
 */

const PH_ENDPOINT = 'https://api.producthunt.com/v2/api/graphql'

const TODAY_POSTS_QUERY = `
query TodayPosts($first: Int!) {
  posts(first: $first, order: RANKING) {
    edges {
      node {
        id
        name
        tagline
        url
        website
        createdAt
        topics { edges { node { name } } }
      }
    }
  }
}
`

function hostnameFromUrl(raw) {
  if (!raw) return null
  try {
    const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
    return u.hostname.replace(/^www\./, '') || null
  } catch {
    return null
  }
}

/**
 * @returns {Promise<{ entities: object[], skipped?: boolean, reason?: string, error?: string, meta?: object }>}
 */
export async function runProductHuntAdapter({ limit = 20 } = {}) {
  const token = process.env.PRODUCT_HUNT_TOKEN?.trim()
  if (!token) {
    return { entities: [], skipped: true, reason: 'no token' }
  }

  try {
    const res = await fetch(PH_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'MeridianIngest/1.0 (+product-hunt adapter)',
      },
      body: JSON.stringify({
        query: TODAY_POSTS_QUERY,
        variables: { first: Math.min(Math.max(limit, 1), 50) },
      }),
      signal: AbortSignal.timeout(25_000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return {
        entities: [],
        error: `HTTP ${res.status}`,
        meta: { body: body.slice(0, 200) },
      }
    }

    const data = await res.json()
    if (data.errors?.length) {
      return {
        entities: [],
        error: data.errors[0]?.message || 'graphql_error',
        meta: { errors: data.errors.slice(0, 3) },
      }
    }

    const edges = data?.data?.posts?.edges || []
    const entities = edges.map(({ node }) => {
      const domain = hostnameFromUrl(node.website) || hostnameFromUrl(node.url)
      const topics = (node.topics?.edges || []).map(e => e?.node?.name).filter(Boolean)
      return {
        id: `ph_${node.id}`,
        type: 'company',
        personName: null,
        companyName: node.name,
        domain,
        source: 'product_hunt',
        confidence: domain ? 'medium' : 'low',
        provenance: `Product Hunt · ${node.tagline || 'launch'}`,
        sourceMeta: {
          tagline: node.tagline,
          productHuntUrl: node.url,
          website: node.website,
          createdAt: node.createdAt,
          topics,
          kind: 'product_hunt',
        },
        discoveredAt: new Date().toISOString(),
        oneLiner: node.tagline || null,
      }
    }).filter(e => e.companyName)

    return {
      entities,
      meta: { count: entities.length, fetchedAt: new Date().toISOString() },
    }
  } catch (e) {
    return { entities: [], error: e.message, meta: { skippedGracefully: true } }
  }
}
