import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getUserByEmail, initDB } from '@/lib/db'
import { createSession, COOKIE_NAME } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    await initDB()
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'メールアドレスとパスワードを入力してください' }, { status: 400 })
    }

    const user = await getUserByEmail(email)
    if (!user) {
      return NextResponse.json({ error: 'メールアドレスまたはパスワードが正しくありません' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'メールアドレスまたはパスワードが正しくありません' }, { status: 401 })
    }

    const token = await createSession(user.id, user.email)
    const res = NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.name } })
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    })
    return res
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'ログインに失敗しました' }, { status: 500 })
  }
}
