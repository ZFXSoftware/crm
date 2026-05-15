import { Router } from 'express'
import { getDb } from '../db/database'
import { authMiddleware, requirePermission, AuthRequest } from '../middleware/auth'

const router = Router()

router.use(authMiddleware)

router.get('/:dealId', (req, res) => {
  const db = getDb()

  const notes = db.prepare(`
    SELECT
      dn.*,
      au.name as author
    FROM deal_notes dn
    LEFT JOIN auth_users au
      ON au.id = dn.created_by
    WHERE dn.deal_id = ?
    ORDER BY dn.created_at DESC
  `).all(req.params.dealId)

  res.json(notes)
})

router.post('/:dealId', (req: any, res) => {
  const db = getDb()

  const { content } = req.body

  if (!content?.trim()) {
    return res.status(400).json({
      error: 'Content required',
    })
  }

  const result = db.prepare(`
    INSERT INTO deal_notes (
      deal_id,
      content,
      created_by
    )
    VALUES (?, ?, ?)
  `).run(
    req.params.dealId,
    content.trim(),
    req.user.id
  )

  const note = db.prepare(`
    SELECT
      dn.*,
      au.name as author
    FROM deal_notes dn
    LEFT JOIN auth_users au
      ON au.id = dn.created_by
    WHERE dn.id = ?
  `).get(result.lastInsertRowid)

  res.json(note)
})

export default router