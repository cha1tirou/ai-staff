// Managed Agents API ラッパー

const API_BASE = 'https://api.anthropic.com/v1'

function headers() {
  return {
    'x-api-key': process.env.ANTHROPIC_API_KEY!,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': 'managed-agents-2026-04-01',
    'content-type': 'application/json',
  }
}

// エージェント作成
export async function createManagedAgent(name: string, systemPrompt: string) {
  const res = await fetch(`${API_BASE}/agents`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      name,
      model: 'claude-sonnet-4-6',
      system: systemPrompt,
      tools: [{ type: 'agent_toolset_20260401' }],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Agent作成失敗: ${res.status}`)
  }
  return res.json() as Promise<{ id: string; version: string }>
}

// エージェントのsystemPrompt更新
export async function updateManagedAgent(agentId: string, systemPrompt: string) {
  const res = await fetch(`${API_BASE}/agents/${agentId}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      system: systemPrompt,
      tools: [{ type: 'agent_toolset_20260401' }],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Agent更新失敗: ${res.status}`)
  }
  return res.json()
}

// 環境作成
export async function createEnvironment(name: string) {
  const res = await fetch(`${API_BASE}/environments`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      name,
      config: { type: 'cloud', networking: { type: 'unrestricted' } },
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Environment作成失敗: ${res.status}`)
  }
  return res.json() as Promise<{ id: string }>
}

// セッション作成（エージェントを実際に動かす）
export async function createSession(agentId: string, environmentId: string, title: string) {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      agent: agentId,
      environment_id: environmentId,
      title,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Session作成失敗: ${res.status}`)
  }
  return res.json() as Promise<{ id: string }>
}

// セッションにメッセージ送信
export async function sendSessionMessage(sessionId: string, message: string) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/events`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      events: [{
        type: 'user.message',
        content: [{ type: 'text', text: message }],
      }],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `メッセージ送信失敗: ${res.status}`)
  }
  return res.json()
}

// セッションのSSEストリームを読む（簡易版・テキストのみ抽出）
export async function readSessionStream(sessionId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/stream`, {
    headers: headers(),
  })
  if (!res.ok) throw new Error(`Stream取得失敗: ${res.status}`)

  const text = await res.text()
  const lines = text.split('\n')
  const parts: string[] = []

  for (const line of lines) {
    if (!line.startsWith('data:')) continue
    try {
      const json = JSON.parse(line.slice(5).trim())
      if (json.type === 'agent.message') {
        for (const block of json.content ?? []) {
          if (block.type === 'text') parts.push(block.text)
        }
      }
    } catch {}
  }

  return parts.join('')
}

// オーケストレーターのsystemPromptを生成
export function buildOrchestratorPrompt(bizName: string, subAgents: {
  name: string, role: string, tasks: string[], managedAgentId: string
}[]) {
  const staffList = subAgents.map(a =>
    `- ${a.name}（${a.role}）\n  業務: ${a.tasks.join('、')}`
  ).join('\n')

  return `あなたは${bizName}のAIスタッフを束ねるマネージャーです。

【管理下のスタッフ】
${staffList}

【あなたの役割】
1. ユーザーの指示を受け取り、最適なスタッフに振り分ける
2. 複数スタッフにまたがる場合は順番に依頼してまとめる
3. どのスタッフにも該当しない場合は自分で対応する
4. 報告は簡潔かつ具体的に行う

【重要なルール】
- 必ず日本語で返答する
- スタッフへの指示内容と結果をユーザーに透明性高く伝える`
}

// サブエージェントのsystemPromptを生成
export function buildSubAgentPrompt(data: {
  agentName: string, userName: string, role: string,
  tasks: string[], customTasks: string,
  startHour: string, endHour: string,
  approvalMode: string, reportEmail: string
}) {
  const taskList = [...data.tasks, data.customTasks].filter(Boolean).join('\n- ')
  const approvalInstruction = data.approvalMode === 'confirm'
    ? '重要な判断や外部への送信が必要なアクションは、必ずメールで確認を取ってから実行してください。'
    : '自律的に判断して実行し、結果を日報で報告してください。'
  return `あなたは${data.userName}さんの${data.role}として働くAIスタッフです。

【ミッション】
- ${taskList}

【稼働時間】
${data.startHour} 〜 ${data.endHour}（日本時間）

【判断基準】
${approvalInstruction}

【重要なルール】
- 報告はすべて ${data.reportEmail} 宛にメールで行う
- 件名には必ず「【${data.agentName}】」を付ける`
}
