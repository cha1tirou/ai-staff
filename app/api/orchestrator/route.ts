import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getUserById } from '@/lib/db'
import { createSession, sendSessionMessage, readSessionStream } from '@/lib/managed-agents'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message } = await req.json()
  const user = await getUserById(session.userId) as any

  // オーケストレーターが存在する場合はManaged Agentsで実行
  if (user?.orchestrator_agent_id && user?.orchestrator_env_id) {
    try {
      const agentSession = await createSession(
        user.orchestrator_agent_id,
        user.orchestrator_env_id,
        `ダッシュボード指示: ${message.slice(0, 30)}`
      )
      await sendSessionMessage(agentSession.id, message)
      const reply = await readSessionStream(agentSession.id)
      return NextResponse.json({ reply, source: 'managed' })
    } catch (e: any) {
      console.error('Managed Agents実行エラー、フォールバックへ:', e.message)
      // フォールバック: 通常Claude APIで応答
    }
  }

  // フォールバック: オーケストレーター未接続の場合は通常APIで応答
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: `あなたは${user?.biz_name || '事業者'}のAIスタッフ管理システムです。
まだAIスタッフの接続設定が完了していません。
ユーザーの質問には丁寧に答えつつ、「スタッフの接続が完了次第、実際の業務を実行できます」と伝えてください。`,
    messages: [{ role: 'user', content: message }],
  })

  const reply = response.content[0].type === 'text' ? response.content[0].text : ''
  return NextResponse.json({ reply, source: 'fallback' })
}
