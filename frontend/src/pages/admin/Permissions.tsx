import { useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { adminApi } from '../../lib/api'
import { useApi } from '../../lib/useApi'
import { useT } from '../../lib/i18n'

type Role = 'Admin' | 'Manager' | 'Analyst'
type PermKey = 'view_sales'|'edit_sales'|'view_finance'|'edit_finance'|'manage_users'|'export_data'

const PERM_KEYS: PermKey[] = ['view_sales','edit_sales','view_finance','edit_finance','manage_users','export_data']

export default function AdminPermissions() {
  const { t } = useT()
  const p = t.permissions
  const c = t.common

  const [selectedRole, setSelectedRole] = useState<Role>('Admin')
  const [saving, setSaving] = useState(false)

  const { data: matrix, loading, refetch } = useApi(() => adminApi.permissions(), [])

  const enabledCount = useMemo(() => {
    if (!matrix?.[selectedRole]) return 0
    return Object.values(matrix[selectedRole]).filter(Boolean).length
  }, [matrix, selectedRole])

  async function toggle(key: PermKey) {
    if (!matrix) return
    const current = matrix[selectedRole]?.[key] ?? false
    setSaving(true)
    try { await adminApi.updatePermission(selectedRole, key, !current); refetch() }
    catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  const ROLES: { key: Role; tone: 'purple'|'blue'|'gray' }[] = [
    { key: 'Admin',   tone: 'purple' },
    { key: 'Manager', tone: 'blue'   },
    { key: 'Analyst', tone: 'gray'   },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title={p.title}
        subtitle={p.subtitle}
        right={<Badge tone="blue">{selectedRole}: {enabledCount}/{PERM_KEYS.length} {p.enabled.toLowerCase()}</Badge>}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {ROLES.map(({ key, tone }) => {
          const info = p.roles[key.toLowerCase() as keyof typeof p.roles]
          return (
            <button key={key} onClick={() => setSelectedRole(key)}
              className={`rounded-card border border-border bg-white p-5 text-left shadow-soft transition ${selectedRole===key?'ring-2 ring-slate-900':'hover:bg-slate-50'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold">{info.name}</div>
                  <div className="mt-1 text-xs text-muted">{info.sub}</div>
                </div>
                <Badge tone={tone}>{info.name}</Badge>
              </div>
            </button>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{p.matrixTitle} {selectedRole}</CardTitle>
          <CardSubtitle>{p.matrixSub}</CardSubtitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-card border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-muted">
                <tr>
                  <th className="px-4 py-3">{p.permission}</th>
                  <th className="px-4 py-3">{p.description}</th>
                  <th className="px-4 py-3 text-right">{p.enabled}</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({length:6}).map((_,i) => (
                      <tr key={i} className="border-t border-border animate-pulse">
                        <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-slate-100" /></td><td /><td />
                      </tr>
                    ))
                  : PERM_KEYS.map(key => {
                      const info = p.keys[key]
                      const enabled = matrix?.[selectedRole]?.[key] ?? false
                      return (
                        <tr key={key} className="border-t border-border">
                          <td className="px-4 py-3 font-semibold">{info.label}</td>
                          <td className="px-4 py-3 text-muted">{info.desc}</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => toggle(key)} disabled={saving}
                              className={`h-8 w-14 rounded-full border border-border p-1 transition ${enabled?'bg-slate-900':'bg-slate-100'} disabled:opacity-50`}>
                              <div className={`h-6 w-6 rounded-full bg-white transition-transform ${enabled?'translate-x-6':'translate-x-0'}`} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">{p.note}</p>
        </CardContent>
      </Card>
    </div>
  )
}
