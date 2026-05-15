import { Router, Request, Response } from 'express'
import { getDb } from '../db/database'
import { authMiddleware, requirePermission, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authMiddleware)

router.get('/roi-channels', requirePermission('view_finance'), (_req, res: Response) => {
  res.json(getDb().prepare('SELECT * FROM roi_channels ORDER BY name ASC').all())
})

router.patch('/roi-channels/:id', requirePermission('edit_finance'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM roi_channels WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Channel not found' })
  const { spend, revenue } = req.body
  const updates: string[] = []
  const params: Record<string, unknown> = { id: req.params.id }
  if (spend !== undefined) { updates.push('spend = @spend'); params.spend = spend }
  if (revenue !== undefined) { updates.push('revenue = @revenue'); params.revenue = revenue }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' })
  db.prepare(`UPDATE roi_channels SET ${updates.join(', ')} WHERE id = @id`).run(params)
  res.json(db.prepare('SELECT * FROM roi_channels WHERE id = ?').get(req.params.id))
})

export default router
