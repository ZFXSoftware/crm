import { useState } from 'react'
import PageHeader from '../../components/PageHeader'
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input, Modal } from '../../components/ui/Modal'
import { analyticsApi, type Report, type EntityType } from '../../lib/api'
import { useApi } from '../../lib/useApi'
import { useT, interpolate } from '../../lib/i18n'

const ENTITY_COLUMNS: Record<EntityType, string[]> = {
  customers: ['id','name','email','company','plan','status','mrr','last_contact','created_at'],
  bills:     ['id','vendor','category','amount','due_date','status','created_at'],
  deals:     ['id','company','stage','owner','value','probability','lost_reason','created_at'],
}
const ENTITY_TONE: Record<EntityType, 'blue'|'green'|'purple'> = { customers:'blue', bills:'green', deals:'purple' }
type FormState = { name:string; entity_type:EntityType; columns:string[]; date_from:string; date_to:string }
const emptyForm: FormState = { name:'', entity_type:'customers', columns:ENTITY_COLUMNS['customers'], date_from:'', date_to:'' }

export default function AnalyticsReports() {
  const { t } = useT()
  const r = t.reports
  const c = t.common

  const [entityFilter, setEntityFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingReport, setEditingReport] = useState<Report | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  const { data, loading, error, refetch } = useApi(() => analyticsApi.reports(entityFilter), [entityFilter])
  const reports = data ?? []

  function openCreate() { setEditingReport(null); setForm(emptyForm); setModalOpen(true) }
  function openEdit(rep: Report) {
    setEditingReport(rep)
    setForm({ name:rep.name, entity_type:rep.entity_type, columns:rep.columns, date_from:rep.date_from??'', date_to:rep.date_to??'' })
    setModalOpen(true)
  }
  function handleEntityChange(entity_type: EntityType) { setForm(p => ({ ...p, entity_type, columns:ENTITY_COLUMNS[entity_type] })) }
  function toggleColumn(col: string) { setForm(p => ({ ...p, columns:p.columns.includes(col)?p.columns.filter(x=>x!==col):[...p.columns,col] })) }

  async function save() {
    if (!form.name.trim()) return alert(r.nameLabel)
    if (form.columns.length === 0) return alert(r.colsMin)
    setSaving(true)
    try {
      const payload = { name:form.name.trim(), entity_type:form.entity_type, columns:form.columns, date_from:form.date_from||null, date_to:form.date_to||null }
      editingReport ? await analyticsApi.updateReport(editingReport.id, payload) : await analyticsApi.createReport(payload)
      refetch(); setModalOpen(false)
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  async function deleteReport(rep: Report) {
    if (!confirm(interpolate(r.deleteConfirm, rep.name))) return
    setDeleting(rep.id)
    try { await analyticsApi.deleteReport(rep.id); refetch() }
    catch (e: any) { alert(e.message) }
    finally { setDeleting(null) }
  }

  const availableCols = ENTITY_COLUMNS[form.entity_type] ?? []
  const ALL_ENTITIES: EntityType[] = ['customers', 'bills', 'deals']

  return (
    <div className="space-y-5">
      <PageHeader
        title={r.title}
        subtitle={r.subtitle}
        filters={[
          { label: c.type, value: entityFilter, onChange: setEntityFilter, options: [
            { label: r.types.all,       value: 'all'       },
            { label: r.types.customers, value: 'customers' },
            { label: r.types.bills,     value: 'bills'     },
            { label: r.types.deals,     value: 'deals'     },
          ]},
        ]}
        right={<Button onClick={openCreate}>{r.newTemplate}</Button>}
      />

      {error && <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{c.backendError}</div>}

      {!loading && reports.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-white py-16 text-center">
          <div className="text-sm font-medium text-slate-700">{r.noTemplates}</div>
          <div className="mt-1 text-xs text-muted">{r.noTemplSub}</div>
          <Button className="mt-4" onClick={openCreate}>{r.newTemplate}</Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({length:3}).map((_,i) => <div key={i} className="h-44 animate-pulse rounded-card bg-slate-100" />)
          : reports.map(rep => (
              <div key={rep.id} className="flex flex-col rounded-card border border-border bg-white p-5 shadow-soft">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{rep.name}</div>
                    <div className="mt-0.5 text-xs text-muted">
                      {rep.columns.length} {r.columns}
                      {(rep.date_from || rep.date_to) && <span> · {rep.date_from ?? r.beginning} → {rep.date_to ?? r.today}</span>}
                    </div>
                  </div>
                  <Badge tone={ENTITY_TONE[rep.entity_type]}>{r.types[rep.entity_type]}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {rep.columns.map(col => (
                    <span key={col} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                      {(r.colLabels as any)[col] ?? col}
                    </span>
                  ))}
                </div>
                <div className="mt-auto pt-4 flex items-center gap-2">
                  <Button size="sm" variant="ghost" className="border border-border bg-white" onClick={() => openEdit(rep)}>{c.edit}</Button>
                  <Button size="sm" variant="ghost" className="border border-red-200 bg-white text-red-600 hover:bg-red-50"
                    onClick={() => deleteReport(rep)} disabled={deleting === rep.id}>
                    {deleting === rep.id ? '…' : c.delete}
                  </Button>
                </div>
              </div>
            ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editingReport ? `${r.editTitle} — ${editingReport.name}` : r.modalTitle}
        subtitle={r.modalSub}
        footer={<><Button variant="ghost" className="border border-border bg-white" onClick={() => setModalOpen(false)}>{c.cancel}</Button><Button onClick={save} disabled={saving}>{saving ? c.saving : editingReport ? c.save : c.create}</Button></>}
      >
        <div className="space-y-5">
          <div>
            <div className="mb-2 text-xs font-medium text-muted">{r.nameLabel}</div>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name:e.target.value }))} placeholder={r.namePh} />
          </div>

          {!editingReport && (
            <div>
              <div className="mb-2 text-xs font-medium text-muted">{r.typeLabel}</div>
              <div className="flex gap-2">
                {ALL_ENTITIES.map(e => (
                  <button key={e} onClick={() => handleEntityChange(e)}
                    className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition ${form.entity_type===e?'border-slate-900 bg-slate-900 text-white':'border-border bg-white text-slate-700 hover:bg-slate-50'}`}>
                    {r.types[e]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-medium text-muted">{r.colsLabel}</div>
              <div className="flex gap-3">
                <button className="text-xs text-slate-500 hover:text-slate-900" onClick={() => setForm(p => ({ ...p, columns:availableCols }))}>{r.colsAll}</button>
                <button className="text-xs text-slate-500 hover:text-slate-900" onClick={() => setForm(p => ({ ...p, columns:[] }))}>{r.colsNone}</button>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-slate-50 p-3">
              <div className="flex flex-wrap gap-2">
                {availableCols.map(col => {
                  const sel = form.columns.includes(col)
                  return (
                    <button key={col} onClick={() => toggleColumn(col)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${sel?'border-slate-900 bg-slate-900 text-white':'border-border bg-white text-slate-700 hover:bg-slate-100'}`}>
                      {sel && <span>✓</span>}{(r.colLabels as any)[col] ?? col}
                    </button>
                  )
                })}
              </div>
              {form.columns.length === 0 && <div className="mt-2 text-xs text-red-500">{r.colsMin}</div>}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-medium text-muted">
              {r.periodLabel} ({form.entity_type==='bills' ? r.periodSub : r.periodSub2}) — {r.periodOpt}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><div className="mb-1 text-[11px] text-muted">{c.from}</div><Input type="date" value={form.date_from} onChange={e => setForm(p => ({ ...p, date_from:e.target.value }))} /></div>
              <div><div className="mb-1 text-[11px] text-muted">{c.to}</div><Input type="date" value={form.date_to} onChange={e => setForm(p => ({ ...p, date_to:e.target.value }))} /></div>
            </div>
          </div>

          {form.columns.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              <div className="mb-1 text-xs font-semibold text-blue-700">{r.preview}</div>
              <code className="block overflow-x-auto whitespace-nowrap text-[11px] text-blue-600">
                {form.columns.join(',')}
              </code>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
