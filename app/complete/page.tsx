'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type Step = {
  id: string
  label: string
  sublabel: string
  status: 'waiting' | 'running' | 'done' | 'error'
}

function CompleteContent() {
  const params = useSearchParams()
  const router = useRouter()
  const name = params.get('name') ? decodeURIComponent(params.get('name')!) : 'AIスタッフ'
  const bizName = params.get('bizName') ? decodeURIComponent(params.get('bizName')!) : '事業者'
  const orchestratorName = `${bizName} AI本部`

  const [steps, setSteps] = useState<Step[]>([
    { id: 'sub',   label: name, sublabel: 'サブエージェント', status: 'waiting' },
    { id: 'orch',  label: orchestratorName, sublabel: 'オーケストレーター', status: 'waiting' },
    { id: 'link',  label: '組織を構成中', sublabel: '接続・権限設定', status: 'waiting' },
  ])
  const [phase, setPhase] = useState<'building' | 'done'>('building')
  const [lineProgress, setLineProgress] = useState(0)
  const ran = useRef(false)

  function updateStep(id: string, status: Step['status']) {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s))
  }

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    async function animate() {
      await delay(400)
      updateStep('sub', 'running')
      await delay(900)
      updateStep('sub', 'done')

      await delay(300)
      updateStep('orch', 'running')
      await delay(1100)
      updateStep('orch', 'done')

      await delay(200)
      updateStep('link', 'running')
      // 接続ラインアニメーション
      for (let i = 0; i <= 100; i += 4) {
        setLineProgress(i)
        await delay(18)
      }
      updateStep('link', 'done')

      await delay(500)
      setPhase('done')
    }

    animate()
  }, [])

  const subDone  = steps[0].status === 'done'
  const orchDone = steps[1].status === 'done'
  const linkDone = steps[2].status === 'done'

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full">

        {/* 構成図 */}
        <div className="mb-8">
          <p className="text-center text-muted text-xs mb-6 tracking-wide uppercase">
            {phase === 'building' ? 'AIスタッフを組織しています...' : 'セットアップ完了'}
          </p>

          {/* SVG構成図 */}
          <div className="relative">
            <svg viewBox="0 0 400 260" className="w-full" xmlns="http://www.w3.org/2000/svg">

              {/* 接続ライン（オーケストレーター → サブ） */}
              <line x1="200" y1="90" x2="200" y2="170"
                stroke="#334155" strokeWidth="1.5" strokeDasharray="4 3" />
              {/* アニメーションライン */}
              <line x1="200" y1="90" x2="200" y2="170"
                stroke="#3b82f6" strokeWidth="2"
                strokeDasharray={`${lineProgress * 0.8} 200`}
                style={{ transition: 'stroke-dasharray 0.05s linear' }} />

              {/* オーケストレーターノード */}
              <g transform="translate(200, 60)">
                <rect x="-90" y="-28" width="180" height="56"
                  rx="10"
                  fill={orchDone ? '#1e3a5f' : '#1e293b'}
                  stroke={orchDone ? '#3b82f6' : '#334155'}
                  strokeWidth={orchDone ? '1.5' : '1'}
                  style={{ transition: 'all 0.4s ease' }}
                />
                <text x="0" y="-6" textAnchor="middle" fill={orchDone ? '#93c5fd' : '#64748b'}
                  fontSize="10" fontWeight="500" style={{ transition: 'fill 0.4s' }}>
                  ORCHESTRATOR
                </text>
                <text x="0" y="12" textAnchor="middle" fill={orchDone ? '#e2e8f0' : '#94a3b8'}
                  fontSize="13" fontWeight="600" style={{ transition: 'fill 0.4s' }}>
                  {orchestratorName}
                </text>
                {/* スピナー or チェック */}
                {steps[1].status === 'running' && (
                  <circle cx="72" cy="-8" r="5" fill="none" stroke="#3b82f6" strokeWidth="1.5"
                    strokeDasharray="20 10">
                    <animateTransform attributeName="transform" type="rotate"
                      from="0 72 -8" to="360 72 -8" dur="0.8s" repeatCount="indefinite" />
                  </circle>
                )}
                {orchDone && (
                  <text x="72" y="-4" textAnchor="middle" fill="#4ade80" fontSize="11">✓</text>
                )}
              </g>

              {/* サブエージェントノード */}
              <g transform="translate(200, 200)">
                <rect x="-75" y="-28" width="150" height="56"
                  rx="8"
                  fill={subDone ? '#14532d' : '#1e293b'}
                  stroke={subDone ? '#16a34a' : '#334155'}
                  strokeWidth={subDone ? '1.5' : '1'}
                  style={{ transition: 'all 0.4s ease' }}
                />
                <text x="0" y="-6" textAnchor="middle" fill={subDone ? '#86efac' : '#64748b'}
                  fontSize="10" fontWeight="500" style={{ transition: 'fill 0.4s' }}>
                  SUB AGENT
                </text>
                <text x="0" y="12" textAnchor="middle" fill={subDone ? '#e2e8f0' : '#94a3b8'}
                  fontSize="13" fontWeight="600" style={{ transition: 'fill 0.4s' }}>
                  {name}
                </text>
                {steps[0].status === 'running' && (
                  <circle cx="57" cy="-8" r="5" fill="none" stroke="#16a34a" strokeWidth="1.5"
                    strokeDasharray="20 10">
                    <animateTransform attributeName="transform" type="rotate"
                      from="0 57 -8" to="360 57 -8" dur="0.8s" repeatCount="indefinite" />
                  </circle>
                )}
                {subDone && (
                  <text x="57" y="-4" textAnchor="middle" fill="#4ade80" fontSize="11">✓</text>
                )}
              </g>

              {/* 接続完了バッジ */}
              {linkDone && (
                <g transform="translate(200, 130)">
                  <rect x="-36" y="-11" width="72" height="22" rx="11"
                    fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1" />
                  <text x="0" y="4" textAnchor="middle" fill="#93c5fd" fontSize="9" fontWeight="600">
                    接続完了
                  </text>
                </g>
              )}

            </svg>
          </div>

          {/* ステップリスト */}
          <div className="space-y-2 mt-2">
            {steps.map(step => (
              <div key={step.id} className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-surface border border-border">
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {step.status === 'waiting' && <span className="w-2 h-2 rounded-full bg-border" />}
                  {step.status === 'running' && (
                    <span className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
                  )}
                  {step.status === 'done' && <span className="text-green-400 text-sm">✓</span>}
                  {step.status === 'error' && <span className="text-red-400 text-sm">✗</span>}
                </div>
                <div className="flex-1">
                  <span className={`text-sm ${step.status === 'done' ? 'text-fg' : 'text-muted'}`}>
                    {step.label}
                  </span>
                  <span className="text-xs text-muted/60 ml-2">{step.sublabel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 完了後の表示 */}
        {phase === 'done' && (
          <div className="animate-fade-up text-center">
            <h1 className="text-2xl font-light text-fg mb-2">
              <span className="font-bold text-accent">{orchestratorName}</span> が<br />
              稼働を開始しました
            </h1>
            <p className="text-muted text-sm mb-6">
              {name}がチームに加わりました。<br />
              ダッシュボードから指示を出せます。
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-8 py-3 rounded-lg bg-accent text-white text-sm font-medium hover:bg-blue-500 transition-colors"
            >
              ダッシュボードで確認 →
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

export default function CompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid-bg flex items-center justify-center"><span className="text-muted text-sm">読み込み中...</span></div>}>
      <CompleteContent />
    </Suspense>
  )
}
