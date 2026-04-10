'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Agent = {
  id: string; name: string; role: string; status: string
  tasks: string[]; tools: string[]; start_hour: string; end_hour: string
  approval_mode: string; report_email: string; created_at: string
  managed_agent_id: string | null; connection_status: string
}
type User = { id: string; email: string; name: string | null }
type ChatMessage = { role: 'ai' | 'user'; text: string }
type PendingChange = { summary: string; changes: Record<string, any> }

export default function DashboardClient({
  user, agents: initialAgents, hasOrchestrator, bizName,
  orchestratorAgentId, orchestratorEnvId,
}: {
  user: User; agents: Agent[]
  hasOrchestrator: boolean; bizName: string
  orchestratorAgentId: string | null; orchestratorEnvId: string | null
}) {
  const router = useRouter()
  const [agents, setAgents] = useState(initialAgents)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // エージェント個別チャット
  const [chatAgentId, setChatAgentId] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null)
  const [applyingChange, setApplyingChange] = useState(false)

  // オーケストレーターチャット
  const [orchOpen, setOrchOpen] = useState(false)
  const [orchMessages, setOrchMessages] = useState<ChatMessage[]>([])
  const [orchInput, setOrchInput] = useState('')
  const [orchLoading, setOrchLoading] = useState(false)

  const agentMsgsRef = useRef<HTMLDivElement>(null)
  const orchMsgsRef = useRef<HTMLDivElement>(null)

  const chatAgent = agents.find(a => a.id === chatAgentId) ?? null
  const orchestratorName = bizName ? `${bizName} AI本部` : 'AI本部'
  const pendingCount = agents.filter(a => a.connection_status === 'pending').length

  useEffect(() => {
    if (agentMsgsRef.current) agentMsgsRef.current.scrollTop = agentMsgsRef.current.scrollHeight
  }, [chatMessages, chatLoading])

  useEffect(() => {
    if (orchMsgsRef.current) orchMsgsRef.current.scrollTop = orchMsgsRef.current.scrollHeight
  }, [orchMessages, orchLoading])

  function openOrch() {
    setOrchOpen(true)
    if (orchMessages.length === 0) {
      setOrchMessages([{
        role: 'ai',
        text: hasOrchestrator
          ? `${orchestratorName}です。何でも指示してください。\n例：「今週のSNS投稿案を出して」「未返信メールを確認して」`
          : `${orchestratorName}はまだスタッフが接続中です。接続完了後に本格稼働します。\n現時点でも質問にはお答えできます。`
      }])
    }
  }

  function openChat(agent: Agent) {
    setChatAgentId(agent.id)
    setChatMessages([{
      role: 'ai',
      text: `${agent.name}の設定変更をどうぞ。\n例：「稼働時間を10時〜19時に変えて」`
    }])
    setPendingChange(null)
    setChatInput('')
  }

  function closeChat() {
    setChatAgentId(null)
    setChatMessages([])
    setPendingChange(null)
  }

  // オーケストレーターへのメッセージ送信
  async function sendOrchMessage() {
    if (!orchInput.trim() || orchLoading) return
    const msg = orchInput.trim()
    setOrchInput('')
    setOrchMessages(prev => [...prev, { role: 'user', text: msg }])
    setOrchLoading(true)

    try {
      const res = await fetch('/api/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      })

      const contentType = res.headers.get('content-type') ?? ''

      if (contentType.includes('text/event-stream')) {
        // SSEストリーミング：リアルタイムでテキストを流す
        let accumulated = ''
        setOrchMessages(prev => [...prev, { role: 'ai', text: '' }])
        const reader = res.body!.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) {
              accumulated += line.slice(6)
              setOrchMessages(prev => {
                const msgs = [...prev]
                msgs[msgs.length - 1] = { role: 'ai', text: accumulated }
                return msgs
              })
            }
          }
        }
      } else {
        // JSONフォールバック
        const data = await res.json()
        setOrchMessages(prev => [...prev, { role: 'ai', text: data.reply }])
      }
    } catch {
      setOrchMessages(prev => [...prev, { role: 'ai', text: 'エラーが発生しました。' }])
    }
    setOrchLoading(false)
  }

  // エージェント設定変更チャット
  async function sendChatMessage() {
    if (!chatInput.trim() || chatLoading || !chatAgent) return
    const msg = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', text: msg }])
    setChatLoading(true)
    setPendingChange(null)

    try {
      const res = await fetch('/api/user/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: chatAgent, message: msg }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error)

      if (Object.keys(data.changes).length > 0) {
        setPendingChange({ summary: data.summary, changes: data.changes })
        setChatMessages(prev => [...prev, { role: 'ai', text: `${data.summary}\n\n以下の変更を適用しますか？` }])
      } else {
        setChatMessages(prev => [...prev, { role: 'ai', text: data.summary || '変更内容が見つかりませんでした。' }])
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'ai', text: 'エラーが発生しました。' }])
    }
    setChatLoading(false)
  }

  async function applyChange() {
    if (!pendingChange || !chatAgent) return
    setApplyingChange(true)
    try {
      const res = await fetch('/api/user/agents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: chatAgent.id, ...pendingChange.changes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAgents(prev => prev.map(a => a.id === chatAgent.id ? { ...a, ...data.agent } : a))
      setPendingChange(null)
      setChatMessages(prev => [...prev, { role: 'ai', text: '✅ 設定を更新しました！' }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'ai', text: '更新に失敗しました。' }])
    }
    setApplyingChange(false)
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/auth')
  }

  const handleDelete = async (agentId: string) => {
    if (!confirm('このスタッフを削除しますか？')) return
    setDeletingId(agentId)
    await fetch('/api/user/agents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId }),
    })
    setAgents(prev => prev.filter(a => a.id !== agentId))
    if (chatAgentId === agentId) closeChat()
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
    if (data.agent) setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, status: newStatus } : a))
    setTogglingId(null)
  }

  const formatDate = (d: string) => { const dt = new Date(d); return `${dt.getFullYear()}/${dt.getMonth()+1}/${dt.getDate()}` }

  const MsgBubble = ({ m, i }: { m: ChatMessage; i: number }) => (
    <div key={i} className={`flex gap-2 items-start ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
        m.role === 'ai' ? 'bg-accent-dim/40 text-accent' : 'bg-green-900/30 text-green-400'
      }`}>{m.role === 'ai' ? 'AI' : '私'}</div>
      <div className="max-w-xs px-3 py-2 rounded-xl text-xs leading-relaxed border bg-surface border-border text-fg"
        style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
    </div>
  )

  const LoadingDots = () => (
    <div className="flex gap-2 items-start">
      <div className="w-6 h-6 rounded-full bg-accent-dim/40 flex items-center justify-center text-xs text-accent flex-shrink-0">AI</div>
      <div className="px-3 py-2.5 rounded-xl border border-border bg-surface flex gap-1">
        {[0,1,2].map(i => <span key={i} className="w-1 h-1 rounded-full bg-muted/50 animate-bounce" style={{ animationDelay: `${i*0.2}s` }} />)}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-bg">
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
          <button onClick={handleLogout} className="text-muted text-sm hover:text-fg transition-colors">ログアウト</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* オーケストレーターパネル */}
        {agents.length > 0 && (
          <div className="mb-6 rounded-xl border border-accent/30 bg-surface overflow-hidden">
            <button
              onClick={orchOpen ? () => setOrchOpen(false) : openOrch}
              className="w-full flex items-center gap-3 p-4 hover:bg-accent/5 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-sm font-bold flex-shrink-0">
                🏢
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-fg">{orchestratorName}</div>
                <div className="text-xs text-muted">
                  {hasOrchestrator ? `${agents.filter(a => a.connection_status === 'active').length}名のスタッフを管理中` : '接続準備中...'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasOrchestrator
                  ? <span className="text-xs px-2 py-0.5 rounded-full border border-green-800/40 text-green-400 bg-green-900/20">● 稼働中</span>
                  : <span className="text-xs px-2 py-0.5 rounded-full border border-border text-muted">⚙ 接続中</span>
                }
                <span className="text-muted text-sm">{orchOpen ? '▲' : '▼'}</span>
              </div>
            </button>

            {orchOpen && (
              <div className="border-t border-accent/20">
                <div ref={orchMsgsRef} className="flex flex-col gap-3 p-4 overflow-y-auto" style={{ maxHeight: '300px' }}>
                  {orchMessages.map((m, i) => <MsgBubble key={i} m={m} i={i} />)}
                  {orchLoading && <LoadingDots />}
                </div>
                <div className="p-3 pt-0">
                  <div className="flex gap-2 items-center border border-border rounded-lg px-3 py-2 bg-bg focus-within:border-accent transition-colors">
                    <input
                      type="text"
                      value={orchInput}
                      onChange={e => setOrchInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendOrchMessage()}
                      placeholder={hasOrchestrator ? "例：今週のSNS投稿案を出して" : "接続完了後に本格稼働します"}
                      disabled={orchLoading}
                      className="flex-1 bg-transparent text-fg text-xs outline-none placeholder-muted/40"
                    />
                    <button onClick={sendOrchMessage} disabled={!orchInput.trim() || orchLoading}
                      className="w-6 h-6 rounded-full bg-accent flex items-center justify-center flex-shrink-0 disabled:opacity-30">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-light text-fg">AIスタッフ一覧</h1>
            <p className="text-muted text-sm mt-1">
              {agents.length}名在籍
              {pendingCount > 0 && <span className="ml-2 text-yellow-500">・{pendingCount}名接続待ち</span>}
            </p>
          </div>
          <Link href="/onboarding" className="px-5 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-blue-500 transition-colors">
            ＋ 新しいスタッフを採用
          </Link>
        </div>

        {agents.length === 0 && (
          <div className="text-center py-20 border border-border rounded-xl bg-surface">
            <div className="w-16 h-16 rounded-full bg-accent-dim/30 border border-accent/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">👤</span>
            </div>
            <h3 className="text-fg font-medium mb-2">まだスタッフがいません</h3>
            <p className="text-muted text-sm mb-6">最初のAIスタッフを採用しましょう</p>
            <Link href="/onboarding" className="inline-block px-6 py-3 rounded-lg bg-accent text-white text-sm font-medium hover:bg-blue-500 transition-colors">
              スタッフを採用する →
            </Link>
          </div>
        )}

        {/* エージェントカード */}
        <div className="grid md:grid-cols-2 gap-4">
          {agents.map(agent => (
            <div key={agent.id} className={`rounded-xl border bg-surface transition-colors ${
              chatAgentId === agent.id ? 'border-accent' : 'border-border hover:border-muted/30'
            }`}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent-dim/40 border border-accent/20 flex items-center justify-center text-accent text-sm font-bold">AI</div>
                    <div>
                      <h3 className="text-fg font-medium text-sm">{agent.name}</h3>
                      <p className="text-muted text-xs">{agent.role}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${
                      agent.status === 'active'
                        ? 'text-green-400 border-green-800/40 bg-green-900/20'
                        : 'text-muted border-border bg-surface'
                    }`}>
                      {agent.status === 'active' ? '● 稼働中' : '○ 停止中'}
                    </span>
                    {/* 接続ステータスバッジ */}
                    {agent.connection_status === 'pending' && (
                      <span className="px-2 py-0.5 rounded-full text-xs border border-yellow-700/40 text-yellow-500 bg-yellow-900/10">
                        ⚙ 接続待ち
                      </span>
                    )}
                    {agent.connection_status === 'active' && (
                      <span className="px-2 py-0.5 rounded-full text-xs border border-blue-800/40 text-blue-400 bg-blue-900/10">
                        ⚡ 接続済み
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-5">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span>🕐</span><span>{agent.start_hour} 〜 {agent.end_hour}</span>
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
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <span className="text-muted text-xs">{formatDate(agent.created_at)} 採用</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => chatAgentId === agent.id ? closeChat() : openChat(agent)}
                      className={`px-3 py-1.5 rounded-md border text-xs transition-colors ${
                        chatAgentId === agent.id
                          ? 'border-accent text-accent bg-accent/10'
                          : 'border-border text-muted hover:border-accent hover:text-accent'
                      }`}
                    >
                      ⚙ 設定変更
                    </button>
                    <button onClick={() => handleToggleStatus(agent)} disabled={togglingId === agent.id}
                      className="px-3 py-1.5 rounded-md border border-border text-muted text-xs hover:text-fg transition-colors disabled:opacity-40">
                      {togglingId === agent.id ? '...' : agent.status === 'active' ? '停止' : '再開'}
                    </button>
                    <button onClick={() => handleDelete(agent.id)} disabled={deletingId === agent.id}
                      className="px-3 py-1.5 rounded-md border border-red-800/30 text-red-500/70 text-xs hover:bg-red-900/20 hover:text-red-400 transition-colors disabled:opacity-40">
                      {deletingId === agent.id ? '削除中...' : '削除'}
                    </button>
                  </div>
                </div>
              </div>

              {/* 設定変更チャットパネル */}
              {chatAgentId === agent.id && (
                <div className="border-t border-accent/30 bg-bg rounded-b-xl">
                  <div ref={agentMsgsRef} className="flex flex-col gap-3 p-4 overflow-y-auto" style={{ maxHeight: '260px' }}>
                    {chatMessages.map((m, i) => <MsgBubble key={i} m={m} i={i} />)}
                    {chatLoading && <LoadingDots />}
                  </div>
                  {pendingChange && (
                    <div className="px-4 pb-2 flex gap-2">
                      <button onClick={applyChange} disabled={applyingChange}
                        className="flex-1 py-2 rounded-lg bg-accent text-white text-xs font-medium hover:bg-blue-500 transition-colors disabled:opacity-40">
                        {applyingChange ? '更新中...' : '✓ この変更を適用する'}
                      </button>
                      <button onClick={() => setPendingChange(null)}
                        className="px-3 py-2 rounded-lg border border-border text-muted text-xs hover:text-fg transition-colors">
                        キャンセル
                      </button>
                    </div>
                  )}
                  <div className="p-3 pt-0">
                    <div className="flex gap-2 items-center border border-border rounded-lg px-3 py-2 bg-surface focus-within:border-accent transition-colors">
                      <input type="text" value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                        placeholder="例：稼働時間を10〜19時に変えて"
                        disabled={chatLoading}
                        className="flex-1 bg-transparent text-fg text-xs outline-none placeholder-muted/40"
                      />
                      <button onClick={sendChatMessage} disabled={!chatInput.trim() || chatLoading}
                        className="w-6 h-6 rounded-full bg-accent flex items-center justify-center flex-shrink-0 disabled:opacity-30">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {agents.length > 0 && (
          <div className="mt-8 p-5 rounded-xl border border-border bg-surface grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-light text-fg">{agents.filter(a => a.status === 'active').length}</div>
              <div className="text-muted text-xs mt-1">稼働中</div>
            </div>
            <div className="text-center border-x border-border">
              <div className="text-2xl font-light text-fg">{agents.filter(a => a.connection_status === 'active').length}</div>
              <div className="text-muted text-xs mt-1">接続済み</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-light text-fg">{pendingCount}</div>
              <div className="text-muted text-xs mt-1">接続待ち</div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
