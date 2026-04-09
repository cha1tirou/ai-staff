'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Phase = 'research' | 'mode-select' | 'chat' | 'proposal' | 'hiring'
type Mode = 'defined' | 'explore' | null

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

// モードA: 業務が決まっている → ヒアリングで詰める
const SYSTEM_PROMPT_DEFINED = `あなたはAIスタッフ採用サービスのコンシェルジュです。
事業者情報をもとに、自然な会話でヒアリングを行い、最適なAIスタッフの役割と業務を定義します。

ルール：
- 1回のメッセージで1〜2個の質問のみ。短くテンポよく。
- 4〜6往復でヒアリングを完了させる
- 「具体的な手順・頻度・何を成果物として出すか」まで引き出す
- 日本語で話す。親しみやすく丁寧に
- ユーザーが「提案して」「OK」「決めて」「この方向で」などと言ったら必ず提案フェーズへ移行する

★重要★ 提案を求められたら、または5往復を超えたら、必ず以下の形式のみで出力すること。
説明文・前置き・後置き・コードブロックは一切不要。PROPOSAL:から始めること。

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

// モードB: 目的・課題から業務を提案する
const SYSTEM_PROMPT_EXPLORE = `あなたはAIスタッフ採用サービスのコンシェルジュです。
事業者の目的・課題をヒアリングし、AIスタッフに任せるべき業務を提案します。

ルール：
- まず「何を達成したいか」「今どんな課題があるか」を引き出す
- 次に「リソース・時間・優先度」を確認する
- 1回のメッセージで1〜2個の質問のみ。短くテンポよく。
- 3〜5往復でヒアリングを完了させ、業務セットを提案する
- 日本語で話す。親しみやすく丁寧に
- ユーザーが「提案して」「OK」「決めて」「この方向で」などと言ったら必ず提案フェーズへ移行する

★重要★ 提案を求められたら、または4往復を超えたら、必ず以下の形式のみで出力すること。
説明文・前置き・後置き・コードブロックは一切不要。PROPOSAL:から始めること。
tasksは目的・課題に対応した具体的な業務を3〜5個提案すること。

PROPOSAL:
{
  "role": "役割名（目的を反映した名前、例：集客強化 Ai・業務効率化 Ai）",
  "tag": "一言タグ（例：売上向上・コスト削減・顧客対応強化）",
  "icon": "絵文字1文字",
  "tasks": [
    {"task": "業務名", "detail": "具体的な手順・頻度・成果物を詳しく"}
  ],
  "schedule": {
    "start": "09:00",
    "end": "18:00",
    "weekly": ["月曜: ○○", "金曜: ○○"]
  },
  "report": "報告タイミングと方法を具体的に",
  "approvalMode": "confirm"
}`

export default function OnboardingPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('research')
  const [mode, setMode] = useState<Mode>(null)
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
      for (let i = 2; i <= 4; i++) {
        await new Promise(r => setTimeout(r, 700))
        setResearchStep(i)
      }

      const text = await callClaude([{
        role: 'user',
        content: `事業者「${urlInput}」について以下をJSON形式で返してください（日本語、JSONのみ）：\n{"name":"正式名称または推測名称","type":"業種","description":"事業概要2〜3文","icon":"絵文字1文字"}`
      }], 'JSONのみ返してください。')

      let info: any = {}
      try { info = JSON.parse(text.replace(/```json|```/g, '').trim()) } catch {}

      const ctx = `事業者: ${info.name || urlInput}\n業種: ${info.type || '不明'}\n概要: ${info.description || ''}`
      setBizContext(ctx)
      setBizInfo({ name: info.name || urlInput, desc: info.description || '', icon: info.icon || '🏢' })
      setPhase('mode-select')
    } catch (e: any) {
      setError(e.message || 'エラーが発生しました')
      setPhase('research')
      setResearchStep(0)
    }
  }

  async function selectMode(selectedMode: Mode) {
    setMode(selectedMode)
    setLoading(true)

    try {
      const promptKey = selectedMode === 'defined'
        ? `事業者情報:\n${bizContext}\n\nモード: 業務がある程度決まっているユーザー向けヒアリング。最初の挨拶と質問（事業への理解を示しながら、どんな業務を任せたいか聞く。60文字以内）をJSON {"greeting":"..."} で返してください。`
        : `事業者情報:\n${bizContext}\n\nモード: 目的・課題から業務を提案するユーザー向けヒアリング。最初の挨拶と質問（事業への理解を示しながら、何を達成したいか・どんな課題があるかを聞く。60文字以内）をJSON {"greeting":"..."} で返してください。`

      const text = await callClaude([{ role: 'user', content: promptKey }], 'JSONのみ返してください。')
      let info: any = {}
      try { info = JSON.parse(text.replace(/```json|```/g, '').trim()) } catch {}

      const greeting = info.greeting || (
        selectedMode === 'defined'
          ? `${bizInfo.name}について、どんな業務をAIスタッフに任せたいか教えてください！`
          : `${bizInfo.name}として、今一番解決したい課題や達成したい目標は何ですか？`
      )

      setFirstGreeting(greeting)
      setMessages([{ role: 'ai', text: greeting }])
      setHistory([{ role: 'assistant', content: greeting }])
      setPhase('chat')
    } catch (e: any) {
      setError(e.message || 'エラーが発生しました')
    }
    setLoading(false)
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
      const systemPrompt = mode === 'explore' ? SYSTEM_PROMPT_EXPLORE : SYSTEM_PROMPT_DEFINED
      const convo = [
        { role: 'user', content: `事業者情報:\n${bizContext}\n\nヒアリングを開始してください。最初の挨拶は既に送りました：「${firstGreeting}」` },
        ...newHistory
      ]

      const reply = await callClaude(convo, systemPrompt)

      const proposalMatch = reply.match(/PROPOSAL:\s*(\{[\s\S]*\})/i)
      if (proposalMatch) {
        try {
          const jsonStr = proposalMatch[1].replace(/```json|```/g, '').trim()
          const p: Proposal = JSON.parse(jsonStr)
          setMessages(prev => [...prev, { role: 'ai', text: 'ヒアリングありがとうございます！こういうスタッフを提案します。内容を確認してください。' }])
          setHistory(prev => [...prev, { role: 'assistant', content: 'PROPOSAL: (生成済み)' }])
          setProposal(p)
          setPhase('proposal')
        } catch (parseErr) {
          console.error('PROPOSAL parse error:', parseErr, reply)
          setMessages(prev => [...prev, { role: 'ai', text: '提案の生成中にエラーが発生しました。「提案してください」ともう一度送ってみてください。' }])
          setHistory(prev => [...prev, { role: 'assistant', content: reply }])
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
  const chips = mode === 'explore'
    ? (turns === 0
        ? ['売上・集客を増やしたい', '業務を効率化したい', '顧客対応を改善したい', 'コストを削減したい', 'まだ漠然としている']
        : turns >= 3
        ? ['この方向でOK、提案してください', 'もう少し詳しく話したい']
        : [])
    : (turns === 0
        ? ['SNSの運用・投稿', 'メール・問い合わせ対応', 'リサーチ・競合調査', '資料・コンテンツ作成', 'まだ決まっていない']
        : turns >= 3
        ? ['この方向でOK、提案してください', 'もう少し詳しく決めたい']
        : [])

  const progressWidth = phase === 'research' ? '25%'
    : phase === 'mode-select' ? '50%'
    : phase === 'chat' ? '75%'
    : '100%'

  const stepLabel = phase === 'research' ? 'ステップ 1 / 4'
    : phase === 'mode-select' ? 'ステップ 2 / 4'
    : phase === 'chat' ? 'ステップ 3 / 4'
    : 'ステップ 4 / 4'

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
        <div className="text-muted text-sm">{stepLabel}</div>
      </header>

      {/* Progress bar */}
      <div className="h-0.5 bg-border">
        <div className="h-full bg-accent transition-all duration-500" style={{ width: progressWidth }} />
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

          {/* ── Phase Mode Select ── */}
          {phase === 'mode-select' && (
            <div className="animate-fade-up">
              {/* 事業者バー */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface mb-6">
                <div className="w-9 h-9 rounded-lg bg-accent-dim/40 flex items-center justify-center text-lg flex-shrink-0">
                  {bizInfo.icon}
                </div>
                <div>
                  <div className="text-sm font-medium text-fg">{bizInfo.name}</div>
                  <div className="text-xs text-muted leading-snug">{bizInfo.desc}</div>
                </div>
              </div>

              <p className="text-sm text-muted mb-4">どのようにAIスタッフを決めますか？</p>

              <div className="flex flex-col gap-3">
                {/* モードA */}
                <button
                  onClick={() => selectMode('defined')}
                  disabled={loading}
                  className="group text-left p-5 rounded-xl border border-border bg-surface hover:border-accent transition-all duration-200 disabled:opacity-40"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-xl flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                      🎯
                    </div>
                    <div>
                      <div className="text-sm font-medium text-fg mb-1">任せたい業務が決まっている</div>
                      <div className="text-xs text-muted leading-relaxed">やりたいことはある程度イメージできている。詳細をヒアリングして最適なスタッフを定義します。</div>
                    </div>
                  </div>
                </button>

                {/* モードB */}
                <button
                  onClick={() => selectMode('explore')}
                  disabled={loading}
                  className="group text-left p-5 rounded-xl border border-border bg-surface hover:border-accent transition-all duration-200 disabled:opacity-40"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-900/30 flex items-center justify-center text-xl flex-shrink-0 group-hover:bg-purple-900/50 transition-colors">
                      💡
                    </div>
                    <div>
                      <div className="text-sm font-medium text-fg mb-1">目的・課題から提案してほしい</div>
                      <div className="text-xs text-muted leading-relaxed">達成したいことや困っていることはある。何をAIに任せるべきか、Claudeが業務セットを提案します。</div>
                    </div>
                  </div>
                </button>
              </div>

              {loading && (
                <div className="mt-4 flex items-center gap-2 text-muted text-sm">
                  <span className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
                  ヒアリングを準備中...
                </div>
              )}
              {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
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
                <div className="flex-1">
                  <div className="text-sm font-medium text-fg">{bizInfo.name}</div>
                  <div className="text-xs text-muted leading-snug">{bizInfo.desc}</div>
                </div>
                {/* モードバッジ */}
                <div className={`text-xs px-2 py-1 rounded-full border flex-shrink-0 ${
                  mode === 'explore'
                    ? 'border-purple-700/50 text-purple-400 bg-purple-900/20'
                    : 'border-accent/30 text-accent bg-accent/10'
                }`}>
                  {mode === 'explore' ? '💡 提案型' : '🎯 業務型'}
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
                    <div className="max-w-xs px-4 py-2.5 rounded-2xl text-sm leading-relaxed border bg-surface border-border text-fg"
                      style={{ whiteSpace: 'pre-wrap' }}>
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
              {phase === 'chat' && chips.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {chips.map(c => (
                    <button key={c} onClick={() => sendMessage(c)}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-full border border-border text-muted text-xs hover:border-accent hover:text-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
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
                  onClick={() => {
                    setPhase('chat')
                    setMessages(prev => [...prev, { role: 'ai', text: 'どの部分を修正しますか？' }])
                    setHistory(prev => [...prev, { role: 'assistant', content: 'どの部分を修正しますか？' }])
                  }}
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
