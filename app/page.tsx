import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function Home() {
  // ログイン済みならダッシュボードへ
  const session = await getSession()
  if (session) redirect('/dashboard')

  return (
    <main className="min-h-screen grid-bg flex flex-col">
      {/* Header */}
      <header className="px-8 py-6 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
            <span className="text-white text-xs font-bold">AI</span>
          </div>
          <span className="font-medium tracking-wide text-fg">AI Staff</span>
          <span className="text-xs text-muted bg-surface px-2 py-0.5 rounded border border-border ml-1">社内専用</span>
        </div>
        <Link href="/auth" className="px-4 py-2 rounded-md bg-accent text-white text-sm font-medium hover:bg-blue-500 transition-colors">
          ログイン / 登録
        </Link>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent-dim bg-accent-dim/30 text-accent text-xs font-medium mb-8 animate-fade-up animate-fade-up-1">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          UNO-HOLDINGS 社内システム
        </div>

        <h1 className="text-5xl md:text-7xl font-light leading-tight text-fg max-w-3xl mb-6 animate-fade-up animate-fade-up-2">
          AIスタッフを<br />
          <span className="font-bold text-accent">採用</span>する
        </h1>

        <p className="text-lg text-muted max-w-xl leading-relaxed mb-10 animate-fade-up animate-fade-up-3">
          5つの質問に答えるだけ。<br />
          毎日メールで報告・実行する自律型デジタルスタッフが生まれます。
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-up animate-fade-up-4">
          <Link
            href="/auth"
            className="px-8 py-4 rounded-lg bg-accent text-white font-medium text-base hover:bg-blue-500 transition-colors shadow-lg shadow-accent/20"
          >
            はじめる →
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-light text-center text-fg mb-12">
            <span className="font-bold">毎日</span>こんな動きをします
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { time: '09:00', title: '朝のプランメール', desc: '今日やることをメールで報告。OKを返信するだけで動き始めます。' },
              { time: '日中', title: '自律実行', desc: 'メール対応・リサーチ・資料作成など、承認されたタスクを順次こなします。' },
              { time: '18:00', title: '夕方の日報', desc: '今日の実績と明日の提案をメールで送ります。' },
            ].map(item => (
              <div key={item.time} className="p-6 rounded-xl border border-border bg-surface">
                <div className="text-accent text-sm font-mono mb-3">{item.time}</div>
                <h3 className="text-fg font-medium mb-2">{item.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="px-6 py-16 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-light text-center text-fg mb-10">作れるスタッフの例</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { role: 'プリシア広報担当', tasks: 'SNS投稿 / メディア対応 / プレスリリース' },
              { role: 'カンダツ営業担当', tasks: 'リード管理 / 提案書作成 / フォローメール' },
              { role: 'インバウンド強化担当', tasks: '英語対応 / 海外メディアリサーチ / 翻訳' },
              { role: 'カスタマーサポート', tasks: '問い合わせ分類 / FAQ更新 / 返信下書き' },
            ].map(item => (
              <div key={item.role} className="flex items-start gap-4 p-5 rounded-xl border border-border bg-surface hover:border-accent/30 transition-colors">
                <div className="w-8 h-8 rounded-md bg-accent-dim flex items-center justify-center text-accent text-xs font-bold shrink-0">AI</div>
                <div>
                  <div className="text-fg font-medium text-sm mb-1">{item.role}</div>
                  <div className="text-muted text-xs">{item.tasks}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 border-t border-border text-center">
        <h2 className="text-2xl font-light text-fg mb-4">はじめましょう</h2>
        <p className="text-muted text-sm mb-6">アカウントを作成してAIスタッフを採用できます</p>
        <Link href="/auth" className="inline-block px-8 py-3 rounded-lg bg-accent text-white font-medium hover:bg-blue-500 transition-colors">
          アカウントを作成 →
        </Link>
      </section>

      <footer className="px-8 py-5 border-t border-border text-center text-muted text-xs">
        © 2026 UNO-HOLDINGS · AI Staff 社内管理システム
      </footer>
    </main>
  )
}
