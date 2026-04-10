import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAgent, initDB, getAgentsByUser, getUserById, updateUserOrchestrator, updateAgentConnectionStatus } from '@/lib/db'
import {
  createManagedAgent, createEnvironment,
  buildSubAgentPrompt, buildOrchestratorPrompt, updateManagedAgent
} from '@/lib/managed-agents'

type FormData = {
  agentName: string; role: string; tasks: string[]; customTasks: string
  tools: string[]; startHour: string; endHour: string
  approvalMode: 'confirm' | 'auto'; reportEmail: string; userName: string
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

    // まずDBに「pending」状態で保存
    const agent = await createAgent(session.userId, {
      name: body.agentName, role: body.role,
      tasks: body.tasks, customTasks: body.customTasks,
      tools: body.tools, startHour: body.startHour, endHour: body.endHour,
      approvalMode: body.approvalMode, reportEmail: body.reportEmail,
      connectionStatus: 'pending',
    })

    // Managed Agentsへの接続を非同期で試みる
    // （失敗してもユーザーへのレスポンスはブロックしない）
    connectToManagedAgents(session.userId, agent.id, body).catch(e => {
      console.error('Managed Agents接続エラー:', e)
    })

    return NextResponse.json({ agentId: agent.id, success: true })
  } catch (e) {
    console.error('Agent creation error:', e)
    const message = e instanceof Error ? e.message : '予期せぬエラーが発生しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// バックグラウンドでManaged Agentsに接続する
async function connectToManagedAgents(userId: string, agentId: string, body: FormData) {
  try {
    // 1. サブエージェントを作成
    const subPrompt = buildSubAgentPrompt({
      agentName: body.agentName, userName: body.userName, role: body.role,
      tasks: body.tasks, customTasks: body.customTasks,
      startHour: body.startHour, endHour: body.endHour,
      approvalMode: body.approvalMode, reportEmail: body.reportEmail,
    })
    const [subAgent, subEnv] = await Promise.all([
      createManagedAgent(body.agentName, subPrompt),
      createEnvironment(`${body.agentName}-env`),
    ])

    // DBのconnection_statusを更新
    await updateAgentConnectionStatus(agentId, 'active', subAgent.id, subEnv.id)

    // 2. オーケストレーターの処理
    const user = await getUserById(userId)
    const existingAgents = await getAgentsByUser(userId)
    const connectedAgents = existingAgents
      .filter((a: any) => a.connection_status === 'active' && a.id !== agentId)

    const allSubAgents = [
      ...connectedAgents.map((a: any) => ({
        name: a.name, role: a.role,
        tasks: a.tasks ?? [],
        managedAgentId: a.managed_agent_id,
      })),
      {
        name: body.agentName, role: body.role,
        tasks: body.tasks,
        managedAgentId: subAgent.id,
      }
    ]

    const orchPrompt = buildOrchestratorPrompt(body.userName, allSubAgents)

    if (user?.orchestrator_agent_id) {
      // オーケストレーターが既存 → systemPromptを更新
      await updateManagedAgent(user.orchestrator_agent_id, orchPrompt)
      console.log(`オーケストレーター更新完了: ${user.orchestrator_agent_id}`)
    } else {
      // 初回 → オーケストレーターを新規作成
      const [orchAgent, orchEnv] = await Promise.all([
        createManagedAgent(`${body.userName} AI本部`, orchPrompt),
        createEnvironment(`${body.userName}-orchestrator-env`),
      ])
      await updateUserOrchestrator(userId, {
        orchestratorAgentId: orchAgent.id,
        orchestratorEnvId: orchEnv.id,
        bizName: body.userName,
      })
      console.log(`オーケストレーター作成完了: ${orchAgent.id}`)
    }

    console.log(`Managed Agents接続完了: agentId=${agentId}`)
  } catch (e) {
    // 接続失敗時はpendingのまま（ユーザーはダッシュボードで確認できる）
    console.error(`Managed Agents接続失敗 agentId=${agentId}:`, e)
  }
}
