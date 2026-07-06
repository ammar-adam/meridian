/** Clerk env helpers — strip accidental quotes and validate key pairing in dev */

export function clerkPublishableKey() {
  return stripEnvQuotes(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
}

export function clerkSecretKey() {
  return stripEnvQuotes(process.env.CLERK_SECRET_KEY)
}

export function clerkSignInUrl() {
  return stripEnvQuotes(process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL) || '/sign-in'
}

export function clerkSignUpUrl() {
  return stripEnvQuotes(process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL) || '/sign-up'
}

function stripEnvQuotes(value) {
  const v = (value ?? '').trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1).trim()
  }
  return v
}

/** Clerk pk/sk must share test vs live; pk embeds the frontend API host (sk is opaque). */
export function clerkKeysMatch(publishableKey, secretKey) {
  const pk = stripEnvQuotes(publishableKey)
  const sk = stripEnvQuotes(secretKey)
  if (!pk || !sk) return true

  const pkEnv = pk.match(/^pk_(test|live)_/)?.[1]
  const skEnv = sk.match(/^sk_(test|live)_/)?.[1]
  if (!pkEnv || !skEnv) return false
  if (pkEnv !== skEnv) return false

  try {
    const pkBody = pk.replace(/^pk_(test|live)_/, '')
    const pkDecoded = Buffer.from(pkBody, 'base64').toString('utf8')
    const host = pkDecoded.split('$')[0]
    return host.endsWith('.clerk.accounts.dev') || host.endsWith('.clerk.accounts.com')
  } catch {
    return true
  }
}

export function isClerkConfigured() {
  return Boolean(clerkPublishableKey() && clerkSecretKey())
}
