import { useState } from 'react'
import PageHeader from '../../components/PageHeader'
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { financesApi } from '../../lib/api'
import { useApi } from '../../lib/useApi'
import { useT } from '../../lib/i18n'

const COLORS = ['#0f172a','#334155','#64748b','#94a3b8']

export default function FinanceROI() {
  const { t } = useT()
  const r = t.roi
  const [channel, setChannel] = useState('all')
  const [mode, setMode] = useState('return')

  const { data: channels, loading, error } = useApi(() => financesApi.roiChannels(), [])
  const allChannels = channels ?? []
  const filtered = channel === 'all' ? allChannels : allChannels.filter(c => c.name === channel)
  const chartData = filtered.map(c => ({ name: c.name, value: mode === 'return' ? c.revenue : c.spend }))
  const sum = chartData.reduce((s, d) => s + d.value, 0)

  const channelOptions = [
    { label: r.filters.allChannels, value: 'all' },
    ...allChannels.map(c => ({ label: c.name, value: c.name })),
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title={r.title}
        subtitle={r.subtitle}
        filters={[
          { label: r.channel, value: channel, onChange: setChannel, options: channelOptions },
          { label: 'Metric', value: mode, onChange: setMode, options: [
            { label: r.filters.return, value: 'return' },
            { label: r.filters.spend,  value: 'spend'  },
          ]},
        ]}
        right={<Badge tone="blue">Total: ${loading ? '…' : sum.toLocaleString()}</Badge>}
      />
      {error && <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{t.common.backendError}</div>}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{r.distribution}</CardTitle><CardSubtitle>{mode === 'return' ? r.distSub : r.spend}</CardSubtitle></CardHeader>
          <CardContent className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={90} outerRadius={130} paddingAngle={2}>
                  {chartData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, mode === 'return' ? r.return : r.spend]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{r.tableTitle}</CardTitle><CardSubtitle>{r.tableSub}</CardSubtitle></CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-card border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-muted">
                  <tr><th className="px-4 py-3">{r.channel}</th><th className="px-4 py-3">{r.spend}</th><th className="px-4 py-3">{r.return}</th><th className="px-4 py-3">ROI</th></tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({length:4}).map((_,i) => <tr key={i} className="border-t border-border animate-pulse"><td className="px-4 py-3"><div className="h-4 w-16 rounded bg-slate-100" /></td><td /><td /><td /></tr>)
                    : filtered.map(ch => {
                        const roi = Math.round(((ch.revenue - ch.spend) / ch.spend) * 100)
                        return (
                          <tr key={ch.name} className="border-t border-border">
                            <td className="px-4 py-3 font-semibold">{ch.name}</td>
                            <td className="px-4 py-3">${ch.spend.toLocaleString()}</td>
                            <td className="px-4 py-3">${ch.revenue.toLocaleString()}</td>
                            <td className="px-4 py-3"><Badge tone={roi >= 100 ? 'green' : roi >= 60 ? 'blue' : 'amber'}>{roi}%</Badge></td>
                          </tr>
                        )
                      })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted">{r.note}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
