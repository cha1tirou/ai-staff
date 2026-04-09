'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', password: '', name: '' })

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'エラーが発生しました')
      router.push('/dashboard')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center">
            <span className="text-white text-xs font-bold">AI</span>
          </div>
          <span className="font-medium text-fg">AI Staff</span>
          <span className="ml-auto text-xs text-muted bg-surface px-2 py-0.5 rounded border border-border">社内専用</span>
        </div>

        <div className="p-8 rounded-2xl border border-border bg-surface">
          <h1 className="text-xl font-medium text-fg mb-1">
            {mode === 'login' ? 'ログイン' : 'アカウント作成'}
          </h1>
          <p className="text-muted text-sm mb-6">
            {mode === 'login' ? 'AIスタッフ管理画面にアクセス' : '社内アカウントを作成'}
          </p>

          <div className="space-y-3">
            {mode === 'register' && (
              <label className="block">
                <span className="text-muted text-xs mb-1.5 block">お名前</span>
                <input
                  type="text"
                  placeholder="宇野 想一郎"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg bg-bg border border-border text-fg placeholder-muted/40 focus:outline-none focus:border-accent text-sm"
                />
              </label>
            )}

            <label className="block">
              <span className="text-muted text-xs mb-1.5 block">メールアドレス</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full px-4 py-3 rounded-lg bg-bg border border-border text-fg placeholder-muted/40 focus:outline-none focus:border-accent text-sm"
              />
            </label>

            <label className="block">
              <span className="text-muted text-xs mb-1.5 block">パスワード{mode === 'register' && '（8文字以上）'}</span>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full px-4 py-3 rounded-lg bg-bg border border-border text-fg placeholder-muted/40 focus:outline-none focus:border-accent text-sm"
              />
            </label>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-900/20 border border-red-800/40 text-red-400 text-xs">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !form.email || !form.password}
            className="w-full mt-5 py-3 rounded-lg bg-accent text-white text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
          >
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {mode === 'login' ? 'ログイン' : 'アカウントを作成'}
          </button>

          <p className="text-center text-muted text-xs mt-4">
            {mode === 'login' ? (
              <>アカウントをお持ちでない方は{' '}
                <button onClick={() => { setMode('register'); setError('') }} className="text-accent hover:underline">新規登録</button>
              </>
            ) : (
              <>既にアカウントをお持ちの方は{' '}
                <button onClick={() => { setMode('login'); setError('') }} className="text-accent hover:underline">ログイン</button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
