import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

function isUrl(input: string): boolean {
  return /^https?:\/\//.test(input) || /^[\w-]+\.[\w.]+/.test(input)
}

function normalizeUrl(input: string): string {
  if (/^https?:\/\//.test(input)) return input
  return `https://${input}`
}

async function fetchSiteContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AI-Staff-Bot/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return ''
    const html = await res.text()
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000)
    return text
  } catch {
    return ''
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { input } = await req.json()
  if (!input) return NextResponse.json({ error: 'input is required' }, { status: 400 })

  let siteContent = ''
  if (isUrl(input)) {
    const url = normalizeUrl(input)
    siteContent = await fetchSiteContent(url)
  }

  const prompt = siteContent
    ? `以下のウェブサイトのコンテンツを元に事業者情報をJSONで返してください（日本語、JSONのみ）：\n\nURL: ${input}\nコンテンツ:\n${siteContent}\n\nJSON形式:\n{"name":"正式な会社・サービス名","type":"業種","description":"事業概要2〜3文","icon":"絵文字1文字"}`
    : `事業者「${input}」について以下をJSON形式で返してください（日本語、JSONのみ）：\n{"name":"正式名称または推測名称","type":"業種","description":"事業概要2〜3文","icon":"絵文字1文字"}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    system: 'JSONのみ返してください。前後の説明文は不要です。',
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  let info: any = {}
  try { info = JSON.parse(text.replace(/```json|```/g, '').trim()) } catch {}

  return NextResponse.json({ info, usedWebFetch: !!siteContent })
}
