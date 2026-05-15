import { useApi } from '../../lib/useApi'
import PageHeader from '../../components/PageHeader'
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { insightsApi } from '../../lib/api'
import { useT } from '../../lib/i18n'

export default function AnalyticsInsights() {
  const { t } = useT()
  const i = t.insights
  const { data: cards, loading: loadingCards, error } = useApi(() => insightsApi.cards(), [])
  const { data: rawSeries, loading: loadingSeries } = useApi(() => insightsApi.healthSeries(), [])
  const series = (rawSeries ?? []).map(x => ({ d: x.day, v: x.score }))

  return (
    <div className="space-y-5">
      <PageHeader title={i.title} subtitle={i.subtitle} />
      {error && <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{t.common.backendError}</div>}
      <div className="grid gap-5 md:grid-cols-4">
        {loadingCards
          ? Array.from({length:4}).map((_,idx) => <Card key={idx} className="animate-pulse"><CardContent className="h-24" /></Card>)
          : (cards ?? []).map(card => (
              <Card key={card.title}>
                <CardHeader><CardTitle>{card.title}</CardTitle><CardSubtitle>{card.note}</CardSubtitle></CardHeader>
                <CardContent className="flex items-end justify-between">
                  <div className="text-3xl font-semibold">{card.value}</div>
                  <Badge tone={card.tone as any}>{card.delta}</Badge>
                </CardContent>
              </Card>
            ))}
      </div>
      <Card>
        <CardHeader><CardTitle>{i.healthTitle}</CardTitle><CardSubtitle>{i.healthSub}</CardSubtitle></CardHeader>
        <CardContent className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="d" /><YAxis domain={[0, 100]} />
              <Tooltip formatter={(v: number) => [`${v}`, 'Score']} />
              <Line type="monotone" dataKey="v" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
