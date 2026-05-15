import { Router, Request, Response } from 'express'
import { getDb } from '../db/database'
import { authMiddleware, requirePermission, AuthRequest } from '../middleware/auth'
import { logActivity } from '../lib/activity'

const router = Router()
router.use(authMiddleware)

router.get('/', requirePermission('view_sales'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const { plan, status, search, minMrr } = req.query
  let sql = 'SELECT * FROM customers WHERE 1=1'
  const params: Record<string, unknown> = {}
  if (plan && plan !== 'all') { sql += ' AND plan = @plan'; params.plan = plan }
  if (status && status !== 'all') { sql += ' AND status = @status'; params.status = status }
  if (minMrr) { sql += ' AND mrr >= @minMrr'; params.minMrr = Number(minMrr) }
  if (search) {
    sql += ' AND (LOWER(name) LIKE @search OR LOWER(email) LIKE @search OR LOWER(company) LIKE @search)'
    params.search = `%${String(search).toLowerCase()}%`
  }
  sql += ' ORDER BY created_at DESC'
  res.json(db.prepare(sql).all(params))
})

router.get('/:id', requirePermission('view_sales'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id)
  if (!customer) return res.status(404).json({ error: 'Customer not found' })
  const deals = db.prepare('SELECT * FROM deals WHERE customer_id = ? ORDER BY created_at DESC').all(req.params.id)
  const contacts = db.prepare('SELECT * FROM contacts WHERE customer_id = ? ORDER BY created_at DESC').all(req.params.id)
  const tasks = db.prepare('SELECT * FROM tasks WHERE customer_id = ? ORDER BY due_date ASC').all(req.params.id)
  const activities = db.prepare("SELECT * FROM activities WHERE entity_type='customer' AND entity_id=? ORDER BY created_at DESC LIMIT 50").all(req.params.id)
  res.json({ ...customer, deals, contacts, tasks, activities })
})

router.post('/', requirePermission('edit_sales'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const { name, email, company, plan, status, mrr, notes } = req.body
  if (!name || !email || !company || !plan || !status) return res.status(400).json({ error: 'Missing required fields' })
  const id = `CUS-${Math.floor(1000 + Math.random() * 9000)}`
  db.prepare('INSERT INTO customers (id,name,email,company,plan,status,mrr,notes,last_contact) VALUES (@id,@name,@email,@company,@plan,@status,@mrr,@notes,\'Today\')')
    .run({ id, name, email, company, plan, status, mrr: mrr ?? 0, notes: notes ?? '' })
  logActivity({ type: 'customer_create', entity_type: 'customer', entity_id: id, description: `Created customer ${name}`, created_by: req.user!.id })
  res.status(201).json(db.prepare('SELECT * FROM customers WHERE id = ?').get(id))
})

router.patch('/:id', requirePermission('edit_sales'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id) as any
  if (!existing) return res.status(404).json({ error: 'Customer not found' })
  const fields = ['name','email','company','plan','status','mrr','last_contact','notes']
  const updates: string[] = []
  const params: Record<string, unknown> = { id: req.params.id }
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = @${f}`); params[f] = req.body[f] }
  }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' })
  db.prepare(`UPDATE customers SET ${updates.join(', ')} WHERE id = @id`).run(params)
  logActivity({ type: 'customer_update', entity_type: 'customer', entity_id: req.params.id, description: `Updated customer ${existing.name}`, metadata: req.body, created_by: req.user!.id })
  res.json(db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id))
})

router.delete('/:id', requirePermission('edit_sales'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id) as any
  if (!existing) return res.status(404).json({ error: 'Customer not found' })
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id)
  logActivity({ type: 'customer_delete', entity_type: 'customer', entity_id: req.params.id, description: `Deleted customer ${existing.name}`, created_by: req.user!.id })
  res.json({ deleted: true, id: req.params.id })
})

router.post('/:id/contacts', requirePermission('edit_sales'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM customers WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Customer not found' })
  const { name, email, phone, title } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  const result = db.prepare('INSERT INTO contacts (name,email,phone,title,customer_id) VALUES (?,?,?,?,?)').run(name, email ?? null, phone ?? null, title ?? null, req.params.id)
  res.status(201).json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid))
})

router.delete('/:id/contacts/:cid', requirePermission('edit_sales'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const r = db.prepare('DELETE FROM contacts WHERE id = ? AND customer_id = ?').run(req.params.cid, req.params.id)
  if (!r.changes) return res.status(404).json({ error: 'Contact not found' })
  res.json({ deleted: true })
})

router.post('/:id/notes', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM customers WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Customer not found' })
  const { text } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'text is required' })
  const result = db.prepare("INSERT INTO activities (type,entity_type,entity_id,description,created_by) VALUES ('note','customer',?,?,?)").run(req.params.id, text.trim(), req.user!.id)
  res.status(201).json(db.prepare('SELECT * FROM activities WHERE id = ?').get(result.lastInsertRowid))
})

export default router
