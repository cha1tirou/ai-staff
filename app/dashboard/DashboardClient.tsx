'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Agent = {
  id: string; name: string; role: string; status: string
  tasks: string[]; tools: string[]; start_hour: string; end_hour: string
  approval_mode: string; report_email: string; created_at: string
  managed_agent_id: string | null
}

type User = { id: string; email: string; name: string | null }

export default function DashboardClient({ user, agents: initialAgents }: { user: User; agents: Agent[] }) {
  const router = useRouter()
  const [agents, setAgents] = useState(initialAgents)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/auth')
  }

  const handleDelete = async (agentId: string) => {
    if (!confirm('このスタッフを削除しますか？この操作は取り消せません。')) return
    setDeletingId(agentId)
    await fetch('/api/user/agents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId }),
    })
    setAgents(prev => prev.filter(a => a.id !== agentId))
    setDeletingId(null)
  }

  const handleToggleStatus = async (agent: Agent) => {
    setTogglingId(agent.id)
    const newStatus = agent.status === 'active' ? 'paused' : 'active'
    const res = await fetch('/api/user/agents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: agent.id, status: newStatus }),
    })
    const data = await res.json()
    if (data.agent) {
      setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, status: newStatus } : a))
    }
    setTogglingId(null)
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="px-8 py-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
            <span className="text-white text-xs font-bold">AI</span>
          </div>
          <span className="font-medium text-fg">AI Staff</span>
          <span className="text-xs text-muted bg-surface px-2 py-0.5 rounded border border-border">社内管理</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-muted text-sm">{user.name ?? user.email}</span>
          <button
            onClick={handleLogout}
            className="text-muted text-sm hover:text-fg transition-colors"
          >
            ログアウト
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-light text-fg">AIスタッフ一覧</h1>
            <p className="text-muted text-sm mt-1">{agents.length}名のスタッフが在籍中</p>
          </div>
          <Link
            href="/onboarding"
            className="px-5 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-blue-500 transition-colors"
          >
            ＋ 新しいスタッフを採用
          </Link>
        </div>

        {/* Empty state */}
        {agents.length === 0 && (
          <div className="text-center py-20 border border-border rounded-xl bg-surface">
            <div className="w-16 h-16 rounded-full bg-accent-dim/30 border border-accent/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">👤</span>
            </div>
            <h3 className="text-fg font-medium mb-2">まだスタッフがいません</h3>
            <p className="text-muted text-sm mb-6">最初のAIスタッフを採用しましょう</p>
            <Link
              href="/onboarding"
              className="inline-block px-6 py-3 rounded-lg bg-accent text-white text-sm font-medium hover:bg-blue-500 transition-colors"
            >
              スタッフを採用する →
            </Link>
          </div>
        )}

        {/* Agent cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {agents.map(agent => (
            <div key={agent.id} className="p-6 rounded-xl border border-border bg-surface hover:border-muted/30 transition-colors">
              {/* Card header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-dim/40 border border-accent/20 flex items-center justify-center text-accent text-sm font-bold">
                    AI
                  </div>
                  <div>
                    <h3 className="text-fg font-medium text-sm">{agent.name}</h3>
                    <p className="text-muted text-xs">{agent.role}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs border ${
                  agent.status === 'active'
                    ? 'text-green-400 border-green-800/40 bg-green-900/20'
                    : 'text-muted border-border bg-surface'
                }`}>
                  {agent.status === 'active' ? '● 稼働中' : '○ 停止中'}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2 mb-5">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span>🕐</span>
                  <span>{agent.start_hour} 〜 {agent.end_hour}</span>
                  <span className="text-border">|</span>
                  <span>{agent.approval_mode === 'confirm' ? '確認あり' : '自律実行'}</span>
                </div>
                {agent.tasks?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {agent.tasks.slice(0, 3).map(t => (
                      <span key={t} className="px-2 py-0.5 bg-bg rounded text-muted text-xs border border-border">{t}</span>
                    ))}
                    {agent.tasks.length > 3 && (
                      <span className="px-2 py-0.5 bg-bg rounded text-muted text-xs border border-border">+{agent.tasks.length - 3}</span>
                    )}
                  </div>
                )}
                <div className="text-xs text-muted">
                  📧 {agent.report_email}
                </div>
                {agent.managed_agent_id && (
                  <div className="text-xs text-muted font-mono truncate">
                    ID: {agent.managed_agent_id.slice(0, 24)}...
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <span className="text-muted text-xs">{formatDate(agent.created_at)} 採用</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleStatus(agent)}
                    disabled={togglingId === agent.id}
                    className="px-3 py-1.5 rounded-md border border-border text-muted text-xs hover:text-fg hover:border-muted/50 transition-colors disabled:opacity-40"
                  >
                    {togglingId === agent.id ? '...' : agent.status === 'active' ? '停止' : '再開'}
                  </button>
                  <button
                    onClick={() => handleDelete(agent.id)}
                    disabled={deletingId === agent.id}
                    className="px-3 py-1.5 rounded-md border border-red-800/30 text-red-500/70 text-xs hover:bg-red-900/20 hover:text-red-400 transition-colors disabled:opacity-40"
                  >
                    {deletingId === agent.id ? '削除中...' : '削除'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats footer */}
        {agents.length > 0 && (
          <div className="mt-8 p-5 rounded-xl border border-border bg-surface grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-light text-fg">{agents.filter(a => a.status === 'active').length}</div>
              <div className="text-muted text-xs mt-1">稼働中</div>
            </div>
            <div className="text-center border-x border-border">
              <div className="text-2xl font-light text-fg">{agents.length}</div>
              <div className="text-muted text-xs mt-1">総スタッフ数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-light text-fg">
                {[...new Set(agents.map(a => a.role))].length}
              </div>
              <div className="text-muted text-xs mt-1">役割の種類</div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
