import { Router, Request, Response } from 'express'
import { getDb } from '../db/database'
import { authMiddleware, requirePermission, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authMiddleware)

// GET /api/bills?category=&status=&period=30d|7d|all
router.get('/', requirePermission('view_finance'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const { category, status, period } = req.query

  let sql = 'SELECT * FROM bills WHERE 1=1'
  const params: Record<string, unknown> = {}

  if (category && category !== 'all') { sql += ' AND category = @category'; params.category = category }
  if (status && status !== 'all') { sql += ' AND status = @status'; params.status = status }

  // Filtro de período real por due_date
  if (period === '7d') {
    sql += " AND due_date >= date('now', '-7 days')"
  } else if (period === '30d') {
    sql += " AND due_date >= date('now', '-30 days')"
  }
  // period === 'all' ou ausente = sem filtro de data

  sql += ' ORDER BY due_date DESC'
  res.json(db.prepare(sql).all(params))
})

router.get('/:id', requirePermission('view_finance'), (req, res: Response) => {
  const bill = getDb().prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id)
  if (!bill) return res.status(404).json({ error: 'Bill not found' })
  res.json(bill)
})

router.post('/', requirePermission('edit_finance'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const { vendor, category, amount, due_date, status } = req.body
  if (!vendor || !category || !due_date || !status) return res.status(400).json({ error: 'Missing required fields: vendor, category, due_date, status' })
  // amount pode ser 0 (conta zerada), mas deve existir
  if (amount === undefined || amount === null) return res.status(400).json({ error: 'amount is required' })
  const id = `B-${Math.floor(800 + Math.random() * 200)}`
  getDb().prepare('INSERT INTO bills (id,vendor,category,amount,due_date,status) VALUES (@id,@vendor,@category,@amount,@due_date,@status)')
    .run({ id, vendor, category, amount: Number(amount), due_date, status })
  res.status(201).json(getDb().prepare('SELECT * FROM bills WHERE id = ?').get(id))
})

router.patch('/:id', requirePermission('edit_finance'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM bills WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Bill not found' })
  const fields = ['vendor','category','amount','due_date','status']
  const updates: string[] = []
  const params: Record<string, unknown> = { id: req.params.id }
  for (const f of fields) { if (req.body[f] !== undefined) { updates.push(`${f} = @${f}`); params[f] = req.body[f] } }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' })
  db.prepare(`UPDATE bills SET ${updates.join(', ')} WHERE id = @id`).run(params)
  res.json(db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id))
})

router.delete('/:id', requirePermission('edit_finance'), (req: AuthRequest, res: Response) => {
  const r = getDb().prepare('DELETE FROM bills WHERE id = ?').run(req.params.id)
  if (!r.changes) return res.status(404).json({ error: 'Bill not found' })
  res.json({ deleted: true, id: req.params.id })
})

export default router
