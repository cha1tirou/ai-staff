import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen grid-bg flex flex-col">
      {/* Header */}
      <header className="px-8 py-6 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
            <span className="text-white text-xs font-bold">AI</span>
          </div>
          <span className="font-medium tracking-wide text-fg">AI Staff</span>
        </div>
        <nav className="flex items-center gap-8 text-sm text-muted">
          <a href="#how" className="hover:text-fg transition-colors">使い方</a>
          <a href="#price" className="hover:text-fg transition-colors">料金</a>
          <Link href="/onboarding" className="px-4 py-2 rounded-md bg-accent text-white text-sm font-medium hover:bg-blue-500 transition-colors">
            無料で試す
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent-dim bg-accent-dim/30 text-accent text-xs font-medium mb-8 animate-fade-up animate-fade-up-1">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          パブリックベータ公開中
        </div>

        <h1 className="text-5xl md:text-7xl font-light leading-tight text-fg max-w-3xl mb-6 animate-fade-up animate-fade-up-2">
          AIスタッフを<br />
          <span className="font-bold text-accent">採用</span>する
        </h1>

        <p className="text-lg text-muted max-w-xl leading-relaxed mb-10 animate-fade-up animate-fade-up-3">
          5つの質問に答えるだけ。<br />
          毎日メールで報告・実行する自律型デジタル従業員が生まれます。
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-up animate-fade-up-4">
          <Link
            href="/onboarding"
            className="px-8 py-4 rounded-lg bg-accent text-white font-medium text-base hover:bg-blue-500 transition-colors shadow-lg shadow-accent/20"
          >
            スタッフを採用する →
          </Link>
          <a href="#how" className="text-muted text-sm hover:text-fg transition-colors">
            どんな仕事をするの？
          </a>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="px-6 py-24 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-light text-center text-fg mb-16">
            <span className="font-bold">毎日</span>こんな動きをします
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                time: '09:00',
                title: '朝のプランメール',
                desc: '今日やることをメールで報告。OKを返信するだけで動き始めます。',
              },
              {
                time: '日中',
                title: '自律実行',
                desc: 'メール対応・リサーチ・SNS投稿など、承認されたタスクを順次こなします。',
              },
              {
                time: '18:00',
                title: '夕方の日報',
                desc: '今日の実績と明日の提案をメールで送ります。',
              },
            ].map((item) => (
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
      <section className="px-6 py-20 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-light text-center text-fg mb-12">
            こんなスタッフが作れます
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { role: '広報担当', tasks: 'SNS投稿 / メディア対応 / プレスリリース作成' },
              { role: '営業担当', tasks: 'リード管理 / 提案書作成 / フォローメール' },
              { role: 'インバウンド強化担当', tasks: '英語対応 / 海外メディアリサーチ / 翻訳' },
              { role: 'カスタマーサポート', tasks: '問い合わせ分類 / FAQ更新 / 返信下書き' },
            ].map((item) => (
              <div key={item.role} className="flex items-start gap-4 p-5 rounded-xl border border-border bg-surface hover:border-accent/30 transition-colors">
                <div className="w-8 h-8 rounded-md bg-accent-dim flex items-center justify-center text-accent text-xs font-bold shrink-0">
                  AI
                </div>
                <div>
                  <div className="text-fg font-medium text-sm mb-1">{item.role}</div>
                  <div className="text-muted text-xs">{item.tasks}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="price" className="px-6 py-24 border-t border-border">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-light text-fg mb-4">シンプルな料金</h2>
          <p className="text-muted text-sm mb-12">月30万円の社員より、ずっと安く。</p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-8 rounded-xl border border-border bg-surface text-left">
              <div className="text-muted text-sm mb-2">スタータープラン</div>
              <div className="text-4xl font-light text-fg mb-1">¥29,800<span className="text-muted text-lg">/月</span></div>
              <div className="text-muted text-xs mb-6">AIスタッフ 1名</div>
              <Link href="/onboarding" className="block text-center px-4 py-3 rounded-lg border border-accent text-accent text-sm hover:bg-accent hover:text-white transition-colors">
                採用する
              </Link>
            </div>
            <div className="p-8 rounded-xl border border-accent/40 bg-accent-dim/20 text-left">
              <div className="text-accent text-sm mb-2">チームプラン</div>
              <div className="text-4xl font-light text-fg mb-1">¥98,000<span className="text-muted text-lg">/月</span></div>
              <div className="text-muted text-xs mb-6">AIスタッフ 5名まで</div>
              <Link href="/onboarding" className="block text-center px-4 py-3 rounded-lg bg-accent text-white text-sm hover:bg-blue-500 transition-colors">
                採用する
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-6 border-t border-border text-center text-muted text-xs">
        © 2026 AI Staff. Powered by Claude Managed Agents.
      </footer>
    </main>
  )
}
