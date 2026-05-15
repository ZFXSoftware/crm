import { useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { analyticsApi } from '../../lib/api'
import { useApi } from '../../lib/useApi'
import { useT } from '../../lib/i18n'

const FX_RATES: Record<string, number> = { usd: 1, eur: 0.92, brl: 5.0 }
const SOURCE_SHARE: Record<string, number> = { all: 1, sub: 0.68, svc: 0.32 }

export default function FinanceRevenue() {
  const { t } = useT()
  const r = t.revenue
  const c = t.common

  const [source, setSource]     = useState('deals')  // default: dados reais
  const [period, setPeriod]     = useState('12m')
  const [currency, setCurrency] = useState('usd')

  const { data: dealsData } = useApi(() => analyticsApi.dealsRevenue(period), [period])
  const { data: series, loading } = useApi(() => analyticsApi.series({ period }), [period])

  const rate = FX_RATES[currency] ?? 1
  const currLabel = r.currencies[currency as keyof typeof r.currencies] ?? 'USD'

  const fmt = (n: number) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: currLabel, maximumFractionDigits: 0
  }).format(n * rate)

  // Dados reais dos deals Won
  const dealsChartData = (dealsData?.series ?? []).map(x => ({
    m: `${x.month}/${x.year?.slice(-2)}`,
    revenue: Math.round(x.revenue * rate),
    deals: x.deals_count,
  }))

  // Dados históricos da série mensal (estimativa)
  const src = series ?? []
  const share = SOURCE_SHARE[source] ?? 1
  const historicalChartData = useMemo(() => src.map(x => ({
    m: x.month,
    revenue: Math.round(x.revenue * share * rate * 1000),
  })), [src, share, rate])

  const isRealData = source === 'deals'
  const chartData  = isRealData ? dealsChartData : historicalChartData
  const total = isRealData
    ? Math.round((dealsData?.totalRevenue ?? 0) * rate)
    : historicalChartData.reduce((s, x) => s + x.revenue, 0)

  return (
    <div className="space-y-5">
      <PageHeader
        title={r.title}
        subtitle={isRealData ? 'Receita real dos deals fechados no Pipeline.' : r.subtitle}
        filters={[
          { label: 'Fonte', value: source, onChange: setSource, options: [
            { label: '★ Deals Fechados (Real)', value: 'deals'   },
            { label: 'Todas as origens',         value: 'all'     },
            { label: 'Assinaturas (estimado)',    value: 'sub'     },
            { label: 'Serviços (estimado)',       value: 'svc'     },
          ]},
          { label: c.timePeriod, value: period, onChange: setPeriod, options: [
            { label: r.periods.m12, value: '12m' },
            { label: r.periods.m6,  value: '6m'  },
          ]},
          { label: 'Moeda', value: currency, onChange: setCurrency, options: [
            { label: 'USD', value: 'usd' },
            { label: 'EUR', value: 'eur' },
            { label: 'BRL', value: 'brl' },
          ]},
        ]}
        right={
          <div className="flex items-center gap-2">
            {isRealData && <Badge tone="green">✓ Dados Reais</Badge>}
            <Badge tone="blue">{c.total}: {loading && !isRealData ? '…' : fmt(total)}</Badge>
          </div>
        }
      />

      {/* KPIs extras quando modo deals */}
      {isRealData && dealsData && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader><CardTitle>Deals Fechados</CardTitle><CardSubtitle>Total no período</CardSubtitle></CardHeader>
            <CardContent className="flex items-end justify-between">
              <div className="text-3xl font-semibold">{dealsData.totalDeals}</div>
              <Badge tone="green">Won</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Ticket Médio</CardTitle><CardSubtitle>Por deal fechado</CardSubtitle></CardHeader>
            <CardContent className="flex items-end justify-between">
              <div className="text-3xl font-semibold">{fmt(dealsData.avgTicket)}</div>
              <Badge tone="purple">Avg</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Pipeline Aberto</CardTitle><CardSubtitle>Em negociação</CardSubtitle></CardHeader>
            <CardContent className="flex items-end justify-between">
              <div className="text-3xl font-semibold">{fmt(dealsData.pipeline)}</div>
              <Badge tone="amber">{dealsData.openDeals} deals</Badge>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{isRealData ? 'Receita por Mês (Deals Won)' : r.trend}</CardTitle>
          <CardSubtitle>
            {isRealData
              ? `Deals fechados reais · ${currLabel}`
              : `${r.trendSub} · ${currLabel}${source !== 'all' ? ' · estimado' : ''}`}
          </CardSubtitle>
        </CardHeader>
        <CardContent className="h-[340px]">
          {isRealData && dealsChartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              Nenhum deal fechado ainda. Feche deals no Pipeline para ver a receita aqui.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="m" />
                <YAxis tickFormatter={v => isRealData ? `$${(v/1000).toFixed(0)}k` : `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [
                  isRealData ? `$${v.toLocaleString()}` : `$${(v/1000).toFixed(1)}k`,
                  'Receita'
                ]} />
                <Bar dataKey="revenue" fill="#0f172a" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {!isRealData && source !== 'all' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          {source === 'sub' ? r.splitNote : r.splitNote}
          {currency !== 'usd' && ` ${r.fxNote}`}
        </div>
      )}
    </div>
  )
}
