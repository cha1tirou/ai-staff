import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'ai-staff-secret-key-change-in-production'
)
const COOKIE_NAME = 'ai-staff-session'

export async function createSession(userId: string, email: string) {
  const token = await new SignJWT({ userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(SECRET)
  return token
}

export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as { userId: string; email: string }
  } catch {
    return null
  }
}

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySession(token)
}

export { COOKIE_NAME }
