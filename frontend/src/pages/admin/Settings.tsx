import PageHeader from '../../components/PageHeader'
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { adminApi } from '../../lib/api'
import { useApi } from '../../lib/useApi'
import { useT } from '../../lib/i18n'

export default function AdminSettings() {
  const { t } = useT()
  const s = t.settings

  const { data: settings, loading } = useApi(() => adminApi.settings(), [])

  return (
    <div className="space-y-5">
      <PageHeader
        title={s.title}
subtitle={s.quickOps}
        right={<Badge tone="blue">{s.envProd}</Badge>}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{s.quickOps}</CardTitle><CardSubtitle>{s.authAudit}</CardSubtitle></CardHeader>
          <CardContent className="space-y-3">
            <Button variant="ghost" className="w-full justify-start border border-border bg-white">{s.inviteUser}</Button>
            <Button variant="ghost" className="w-full justify-start border border-border bg-white">{s.exportLogs}</Button>
            <Button variant="ghost" className="w-full justify-start border border-border bg-white">{s.security}</Button>
            <Button variant="ghost" className="w-full justify-start border border-border bg-white">{s.rotateKeys}</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{s.title}</CardTitle><CardSubtitle>company · system</CardSubtitle></CardHeader>
          <CardContent>
            {loading
              ? <div className="animate-pulse space-y-3">{Array.from({length:4}).map((_,i) => <div key={i} className="h-10 rounded-xl bg-slate-100" />)}</div>
              : (
                <div className="space-y-3">
                  {Object.entries(settings ?? {}).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between rounded-xl border border-border bg-slate-50 px-4 py-3">
                      <span className="text-xs font-medium text-slate-700">{key}</span>
                      <Badge tone="gray">{String(value)}</Badge>
                    </div>
                  ))}
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
