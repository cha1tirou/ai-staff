'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Phase = 'research' | 'chat' | 'proposal' | 'hiring'

type Message = { role: 'ai' | 'user'; text: string }

type Proposal = {
  role: string
  tag: string
  icon: string
  tasks: { task: string; detail: string }[]
  schedule: { start: string; end: string; weekly: string[] }
  report: string
  approvalMode: 'confirm' | 'auto'
}

const SYSTEM_PROMPT = `あなたはAIスタッフ採用サービスのコンシェルジュです。
事業者情報をもとに、自然な会話でヒアリングを行い、最適なAIスタッフの役割と業務を定義します。

ルール：
- 1回のメッセージで1〜2個の質問のみ。短くテンポよく。
- 4〜6往復でヒアリングを完了させる
- 「具体的な手順・頻度・何を成果物として出すか」まで引き出す
- 日本語で話す。親しみやすく丁寧に
- ユーザーが「提案して」「OK」「決めて」などと言ったら提案フェーズへ

5往復を超えたら、または提案の指示があったら、以下のJSON形式のみ出力すること（前後の説明文なし）：

PROPOSAL:
{
  "role": "役割名（例：プリシア広報 Ai）",
  "tag": "一言タグ（例：インバウンド強化・SNS担当）",
  "icon": "絵文字1文字",
  "tasks": [
    {"task": "業務名", "detail": "具体的な手順・頻度・成果物を詳しく"}
  ],
  "schedule": {
    "start": "09:00",
    "end": "18:00",
    "weekly": ["月曜: 競合調査レポート送付", "金曜: 週次まとめメール"]
  },
  "report": "毎朝9時にその日のプランをメールで報告し、18時に実績と翌日の提案を日報で送信",
  "approvalMode": "confirm"
}`

export default function OnboardingPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('research')
  const [urlInput, setUrlInput] = useState('')
  const [researchStep, setResearchStep] = useState(0)
  const [bizContext, setBizContext] = useState('')
  const [bizInfo, setBizInfo] = useState({ name: '', desc: '', icon: '🏢' })
  const [firstGreeting, setFirstGreeting] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [history, setHistory] = useState<{role: string; content: string}[]>([])
  const [input, setInput] = useState('')
  const [turns, setTurns] = useState(0)
  const [loading, setLoading] = useState(false)
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [hiring, setHiring] = useState(false)
  const [error, setError] = useState('')
  const msgsRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const STEPS = ['事業内容を確認中', 'サービス・商品を特定中', 'ターゲット顧客を把握中', '課題・ニーズを推測中']

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [messages, loading])

  async function callClaude(messages: {role: string; content: string}[], system?: string) {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, system }),
    })
    if (!res.ok) throw new Error('AIとの通信に失敗しました')
    const data = await res.json()
    return data.text as string
  }

  async function startResearch() {
    if (!urlInput.trim()) return
    setError('')
    setPhase('research')
    setResearchStep(1)

    try {
      // アニメーション
      for (let i = 2; i <= 4; i++) {
        await new Promise(r => setTimeout(r, 700))
        setResearchStep(i)
      }

      const text = await callClaude([{
        role: 'user',
        content: `事業者「${urlInput}」について以下をJSON形式で返してください（日本語、JSONのみ）：
{"name":"正式名称または推測名称","type":"業種","description":"事業概要2〜3文","icon":"絵文字1文字","greeting":"この事業者への最初の挨拶と質問（事業への理解を示しながら最初の質問をする。60文字以内）"}`
      }], 'JSONのみ返してください。')

      let info: any = {}
      try { info = JSON.parse(text.replace(/```json|```/g, '').trim()) } catch {}

      const ctx = `事業者: ${info.name || urlInput}\n業種: ${info.type || '不明'}\n概要: ${info.description || ''}`
      const greeting = info.greeting || `${info.name || urlInput}について教えてください。どんな業務をAIスタッフに任せたいですか？`

      setBizContext(ctx)
      setBizInfo({ name: info.name || urlInput, desc: info.description || '', icon: info.icon || '🏢' })
      setFirstGreeting(greeting)
      setMessages([{ role: 'ai', text: greeting }])
      setHistory([{ role: 'assistant', content: greeting }])
      setPhase('chat')
    } catch (e: any) {
      setError(e.message || 'エラーが発生しました')
      setPhase('research')
      setResearchStep(0)
    }
  }

  async function sendMessage(text?: string) {
    const msg = text ?? input.trim()
    if (!msg || loading) return
    setInput('')

    const newMsg: Message = { role: 'user', text: msg }
    setMessages(prev => [...prev, newMsg])
    const newHistory = [...history, { role: 'user', content: msg }]
    setHistory(newHistory)
    setTurns(t => t + 1)
    setLoading(true)

    try {
      const convo = [
        { role: 'user', content: `事業者情報:\n${bizContext}\n\nヒアリングを開始してください。最初の挨拶は既に送りました：「${firstGreeting}」` },
        ...newHistory
      ]

      const reply = await callClaude(convo, SYSTEM_PROMPT)

      if (reply.includes('PROPOSAL:')) {
        const jsonStr = reply.split('PROPOSAL:')[1].trim()
        try {
          const p: Proposal = JSON.parse(jsonStr.replace(/```json|```/g, '').trim())
          setMessages(prev => [...prev, { role: 'ai', text: 'ヒアリングありがとうございます！こういうスタッフを提案します。内容を確認してください。' }])
          setProposal(p)
          setPhase('proposal')
        } catch {
          const clean = reply.split('PROPOSAL:')[0].trim()
          if (clean) setMessages(prev => [...prev, { role: 'ai', text: clean }])
        }
      } else {
        setMessages(prev => [...prev, { role: 'ai', text: reply }])
        setHistory(prev => [...prev, { role: 'assistant', content: reply }])
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'ai', text: 'エラーが発生しました。もう一度お試しください。' }])
    }
    setLoading(false)
  }

  async function submitHire() {
    if (!proposal) return
    setHiring(true)
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: proposal.role,
          role: proposal.role,
          tasks: proposal.tasks.map(t => t.task),
          customTasks: proposal.tasks.map(t => `${t.task}：${t.detail}`).join('\n'),
          tools: ['Gmail', 'Google Calendar', 'Web検索'],
          startHour: proposal.schedule.start,
          endHour: proposal.schedule.end,
          approvalMode: proposal.approvalMode || 'confirm',
          reportEmail: '',
          userName: bizInfo.name,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/complete?agentId=${data.agentId}&name=${encodeURIComponent(proposal.role)}`)
    } catch (e: any) {
      setError(e.message || '採用に失敗しました')
      setHiring(false)
    }
  }

  // クイック返信チップ
  const chips = turns === 0
    ? ['SNSの運用・投稿', 'メール・問い合わせ対応', 'リサーチ・競合調査', '資料・コンテンツ作成', 'まだ決まっていない']
    : turns >= 3
    ? ['この方向でOK、提案してください', 'もう少し詳しく決めたい']
    : []

  return (
    <div className="min-h-screen grid-bg flex flex-col">
      {/* Header */}
      <header className="px-8 py-5 border-b border-border flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
            <span className="text-white text-xs font-bold">AI</span>
          </div>
          <span className="font-medium text-fg">AI Staff</span>
        </Link>
        <div className="text-muted text-sm">
          {phase === 'research' && 'ステップ 1 / 3'}
          {phase === 'chat' && 'ステップ 2 / 3'}
          {phase === 'proposal' && 'ステップ 3 / 3'}
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-0.5 bg-border">
        <div className="h-full bg-accent transition-all duration-500"
          style={{ width: phase === 'research' ? '33%' : phase === 'chat' ? '66%' : '100%' }} />
      </div>

      <main className="flex-1 flex flex-col items-center px-6 py-8">
        <div className="w-full max-w-lg">

          {/* ── Phase 0: 事業者入力 ── */}
          {phase === 'research' && researchStep === 0 && (
            <div className="animate-fade-up">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center text-white text-xs font-bold">AI</div>
                <div>
                  <h2 className="text-xl font-medium text-fg">あなたの事業を教えてください</h2>
                  <p className="text-muted text-sm">URLまたは会社・サービス名を入力してください</p>
                </div>
              </div>

              <div className="flex gap-3 mb-3">
                <input
                  type="text"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && startResearch()}
                  placeholder="例：pricia-resort.com　または　プリシアリゾート与論"
                  className="flex-1 px-4 py-3 rounded-lg bg-surface border border-border text-fg placeholder-muted/40 focus:outline-none focus:border-accent text-sm"
                />
                <button
                  onClick={startResearch}
                  disabled={!urlInput.trim()}
                  className="px-5 py-3 rounded-lg bg-accent text-white text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-30"
                >
                  調べる
                </button>
              </div>
              <p className="text-muted text-xs">URLでも会社名でも大丈夫です。Claudeが事業内容を把握してからヒアリングを始めます。</p>
              {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
            </div>
          )}

          {/* ── Phase Research: アニメーション ── */}
          {phase === 'research' && researchStep > 0 && (
            <div className="p-5 rounded-xl border border-border bg-surface">
              <p className="text-sm font-medium text-fg mb-4">「{urlInput}」を調査中...</p>
              <ul className="space-y-2">
                {STEPS.map((s, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    {researchStep > i + 1 ? (
                      <span className="text-green-400 text-xs">✓</span>
                    ) : researchStep === i + 1 ? (
                      <span className="w-3 h-3 border-2 border-border border-t-accent rounded-full animate-spin inline-block" />
                    ) : (
                      <span className="w-3 h-3 rounded-full border border-border inline-block" />
                    )}
                    <span className={researchStep > i ? 'text-fg' : 'text-muted/50'}>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Phase Chat: ヒアリング ── */}
          {(phase === 'chat' || phase === 'proposal') && (
            <div>
              {/* 事業者バー */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface mb-5">
                <div className="w-9 h-9 rounded-lg bg-accent-dim/40 flex items-center justify-center text-lg flex-shrink-0">
                  {bizInfo.icon}
                </div>
                <div>
                  <div className="text-sm font-medium text-fg">{bizInfo.name}</div>
                  <div className="text-xs text-muted leading-snug">{bizInfo.desc}</div>
                </div>
              </div>

              {/* メッセージ */}
              <div ref={msgsRef} className="flex flex-col gap-3 mb-3 overflow-y-auto" style={{ maxHeight: '340px' }}>
                {messages.map((m, i) => (
                  <div key={i} className={`flex gap-2 items-start ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                      m.role === 'ai' ? 'bg-accent-dim/40 text-accent' : 'bg-green-900/30 text-green-400'
                    }`}>
                      {m.role === 'ai' ? 'AI' : '私'}
                    </div>
                    <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm leading-relaxed border ${
                      m.role === 'ai'
                        ? 'bg-surface border-border text-fg'
                        : 'bg-surface border-border text-fg'
                    }`} style={{ whiteSpace: 'pre-wrap' }}>
                      {m.text}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-2 items-start">
                    <div className="w-7 h-7 rounded-full bg-accent-dim/40 flex items-center justify-center text-xs font-medium text-accent flex-shrink-0">AI</div>
                    <div className="px-4 py-3 rounded-2xl border border-border bg-surface flex gap-1">
                      {[0,1,2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted/50 animate-bounce"
                          style={{ animationDelay: `${i * 0.2}s` }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* チップ */}
              {phase === 'chat' && !loading && chips.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {chips.map(c => (
                    <button key={c} onClick={() => sendMessage(c)}
                      className="px-3 py-1.5 rounded-full border border-border text-muted text-xs hover:border-accent hover:text-accent transition-colors">
                      {c}
                    </button>
                  ))}
                </div>
              )}

              {/* 入力 */}
              {phase === 'chat' && (
                <div className="flex gap-2 items-end border border-border rounded-xl px-3 py-2 bg-surface focus-within:border-accent transition-colors">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 90) + 'px' }}
                    placeholder="自由に入力してください..."
                    rows={1}
                    disabled={loading}
                    className="flex-1 bg-transparent text-fg text-sm resize-none outline-none placeholder-muted/40 leading-relaxed"
                    style={{ minHeight: '20px', maxHeight: '90px' }}
                  />
                  <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
                    className="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0 disabled:opacity-30">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Phase Proposal: 提案カード ── */}
          {phase === 'proposal' && proposal && (
            <div className="mt-4 rounded-xl border border-border bg-surface overflow-hidden">
              <div className="p-4 border-b border-border bg-bg flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-900/30 flex items-center justify-center text-xl flex-shrink-0">
                  {proposal.icon}
                </div>
                <div>
                  <div className="text-sm font-medium text-fg">{proposal.role}</div>
                  <div className="text-xs text-muted">{proposal.tag}</div>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <div className="text-xs font-medium text-muted/60 uppercase tracking-wide mb-2">業務内容</div>
                  {proposal.tasks.map((t, i) => (
                    <div key={i} className="text-sm text-fg py-1 flex gap-2 leading-snug">
                      <span className="text-muted flex-shrink-0">—</span>
                      <span><strong>{t.task}</strong>：{t.detail}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="text-xs font-medium text-muted/60 uppercase tracking-wide mb-2">稼働</div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs px-3 py-1 rounded-full border border-border text-muted">
                      🕐 {proposal.schedule.start} 〜 {proposal.schedule.end}
                    </span>
                  </div>
                  {proposal.schedule.weekly?.map((w, i) => (
                    <div key={i} className="text-sm text-fg py-0.5 flex gap-2 mt-1">
                      <span className="text-muted">—</span>{w}
                    </div>
                  ))}
                </div>

                <div>
                  <div className="text-xs font-medium text-muted/60 uppercase tracking-wide mb-2">報告方法</div>
                  <p className="text-sm text-fg leading-relaxed">{proposal.report}</p>
                </div>
              </div>

              {error && <div className="mx-4 mb-3 p-3 rounded-lg bg-red-900/20 border border-red-800/40 text-red-400 text-xs">{error}</div>}

              <div className="p-4 border-t border-border flex gap-3">
                <button
                  onClick={() => { setPhase('chat'); setMessages(prev => [...prev, { role: 'ai', text: 'どの部分を修正しますか？' }]) }}
                  className="flex-1 py-2.5 rounded-lg border border-border text-muted text-sm hover:text-fg transition-colors">
                  修正する
                </button>
                <button
                  onClick={submitHire}
                  disabled={hiring}
                  className="flex-2 px-6 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-500 transition-colors disabled:opacity-40 flex items-center gap-2">
                  {hiring && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  この内容で採用する ✨
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
