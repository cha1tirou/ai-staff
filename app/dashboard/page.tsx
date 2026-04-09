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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <DashboardClient user={user as any} agents={agents as any} />
}
