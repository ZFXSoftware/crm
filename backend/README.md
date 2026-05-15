# Analytics Hub CRM — Backend v3

Backend REST API completo: Node.js + Express + TypeScript + SQLite (better-sqlite3).

## Início rápido

```bash
cp .env.example .env   # configure JWT_SECRET em produção
npm install
npm run seed           # cria banco + admin + dados de exemplo
npm run dev            # http://localhost:3001
```

Credenciais padrão do seed: `admin@company.com` / `Admin@1234`

---

## Auth (`/auth`)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/auth/register` | Cria primeiro Admin (fecha após 1 usuário) | Público |
| POST | `/auth/login` | Login → `{ token, user }` | Público |
| GET | `/auth/me` | Perfil autenticado | Bearer |
| PATCH | `/auth/me` | Atualizar nome/senha | Bearer |
| POST | `/auth/invite` | Gerar link de convite → `{ user, invite_link }` | Bearer + `manage_users` |
| POST | `/auth/activate` | Ativar conta via token | Público |

---

## API (todas as rotas requerem `Authorization: Bearer <token>`)

### Customers `/api/customers`
| Método | Rota | Permissão |
|--------|------|-----------|
| GET | `/api/customers?plan=&status=&search=&minMrr=` | `view_sales` |
| GET | `/api/customers/:id` — retorna customer + deals + contacts + tasks + activities | `view_sales` |
| POST | `/api/customers` | `edit_sales` |
| PATCH | `/api/customers/:id` | `edit_sales` |
| DELETE | `/api/customers/:id` | `edit_sales` |
| POST | `/api/customers/:id/contacts` | `edit_sales` |
| DELETE | `/api/customers/:id/contacts/:cid` | `edit_sales` |
| POST | `/api/customers/:id/notes` | Bearer |

### Deals `/api/deals`
| Método | Rota | Permissão |
|--------|------|-----------|
| GET | `/api/deals?owner=&stage=&minValue=&customer_id=` | `view_sales` |
| GET | `/api/deals/:id` — retorna deal + activities | `view_sales` |
| POST | `/api/deals` | `edit_sales` |
| PATCH | `/api/deals/:id` | `edit_sales` |
| PATCH | `/api/deals/:id/move` — body: `{ direction: "next"|"prev" }` — atualiza probability automaticamente | `edit_sales` |
| DELETE | `/api/deals/:id` | `edit_sales` |
| POST | `/api/deals/:id/notes` | Bearer |

Stages: `Discovery → Qualified → Proposal → Negotiation → Won | Lost`
Probability automática: Discovery=25, Qualified=50, Proposal=65, Negotiation=78, Won=100, Lost=0

### Bills `/api/bills`
| Método | Rota | Permissão |
|--------|------|-----------|
| GET | `/api/bills?category=&status=&period=7d\|30d\|all` — period filtra por due_date no banco | `view_finance` |
| POST | `/api/bills` | `edit_finance` |
| PATCH | `/api/bills/:id` | `edit_finance` |
| DELETE | `/api/bills/:id` | `edit_finance` |

### Analytics `/api/analytics`
| Método | Rota | Permissão |
|--------|------|-----------|
| GET | `/api/analytics/series?region=&category=&period=6m\|12m` — filtros reais no banco | `view_sales` |
| GET | `/api/analytics/targets?quarter=` | `view_sales` |
| PATCH | `/api/analytics/targets/:id` | `edit_sales` |
| GET | `/api/analytics/reports?type=` | `export_data` |
| POST | `/api/analytics/reports` | `export_data` |
| PATCH | `/api/analytics/reports/:id` | `export_data` |
| DELETE | `/api/analytics/reports/:id` | `export_data` |
| GET | `/api/analytics/summary` — KPIs calculados: MRR, winRate, avgTicket, pipeline, overdueBills | `view_sales` |

### Tasks `/api/tasks`
| Método | Rota |
|--------|------|
| GET | `/api/tasks?customer_id=&deal_id=&status=&assigned_to=` |
| POST | `/api/tasks` |
| PATCH | `/api/tasks/:id` |
| DELETE | `/api/tasks/:id` |

### Export Jobs `/api/export-jobs`
| Método | Rota | Obs |
|--------|------|-----|
| GET | `/api/export-jobs?type=&format=` | — |
| POST | `/api/export-jobs` | Apenas `format: "CSV"` suportado. PDF retorna 422. |
| GET | `/api/export-jobs/:id/download` | Gera e retorna CSV real. Requer `format=CSV`. |

### Admin `/api/admin`
| Método | Rota | Permissão |
|--------|------|-----------|
| GET | `/api/admin/users?role=&status=` | `manage_users` |
| PATCH | `/api/admin/users/:id` | `manage_users` |
| DELETE | `/api/admin/users/:id` | Admin role |
| GET | `/api/admin/permissions` | Admin role |
| PATCH | `/api/admin/permissions` — `{ role, permission_key, enabled }` | Admin role |
| PUT | `/api/admin/permissions/:role` | Admin role |
| GET | `/api/admin/settings` | Admin role |
| PATCH | `/api/admin/settings` | Admin role |
| GET | `/api/admin/activities?entity_type=&entity_id=&limit=` | `manage_users` |

### Finances `/api/finances`
| Método | Rota | Permissão |
|--------|------|-----------|
| GET | `/api/finances/roi-channels` | `view_finance` |
| PATCH | `/api/finances/roi-channels/:id` | `edit_finance` |

### Insights `/api/insights`
| Método | Rota |
|--------|------|
| GET | `/api/insights/cards` |
| GET | `/api/insights/health-series` |

---

## Permissões RBAC

| Permissão | Admin | Manager | Analyst |
|-----------|-------|---------|---------|
| view_sales | ✅ | ✅ | ✅ |
| edit_sales | ✅ | ✅ | ❌ |
| view_finance | ✅ | ✅ | ✅ |
| edit_finance | ✅ | ❌ | ❌ |
| manage_users | ✅ | ❌ | ❌ |
| export_data | ✅ | ✅ | ✅ |

Permissões são verificadas em tempo real no banco — alterações via `/api/admin/permissions` têm efeito imediato.

## Segurança
- Admin não pode suspender a própria conta
- Admin não pode deletar a própria conta
- Convites requerem permissão `manage_users` (não apenas role Admin)
- PDF export retorna 422 com mensagem clara em vez de criar job silencioso

## Banco de dados

SQLite (`data.db`) criado automaticamente. Para resetar:
```bash
rm data.db && npm run seed
```

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PORT` | `3001` | Porta do servidor |
| `CORS_ORIGIN` | `http://localhost:5173` | URL do frontend |
| `JWT_SECRET` | `dev_secret` | **Mude em produção!** |
| `JWT_EXPIRES_IN` | `7d` | Validade do token |
| `SEED_ADMIN_EMAIL` | `admin@company.com` | Email do admin inicial |
| `SEED_ADMIN_PASSWORD` | `Admin@1234` | Senha do admin inicial |
