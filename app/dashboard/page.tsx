import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getAgentsByUser, getUserById, initDB } from '@/lib/db'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/auth')

  await initDB()
  const [user, agents] = await Promise.all([
    getUserById(session.userId),
    getAgentsByUser(session.userId),
  ])

  const u = user as any
  return (
    <DashboardClient
      user={u}
      agents={agents as any}
      hasOrchestrator={!!u?.orchestrator_agent_id}
      bizName={u?.biz_name ?? ''}
      orchestratorAgentId={u?.orchestrator_agent_id ?? null}
      orchestratorEnvId={u?.orchestrator_env_id ?? null}
    />
  )
}
