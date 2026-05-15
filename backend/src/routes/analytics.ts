import { Router, Request, Response } from 'express'
import { getDb } from '../db/database'
import { authMiddleware, requirePermission, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authMiddleware)

// ── Monthly Series ─────────────────────────────────────────
router.get('/series', requirePermission('view_sales'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const { region = 'all', category = 'all', period } = req.query
  let rows = db.prepare('SELECT * FROM monthly_series WHERE region = ? AND category = ? ORDER BY id ASC').all(region, category)
  if (!rows.length) rows = db.prepare("SELECT * FROM monthly_series WHERE region = 'all' AND category = 'all' ORDER BY id ASC").all()
  if (period === '6m') rows = rows.slice(-6)
  res.json(rows)
})

// ── Targets ────────────────────────────────────────────────
router.get('/targets', requirePermission('view_sales'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const { quarter } = req.query
  let sql = 'SELECT * FROM targets'
  if (quarter) sql += ' WHERE quarter = ?'
  res.json(quarter ? db.prepare(sql).all(quarter) : db.prepare(sql).all())
})

router.patch('/targets/:id', requirePermission('edit_sales'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  if (!db.prepare('SELECT id FROM targets WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Target not found' })
  const { current, goal, quarter } = req.body
  const updates: string[] = []
  const params: Record<string, unknown> = { id: req.params.id }
  if (current !== undefined) { updates.push('current = @current'); params.current = current }
  if (goal !== undefined) { updates.push('goal = @goal'); params.goal = goal }
  if (quarter !== undefined) { updates.push('quarter = @quarter'); params.quarter = quarter }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' })
  db.prepare(`UPDATE targets SET ${updates.join(', ')} WHERE id = @id`).run(params)
  res.json(db.prepare('SELECT * FROM targets WHERE id = ?').get(req.params.id))
})

// ── Report Templates ───────────────────────────────────────

// Colunas disponíveis por entity_type
const AVAILABLE_COLUMNS: Record<string, string[]> = {
  customers: ['id','name','email','company','plan','status','mrr','last_contact','created_at'],
  bills:     ['id','vendor','category','amount','due_date','status','created_at'],
  deals:     ['id','company','stage','owner','value','probability','lost_reason','created_at'],
}

// GET /api/analytics/reports?entity_type=customers
router.get('/reports', requirePermission('export_data'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const { entity_type } = req.query
  let sql = 'SELECT * FROM reports WHERE 1=1'
  const params: Record<string, unknown> = {}
  if (entity_type && entity_type !== 'all') { sql += ' AND entity_type = @entity_type'; params.entity_type = entity_type }
  sql += ' ORDER BY updated_at DESC'
  const rows = db.prepare(sql).all(params) as any[]
  // Parse JSON columns e retornar colunas disponíveis
  const result = rows.map(r => ({
    ...r,
    columns: JSON.parse(r.columns ?? '[]'),
    available_columns: AVAILABLE_COLUMNS[r.entity_type] ?? [],
  }))
  res.json(result)
})

// GET /api/analytics/reports/:id
router.get('/reports/:id', requirePermission('export_data'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id) as any
  if (!row) return res.status(404).json({ error: 'Report not found' })
  res.json({ ...row, columns: JSON.parse(row.columns ?? '[]'), available_columns: AVAILABLE_COLUMNS[row.entity_type] ?? [] })
})

// POST /api/analytics/reports — cria template
router.post('/reports', requirePermission('export_data'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const { name, entity_type, columns, date_from, date_to } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' })
  if (!entity_type || !AVAILABLE_COLUMNS[entity_type]) {
    return res.status(400).json({ error: `entity_type must be one of: ${Object.keys(AVAILABLE_COLUMNS).join(', ')}` })
  }

  // Valida colunas escolhidas
  const available = AVAILABLE_COLUMNS[entity_type]
  const chosen: string[] = Array.isArray(columns) && columns.length > 0
    ? columns.filter((c: string) => available.includes(c))
    : available // padrão: todas as colunas

  const result = db.prepare(`
    INSERT INTO reports (name, entity_type, columns, date_from, date_to, created_by)
    VALUES (@name, @entity_type, @columns, @date_from, @date_to, @created_by)
  `).run({
    name: name.trim(),
    entity_type,
    columns: JSON.stringify(chosen),
    date_from: date_from ?? null,
    date_to: date_to ?? null,
    created_by: req.user!.id,
  })

  const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(result.lastInsertRowid) as any
  res.status(201).json({ ...row, columns: JSON.parse(row.columns), available_columns: available })
})

// PATCH /api/analytics/reports/:id — edita template
router.patch('/reports/:id', requirePermission('export_data'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id) as any
  if (!existing) return res.status(404).json({ error: 'Report not found' })

  const { name, columns, date_from, date_to } = req.body
  const updates: string[] = ["updated_at = datetime('now')"]
  const params: Record<string, unknown> = { id: req.params.id }

  if (name !== undefined) { updates.push('name = @name'); params.name = name }
  if (columns !== undefined) {
    const available = AVAILABLE_COLUMNS[existing.entity_type] ?? []
    const chosen = Array.isArray(columns) ? columns.filter((c: string) => available.includes(c)) : available
    updates.push('columns = @columns'); params.columns = JSON.stringify(chosen)
  }
  if (date_from !== undefined) { updates.push('date_from = @date_from'); params.date_from = date_from || null }
  if (date_to !== undefined) { updates.push('date_to = @date_to'); params.date_to = date_to || null }

  db.prepare(`UPDATE reports SET ${updates.join(', ')} WHERE id = @id`).run(params)
  const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id) as any
  res.json({ ...row, columns: JSON.parse(row.columns), available_columns: AVAILABLE_COLUMNS[row.entity_type] ?? [] })
})

// DELETE /api/analytics/reports/:id
router.delete('/reports/:id', requirePermission('export_data'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const r = db.prepare('DELETE FROM reports WHERE id = ?').run(req.params.id)
  if (!r.changes) return res.status(404).json({ error: 'Report not found' })
  res.json({ deleted: true })
})

// GET /api/analytics/available-columns — retorna colunas disponíveis por entity_type
router.get('/available-columns', requirePermission('export_data'), (_req, res: Response) => {
  res.json(AVAILABLE_COLUMNS)
})

// ── Export Jobs ────────────────────────────────────────────

// GET /api/analytics/export-jobs
router.get('/export-jobs', requirePermission('export_data'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const { report_id } = req.query
  let sql = `SELECT e.*, u.name as created_by_name FROM export_jobs e LEFT JOIN auth_users u ON e.created_by = u.id WHERE 1=1`
  const params: Record<string, unknown> = {}
  if (report_id) { sql += ' AND e.report_id = @report_id'; params.report_id = report_id }
  sql += ' ORDER BY e.created_at DESC'
  res.json(db.prepare(sql).all(params))
})

// POST /api/analytics/export-jobs/:report_id/run — gera CSV de um template
router.post('/export-jobs/:report_id/run', requirePermission('export_data'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.report_id) as any
  if (!report) return res.status(404).json({ error: 'Report template not found' })

  const columns: string[] = JSON.parse(report.columns ?? '[]')
  const { entity_type, date_from, date_to, name } = report

  // Constrói query dinâmica com colunas e filtro de data
  const safeColumns = columns.filter(c => /^[a-z_]+$/.test(c)).join(', ')
  let sql = `SELECT ${safeColumns} FROM ${entity_type} WHERE 1=1`
  const queryParams: unknown[] = []

  const dateField = entity_type === 'bills' ? 'due_date' : 'created_at'
  if (date_from) { sql += ` AND ${dateField} >= ?`; queryParams.push(date_from) }
  if (date_to)   { sql += ` AND ${dateField} <= ?`; queryParams.push(date_to) }
  sql += ' ORDER BY created_at DESC'

  try {
    const rows = db.prepare(sql).all(...queryParams) as any[]

    // Gerar CSV
    const header = columns.join(',')
    const body = rows.map(r =>
      columns.map(col => {
        const val = r[col]
        if (val === null || val === undefined) return ''
        if (typeof val === 'number') return String(val)
        return `"${String(val).replace(/"/g, '""')}"`
      }).join(',')
    ).join('\n')
    const csv = `${header}\n${body}`

    // Salvar job na tabela
    const jobId = `X-${Date.now()}`
    db.prepare(`
      INSERT INTO export_jobs (id, report_id, report_name, entity_type, columns, date_from, date_to, row_count, status, created_by)
      VALUES (@id, @report_id, @report_name, @entity_type, @columns, @date_from, @date_to, @row_count, 'Done', @created_by)
    `).run({
      id: jobId,
      report_id: report.id,
      report_name: name,
      entity_type,
      columns: report.columns,
      date_from: date_from ?? null,
      date_to: date_to ?? null,
      row_count: rows.length,
      created_by: req.user!.id,
    })

    // Retornar CSV para download imediato
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${name.replace(/[^a-z0-9]/gi, '-')}-${new Date().toISOString().slice(0,10)}.csv"`)
    res.setHeader('X-Export-Job-Id', jobId)
    res.setHeader('X-Export-Row-Count', String(rows.length))
    res.send(csv)
  } catch (err: any) {
    // Salvar job como Failed
    const jobId = `X-${Date.now()}`
    db.prepare(`
      INSERT INTO export_jobs (id, report_id, report_name, entity_type, columns, status, created_by)
      VALUES (@id, @report_id, @report_name, @entity_type, @columns, 'Failed', @created_by)
    `).run({ id: jobId, report_id: report.id, report_name: name, entity_type, columns: report.columns, created_by: req.user!.id })
    res.status(500).json({ error: `Export failed: ${err.message}` })
  }
})

// ── Dashboard Summary ──────────────────────────────────────
router.get('/summary', requirePermission('view_sales'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const totalMrr    = (db.prepare("SELECT COALESCE(SUM(mrr),0) as v FROM customers WHERE status='Active'").get() as any).v
  const atRisk      = (db.prepare("SELECT COUNT(*) as v FROM customers WHERE status='At Risk'").get() as any).v
  const openDeals   = (db.prepare("SELECT COUNT(*) as v FROM deals WHERE stage NOT IN ('Won','Lost')").get() as any).v
  const pipeline    = (db.prepare("SELECT COALESCE(SUM(value),0) as v FROM deals WHERE stage NOT IN ('Won','Lost')").get() as any).v
  const wonDeals    = (db.prepare("SELECT COUNT(*) as v FROM deals WHERE stage='Won'").get() as any).v
  const totalDeals  = (db.prepare("SELECT COUNT(*) as v FROM deals").get() as any).v
  const winRate     = totalDeals ? Math.round((wonDeals / totalDeals) * 100) : 0
  const avgTicket   = wonDeals ? Math.round((db.prepare("SELECT COALESCE(AVG(value),0) as v FROM deals WHERE stage='Won'").get() as any).v) : 0
  const overdueBills = (db.prepare("SELECT COALESCE(SUM(amount),0) as v FROM bills WHERE status='Overdue'").get() as any).v
  res.json({ totalMrr, atRisk, openDeals, pipeline, wonDeals, winRate, avgTicket, overdueBills })
})


// ── Deals Revenue Summary — receita real dos deals ────────
// Calcula receita agregada dos deals Won por mês (baseado em created_at)
// Este é o dado "real" que reflete o Pipeline no financeiro
router.get('/deals-revenue', requirePermission('view_sales'), (req: AuthRequest, res: Response) => {
  const db = getDb()
  const { period } = req.query

  // Agrupa deals Won por mês/ano
  const rows = db.prepare(`
    SELECT
      strftime('%b', created_at) as month,
      strftime('%Y', created_at) as year,
      strftime('%Y-%m', created_at) as month_key,
      COALESCE(SUM(value), 0) as revenue,
      COUNT(*) as deals_count,
      COALESCE(AVG(value), 0) as avg_ticket
    FROM deals
    WHERE stage = 'Won'
    GROUP BY month_key
    ORDER BY month_key ASC
  `).all() as any[]

  // Filtro de período
  let filtered = rows
  if (period === '6m') filtered = rows.slice(-6)
  if (period === '12m') filtered = rows.slice(-12)

  // KPIs gerais
  const totalRevenue = (db.prepare("SELECT COALESCE(SUM(value),0) as v FROM deals WHERE stage='Won'").get() as any).v
  const totalDeals   = (db.prepare("SELECT COUNT(*) as v FROM deals WHERE stage='Won'").get() as any).v
  const avgTicket    = totalDeals ? Math.round(totalRevenue / totalDeals) : 0
  const pipeline     = (db.prepare("SELECT COALESCE(SUM(value),0) as v FROM deals WHERE stage NOT IN ('Won','Lost')").get() as any).v
  const openDeals    = (db.prepare("SELECT COUNT(*) as v FROM deals WHERE stage NOT IN ('Won','Lost')").get() as any).v

  res.json({
    series: filtered,
    totalRevenue,
    totalDeals,
    avgTicket,
    pipeline,
    openDeals,
  })
})

export default router
