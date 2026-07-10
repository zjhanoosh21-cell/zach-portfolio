import { NextRequest } from 'next/server'
import { verifyPassword, createSession, destroySession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { password } = body

  if (!password) {
    return Response.json({ error: 'Password required' }, { status: 400 })
  }

  const valid = await verifyPassword(password)
  if (!valid) {
    return Response.json({ error: 'Invalid password' }, { status: 401 })
  }

  await createSession()
  return Response.json({ success: true })
}

export async function DELETE() {
  await destroySession()
  return Response.json({ success: true })
}
