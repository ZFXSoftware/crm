import { useState } from 'react'
import PageHeader from '../../components/PageHeader'
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { analyticsApi, type Report, type ExportJob, type EntityType, API_BASE } from '../../lib/api'
import { useApi } from '../../lib/useApi'
import { useT } from '../../lib/i18n'

const ENTITY_TONE: Record<EntityType, 'blue'|'green'|'purple'> = { customers:'blue', bills:'green', deals:'purple' }

export default function AnalyticsExports() {
  const { t } = useT()
  const e = t.exports
  const c = t.common
  const rt = t.reports
  const [generating, setGenerating] = useState<number | null>(null)

  const { data: reports, loading: loadingReports } = useApi(() => analyticsApi.reports(), [])
  const { data: jobs, loading: loadingJobs, refetch: refetchJobs } = useApi(() => analyticsApi.exportJobs(), [])

  const templateList = reports ?? []
  const jobList = jobs ?? []

  // Labels de tipo usando traduções
  function entityLabel(et: EntityType) {
    const map: Record<EntityType, string> = {
      customers: rt.types.customers,
      bills: rt.types.bills,
      deals: rt.types.deals,
    }
    return map[et] ?? et
  }

  // Labels de coluna usando traduções
  function colLabel(col: string): string {
    return (rt.colLabels as any)[col] ?? col
  }

  async function runReport(report: Report) {
    setGenerating(report.id)
    try {
      const token = localStorage.getItem('crm_token')
      const res = await fetch(`${API_BASE}/api/analytics/export-jobs/${report.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(err.error ?? e.exportError)
      }
      const blob = await res.blob()
      const filename = `${report.name.replace(/[^a-z0-9]/gi, '-')}-${new Date().toISOString().slice(0,10)}.csv`
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(a.href)
      refetchJobs()
    } catch (err: any) {
      alert(`${e.exportError}: ${err.message}`)
      refetchJobs()
    } finally { setGenerating(null) }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={e.title} subtitle={e.subtitle} />

      <Card>
        <CardHeader>
          <CardTitle>{e.templates}</CardTitle>
          <CardSubtitle>{loadingReports ? c.loading : `${templateList.length} templates`}</CardSubtitle>
        </CardHeader>
        <CardContent>
          {loadingReports
            ? <div className="space-y-3">{Array.from({length:3}).map((_,i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}</div>
            : templateList.length === 0
              ? <div className="rounded-xl border border-dashed border-border bg-slate-50 py-10 text-center text-sm text-muted">{e.noTemplates}</div>
              : (
                <div className="space-y-3">
                  {templateList.map(r => (
                    <div key={r.id} className="flex items-center gap-4 rounded-xl border border-border bg-white p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold truncate">{r.name}</span>
                          <Badge tone={ENTITY_TONE[r.entity_type]}>{entityLabel(r.entity_type)}</Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <span className="text-xs text-muted">{r.columns.length} {rt.columns}:</span>
                          {r.columns.slice(0, 5).map(col => (
                            <span key={col} className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{colLabel(col)}</span>
                          ))}
                          {r.columns.length > 5 && <span className="text-[11px] text-muted">+{r.columns.length - 5}</span>}
                        </div>
                        {(r.date_from || r.date_to) && (
                          <div className="mt-1 text-xs text-muted">
                            {c.period}: {r.date_from ?? rt.beginning} → {r.date_to ?? rt.today}
                          </div>
                        )}
                      </div>
                      <Button onClick={() => runReport(r)} disabled={generating === r.id} className="shrink-0">
                        {generating === r.id ? (
                          <span className="flex items-center gap-2">
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                            </svg>
                            {c.generating}
                          </span>
                        ) : e.generate}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{e.history}</CardTitle>
          <CardSubtitle>{loadingJobs ? c.loading : `${jobList.length} exports`}</CardSubtitle>
        </CardHeader>
        <CardContent>
          {loadingJobs
            ? <div className="space-y-2">{Array.from({length:3}).map((_,i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}</div>
            : jobList.length === 0
              ? <div className="rounded-xl border border-dashed border-border bg-slate-50 py-8 text-center text-sm text-muted">{e.noHistory}</div>
              : (
                <div className="overflow-hidden rounded-card border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-muted">
                      <tr>
                        <th className="px-4 py-3">{e.template}</th>
                        <th className="px-4 py-3">{c.type}</th>
                        <th className="px-4 py-3">{c.lines}</th>
                        <th className="px-4 py-3">{e.period}</th>
                        <th className="px-4 py-3">{c.status}</th>
                        <th className="px-4 py-3">{c.generatedAt}</th>
                        <th className="px-4 py-3">{c.by}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobList.map(j => (
                        <tr key={j.id} className="border-t border-border">
                          <td className="px-4 py-3"><div className="font-medium">{j.report_name}</div><div className="text-xs text-muted">{j.id}</div></td>
                          <td className="px-4 py-3"><Badge tone={ENTITY_TONE[j.entity_type as EntityType] ?? 'gray'}>{entityLabel(j.entity_type as EntityType)}</Badge></td>
                          <td className="px-4 py-3">{j.row_count !== null ? j.row_count?.toLocaleString() : '—'}</td>
                          <td className="px-4 py-3 text-xs text-muted">{j.date_from || j.date_to ? `${j.date_from ?? rt.beginning} → ${j.date_to ?? rt.today}` : e.allTime}</td>
                          <td className="px-4 py-3"><Badge tone={j.status === 'Done' ? 'green' : 'red'}>{j.status}</Badge></td>
                          <td className="px-4 py-3 text-muted">{new Date(j.created_at).toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short' })}</td>
                          <td className="px-4 py-3 text-muted">{j.created_by_name ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
        </CardContent>
      </Card>
    </div>
  )
}
