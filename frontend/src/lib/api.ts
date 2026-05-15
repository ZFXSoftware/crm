export const API_BASE = import.meta.env.VITE_API_URL ?? ''

function getToken() { return localStorage.getItem('crm_token') }

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })
  if (res.status === 401) {
    localStorage.removeItem('crm_token')
    window.location.href = '/login'
    throw new Error('Session expired')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'Request failed')
  }
  return res.json()
}

// ── Types ──────────────────────────────────────────────────
export type AuthUser = { id: number; name: string; email: string; role: 'Admin'|'Manager'|'Analyst'; status: string; last_seen: string }
export type Customer = { id: string; name: string; email: string; company: string; plan: 'Starter'|'Growth'|'Enterprise'; status: 'Active'|'Trial'|'At Risk'; mrr: number; last_contact: string; notes?: string }
export type Contact = { id: number; name: string; email?: string; phone?: string; title?: string; customer_id: string }
export type Deal = { id: string; company: string; customer_id?: string; stage: 'Discovery'|'Qualified'|'Proposal'|'Negotiation'|'Won'|'Lost'; owner: string; value: number; probability: number; lost_reason?: string, stage_updated_at: string, priority?: 'low' | 'medium' | 'high' }
export type Bill = { id: string; vendor: string; category: 'Software'|'Services'|'Office'|'Ads'; amount: number; due_date: string; status: 'Paid'|'Pending'|'Overdue' }
export type MonthlySeries = { month: string; revenue: number; cost: number; leads: number }
export type Target = { id: number; name: string; current: number; goal: number; unit: 'USD'|'Leads'|'Deals'; quarter: string }
export type EntityType = 'customers' | 'bills' | 'deals'

export type Report = {
  id: number
  name: string
  entity_type: EntityType
  columns: string[]
  available_columns: string[]
  date_from: string | null
  date_to: string | null
  created_at: string
  updated_at: string
}

export type ExportJob = {
  id: string
  report_id: number | null
  report_name: string
  entity_type: EntityType
  columns: string[]
  date_from: string | null
  date_to: string | null
  row_count: number | null
  status: 'Done' | 'Failed'
  created_by_name?: string
  created_at: string
}
export type Task = { id: number; title: string; due_date?: string; status: 'Open'|'Done'|'Cancelled'; customer_id?: string; deal_id?: string; assigned_to?: number; assignee_name?: string }
export type Activity = { id: number; type: string; entity_type: string; entity_id: string; description: string; metadata?: string; created_by?: number; created_at: string; user_name?: string }
export type RoiChannel = { id: number; name: string; spend: number; revenue: number }
export type InsightCard = { id: number; title: string; value: string; delta: string; tone: string; note: string }
export type HealthPoint = { id: number; day: string; score: number }

export type DealsRevenueSeries = {
  month: string
  year: string
  month_key: string
  revenue: number
  deals_count: number
  avg_ticket: number
}

export type DealsRevenueSummary = {
  series: DealsRevenueSeries[]
  totalRevenue: number
  totalDeals: number
  avgTicket: number
  pipeline: number
  openDeals: number
}

export type Summary = { totalMrr: number; atRisk: number; openDeals: number; pipeline: number; wonDeals: number; winRate: number; avgTicket: number; overdueBills: number }
export type PermissionMatrix = Record<string, Record<string, boolean>>
export type Settings = Record<string, string>

export type DealNote = {
  id: number
  deal_id: string
  content: string
  author?: string
  created_at: string
}

// ── Auth ───────────────────────────────────────────────────
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    request<{ token: string; user: AuthUser }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (email: string, password: string) =>
    request<{ token: string; user: AuthUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request<AuthUser>('/auth/me'),
  invite: (data: { name: string; email: string; role: string }) =>
    request<{ user: AuthUser; invite_link: string }>('/auth/invite', { method: 'POST', body: JSON.stringify(data) }),
  activate: (token: string, password: string) =>
    request<{ token: string; user: AuthUser }>('/auth/activate', { method: 'POST', body: JSON.stringify({ token, password }) }),
  updateMe: (data: { name?: string; password?: string }) =>
    request<AuthUser>('/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),
}

// ── Customers ──────────────────────────────────────────────
export const customersApi = {
  list: (p?: { plan?: string; status?: string; search?: string; minMrr?: number }) => {
    const qs = new URLSearchParams()
    if (p?.plan && p.plan !== 'all') qs.set('plan', p.plan)
    if (p?.status && p.status !== 'all') qs.set('status', p.status)
    if (p?.search) qs.set('search', p.search)
    if (p?.minMrr) qs.set('minMrr', String(p.minMrr))
    return request<Customer[]>(`/api/customers?${qs}`)
  },
  get: (id: string) => request<Customer & { deals: Deal[]; contacts: Contact[]; tasks: Task[]; activities: Activity[] }>(`/api/customers/${id}`),
  create: (data: Omit<Customer, 'id'|'last_contact'>) => request<Customer>('/api/customers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Customer>) => request<Customer>(`/api/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => request<{ deleted: boolean }>(`/api/customers/${id}`, { method: 'DELETE' }),
  addContact: (id: string, data: Omit<Contact,'id'|'customer_id'>) => request<Contact>(`/api/customers/${id}/contacts`, { method: 'POST', body: JSON.stringify(data) }),
  deleteContact: (id: string, cid: number) => request<{ deleted: boolean }>(`/api/customers/${id}/contacts/${cid}`, { method: 'DELETE' }),
  addNote: (id: string, text: string) => request<Activity>(`/api/customers/${id}/notes`, { method: 'POST', body: JSON.stringify({ text }) }),
}

// ── Deals ──────────────────────────────────────────────────
export const dealsApi = {
  list: (p?: { owner?: string; stage?: string; minValue?: number; customer_id?: string }) => {
    const qs = new URLSearchParams()
    if (p?.owner && p.owner !== 'all') qs.set('owner', p.owner)
    if (p?.stage && p.stage !== 'all') qs.set('stage', p.stage)
    if (p?.minValue) qs.set('minValue', String(p.minValue))
    if (p?.customer_id) qs.set('customer_id', p.customer_id)
    return request<Deal[]>(`/api/deals?${qs}`)
  },
  get: (id: string) => request<Deal & { activities: Activity[] }>(`/api/deals/${id}`),
  create: (data: Omit<Deal,'id'>) => request<Deal>('/api/deals', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Deal>) => request<Deal>(`/api/deals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  move: (id: string, direction: 'next'|'prev') => request<Deal>(`/api/deals/${id}/move`, { method: 'PATCH', body: JSON.stringify({ direction }) }),
  remove: (id: string) => request<{ deleted: boolean }>(`/api/deals/${id}`, { method: 'DELETE' }),
  addNote: (id: string, text: string) => request<Activity>(`/api/deals/${id}/notes`, { method: 'POST', body: JSON.stringify({ text }) }),
}

// ── Bills ──────────────────────────────────────────────────
export const billsApi = {
  list: (p?: { category?: string; status?: string; period?: string }) => {
    const qs = new URLSearchParams()
    if (p?.category && p.category !== 'all') qs.set('category', p.category)
    if (p?.period && p.period !== 'all') qs.set('period', p.period)
    if (p?.status && p.status !== 'all') qs.set('status', p.status)
    return request<Bill[]>(`/api/bills?${qs}`)
  },
  create: (data: Omit<Bill,'id'>) => request<Bill>('/api/bills', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Bill>) => request<Bill>(`/api/bills/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => request<{ deleted: boolean }>(`/api/bills/${id}`, { method: 'DELETE' }),
}

// ── Analytics ──────────────────────────────────────────────
export const analyticsApi = {
  series: (p?: { region?: string; category?: string; period?: string }) => {
    const qs = new URLSearchParams()
    if (p?.region && p.region !== 'all') qs.set('region', p.region)
    if (p?.category && p.category !== 'all') qs.set('category', p.category)
    if (p?.period && p.period !== 'all') qs.set('period', p.period)
    return request<MonthlySeries[]>(`/api/analytics/series?${qs}`)
  },
  targets: (quarter?: string) => request<Target[]>(`/api/analytics/targets${quarter ? `?quarter=${quarter}` : ''}`),
  updateTarget: (id: number, data: Partial<Target>) => request<Target>(`/api/analytics/targets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  // Report templates
  reports: (entity_type?: string) => {
    const qs = entity_type && entity_type !== 'all' ? `?entity_type=${entity_type}` : ''
    return request<Report[]>(`/api/analytics/reports${qs}`)
  },
  getReport: (id: number) => request<Report>(`/api/analytics/reports/${id}`),
  createReport: (data: { name: string; entity_type: EntityType; columns: string[]; date_from?: string | null; date_to?: string | null }) =>
    request<Report>('/api/analytics/reports', { method: 'POST', body: JSON.stringify(data) }),
  updateReport: (id: number, data: Partial<Pick<Report, 'name' | 'columns' | 'date_from' | 'date_to'>>) =>
    request<Report>(`/api/analytics/reports/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteReport: (id: number) => request<{ deleted: boolean }>(`/api/analytics/reports/${id}`, { method: 'DELETE' }),
  availableColumns: () => request<Record<EntityType, string[]>>('/api/analytics/available-columns'),
  // Export jobs
  exportJobs: (report_id?: number) => {
    const qs = report_id ? `?report_id=${report_id}` : ''
    return request<ExportJob[]>(`/api/analytics/export-jobs${qs}`)
  },
  summary: () => request<Summary>('/api/analytics/summary'),
  dealsRevenue: (period?: string) => request<DealsRevenueSummary>(`/api/analytics/deals-revenue${period ? `?period=${period}` : ''}`),
}

// ── Tasks ──────────────────────────────────────────────────
export const tasksApi = {
  list: (p?: { customer_id?: string; deal_id?: string; status?: string }) => {
    const qs = new URLSearchParams()
    if (p?.customer_id) qs.set('customer_id', p.customer_id)
    if (p?.deal_id) qs.set('deal_id', p.deal_id)
    if (p?.status && p.status !== 'all') qs.set('status', p.status)
    return request<Task[]>(`/api/tasks?${qs}`)
  },
  create: (data: Partial<Task> & { title: string }) => request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Task>) => request<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: number) => request<{ deleted: boolean }>(`/api/tasks/${id}`, { method: 'DELETE' }),
}

// exportJobsApi foi integrado ao analyticsApi (runReport, exportJobs)

// ── Admin ──────────────────────────────────────────────────
export const adminApi = {
  users: (p?: { role?: string; status?: string }) => {
    const qs = new URLSearchParams()
    if (p?.role && p.role !== 'all') qs.set('role', p.role)
    if (p?.status && p.status !== 'all') qs.set('status', p.status)
    return request<AuthUser[]>(`/api/admin/users?${qs}`)
  },
  updateUser: (id: number, data: Partial<AuthUser>) => request<AuthUser>(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteUser: (id: number) => request<{ deleted: boolean }>(`/api/admin/users/${id}`, { method: 'DELETE' }),
  permissions: () => request<PermissionMatrix>('/api/admin/permissions'),
  updatePermission: (role: string, permission_key: string, enabled: boolean) =>
    request('/api/admin/permissions', { method: 'PATCH', body: JSON.stringify({ role, permission_key, enabled }) }),
  settings: () => request<Settings>('/api/admin/settings'),
  updateSettings: (data: Partial<Settings>) => request<Settings>('/api/admin/settings', { method: 'PATCH', body: JSON.stringify(data) }),
  activities: (p?: { entity_type?: string; entity_id?: string; limit?: number }) => {
    const qs = new URLSearchParams()
    if (p?.entity_type) qs.set('entity_type', p.entity_type)
    if (p?.entity_id) qs.set('entity_id', p.entity_id)
    if (p?.limit) qs.set('limit', String(p.limit))
    return request<Activity[]>(`/api/admin/activities?${qs}`)
  },
}

// ── Finances ──────────────────────────────────────────────
export const financesApi = {
  roiChannels: () => request<RoiChannel[]>('/api/finances/roi-channels'),
  updateChannel: (id: number, data: Partial<RoiChannel>) => request<RoiChannel>(`/api/finances/roi-channels/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
}

// ── Insights ──────────────────────────────────────────────
export const insightsApi = {
  cards: () => request<InsightCard[]>('/api/insights/cards'),
  healthSeries: () => request<HealthPoint[]>('/api/insights/health-series'),
}

// ── DealNotes ──────────────────────────────────────────────
export const dealNotesApi = {
  list: (dealId: string) =>
    request<DealNote[]>(`/api/deal-notes/${dealId}`),

  create: (
    dealId: string,
    payload: { content: string }
  ) =>
    request<DealNote>(
      `/api/deal-notes/${dealId}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),
}
