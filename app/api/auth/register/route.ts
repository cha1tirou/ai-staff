import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createUser, getUserByEmail, initDB } from '@/lib/db'
import { createSession, COOKIE_NAME } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    await initDB()
    const { email, password, name } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'メールアドレスとパスワードは必須です' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'パスワードは8文字以上にしてください' }, { status: 400 })
    }

    const existing = await getUserByEmail(email)
    if (existing) {
      return NextResponse.json({ error: 'このメールアドレスは既に登録されています' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await createUser(email, passwordHash, name)
    const token = await createSession(user.id, user.email)

    const res = NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.name } })
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30日
    })
    return res
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '登録に失敗しました' }, { status: 500 })
  }
}
