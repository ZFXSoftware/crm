import { Router, Request, Response } from 'express'
import { getDb } from '../db/database'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authMiddleware)

router.get('/tasks', (req: AuthRequest, res: Response) => {
  const db = getDb()
  const { customer_id, deal_id, status, assigned_to } = req.query
  let sql = `SELECT t.*, u.name as assignee_name FROM tasks t LEFT JOIN auth_users u ON t.assigned_to = u.id WHERE 1=1`
  const params: Record<string, unknown> = {}
  if (customer_id) { sql += ' AND t.customer_id = @customer_id'; params.customer_id = customer_id }
  if (deal_id)     { sql += ' AND t.deal_id = @deal_id';         params.deal_id = deal_id }
  if (status && status !== 'all') { sql += ' AND t.status = @status'; params.status = status }
  if (assigned_to) { sql += ' AND t.assigned_to = @assigned_to'; params.assigned_to = assigned_to }
  sql += ' ORDER BY t.due_date ASC NULLS LAST'
  res.json(db.prepare(sql).all(params))
})

router.post('/tasks', (req: AuthRequest, res: Response) => {
  const db = getDb()
  const { title, due_date, customer_id, deal_id, assigned_to } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'title is required' })
  const result = db.prepare(
    'INSERT INTO tasks (title,due_date,customer_id,deal_id,assigned_to,created_by) VALUES (@title,@due_date,@customer_id,@deal_id,@assigned_to,@created_by)'
  ).run({ title: title.trim(), due_date: due_date ?? null, customer_id: customer_id ?? null, deal_id: deal_id ?? null, assigned_to: assigned_to ?? null, created_by: req.user!.id })
  res.status(201).json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid))
})

router.patch('/tasks/:id', (req: AuthRequest, res: Response) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Task not found' })
  const fields = ['title','due_date','status','assigned_to']
  const updates: string[] = []
  const params: Record<string, unknown> = { id: req.params.id }
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f} = @${f}`); params[f] = req.body[f] } }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' })
  db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = @id`).run(params)
  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id))
})

router.delete('/tasks/:id', (req: AuthRequest, res: Response) => {
  const r = getDb().prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id)
  if (!r.changes) return res.status(404).json({ error: 'Task not found' })
  res.json({ deleted: true })
})

export default router
