import { Router, Request, Response } from 'express'
import { getDb } from '../db/database'
import { authMiddleware, requirePermission, requireRole, AuthRequest } from '../middleware/auth'
import { logActivity } from '../lib/activity'

const router = Router()
router.use(authMiddleware)

// ── Users ─────────────────────────────────────────────────
// Listagem: manage_users OU Admin
router.get('/users', requirePermission('manage_users'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const { role, status } = req.query
  let sql = 'SELECT id,name,email,role,status,last_seen,created_at FROM auth_users WHERE 1=1'
  const params: Record<string, unknown> = {}
  if (role && role !== 'all') { sql += ' AND role = @role'; params.role = role }
  if (status && status !== 'all') { sql += ' AND status = @status'; params.status = status }
  sql += ' ORDER BY created_at ASC'
  res.json(db.prepare(sql).all(params))
})

router.patch('/users/:id', requirePermission('manage_users'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const targetId = req.params.id

  // Impede admin de suspender a si mesmo
  if (String(req.user!.id) === targetId && req.body.status === 'Suspended') {
    return res.status(400).json({ error: 'You cannot suspend your own account' })
  }

  const target = db.prepare('SELECT id,role FROM auth_users WHERE id = ?').get(targetId) as any
  if (!target) return res.status(404).json({ error: 'User not found' })

  // Apenas Admin pode alterar role de outros usuários
  if (req.body.role !== undefined && req.user!.role !== 'Admin') {
    return res.status(403).json({ error: 'Only Admins can change roles' })
  }

  const { name, role, status } = req.body
  const updates: string[] = []
  const params: Record<string, unknown> = { id: targetId }
  if (name !== undefined) { updates.push('name = @name'); params.name = name }
  if (role !== undefined) { updates.push('role = @role'); params.role = role }
  if (status !== undefined) { updates.push('status = @status'); params.status = status }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' })

  db.prepare(`UPDATE auth_users SET ${updates.join(', ')} WHERE id = @id`).run(params)
  logActivity({ type: 'invite', entity_type: 'user', entity_id: targetId, description: `User #${req.user!.id} updated user #${targetId}`, created_by: req.user!.id })
  res.json(db.prepare('SELECT id,name,email,role,status,last_seen FROM auth_users WHERE id = ?').get(targetId))
})

router.delete('/users/:id', requireRole('Admin'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  if (String(req.user!.id) === req.params.id) return res.status(400).json({ error: 'Cannot delete yourself' })
  const r = db.prepare('DELETE FROM auth_users WHERE id = ?').run(req.params.id)
  if (!r.changes) return res.status(404).json({ error: 'User not found' })
  res.json({ deleted: true })
})

// ── Permissions ───────────────────────────────────────────
router.get('/permissions', requireRole('Admin'), (_req, res: Response) => {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM permissions ORDER BY role, permission_key').all() as any[]
  const matrix: Record<string, Record<string, boolean>> = {}
  for (const r of rows) {
    if (!matrix[r.role]) matrix[r.role] = {}
    matrix[r.role][r.permission_key] = Boolean(r.enabled)
  }
  res.json(matrix)
})

router.patch('/permissions', requireRole('Admin'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const { role, permission_key, enabled } = req.body
  if (!role || !permission_key || enabled === undefined) return res.status(400).json({ error: 'Missing fields' })
  db.prepare('INSERT INTO permissions (role,permission_key,enabled) VALUES (@role,@permission_key,@enabled) ON CONFLICT(role,permission_key) DO UPDATE SET enabled=@enabled')
    .run({ role, permission_key, enabled: enabled ? 1 : 0 })
  res.json({ role, permission_key, enabled })
})

router.put('/permissions/:role', requireRole('Admin'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const upsert = db.prepare('INSERT INTO permissions (role,permission_key,enabled) VALUES (@role,@permission_key,@enabled) ON CONFLICT(role,permission_key) DO UPDATE SET enabled=@enabled')
  db.transaction(() => {
    for (const [key, val] of Object.entries(req.body))
      upsert.run({ role: req.params.role, permission_key: key, enabled: val ? 1 : 0 })
  })()
  const rows = db.prepare('SELECT * FROM permissions WHERE role = ?').all(req.params.role) as any[]
  const result: Record<string, boolean> = {}
  for (const r of rows) result[r.permission_key] = Boolean(r.enabled)
  res.json({ role: req.params.role, permissions: result })
})

// ── Settings ──────────────────────────────────────────────
router.get('/settings', requireRole('Admin'), (_req, res: Response) => {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM settings').all() as any[]
  const out: Record<string, string> = {}
  for (const r of rows) out[r.key] = r.value
  res.json(out)
})

router.patch('/settings', requireRole('Admin'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const upsert = db.prepare('INSERT INTO settings (key,value) VALUES (@key,@value) ON CONFLICT(key) DO UPDATE SET value=@value')
  db.transaction(() => { for (const [k, v] of Object.entries(req.body)) upsert.run({ key: k, value: String(v) }) })()
  const rows = db.prepare('SELECT * FROM settings').all() as any[]
  const out: Record<string, string> = {}
  for (const r of rows as any[]) out[r.key] = r.value
  res.json(out)
})

// ── Activities (audit log) ────────────────────────────────
router.get('/activities', requirePermission('manage_users'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const { entity_type, entity_id, limit = 100 } = req.query
  let sql = `SELECT a.*, u.name as user_name FROM activities a LEFT JOIN auth_users u ON a.created_by = u.id WHERE 1=1`
  const params: Record<string, unknown> = {}
  if (entity_type) { sql += ' AND a.entity_type = @entity_type'; params.entity_type = entity_type }
  if (entity_id) { sql += ' AND a.entity_id = @entity_id'; params.entity_id = entity_id }
  sql += ' ORDER BY a.created_at DESC LIMIT @limit'
  params.limit = Number(limit)
  res.json(db.prepare(sql).all(params))
})

export default router
