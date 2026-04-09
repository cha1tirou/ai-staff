import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { agent, message } = await req.json()

  const systemPrompt = `あなたはAIスタッフ管理システムのアシスタントです。
ユーザーの自然言語による指示を解釈し、AIスタッフの設定変更内容をJSONで返してください。

現在のエージェント設定：
- 役割: ${agent.role}
- 業務: ${(agent.tasks || []).join('、')}
- 稼働時間: ${agent.start_hour} 〜 ${agent.end_hour}
- 承認モード: ${agent.approval_mode === 'confirm' ? '確認あり' : '自律実行'}
- 報告先: ${agent.report_email || '未設定'}

ルール：
- ユーザーの指示から変更すべき項目を判断する
- 変更内容と変更しない項目を明確に分ける
- 必ず以下のJSON形式のみ返す（説明文なし）：

{
  "summary": "変更内容の要約（1〜2文、日本語）",
  "changes": {
    "role": "新しい役割名（変更なければnull）",
    "tasks": ["新しい業務リスト"（変更なければnull）],
    "customTasks": "詳細な業務説明（変更なければnull）",
    "startHour": "HH:MM形式（変更なければnull）",
    "endHour": "HH:MM形式（変更なければnull）",
    "approvalMode": "confirm または auto（変更なければnull）",
    "reportEmail": "メールアドレス（変更なければnull）"
  }
}`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    let parsed: any = {}
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    } catch {
      return NextResponse.json({ error: '解釈に失敗しました' }, { status: 500 })
    }

    // nullの項目を除去
    const changes: any = {}
    for (const [k, v] of Object.entries(parsed.changes || {})) {
      if (v !== null) changes[k] = v
    }

    return NextResponse.json({ summary: parsed.summary, changes })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
