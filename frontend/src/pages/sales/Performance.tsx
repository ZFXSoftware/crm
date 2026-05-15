import { useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts'
import { analyticsApi } from '../../lib/api'
import { useApi } from '../../lib/useApi'
import { useT } from '../../lib/i18n'

function money(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function SalesPerformance() {
  const { t } = useT()
  const p = t.performance
  const c = t.common

  const [region, setRegion]     = useState('all')
  const [period, setPeriod]     = useState('12m')
  const [category, setCategory] = useState('all')

  // Dados reais dos deals
  const { data: dealsData } = useApi(() => analyticsApi.dealsRevenue(period), [period])
  // Série mensal de marketing/leads (dados históricos)
  const { data: series, loading } = useApi(
    () => analyticsApi.series({ region, category, period }),
    [region, category, period]
  )

  const src = series ?? []
  const totalLeads = useMemo(() => src.reduce((s, x) => s + x.leads, 0), [src])
  const chartData  = src.map(x => ({ m: x.month, revenue: x.revenue, leads: x.leads }))

  // KPIs reais dos deals Won
  const wonRevenue  = dealsData?.totalRevenue ?? 0
  const wonDeals    = dealsData?.totalDeals ?? 0
  const pipeline    = dealsData?.pipeline ?? 0
  const avgTicket   = dealsData?.avgTicket ?? 0
  const openDeals   = dealsData?.openDeals ?? 0
  const totalAllDeals = wonDeals + openDeals + 0 // simplificado
  const winRate = totalAllDeals > 0 ? Math.round((wonDeals / (wonDeals + openDeals)) * 100) : 0

  // Série real dos deals Won por mês
  const dealsChartData = (dealsData?.series ?? []).map(x => ({
    m: x.month,
    revenue: Math.round(x.revenue / 1000),  // em k
    deals: x.deals_count,
  }))

  return (
    <div className="space-y-5">
      <PageHeader
        title={p.title}
        subtitle={p.subtitle}
        filters={[
          { label: c.region, value: region, onChange: setRegion, options: [
            { label: c.regions.all,   value: 'all'   },
            { label: c.regions.north, value: 'north' },
            { label: c.regions.south, value: 'south' },
            { label: c.regions.emea,  value: 'emea'  },
          ]},
          { label: c.timePeriod, value: period, onChange: setPeriod, options: [
            { label: c.timePeriods.m12, value: '12m' },
            { label: c.timePeriods.m6,  value: '6m'  },
          ]},
        ]}
      />

      {/* KPIs de deals reais */}
      <div className="grid gap-5 md:grid-cols-4">
        <Card>
          <CardHeader><CardTitle>{p.winRate}</CardTitle><CardSubtitle>{p.winRateSub}</CardSubtitle></CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold">{winRate}%</div>
            <Badge tone="blue">{p.real}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Deals Won</CardTitle><CardSubtitle>Fechados no pipeline</CardSubtitle></CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold">{wonDeals}</div>
            <Badge tone="green">Won</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Receita Won</CardTitle><CardSubtitle>Valor total fechado</CardSubtitle></CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold">{money(wonRevenue)}</div>
            <Badge tone="green">{p.real}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Ticket Médio</CardTitle><CardSubtitle>Deals fechados</CardSubtitle></CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold">{money(avgTicket)}</div>
            <Badge tone="purple">Avg</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Pipeline Aberto</CardTitle><CardSubtitle>Em negociação</CardSubtitle></CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold">{money(pipeline)}</div>
            <Badge tone="amber">{openDeals} deals</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{p.totalLeads}</CardTitle><CardSubtitle>{p.periodTotal}</CardSubtitle></CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold">{loading ? '…' : totalLeads.toLocaleString()}</div>
            <Badge tone="blue">Leads</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Receita real dos deals Won por mês */}
        <Card>
          <CardHeader>
            <CardTitle>Receita por Mês (Deals Won)</CardTitle>
            <CardSubtitle>Baseado nos deals fechados reais</CardSubtitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            {dealsChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted">Nenhum deal fechado ainda</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dealsChartData}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="m" /><YAxis />
                  <Tooltip formatter={(v: number) => [`${v}k`, 'Receita']} />
                  <Bar dataKey="revenue" fill="#0f172a" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Leads por mês (dados históricos) */}
        <Card>
          <CardHeader><CardTitle>{p.leads}</CardTitle><CardSubtitle>{p.leadsSub}</CardSubtitle></CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="m" /><YAxis />
                <Tooltip /><Bar dataKey="leads" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
