import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { getDb } from '../db/database'

export interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string; name: string }
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' })
  }
  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET ?? 'dev_secret') as any
    // Confirma que o usuário ainda existe e está ativo
    const user = getDb().prepare('SELECT id, name, email, role, status FROM auth_users WHERE id = ?').get(payload.sub) as any
    if (!user || user.status === 'Suspended') {
      return res.status(401).json({ error: 'User not found or suspended' })
    }
    req.user = { id: user.id, email: user.email, role: user.role, name: user.name }
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Required role: ${roles.join(' or ')}` })
    }
    next()
  }
}

export function requirePermission(permissionKey: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
    const db = getDb()
    const perm = db.prepare(
      'SELECT enabled FROM permissions WHERE role = ? AND permission_key = ?'
    ).get(req.user.role, permissionKey) as any
    if (!perm || !perm.enabled) {
      return res.status(403).json({ error: `Missing permission: ${permissionKey}` })
    }
    next()
  }
}
