import { Router, Request, Response } from 'express'
import { getDb } from '../db/database'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authMiddleware)

router.get('/cards', (_req, res: Response) => {
  res.json(getDb().prepare('SELECT * FROM insight_cards ORDER BY sort_order ASC').all())
})

router.get('/health-series', (_req, res: Response) => {
  res.json(getDb().prepare('SELECT * FROM health_series ORDER BY sort_order ASC').all())
})

export default router
