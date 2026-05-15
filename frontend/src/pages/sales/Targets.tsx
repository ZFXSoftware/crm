import { useApi } from '../../lib/useApi'
import { useState } from 'react'
import PageHeader from '../../components/PageHeader'
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { analyticsApi, type Target } from '../../lib/api'
import { useT } from '../../lib/i18n'

function fmt(t: Target) {
  if (t.unit === 'USD') return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 }).format(t.current)
  return t.current.toLocaleString()
}

export default function SalesTargets() {
  const { t } = useT()
  const tg = t.targets
  const c = t.common
  const [quarter, setQuarter] = useState('q1')
  const [nudging, setNudging] = useState<number | null>(null)
  const { data, loading, refetch } = useApi(() => analyticsApi.targets(quarter), [quarter])
  const targets = data ?? []

  async function nudge(target: Target) {
    setNudging(target.id)
    try { await analyticsApi.updateTarget(target.id, { current: Math.round(target.current * 1.03) }); refetch() }
    catch (e: any) { alert(e.message) }
    finally { setNudging(null) }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={tg.title}
        subtitle={tg.subtitle}
        filters={[
          { label: 'Quarter', value: quarter, onChange: setQuarter, options: [
            { label: 'Q1', value: 'q1' }, { label: 'Q2', value: 'q2' },
            { label: 'Q3', value: 'q3' }, { label: 'Q4', value: 'q4' },
          ]},
        ]}
      />
      <div className="grid gap-5 md:grid-cols-3">
        {loading
          ? Array.from({length:3}).map((_,i) => <Card key={i} className="animate-pulse"><CardContent className="h-32" /></Card>)
          : targets.map(target => {
              const pct = Math.min(100, Math.round((target.current / target.goal) * 100))
              const tone = pct >= 90 ? 'green' : pct >= 70 ? 'blue' : 'amber'
              const goalFmt = target.unit === 'USD'
                ? new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 }).format(target.goal)
                : target.goal.toLocaleString()
              return (
                <Card key={target.id}>
                  <CardHeader>
                    <CardTitle>{target.name}</CardTitle>
                    <CardSubtitle>{tg.goal}: {goalFmt}</CardSubtitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between">
                      <div className="text-3xl font-semibold">{fmt(target)}</div>
                      <Badge tone={tone as any}>{pct}%</Badge>
                    </div>
                    <div className="mt-4 h-2 w-full rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-slate-900 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button size="sm" variant="ghost" className="border border-border bg-white"
                        onClick={() => nudge(target)} disabled={nudging === target.id}>
                        {nudging === target.id ? c.saving : tg.nudge}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
      </div>
    </div>
  )
}
