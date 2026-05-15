/**
 * Seed de nova instância CRM
 * - Cria admin, permissions e settings
 * - NÃO cria tabelas (as migrations em database.ts fazem isso automaticamente)
 * - NÃO insere dados de demo
 */
import { getDb } from './database'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
dotenv.config()

const db = getDb() // dispara as migrations automaticamente

const adminName  = process.env.SEED_ADMIN_NAME     ?? 'Administrator'
const adminEmail = process.env.SEED_ADMIN_EMAIL    ?? 'admin@company.com'
const adminPass  = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@1234'

// Admin
const existing = db.prepare('SELECT id FROM auth_users WHERE email = ?').get(adminEmail)
if (!existing) {
  db.prepare("INSERT INTO auth_users (name,email,password_hash,role,status) VALUES (?,?,?,'Admin','Active')")
    .run(adminName, adminEmail, bcrypt.hashSync(adminPass, 10))
  console.log('👤 Admin criado: ' + adminEmail)
} else {
  console.log('👤 Admin já existe: ' + adminEmail)
}

// Permissions
const insertPerm = db.prepare('INSERT OR IGNORE INTO permissions (role,permission_key,enabled) VALUES (@role,@permission_key,@enabled)')
const permMatrix = {
  Admin:   { view_sales:1, edit_sales:1, view_finance:1, edit_finance:1, manage_users:1, export_data:1 },
  Manager: { view_sales:1, edit_sales:1, view_finance:1, edit_finance:0, manage_users:0, export_data:1 },
  Analyst: { view_sales:1, edit_sales:0, view_finance:1, edit_finance:0, manage_users:0, export_data:1 },
}
db.transaction(() => {
  for (const [role, perms] of Object.entries(permMatrix))
    for (const [key, enabled] of Object.entries(perms))
      insertPerm.run({ role, permission_key: key, enabled })
})()
console.log('🔐 Permissions configuradas')

// Settings
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (@key,@value)')
db.transaction(() => {
  insertSetting.run({ key:'company_name',      value:'Analytics Hub' })
  insertSetting.run({ key:'timezone',          value:'UTC' })
  insertSetting.run({ key:'currency',          value:'USD' })
  insertSetting.run({ key:'fiscal_year_start', value:'January' })
  insertSetting.run({ key:'sso_enabled',       value:'false' })
  insertSetting.run({ key:'audit_logs',        value:'true' })
  insertSetting.run({ key:'api_access',        value:'false' })
})()
console.log('⚙️  Settings configuradas')

// Insight cards (necessários para a aba Insights não quebrar)
const insertCard = db.prepare('INSERT OR IGNORE INTO insight_cards (title,value,delta,tone,note,sort_order) VALUES (@title,@value,@delta,@tone,@note,@sort_order)')
db.transaction(() => {
  insertCard.run({ title:'Retention',    value:'—', delta:'—', tone:'gray', note:'Sem dados ainda', sort_order:0 })
  insertCard.run({ title:'Churn Risk',   value:'—', delta:'—', tone:'gray', note:'Sem dados ainda', sort_order:1 })
  insertCard.run({ title:'Expansion',    value:'—', delta:'—', tone:'gray', note:'Sem dados ainda', sort_order:2 })
  insertCard.run({ title:'Support Load', value:'—', delta:'—', tone:'gray', note:'Sem dados ainda', sort_order:3 })
})()

// Health series (necessário para o gráfico de health não quebrar)
const insertHealth = db.prepare('INSERT OR IGNORE INTO health_series (day,score,sort_order) VALUES (@day,@score,@sort_order)')
db.transaction(() => {
  ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach((day, i) =>
    insertHealth.run({ day, score: 0, sort_order: i })
  )
})()
console.log('📊 Dados base de insights configurados')

console.log('\n✅ Seed concluído!')
console.log('🔑 Login: ' + adminEmail + ' / ' + adminPass + '\n')
