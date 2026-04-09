import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAgent, initDB } from '@/lib/db'

type FormData = {
  agentName: string; role: string; tasks: string[]; customTasks: string
  tools: string[]; startHour: string; endHour: string
  approvalMode: 'confirm' | 'auto'; reportEmail: string; userName: string
}

function buildSystemPrompt(data: FormData): string {
  const taskList = [...data.tasks, data.customTasks].filter(Boolean).join('\n- ')
  const toolList = data.tools.join(', ')
  const approvalInstruction = data.approvalMode === 'confirm'
    ? '重要な判断や外部への送信が必要なアクションは、必ずメールで確認を取ってから実行してください。'
    : '自律的に判断して実行し、結果を日報で報告してください。'
  return `あなたは${data.userName}さんの${data.role}として働くAIスタッフです。

【ミッション】
- ${taskList}

【稼働時間】
${data.startHour} 〜 ${data.endHour}（日本時間）

【使用ツール】
${toolList}

【判断基準】
${approvalInstruction}

【毎日のルーティン】
1. 朝（${data.startHour}）：今日のプランをメールで報告する
2. 日中：承認されたタスクを順次実行する
3. 夕方（${data.endHour}）：今日の実績と明日の提案を日報メールで送る

【重要なルール】
- 報告はすべて ${data.reportEmail} 宛にメールで行う
- ユーザーからメールで「ミッション変更」の指示があれば即反映する
- 件名には必ず「【${data.agentName}】」を付ける`
}

async function createManagedAgent(data: FormData) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY が設定されていません')
  const systemPrompt = buildSystemPrompt(data)

  const agentRes = await fetch('https://api.anthropic.com/v1/agents', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'managed-agents-2026-04-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      name: data.agentName, model: 'claude-sonnet-4-6',
      system: systemPrompt, tools: [{ type: 'agent_toolset_20260401' }],
    }),
  })

  if (!agentRes.ok) {
    const err = await agentRes.json().catch(() => ({}))
    throw new Error(err.error?.message || `Agent作成失敗: ${agentRes.status}`)
  }
  const agent = await agentRes.json()

  const envRes = await fetch('https://api.anthropic.com/v1/environments', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'managed-agents-2026-04-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      name: `${data.agentName}-env`,
      config: { type: 'cloud', networking: { type: 'unrestricted' } },
    }),
  })

  if (!envRes.ok) {
    const err = await envRes.json().catch(() => ({}))
    throw new Error(err.error?.message || `Environment作成失敗: ${envRes.status}`)
  }
  const env = await envRes.json()
  return { agentId: agent.id, environmentId: env.id }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })

    await initDB()
    const body: FormData = await req.json()
    if (!body.agentName || !body.role || !body.reportEmail) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
    }

    // Managed Agents APIへの接続（ベータ中はエラーになる可能性があるので、DBへの保存は別で行う）
    let managedAgentId: string | undefined
    let environmentId: string | undefined
    try {
      const result = await createManagedAgent(body)
      managedAgentId = result.agentId
      environmentId = result.environmentId
    } catch (e) {
      console.warn('Managed Agents API error (continuing):', e)
    }

    // DBに保存
    const agent = await createAgent(session.userId, {
      name: body.agentName, role: body.role,
      tasks: body.tasks, customTasks: body.customTasks,
      tools: body.tools, startHour: body.startHour, endHour: body.endHour,
      approvalMode: body.approvalMode, reportEmail: body.reportEmail,
      managedAgentId, environmentId,
    })

    return NextResponse.json({ agentId: agent.id, success: true })
  } catch (e) {
    console.error('Agent creation error:', e)
    const message = e instanceof Error ? e.message : '予期せぬエラーが発生しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
