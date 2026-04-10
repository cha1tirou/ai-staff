import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getUserById, getAgentsByUser } from '@/lib/db'

const AGENT_SERVER_URL = process.env.AGENT_SERVER_URL ?? ''
const INTERNAL_SECRET = process.env.INTERNAL_SECRET ?? ''

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message } = await req.json()
  const user = await getUserById(session.userId) as any
  const agents = await getAgentsByUser(session.userId) as any[]

  // 接続済みのサブエージェントのみ使う
  const activeAgents = agents.filter((a: any) => a.connection_status === 'active')

  // Pythonサーバーが設定されていない場合はフォールバック
  if (!AGENT_SERVER_URL || activeAgents.length === 0) {
    return NextResponse.json({
      reply: activeAgents.length === 0
        ? 'まだスタッフの接続が完了していません。しばらくお待ちください。'
        : 'エージェントサーバーが未設定です。',
      source: 'fallback'
    })
  }

  // Pythonサーバーにリクエスト（SSEをそのまま流す）
  const res = await fetch(`${AGENT_SERVER_URL}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': INTERNAL_SECRET,
    },
    body: JSON.stringify({
      message,
      biz_name: user?.biz_name ?? user?.name ?? '事業者',
      sub_agents: activeAgents.map((a: any) => ({
        name: a.name,
        role: a.role,
        tasks: a.tasks ?? [],
        custom_tasks: a.custom_tasks ?? '',
      })),
    }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'エージェントサーバーエラー' }, { status: 500 })
  }

  // SSEをクライアントにそのまま流す
  return new NextResponse(res.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
