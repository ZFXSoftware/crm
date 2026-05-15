import { Router, Request, Response } from 'express'
import { getDb } from '../db/database'
import { authMiddleware, requirePermission, AuthRequest } from '../middleware/auth'
import { logActivity } from '../lib/activity'

const router = Router()
router.use(authMiddleware)

const STAGES = ['Discovery','Qualified','Proposal','Negotiation','Won','Lost']
const STAGE_PROBABILITY: Record<string, number> = { Discovery:25, Qualified:50, Proposal:65, Negotiation:78, Won:100, Lost:0 }

router.get('/', requirePermission('view_sales'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const { owner, stage, minValue, customer_id } = req.query
  let sql = 'SELECT * FROM deals WHERE 1=1'
  const params: Record<string, unknown> = {}
  if (owner && owner !== 'all') { sql += ' AND owner = @owner'; params.owner = owner }
  if (stage && stage !== 'all') { sql += ' AND stage = @stage'; params.stage = stage }
  if (minValue) { sql += ' AND value >= @minValue'; params.minValue = Number(minValue) }
  if (customer_id) { sql += ' AND customer_id = @customer_id'; params.customer_id = customer_id }
  sql += ' ORDER BY created_at DESC'
  res.json(db.prepare(sql).all(params))
})

router.get('/:id', requirePermission('view_sales'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id)
  if (!deal) return res.status(404).json({ error: 'Deal not found' })
  const activities = db.prepare("SELECT * FROM activities WHERE entity_type='deal' AND entity_id=? ORDER BY created_at DESC").all(req.params.id)
  res.json({ ...deal, activities })
})

router.post('/', requirePermission('edit_sales'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const { company, stage, owner, value, probability, customer_id } = req.body
  if (!company || !stage || !owner) return res.status(400).json({ error: 'Missing required fields: company, stage, owner' })
  if (!STAGES.includes(stage)) return res.status(400).json({ error: 'Invalid stage' })
  const id = `D-${Math.floor(100 + Math.random() * 900)}`
  const prob = probability ?? STAGE_PROBABILITY[stage] ?? 25
  db.prepare('INSERT INTO deals (id,company,customer_id,stage,owner,value,probability) VALUES (@id,@company,@customer_id,@stage,@owner,@value,@probability)')
    .run({ id, company, customer_id: customer_id ?? null, stage, owner, value: value ?? 0, probability: prob })
  logActivity({ type: 'deal_create', entity_type: 'deal', entity_id: id, description: `Created deal: ${company} (${stage})`, created_by: req.user!.id })
  res.status(201).json(db.prepare('SELECT * FROM deals WHERE id = ?').get(id))
})

router.patch('/:id', requirePermission('edit_sales'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id) as any
  if (!existing) return res.status(404).json({ error: 'Deal not found' })
  const { stage, owner, value, probability, customer_id, lost_reason } = req.body
  const updates: string[] = []
  const params: Record<string, unknown> = { id: req.params.id }
  if (stage !== undefined) {
    if (!STAGES.includes(stage)) return res.status(400).json({ error: 'Invalid stage' })
    updates.push('stage = @stage'); params.stage = stage
    if (probability === undefined) { updates.push('probability = @probability'); params.probability = STAGE_PROBABILITY[stage] }
  }
  if (owner !== undefined) { updates.push('owner = @owner'); params.owner = owner }
  if (value !== undefined) { updates.push('value = @value'); params.value = value }
  if (probability !== undefined) { updates.push('probability = @probability'); params.probability = probability }
  if (customer_id !== undefined) { updates.push('customer_id = @customer_id'); params.customer_id = customer_id }
  if (lost_reason !== undefined) { updates.push('lost_reason = @lost_reason'); params.lost_reason = lost_reason }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' })
  db.prepare(`UPDATE deals SET ${updates.join(', ')} WHERE id = @id`).run(params)
  if (stage && stage !== existing.stage) {
    logActivity({ type: 'stage_change', entity_type: 'deal', entity_id: req.params.id, description: `Deal ${existing.company} moved ${existing.stage} → ${stage}`, metadata: { from: existing.stage, to: stage }, created_by: req.user!.id })
  } else {
    logActivity({ type: 'deal_update', entity_type: 'deal', entity_id: req.params.id, description: `Updated deal ${existing.company}`, metadata: req.body, created_by: req.user!.id })
  }
  res.json(db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id))
})

router.patch('/:id/move', requirePermission('edit_sales'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id) as any
  if (!deal) return res.status(404).json({ error: 'Deal not found' })
  const movable = STAGES.filter(s => s !== 'Lost')
  const { direction } = req.body
  const idx = movable.indexOf(deal.stage)
  const nextIdx = direction === 'next' ? idx + 1 : idx - 1
  if (nextIdx < 0 || nextIdx >= movable.length) return res.status(400).json({ error: 'Cannot move further' })
  const newStage = movable[nextIdx]
  db.prepare('UPDATE deals SET stage = ?, probability = ? WHERE id = ?').run(newStage, STAGE_PROBABILITY[newStage], deal.id)
  logActivity({ type: 'stage_change', entity_type: 'deal', entity_id: deal.id, description: `Deal ${deal.company} moved ${deal.stage} → ${newStage}`, metadata: { from: deal.stage, to: newStage }, created_by: req.user!.id })
  res.json(db.prepare('SELECT * FROM deals WHERE id = ?').get(deal.id))
})

router.delete('/:id', requirePermission('edit_sales'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id) as any
  if (!existing) return res.status(404).json({ error: 'Deal not found' })
  db.prepare('DELETE FROM deals WHERE id = ?').run(req.params.id)
  logActivity({ type: 'deal_delete', entity_type: 'deal', entity_id: req.params.id, description: `Deleted deal ${existing.company}`, created_by: req.user!.id })
  res.json({ deleted: true, id: req.params.id })
})

router.post('/:id/notes', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM deals WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Deal not found' })
  const { text } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'text is required' })
  const result = db.prepare("INSERT INTO activities (type,entity_type,entity_id,description,created_by) VALUES ('note','deal',?,?,?)").run(req.params.id, text.trim(), req.user!.id)
  res.status(201).json(db.prepare('SELECT * FROM activities WHERE id = ?').get(result.lastInsertRowid))
})

export default router
