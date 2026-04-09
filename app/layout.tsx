import type { Metadata } from 'next'
import { Noto_Sans_JP } from 'next/font/google'
import './globals.css'

const noto = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-noto',
})

export const metadata: Metadata = {
  title: 'AI Staff — デジタルスタッフ採用サービス',
  description: '質問に答えるだけで、自律型AIスタッフが生成されます。毎日自動でプランニング・実行・メール報告。',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${noto.variable} font-sans`}>{children}</body>
    </html>
  )
}
