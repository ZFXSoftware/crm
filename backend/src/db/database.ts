import Database from 'better-sqlite3'
import path from 'path'
import dotenv from 'dotenv'
dotenv.config()

const DB_PATH = path.join(__dirname, '../../data.db')
let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    runMigrations(db)
  }
  return db
}

// ─────────────────────────────────────────────────────────────
// Sistema de Migrations
//
// Como funciona:
//  1. Ao iniciar, cria a tabela _migrations se não existir
//  2. Para cada migration na lista, verifica se já foi aplicada
//  3. Se não foi, executa dentro de uma transaction e registra
//
// Como adicionar uma migration nova:
//  - Adicione um novo objeto ao array MIGRATIONS abaixo
//  - Dê um nome único e sequencial (ex: "004_add_column_x")
//  - Nunca edite migrations existentes — só adicione novas
//  - O sistema aplica apenas as que ainda não rodaram
// ─────────────────────────────────────────────────────────────

interface Migration {
  name: string
  up: (db: Database.Database) => void
}

const MIGRATIONS: Migration[] = [
  // ── 001 — Schema inicial completo ─────────────────────────
  {
    name: '001_initial_schema',
    up: (db) => db.exec(`
      CREATE TABLE IF NOT EXISTS auth_users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        name          TEXT NOT NULL,
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role          TEXT NOT NULL CHECK(role IN ('Admin','Manager','Analyst')) DEFAULT 'Analyst',
        status        TEXT NOT NULL CHECK(status IN ('Active','Invited','Suspended','Pending')) DEFAULT 'Active',
        invite_token  TEXT,
        last_seen     TEXT NOT NULL DEFAULT (datetime('now')),
        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS customers (
        id           TEXT PRIMARY KEY,
        name         TEXT NOT NULL,
        email        TEXT NOT NULL UNIQUE,
        company      TEXT NOT NULL,
        plan         TEXT NOT NULL CHECK(plan IN ('Starter','Growth','Enterprise')),
        status       TEXT NOT NULL CHECK(status IN ('Active','Trial','At Risk')),
        mrr          INTEGER NOT NULL DEFAULT 0,
        last_contact TEXT NOT NULL DEFAULT 'Today',
        created_at   TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS contacts (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        email       TEXT,
        phone       TEXT,
        title       TEXT,
        customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS deals (
        id          TEXT PRIMARY KEY,
        company     TEXT NOT NULL,
        stage       TEXT NOT NULL CHECK(stage IN ('Discovery','Qualified','Proposal','Negotiation','Won','Lost')),
        owner       TEXT NOT NULL,
        value       INTEGER NOT NULL DEFAULT 0,
        probability INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS bills (
        id         TEXT PRIMARY KEY,
        vendor     TEXT NOT NULL,
        category   TEXT NOT NULL CHECK(category IN ('Software','Services','Office','Ads')),
        amount     INTEGER NOT NULL DEFAULT 0,
        due_date   TEXT NOT NULL,
        status     TEXT NOT NULL CHECK(status IN ('Paid','Pending','Overdue')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS monthly_series (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        month    TEXT NOT NULL,
        revenue  INTEGER NOT NULL DEFAULT 0,
        cost     INTEGER NOT NULL DEFAULT 0,
        leads    INTEGER NOT NULL DEFAULT 0,
        region   TEXT NOT NULL DEFAULT 'all',
        category TEXT NOT NULL DEFAULT 'all',
        UNIQUE(month, region, category)
      );

      CREATE TABLE IF NOT EXISTS targets (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        name     TEXT NOT NULL UNIQUE,
        current  INTEGER NOT NULL DEFAULT 0,
        goal     INTEGER NOT NULL DEFAULT 0,
        unit     TEXT NOT NULL CHECK(unit IN ('USD','Leads','Deals')),
        quarter  TEXT NOT NULL DEFAULT 'q1'
      );

      CREATE TABLE IF NOT EXISTS reports (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT NOT NULL,
        type       TEXT NOT NULL CHECK(type IN ('Sales','Finance','Analytics')),
        status     TEXT NOT NULL CHECK(status IN ('Ready','Draft')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS export_jobs (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        type       TEXT NOT NULL,
        format     TEXT NOT NULL,
        status     TEXT NOT NULL CHECK(status IN ('Queued','Running','Done','Failed')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS permissions (
        role           TEXT NOT NULL,
        permission_key TEXT NOT NULL,
        enabled        INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (role, permission_key)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS roi_channels (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        name    TEXT NOT NULL UNIQUE,
        spend   INTEGER NOT NULL DEFAULT 0,
        revenue INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS insight_cards (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        title      TEXT NOT NULL UNIQUE,
        value      TEXT NOT NULL,
        delta      TEXT NOT NULL,
        tone       TEXT NOT NULL,
        note       TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS health_series (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        day        TEXT NOT NULL UNIQUE,
        score      INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        title       TEXT NOT NULL,
        due_date    TEXT,
        status      TEXT NOT NULL CHECK(status IN ('Open','Done','Cancelled')) DEFAULT 'Open',
        customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
        deal_id     TEXT REFERENCES deals(id) ON DELETE CASCADE,
        assigned_to INTEGER REFERENCES auth_users(id),
        created_by  INTEGER REFERENCES auth_users(id),
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS activities (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        type        TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id   TEXT NOT NULL,
        description TEXT NOT NULL,
        metadata    TEXT,
        created_by  INTEGER REFERENCES auth_users(id),
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `),
  },

  // ── 002 — Adiciona campos que faltavam no schema inicial ───
  {
    name: '002_add_missing_columns',
    up: (db) => {
      // customers.notes
      const custCols = db.prepare("PRAGMA table_info(customers)").all() as any[]
      if (!custCols.find(c => c.name === 'notes')) {
        db.exec(`ALTER TABLE customers ADD COLUMN notes TEXT NOT NULL DEFAULT ''`)
      }
      // deals.customer_id
      const dealCols = db.prepare("PRAGMA table_info(deals)").all() as any[]
      if (!dealCols.find(c => c.name === 'customer_id')) {
        db.exec(`ALTER TABLE deals ADD COLUMN customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL`)
      }
      // deals.lost_reason
      if (!dealCols.find(c => c.name === 'lost_reason')) {
        db.exec(`ALTER TABLE deals ADD COLUMN lost_reason TEXT`)
      }
      // export_jobs.created_by
      const jobCols = db.prepare("PRAGMA table_info(export_jobs)").all() as any[]
      if (!jobCols.find(c => c.name === 'created_by')) {
        db.exec(`ALTER TABLE export_jobs ADD COLUMN created_by INTEGER REFERENCES auth_users(id)`)
      }
    },
  },

  // ── 003 — Reestrutura reports e export_jobs para templates ─
  {
    name: '003_report_templates',
    up: (db) => {
      // Verificar se reports já tem a coluna entity_type (nova estrutura)
      const reportCols = db.prepare("PRAGMA table_info(reports)").all() as any[]
      const hasEntityType = reportCols.find(c => c.name === 'entity_type')

      if (!hasEntityType) {
        // Renomear tabela antiga e recriar com nova estrutura
        db.exec(`ALTER TABLE reports RENAME TO reports_old`)
        db.exec(`
          CREATE TABLE reports (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            name         TEXT NOT NULL,
            entity_type  TEXT NOT NULL CHECK(entity_type IN ('customers','bills','deals')) DEFAULT 'customers',
            columns      TEXT NOT NULL DEFAULT '[]',
            date_from    TEXT,
            date_to      TEXT,
            created_by   INTEGER REFERENCES auth_users(id),
            created_at   TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
          )
        `)
        // Migrar dados antigos: mapear type → entity_type
        db.exec(`
          INSERT INTO reports (id, name, entity_type, columns, created_at, updated_at)
          SELECT
            id,
            name,
            CASE type
              WHEN 'Sales'     THEN 'customers'
              WHEN 'Finance'   THEN 'bills'
              ELSE 'customers'
            END,
            '["id","name","status","created_at"]',
            COALESCE(updated_at, datetime('now')),
            COALESCE(updated_at, datetime('now'))
          FROM reports_old
        `)
        db.exec(`DROP TABLE reports_old`)
      }

      // Verificar se export_jobs já tem a nova coluna report_name
      const jobCols = db.prepare("PRAGMA table_info(export_jobs)").all() as any[]
      const hasReportName = jobCols.find(c => c.name === 'report_name')

      if (!hasReportName) {
        db.exec(`ALTER TABLE export_jobs RENAME TO export_jobs_old`)
        db.exec(`
          CREATE TABLE export_jobs (
            id          TEXT PRIMARY KEY,
            report_id   INTEGER REFERENCES reports(id) ON DELETE SET NULL,
            report_name TEXT NOT NULL DEFAULT 'Export',
            entity_type TEXT NOT NULL DEFAULT 'customers',
            columns     TEXT NOT NULL DEFAULT '[]',
            date_from   TEXT,
            date_to     TEXT,
            row_count   INTEGER,
            status      TEXT NOT NULL CHECK(status IN ('Done','Failed')),
            created_by  INTEGER REFERENCES auth_users(id),
            created_at  TEXT NOT NULL DEFAULT (datetime('now'))
          )
        `)
        // Migrar dados antigos — descartar jobs no formato antigo (incompatíveis)
        // Em produção real, você poderia tentar mapear; aqui é mais seguro limpar
        db.exec(`DROP TABLE export_jobs_old`)
      }
    },
  },

  // ── Adicione futuras migrations aqui ──────────────────────
  // Exemplo:
  // {
  //   name: '004_add_tags_to_customers',
  //   up: (db) => {
  //     db.exec(`ALTER TABLE customers ADD COLUMN tags TEXT DEFAULT '[]'`)
  //   },
  // },
]

function runMigrations(db: Database.Database) {
  // Tabela de controle de migrations
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name       TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const applied = new Set(
    (db.prepare('SELECT name FROM _migrations').all() as any[]).map(r => r.name)
  )

  let count = 0
  for (const migration of MIGRATIONS) {
    if (applied.has(migration.name)) continue

    console.log(`  ↳ Applying migration: ${migration.name}`)
    db.transaction(() => {
      migration.up(db)
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(migration.name)
    })()
    count++
  }

  if (count > 0) {
    console.log(`✅ ${count} migration(s) applied.`)
  }
}
