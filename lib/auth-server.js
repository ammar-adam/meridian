import { auth } from '@clerk/nextjs/server'

export function isClerkEnabled() {
  return Boolean(process.env.CLERK_SECRET_KEY?.trim())
}

export async function getUserId() {
  if (!isClerkEnabled()) return null
  const { userId } = await auth()
  return userId
}

export async function requireUserId() {
  const userId = await getUserId()
  if (!userId) {
    return { error: Response.json({ error: 'Sign in required' }, { status: 401 }) }
  }
  return { userId }
}
