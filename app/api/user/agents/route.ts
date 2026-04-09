import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAgentsByUser, deleteAgent, updateAgentStatus } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const agents = await getAgentsByUser(session.userId)
  return NextResponse.json({ agents })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { agentId } = await req.json()
  await deleteAgent(agentId, session.userId)
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { agentId, status } = await req.json()
  const agent = await updateAgentStatus(agentId, session.userId, status)
  return NextResponse.json({ agent })
}
