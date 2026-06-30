import { NextResponse } from 'next/server'
import { requireUserId } from '@/lib/auth-server'
import { getWorkspace, saveWorkspace, isDbEnabled } from '@/lib/db/workspace'

export const maxDuration = 30

export async function GET() {
  if (!isDbEnabled()) {
    return NextResponse.json({ error: 'Database not configured', mode: 'local' }, { status: 503 })
  }

  const auth = await requireUserId()
  if (auth.error) return auth.error

  const workspace = await getWorkspace(auth.userId)
  return NextResponse.json({
    mode: 'cloud',
    ...workspace,
    configured: { db: true, clerk: true },
  })
}

export async function PUT(req) {
  if (!isDbEnabled()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const auth = await requireUserId()
  if (auth.error) return auth.error

  const body = await req.json()
  await saveWorkspace(auth.userId, {
    fundsStore: body.fundsStore ?? null,
    memos: body.memos ?? [],
    edits: body.edits ?? [],
    teamContext: body.teamContext ?? null,
  })

  return NextResponse.json({ ok: true })
}
