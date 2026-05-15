import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input, Modal } from '../../components/ui/Modal'
import { customersApi, type Customer } from '../../lib/api'
import { useApi } from '../../lib/useApi'
import { useT } from '../../lib/i18n'

function money(n: number) {
  return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 }).format(n)
}

export default function SalesCustomers() {
  const { t } = useT()
  const cu = t.customers
  const c = t.common
  const navigate = useNavigate()

  const [plan, setPlan]     = useState('all')
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [open, setOpen]     = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm]     = useState({ name:'', email:'', company:'', plan:'Growth', status:'Active', mrr:'1200' })

  const { data, loading, error, refetch } = useApi(
    () => customersApi.list({ plan, status, search }),
    [plan, status, search],
  )
  const customers = data ?? []

  const kpis = useMemo(() => ({
    total:   customers.length,
    atRisk:  customers.filter(c => c.status === 'At Risk').length,
    sumMrr:  customers.reduce((s, c) => s + c.mrr, 0),
  }), [customers])

  function statusTone(s: Customer['status']) {
    if (s === 'Active')   return 'green'
    if (s === 'Trial')    return 'blue'
    return 'red'
  }

  function statusLabel(s: Customer['status']) {
    const map: Record<string, string> = { Active: cu.statuses.active, Trial: cu.statuses.trial, 'At Risk': cu.statuses.atRisk }
    return map[s] ?? s
  }

  async function addCustomer() {
    if (!form.name.trim() || !form.email.trim() || !form.company.trim()) return alert('Preencha todos os campos obrigatórios.')
    setSaving(true)
    try {
      await customersApi.create({ name:form.name.trim(), email:form.email.trim(), company:form.company.trim(), plan:form.plan as Customer['plan'], status:form.status as Customer['status'], mrr:Number(form.mrr)||0 })
      refetch(); setOpen(false)
      setForm({ name:'', email:'', company:'', plan:'Growth', status:'Active', mrr:'1200' })
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={cu.title}
        subtitle={cu.subtitle}
        filters={[
          { label: 'Plan', value: plan, onChange: setPlan, options: [
            { label: cu.plans.all,        value: 'all'        },
            { label: cu.plans.starter,    value: 'Starter'    },
            { label: cu.plans.growth,     value: 'Growth'     },
            { label: cu.plans.enterprise, value: 'Enterprise' },
          ]},
          { label: c.status, value: status, onChange: setStatus, options: [
            { label: cu.statuses.all,    value: 'all'     },
            { label: cu.statuses.active, value: 'Active'  },
            { label: cu.statuses.trial,  value: 'Trial'   },
            { label: cu.statuses.atRisk, value: 'At Risk' },
          ]},
        ]}
        right={
          <div className="flex items-center gap-2">
            <div className="relative">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={cu.searchPh}
                className="h-10 w-56 rounded-full border border-border bg-white px-4 pr-10 text-sm outline-none focus:ring-2 focus:ring-slate-200" />
              <span className="absolute right-3 top-2.5 text-muted text-sm">⌕</span>
            </div>
            <Button onClick={() => setOpen(true)}>{cu.addCustomer}</Button>
          </div>
        }
      />

      <div className="grid gap-5 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>{cu.accounts}</CardTitle><CardSubtitle>{cu.currentView}</CardSubtitle></CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold">{kpis.total}</div>
            <Badge tone="blue">{c.updated}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{cu.atRisk}</CardTitle><CardSubtitle>{cu.atRiskSub}</CardSubtitle></CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold">{kpis.atRisk}</div>
            <Badge tone="red">{cu.watch}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{cu.sumMrr}</CardTitle><CardSubtitle>{cu.mrrSub}</CardSubtitle></CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold">{money(kpis.sumMrr)}</div>
            <Badge tone="green">{cu.health}</Badge>
          </CardContent>
        </Card>
      </div>

      {error && <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{c.backendError}</div>}

      <Card>
        <CardHeader>
          <CardTitle>{cu.customerList}</CardTitle>
          <CardSubtitle>{loading ? c.loading : `${customers.length} ${cu.title.toLowerCase()}`}</CardSubtitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-card border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-muted">
                <tr>
                  <th className="px-4 py-3">{c.name}</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">MRR</th>
                  <th className="px-4 py-3">{cu.lastContact}</th>
                  <th className="px-4 py-3">{c.status}</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({length:4}).map((_,i) => (
                      <tr key={i} className="border-t border-border animate-pulse">
                        {Array.from({length:5}).map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 w-20 rounded bg-slate-100" /></td>)}
                      </tr>
                    ))
                  : customers.map(cust => (
                      <tr key={cust.id} onClick={() => navigate(`/sales/customers/${cust.id}`)}
                        className="cursor-pointer border-t border-border transition hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-semibold">{cust.name}</div>
                          <div className="text-xs text-muted">{cust.company}</div>
                        </td>
                        <td className="px-4 py-3">{cust.plan}</td>
                        <td className="px-4 py-3 font-semibold">{money(cust.mrr)}</td>
                        <td className="px-4 py-3 text-muted">{cust.last_contact}</td>
                        <td className="px-4 py-3"><Badge tone={statusTone(cust.status) as any}>{statusLabel(cust.status)}</Badge></td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={cu.addTitle} subtitle={cu.addSub}
        footer={<><Button variant="ghost" className="border border-border bg-white" onClick={() => setOpen(false)}>{c.cancel}</Button><Button onClick={addCustomer} disabled={saving}>{saving ? c.saving : c.create}</Button></>}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2"><div className="mb-2 text-xs text-muted">{c.name} *</div><Input value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="Amelia Grant" /></div>
          <div className="md:col-span-2"><div className="mb-2 text-xs text-muted">{c.email} *</div><Input type="email" value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} placeholder="amelia@company.com" /></div>
          <div className="md:col-span-2"><div className="mb-2 text-xs text-muted">{c.company} *</div><Input value={form.company} onChange={e => setForm(p=>({...p,company:e.target.value}))} placeholder="Northwind" /></div>
          <div><div className="mb-2 text-xs text-muted">MRR</div><Input value={form.mrr} onChange={e => setForm(p=>({...p,mrr:e.target.value}))} placeholder="1200" /></div>
          <div><div className="mb-2 text-xs text-muted">Plan</div>
            <select className="h-10 w-full rounded-full border border-border bg-white px-4 text-sm outline-none" value={form.plan} onChange={e => setForm(p=>({...p,plan:e.target.value}))}>
              <option value="Starter">{cu.plans.starter}</option><option value="Growth">{cu.plans.growth}</option><option value="Enterprise">{cu.plans.enterprise}</option>
            </select>
          </div>
          <div><div className="mb-2 text-xs text-muted">{c.status}</div>
            <select className="h-10 w-full rounded-full border border-border bg-white px-4 text-sm outline-none" value={form.status} onChange={e => setForm(p=>({...p,status:e.target.value}))}>
              <option value="Active">{cu.statuses.active}</option><option value="Trial">{cu.statuses.trial}</option><option value="At Risk">{cu.statuses.atRisk}</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}
