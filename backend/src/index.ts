import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
dotenv.config()

import authRouter from './routes/auth'
import customersRouter from './routes/customers'
import dealsRouter from './routes/deals'
import billsRouter from './routes/bills'
import analyticsRouter from './routes/analytics'
import adminRouter from './routes/admin'
import financesRouter from './routes/finances'
import insightsRouter from './routes/insights'
import tasksRouter from './routes/tasks'
import { errorHandler, notFound } from './middleware/errorHandler'

// Validação de variáveis críticas
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change_this_to_a_long_random_secret_in_production') {
  console.warn('⚠️  JWT_SECRET não definido ou usando valor padrão. Configure o .env para produção!')
}

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors({
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  methods: ['GET','POST','PATCH','PUT','DELETE'],
  allowedHeaders: ['Content-Type','Authorization'],
}))
app.use(express.json())

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.use('/auth',          authRouter)
app.use('/api/customers', customersRouter)
app.use('/api/deals',     dealsRouter)
app.use('/api/bills',     billsRouter)
app.use('/api/analytics', analyticsRouter)
app.use('/api/admin',     adminRouter)
app.use('/api/finances',  financesRouter)
app.use('/api/insights',  insightsRouter)
app.use('/api',           tasksRouter)   // /api/tasks

app.use(notFound)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`\n🚀 Analytics Hub CRM — Backend v3`)
  console.log(`   http://localhost:${PORT}\n`)
  console.log(`Auth:`)
  console.log(`  POST /auth/register   — Criar primeiro admin`)
  console.log(`  POST /auth/login      — Login`)
  console.log(`  GET  /auth/me         — Perfil autenticado`)
  console.log(`  POST /auth/invite     — Convidar usuário`)
  console.log(`  POST /auth/activate   — Ativar conta via token`)
  console.log(`\nAPI (requer Bearer token):`)
  console.log(`  /api/customers        — CRUD + contacts + notes + detalhe`)
  console.log(`  /api/deals            — CRUD + move + notes`)
  console.log(`  /api/bills            — CRUD`)
  console.log(`  /api/analytics        — series (filtros reais), targets, reports, summary`)
  console.log(`  /api/admin            — users, permissions, settings, activities`)
  console.log(`  /api/finances         — roi-channels`)
  console.log(`  /api/insights         — cards, health-series`)
  console.log(`  /api/tasks            — CRUD`)
  console.log(`  /api/analytics        — /series, /targets, /reports, /reports/:id/run, /export-jobs, /summary\n`)
})
