import { useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { analyticsApi } from '../../lib/api'
import { useApi } from '../../lib/useApi'
import { useT } from '../../lib/i18n'

export default function FinanceGrowth() {
  const { t } = useT()
  const g = t.growth
  const c = t.common

  const [period, setPeriod] = useState('12m')
  const [mode, setMode]     = useState('real') // 'real' = deals, 'estimated' = série mensal

  // Dados reais dos deals Won
  const { data: dealsData } = useApi(() => analyticsApi.dealsRevenue(period), [period])
  // Série histórica estimada
  const { data: series, loading } = useApi(() => analyticsApi.series({ period }), [period])

  const src = series ?? []

  // Growth baseado nos dados reais dos deals
  const dealsChartData = (dealsData?.series ?? []).map(x => ({
    m: `${x.month}/${x.year?.slice(-2)}`,
    revenue: x.revenue,
    deals: x.deals_count,
  }))

  const dealsGrowth = useMemo(() => {
    if (dealsChartData.length < 2) return 0
    const first = dealsChartData[0].revenue
    const last  = dealsChartData[dealsChartData.length - 1].revenue
    return first > 0 ? Math.round(((last - first) / first) * 100) : 0
  }, [dealsChartData])

  // Growth histórico estimado
  const histChartData = src.map(x => ({ m: x.month, revenue: x.revenue, cost: x.cost }))
  const histGrowth = useMemo(() => {
    if (src.length < 2) return 0
    const first = src[0].revenue, last = src[src.length-1].revenue
    return first > 0 ? Math.round(((last - first) / first) * 100) : 0
  }, [src])

  const isReal = mode === 'real'
  const chartData = isReal ? dealsChartData : histChartData
  const growth    = isReal ? dealsGrowth : histGrowth
  const growthLabel = period === '12m' ? g.yoy : `${src.length}m Growth`

  return (
    <div className="space-y-5">
      <PageHeader
        title={g.title}
        subtitle={isReal ? 'Crescimento baseado nos deals fechados reais.' : g.subtitle}
        filters={[
          { label: 'Fonte', value: mode, onChange: setMode, options: [
            { label: '★ Deals Fechados (Real)', value: 'real'      },
            { label: 'Série histórica (estimado)', value: 'estimated' },
          ]},
          { label: c.timePeriod, value: period, onChange: setPeriod, options: [
            { label: c.timePeriods.m12, value: '12m' },
            { label: c.timePeriods.m6,  value: '6m'  },
          ]},
        ]}
      />

      <div className="grid gap-5 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{growthLabel}</CardTitle>
            <CardSubtitle>{isReal ? 'Primeiro vs último mês com deals' : g.yoySub}</CardSubtitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold">{loading && !isReal ? '…' : `${growth}%`}</div>
            <Badge tone={growth >= 20 ? 'green' : growth >= 0 ? 'blue' : 'red'}>{g.trend}</Badge>
          </CardContent>
        </Card>

        {isReal ? (
          <>
            <Card>
              <CardHeader><CardTitle>Deals Fechados</CardTitle><CardSubtitle>Total no período</CardSubtitle></CardHeader>
              <CardContent className="flex items-end justify-between">
                <div className="text-3xl font-semibold">{dealsData?.totalDeals ?? 0}</div>
                <Badge tone="green">Won</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Receita Total</CardTitle><CardSubtitle>Deals fechados</CardSubtitle></CardHeader>
              <CardContent className="flex items-end justify-between">
                <div className="text-3xl font-semibold">
                  {new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 }).format(dealsData?.totalRevenue ?? 0)}
                </div>
                <Badge tone="green">{g.up}</Badge>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader><CardTitle>{g.lastRevenue}</CardTitle><CardSubtitle>{g.inThousands}</CardSubtitle></CardHeader>
              <CardContent className="flex items-end justify-between">
                <div className="text-3xl font-semibold">{loading ? '…' : `${src[src.length-1]?.revenue ?? 0}k`}</div>
                <Badge tone="green">{g.up}</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>{g.lastCost}</CardTitle><CardSubtitle>{g.inThousands}</CardSubtitle></CardHeader>
              <CardContent className="flex items-end justify-between">
                <div className="text-3xl font-semibold">{loading ? '…' : `${src[src.length-1]?.cost ?? 0}k`}</div>
                <Badge tone="amber">{g.watch}</Badge>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isReal ? 'Receita por Mês (Deals Won)' : `${mode === 'revenue' ? 'Receita' : 'Custo'} por Mês`}</CardTitle>
          <CardSubtitle>{isReal ? 'Dados reais do pipeline' : g.barSub}</CardSubtitle>
        </CardHeader>
        <CardContent className="h-[340px]">
          {isReal && dealsChartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              Nenhum deal fechado ainda. Feche deals no Pipeline para ver aqui.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="m" />
                <YAxis tickFormatter={v => isReal ? `$${(v/1000).toFixed(0)}k` : `${v}k`} />
                <Tooltip formatter={(v: number) => [
                  isReal ? `$${v.toLocaleString()}` : `${v}k`,
                  isReal ? 'Receita' : 'Valor'
                ]} />
                <Bar dataKey="revenue" fill="#0f172a" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
