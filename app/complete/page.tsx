import Link from 'next/link'

export default function CompletePage({
  searchParams,
}: {
  searchParams: Promise<{ agentId?: string; name?: string }>
}) {
  return (
    <CompleteClient searchParams={searchParams} />
  )
}

async function CompleteClient({
  searchParams,
}: {
  searchParams: Promise<{ agentId?: string; name?: string }>
}) {
  const params = await searchParams
  const name = params.name ? decodeURIComponent(params.name) : 'AIスタッフ'
  const agentId = params.agentId ?? ''

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {/* Success icon */}
        <div className="w-20 h-20 rounded-full bg-accent-dim/30 border border-accent/30 flex items-center justify-center mx-auto mb-8">
          <span className="text-3xl">✨</span>
        </div>

        <h1 className="text-3xl font-light text-fg mb-3">
          <span className="font-bold text-accent">{name}</span> が<br />採用されました
        </h1>

        <p className="text-muted text-sm leading-relaxed mb-8">
          明日の朝から稼働開始します。<br />
          朝のプランメールをお待ちください。
        </p>

        {/* Agent ID */}
        {agentId && (
          <div className="p-4 rounded-xl border border-border bg-surface mb-8 text-left">
            <div className="text-muted text-xs mb-1">スタッフID</div>
            <div className="font-mono text-accent text-xs break-all">{agentId}</div>
          </div>
        )}

        {/* What happens next */}
        <div className="p-5 rounded-xl border border-border bg-surface text-left mb-8">
          <div className="text-muted text-xs font-medium mb-4">これから起きること</div>
          <div className="space-y-3">
            {[
              { time: '明日 朝', text: '最初のプランメールが届きます' },
              { time: '返信するだけ', text: 'OKと送ればタスクが始まります' },
              { time: 'いつでも', text: 'メールでミッションを変更・追加できます' },
            ].map((item) => (
              <div key={item.time} className="flex items-start gap-3">
                <div className="text-accent text-xs font-mono pt-0.5 whitespace-nowrap">{item.time}</div>
                <div className="text-fg text-sm">{item.text}</div>
              </div>
            ))}
          </div>
        </div>

        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-lg border border-border text-muted text-sm hover:text-fg hover:border-muted/50 transition-colors"
        >
          トップに戻る
        </Link>
      </div>
    </div>
  )
}
