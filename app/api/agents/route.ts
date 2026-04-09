import { NextRequest, NextResponse } from 'next/server'

type FormData = {
  agentName: string
  role: string
  tasks: string[]
  customTasks: string
  tools: string[]
  startHour: string
  endHour: string
  approvalMode: 'confirm' | 'auto'
  reportEmail: string
  userName: string
}

// フォームデータからsystem promptを生成
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
1. 朝（${data.startHour}）：今日のプランをメールで${data.userName}さんに送る
2. 日中：承認されたタスクを順次実行する
3. 夕方（${data.endHour}）：今日の実績と明日の提案を日報メールで送る

【重要なルール】
- 報告・連絡・確認はすべて ${data.reportEmail} 宛にメールで行う
- ユーザーからメールで「ミッション変更」の指示があれば即反映する
- 毎週月曜日に「今週のミッション確認メール」を送り、変更・追加を受け付ける
- 件名には必ず「【${data.agentName}】」を付ける`
}

// Managed Agents APIでエージェントを作成
async function createManagedAgent(data: FormData): Promise<{ agentId: string; version: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY が設定されていません')

  const systemPrompt = buildSystemPrompt(data)

  // 1. エージェントを作成
  const agentRes = await fetch('https://api.anthropic.com/v1/agents', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'managed-agents-2026-04-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      name: data.agentName,
      model: 'claude-sonnet-4-6',
      system: systemPrompt,
      tools: [{ type: 'agent_toolset_20260401' }],
    }),
  })

  if (!agentRes.ok) {
    const err = await agentRes.json().catch(() => ({}))
    throw new Error(err.error?.message || `Agent作成失敗: ${agentRes.status}`)
  }

  const agent = await agentRes.json()

  // 2. 環境を作成
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
      config: {
        type: 'cloud',
        networking: { type: 'unrestricted' },
      },
    }),
  })

  if (!envRes.ok) {
    const err = await envRes.json().catch(() => ({}))
    throw new Error(err.error?.message || `Environment作成失敗: ${envRes.status}`)
  }

  const env = await envRes.json()

  // 3. DBに保存（SQLite）
  await saveAgentToDB({
    agentId: agent.id,
    agentVersion: agent.version,
    environmentId: env.id,
    data,
    systemPrompt,
  })

  return { agentId: agent.id, version: agent.version }
}

// DBに保存
async function saveAgentToDB(params: {
  agentId: string
  agentVersion: string
  environmentId: string
  data: FormData
  systemPrompt: string
}) {
  // Next.js Edge Runtimeではbetter-sqlite3が使えないため、
  // API routeをNode.js runtimeで動かす or 別のDBを使う
  // ここでは簡易実装としてログ出力のみ
  // 本番ではPostgres (Railway) に保存する
  console.log('Agent saved:', {
    agentId: params.agentId,
    name: params.data.agentName,
    email: params.data.reportEmail,
    environmentId: params.environmentId,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body: FormData = await req.json()

    // バリデーション
    if (!body.agentName || !body.role || !body.reportEmail) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
    }

    const { agentId } = await createManagedAgent(body)

    return NextResponse.json({ agentId, success: true })
  } catch (e: unknown) {
    console.error('Agent creation error:', e)
    const message = e instanceof Error ? e.message : '予期せぬエラーが発生しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
