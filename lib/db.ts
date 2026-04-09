import postgres from 'postgres'

let sql: ReturnType<typeof postgres>

function getDB() {
  if (!sql) {
    sql = postgres(process.env.DATABASE_URL ?? process.env.POSTGRES_URL!, { ssl: 'require', max: 5 })
  }
  return sql
}

export async function initDB() {
  const db = getDB()
  await db`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await db`
    CREATE TABLE IF NOT EXISTS agents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      tasks TEXT[],
      custom_tasks TEXT,
      tools TEXT[],
      start_hour TEXT DEFAULT '09:00',
      end_hour TEXT DEFAULT '18:00',
      approval_mode TEXT DEFAULT 'confirm',
      report_email TEXT,
      managed_agent_id TEXT,
      environment_id TEXT,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

export async function createUser(email: string, passwordHash: string, name?: string) {
  const db = getDB()
  const [user] = await db`
    INSERT INTO users (email, password_hash, name)
    VALUES (${email}, ${passwordHash}, ${name ?? null})
    RETURNING id, email, name, created_at
  `
  return user
}

export async function getUserByEmail(email: string) {
  const db = getDB()
  const [user] = await db`
    SELECT id, email, password_hash, name FROM users WHERE email = ${email}
  `
  return user ?? null
}

export async function getUserById(id: string) {
  const db = getDB()
  const [user] = await db`
    SELECT id, email, name, created_at FROM users WHERE id = ${id}
  `
  return user ?? null
}

export async function createAgent(userId: string, data: {
  name: string, role: string, tasks: string[], customTasks: string,
  tools: string[], startHour: string, endHour: string,
  approvalMode: string, reportEmail: string,
  managedAgentId?: string, environmentId?: string
}) {
  const db = getDB()
  const [agent] = await db`
    INSERT INTO agents (user_id, name, role, tasks, custom_tasks, tools, start_hour, end_hour, approval_mode, report_email, managed_agent_id, environment_id)
    VALUES (${userId}, ${data.name}, ${data.role}, ${data.tasks}, ${data.customTasks}, ${data.tools}, ${data.startHour}, ${data.endHour}, ${data.approvalMode}, ${data.reportEmail}, ${data.managedAgentId ?? null}, ${data.environmentId ?? null})
    RETURNING *
  `
  return agent
}

export async function getAgentsByUser(userId: string) {
  const db = getDB()
  return await db`
    SELECT * FROM agents WHERE user_id = ${userId} ORDER BY created_at DESC
  `
}

export async function deleteAgent(agentId: string, userId: string) {
  const db = getDB()
  await db`
    DELETE FROM agents WHERE id = ${agentId} AND user_id = ${userId}
  `
}

export async function updateAgentStatus(agentId: string, userId: string, status: string) {
  const db = getDB()
  const [agent] = await db`
    UPDATE agents SET status = ${status} WHERE id = ${agentId} AND user_id = ${userId} RETURNING *
  `
  return agent
}
