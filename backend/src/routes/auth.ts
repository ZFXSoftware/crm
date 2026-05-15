import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database'
import { authMiddleware, requirePermission, AuthRequest } from '../middleware/auth'
import { logActivity } from '../lib/activity'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev_secret'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d'

function makeToken(userId: number) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as any)
}
function safeUser(u: any) {
  const { password_hash, invite_token, ...rest } = u
  return rest
}

// POST /auth/register — só funciona se não há nenhum usuário ainda
router.post('/register', (req: Request, res: Response) => {
  const db = getDb()
  const count = (db.prepare('SELECT COUNT(*) as c FROM auth_users').get() as any).c
  if (count > 0) return res.status(403).json({ error: 'Registration is closed. Use invite flow.' })
  const { name, email, password } = req.body
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password are required' })
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
  const hash = bcrypt.hashSync(password, 10)
  try {
    const result = db.prepare("INSERT INTO auth_users (name,email,password_hash,role,status) VALUES (?,?,?,'Admin','Active')").run(name, email, hash)
    const user = db.prepare('SELECT * FROM auth_users WHERE id = ?').get(result.lastInsertRowid) as any
    logActivity({ type: 'login', entity_type: 'user', entity_id: String(user.id), description: `Admin ${user.name} registered`, created_by: user.id })
    res.status(201).json({ token: makeToken(user.id), user: safeUser(user) })
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Email already in use' })
    throw e
  }
})

// POST /auth/login
router.post('/login', (req: Request, res: Response) => {
  const db = getDb()
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' })
  const user = db.prepare('SELECT * FROM auth_users WHERE email = ?').get(email) as any
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  if (user.status === 'Suspended') return res.status(403).json({ error: 'Account suspended. Contact your administrator.' })
  if (user.status === 'Invited' || user.status === 'Pending') return res.status(403).json({ error: 'Account not yet activated. Check your invite link.' })
  if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' })
  db.prepare("UPDATE auth_users SET last_seen = datetime('now') WHERE id = ?").run(user.id)
  logActivity({ type: 'login', entity_type: 'user', entity_id: String(user.id), description: `${user.name} logged in`, created_by: user.id })
  res.json({ token: makeToken(user.id), user: safeUser(user) })
})

// GET /auth/me
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = getDb().prepare('SELECT * FROM auth_users WHERE id = ?').get(req.user!.id) as any
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(safeUser(user))
})

// POST /auth/invite — requer permissão manage_users
router.post('/invite', authMiddleware, requirePermission('manage_users'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const { name, email, role } = req.body
  if (!name || !email || !role) return res.status(400).json({ error: 'name, email and role are required' })
  const token = uuidv4()
  const placeholder = bcrypt.hashSync(uuidv4(), 4)
  try {
    const result = db.prepare("INSERT INTO auth_users (name,email,password_hash,role,status,invite_token) VALUES (?,?,?,?,'Invited',?)").run(name, email, placeholder, role, token)
    const user = db.prepare('SELECT * FROM auth_users WHERE id = ?').get(result.lastInsertRowid) as any
    logActivity({ type: 'invite', entity_type: 'user', entity_id: String(user.id), description: `${req.user!.name} invited ${name} as ${role}`, created_by: req.user!.id })
    res.status(201).json({
      user: safeUser(user),
      invite_link: `${process.env.CORS_ORIGIN ?? 'http://localhost:5173'}/activate?token=${token}`,
    })
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Email already in use' })
    throw e
  }
})

// POST /auth/activate
router.post('/activate', (req: Request, res: Response) => {
  const db = getDb()
  const { token, password } = req.body
  if (!token || !password) return res.status(400).json({ error: 'token and password are required' })
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
  const user = db.prepare('SELECT * FROM auth_users WHERE invite_token = ?').get(token) as any
  if (!user) return res.status(404).json({ error: 'Invalid or expired invite token' })
  db.prepare("UPDATE auth_users SET password_hash=?,status='Active',invite_token=NULL WHERE id=?").run(bcrypt.hashSync(password, 10), user.id)
  logActivity({ type: 'login', entity_type: 'user', entity_id: String(user.id), description: `${user.name} activated account`, created_by: user.id })
  res.json({ token: makeToken(user.id), user: safeUser({ ...user, status: 'Active', invite_token: null }) })
})

// PATCH /auth/me
router.patch('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb()
  const { name, password } = req.body
  const updates: string[] = []
  const params: any[] = []
  if (name) { updates.push('name = ?'); params.push(name) }
  if (password) {
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
    updates.push('password_hash = ?'); params.push(bcrypt.hashSync(password, 10))
  }
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' })
  params.push(req.user!.id)
  db.prepare(`UPDATE auth_users SET ${updates.join(', ')} WHERE id = ?`).run(...params)
  res.json(safeUser(db.prepare('SELECT * FROM auth_users WHERE id = ?').get(req.user!.id)))
})

export default router
