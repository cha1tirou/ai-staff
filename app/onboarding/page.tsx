'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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

const ROLES = ['広報担当', '営業担当', 'インバウンド強化担当', 'カスタマーサポート', 'HR担当', '経理・財務', 'その他']
const TASKS = ['SNS管理', 'メール対応', 'レポート作成', '競合調査', '予約フォローアップ', 'Web検索・情報収集', 'スケジュール管理', 'ドキュメント作成']
const TOOLS = ['Gmail', 'Google Calendar', 'Notion', 'Slack', 'Googleスプレッドシート', 'Web検索']
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)

const STEPS = ['役割', '業務', 'ツール', '稼働設定', '連絡先']

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<FormData>({
    agentName: '',
    role: '',
    tasks: [],
    customTasks: '',
    tools: [],
    startHour: '09:00',
    endHour: '18:00',
    approvalMode: 'confirm',
    reportEmail: '',
    userName: '',
  })

  const toggleArray = (key: 'tasks' | 'tools', value: string) => {
    setForm(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value],
    }))
  }

  const canNext = () => {
    if (step === 0) return form.role && form.agentName
    if (step === 1) return form.tasks.length > 0 || form.customTasks
    if (step === 2) return true
    if (step === 3) return true
    if (step === 4) return form.reportEmail && form.userName
    return true
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '生成に失敗しました')
      router.push(`/complete?agentId=${data.agentId}&name=${encodeURIComponent(form.agentName)}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '予期せぬエラーが発生しました')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid-bg flex flex-col">
      {/* Header */}
      <header className="px-8 py-5 border-b border-border flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
            <span className="text-white text-xs font-bold">AI</span>
          </div>
          <span className="font-medium text-fg">AI Staff</span>
        </a>
        <div className="text-muted text-sm">{step + 1} / {STEPS.length}</div>
      </header>

      {/* Progress */}
      <div className="h-0.5 bg-border">
        <div
          className="h-full bg-accent transition-all duration-500 ease-out"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Step labels */}
      <div className="px-8 py-4 flex items-center gap-2 overflow-x-auto">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-xs ${i === step ? 'text-accent' : i < step ? 'text-muted' : 'text-border'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs border ${
                i === step ? 'border-accent text-accent bg-accent-dim/30' :
                i < step ? 'border-muted/50 text-muted bg-surface' :
                'border-border text-border'
              }`}>
                {i < step ? '✓' : i + 1}
              </span>
              <span className="whitespace-nowrap">{label}</span>
            </div>
            {i < STEPS.length - 1 && <span className="text-border text-xs">›</span>}
          </div>
        ))}
      </div>

      {/* Form */}
      <main className="flex-1 px-6 py-10 flex items-start justify-center">
        <div className="w-full max-w-xl">

          {/* Step 0: 役割 */}
          {step === 0 && (
            <div className="animate-fade-up">
              <h2 className="text-2xl font-light text-fg mb-2">どんな役割ですか？</h2>
              <p className="text-muted text-sm mb-8">AIスタッフの名前と役割を設定します。</p>

              <label className="block mb-6">
                <span className="text-muted text-xs mb-2 block">スタッフの名前</span>
                <input
                  type="text"
                  placeholder="例：プリシア広報 Ai"
                  value={form.agentName}
                  onChange={e => setForm(p => ({ ...p, agentName: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-fg placeholder-muted/50 focus:outline-none focus:border-accent text-sm"
                />
              </label>

              <label className="block mb-2">
                <span className="text-muted text-xs mb-3 block">役職・役割</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(role => (
                  <button
                    key={role}
                    onClick={() => setForm(p => ({ ...p, role }))}
                    className={`px-4 py-3 rounded-lg border text-sm text-left transition-all ${
                      form.role === role
                        ? 'border-accent bg-accent-dim/30 text-accent'
                        : 'border-border bg-surface text-muted hover:border-muted/50 hover:text-fg'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: 業務 */}
          {step === 1 && (
            <div className="animate-fade-up">
              <h2 className="text-2xl font-light text-fg mb-2">主な業務は？</h2>
              <p className="text-muted text-sm mb-8">複数選択可。詳細は自由記述でどうぞ。</p>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {TASKS.map(task => (
                  <button
                    key={task}
                    onClick={() => toggleArray('tasks', task)}
                    className={`px-4 py-3 rounded-lg border text-sm text-left transition-all ${
                      form.tasks.includes(task)
                        ? 'border-accent bg-accent-dim/30 text-accent'
                        : 'border-border bg-surface text-muted hover:border-muted/50 hover:text-fg'
                    }`}
                  >
                    {form.tasks.includes(task) && <span className="mr-1.5">✓</span>}
                    {task}
                  </button>
                ))}
              </div>

              <label className="block">
                <span className="text-muted text-xs mb-2 block">その他・詳しく教えてください（任意）</span>
                <textarea
                  rows={3}
                  placeholder="例：インバウンド向けに英語でのメディア対応を週2回やってほしい"
                  value={form.customTasks}
                  onChange={e => setForm(p => ({ ...p, customTasks: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-fg placeholder-muted/50 focus:outline-none focus:border-accent text-sm resize-none"
                />
              </label>
            </div>
          )}

          {/* Step 2: ツール */}
          {step === 2 && (
            <div className="animate-fade-up">
              <h2 className="text-2xl font-light text-fg mb-2">使うツールは？</h2>
              <p className="text-muted text-sm mb-8">エージェントが連携するサービスを選んでください。</p>

              <div className="grid grid-cols-2 gap-2">
                {TOOLS.map(tool => (
                  <button
                    key={tool}
                    onClick={() => toggleArray('tools', tool)}
                    className={`px-4 py-3 rounded-lg border text-sm text-left transition-all ${
                      form.tools.includes(tool)
                        ? 'border-accent bg-accent-dim/30 text-accent'
                        : 'border-border bg-surface text-muted hover:border-muted/50 hover:text-fg'
                    }`}
                  >
                    {form.tools.includes(tool) && <span className="mr-1.5">✓</span>}
                    {tool}
                  </button>
                ))}
              </div>

              <p className="text-muted text-xs mt-4">※ ツール連携は後からメールで追加・変更できます。</p>
            </div>
          )}

          {/* Step 3: 稼働設定 */}
          {step === 3 && (
            <div className="animate-fade-up">
              <h2 className="text-2xl font-light text-fg mb-2">稼働設定</h2>
              <p className="text-muted text-sm mb-8">いつ・どのように動かしますか？</p>

              <div className="flex gap-4 mb-8">
                <label className="flex-1">
                  <span className="text-muted text-xs mb-2 block">開始時刻</span>
                  <select
                    value={form.startHour}
                    onChange={e => setForm(p => ({ ...p, startHour: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-fg focus:outline-none focus:border-accent text-sm"
                  >
                    {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
                <label className="flex-1">
                  <span className="text-muted text-xs mb-2 block">終了時刻</span>
                  <select
                    value={form.endHour}
                    onChange={e => setForm(p => ({ ...p, endHour: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-fg focus:outline-none focus:border-accent text-sm"
                  >
                    {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
              </div>

              <label className="block mb-2">
                <span className="text-muted text-xs mb-3 block">判断に迷ったら？</span>
              </label>
              <div className="flex flex-col gap-3">
                {[
                  { value: 'confirm', label: 'メールで確認を取る', desc: '重要な判断はメールで確認してから実行' },
                  { value: 'auto', label: '自分で判断して報告', desc: '自律的に実行し、結果を日報で報告' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setForm(p => ({ ...p, approvalMode: opt.value as 'confirm' | 'auto' }))}
                    className={`px-5 py-4 rounded-lg border text-left transition-all ${
                      form.approvalMode === opt.value
                        ? 'border-accent bg-accent-dim/30'
                        : 'border-border bg-surface hover:border-muted/50'
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${form.approvalMode === opt.value ? 'text-accent' : 'text-fg'}`}>
                      {opt.label}
                    </div>
                    <div className="text-muted text-xs">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: 連絡先 */}
          {step === 4 && (
            <div className="animate-fade-up">
              <h2 className="text-2xl font-light text-fg mb-2">連絡先</h2>
              <p className="text-muted text-sm mb-8">毎日の報告メールを受け取るアドレスを入力してください。</p>

              <label className="block mb-4">
                <span className="text-muted text-xs mb-2 block">お名前</span>
                <input
                  type="text"
                  placeholder="宇野 想一郎"
                  value={form.userName}
                  onChange={e => setForm(p => ({ ...p, userName: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-fg placeholder-muted/50 focus:outline-none focus:border-accent text-sm"
                />
              </label>

              <label className="block mb-8">
                <span className="text-muted text-xs mb-2 block">報告先メールアドレス</span>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={form.reportEmail}
                  onChange={e => setForm(p => ({ ...p, reportEmail: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-fg placeholder-muted/50 focus:outline-none focus:border-accent text-sm"
                />
              </label>

              {/* Summary */}
              <div className="p-5 rounded-xl border border-border bg-surface">
                <div className="text-muted text-xs mb-3 font-medium">採用するスタッフの概要</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">名前</span>
                    <span className="text-fg">{form.agentName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">役割</span>
                    <span className="text-fg">{form.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">業務</span>
                    <span className="text-fg text-right max-w-48">{[...form.tasks].join(', ') || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">稼働</span>
                    <span className="text-fg">{form.startHour} 〜 {form.endHour}</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-4 rounded-lg border border-red-800/50 bg-red-900/20 text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-10">
            {step > 0 ? (
              <button
                onClick={() => setStep(s => s - 1)}
                className="px-5 py-3 rounded-lg border border-border text-muted text-sm hover:text-fg hover:border-muted/50 transition-colors"
              >
                ← 戻る
              </button>
            ) : <div />}

            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext()}
                className="px-6 py-3 rounded-lg bg-accent text-white text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                次へ →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canNext() || loading}
                className="px-8 py-3 rounded-lg bg-accent text-white text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    生成中...
                  </>
                ) : 'AIスタッフを採用する ✨'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
