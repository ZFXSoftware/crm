import { useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input, Modal } from '../../components/ui/Modal'
import { billsApi, type Bill } from '../../lib/api'
import { useApi } from '../../lib/useApi'
import { useT } from '../../lib/i18n'

function money(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function FinanceBills() {
  const { t } = useT()
  const b = t.bills
  const c = t.common

  const [category, setCategory] = useState('all')
  const [status, setStatus]   = useState('all')
  const [period, setPeriod]   = useState('all')
  const [open, setOpen]       = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState({
    vendor: '', category: 'Services', amount: '1200', due_date: '2026-03-15', status: 'Pending',
  })

  const { data, loading, error, refetch } = useApi(
    () => billsApi.list({ category, status, period }),
    [category, status, period],
  )
  const bills = data ?? []

  const totals = useMemo(() => ({
    total:   bills.reduce((s, bl) => s + bl.amount, 0),
    overdue: bills.filter((bl) => bl.status === 'Overdue').reduce((s, bl) => s + bl.amount, 0),
  }), [bills])

  function toneFor(s: Bill['status']) {
    if (s === 'Paid')    return 'green'
    if (s === 'Pending') return 'blue'
    return 'red'
  }
  function statusLabel(s: Bill['status']) {
    if (s === 'Paid')    return b.statuses.paid
    if (s === 'Pending') return b.statuses.pending
    return b.statuses.overdue
  }

  async function addBill() {
    setSaving(true)
    try {
      await billsApi.create({
        vendor:   form.vendor.trim() || 'New Vendor',
        category: form.category as Bill['category'],
        amount:   Number(form.amount) || 0,
        due_date: form.due_date,
        status:   form.status as Bill['status'],
      })
      refetch()
      setOpen(false)
      setForm({ vendor: '', category: 'Services', amount: '1200', due_date: '2026-03-15', status: 'Pending' })
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={b.title}
        subtitle={b.subtitle}
        filters={[
          {
            label: c.status,
            value: status,
            onChange: setStatus,
            options: [
              { label: b.statuses.all,     value: 'all'     },
              { label: b.statuses.paid,    value: 'Paid'    },
              { label: b.statuses.pending, value: 'Pending' },
              { label: b.statuses.overdue, value: 'Overdue' },
            ],
          },
          {
            label: b.category,
            value: category,
            onChange: setCategory,
            options: [
              { label: b.categories.all,      value: 'all'      },
              { label: b.categories.software, value: 'Software' },
              { label: b.categories.services, value: 'Services' },
              { label: b.categories.office,   value: 'Office'   },
              { label: b.categories.ads,      value: 'Ads'      },
            ],
          },
          {
            label: b.dueDate,
            value: period,
            onChange: setPeriod,
            options: [
              { label: b.periods.all, value: 'all' },
              { label: b.periods.d30, value: '30d' },
              { label: b.periods.d7,  value: '7d'  },
            ],
          },
        ]}
        right={<Button onClick={() => setOpen(true)}>{b.addBill}</Button>}
      />

      <div className="grid gap-5 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>{c.total}</CardTitle><CardSubtitle>{b.filtered}</CardSubtitle></CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold">{money(totals.total)}</div>
            <Badge tone="blue">{b.thisPeriod}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{b.statuses.overdue}</CardTitle><CardSubtitle>{b.actionReq}</CardSubtitle></CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold">{money(totals.overdue)}</div>
            <Badge tone="red">{b.statuses.overdue}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{b.vendors}</CardTitle><CardSubtitle>{b.healthy}</CardSubtitle></CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold">{new Set(bills.map(bl => bl.vendor)).size}</div>
            <Badge tone="green">{b.healthy}</Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{b.billList}</CardTitle>
          <CardSubtitle>{loading ? c.loading : error ? c.backendError : `${bills.length} ${b.title.toLowerCase()}`}</CardSubtitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {c.backendError}
            </div>
          )}
          <div className="overflow-hidden rounded-card border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-muted">
                <tr>
                  <th className="px-4 py-3">{b.vendor}</th>
                  <th className="px-4 py-3">{b.category}</th>
                  <th className="px-4 py-3">{c.amount}</th>
                  <th className="px-4 py-3">{b.dueDate}</th>
                  <th className="px-4 py-3">{c.status}</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-t border-border animate-pulse">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 w-20 rounded bg-slate-100" /></td>
                        ))}
                      </tr>
                    ))
                  : bills.map((bl) => (
                      <tr key={bl.id} className="border-t border-border">
                        <td className="px-4 py-3">
                          <div className="font-semibold">{bl.vendor}</div>
                          <div className="text-xs text-muted">{bl.id}</div>
                        </td>
                        <td className="px-4 py-3">{bl.category}</td>
                        <td className="px-4 py-3 font-semibold">{money(bl.amount)}</td>
                        <td className="px-4 py-3 text-muted">{bl.due_date}</td>
                        <td className="px-4 py-3">
                          <Badge tone={toneFor(bl.status) as any}>{statusLabel(bl.status)}</Badge>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={b.addTitle}
        subtitle={b.addSub}
        footer={
          <>
            <Button variant="ghost" className="border border-border bg-white" onClick={() => setOpen(false)}>
              {c.cancel}
            </Button>
            <Button onClick={addBill} disabled={saving}>
              {saving ? c.saving : c.create}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <div className="mb-2 text-xs text-muted">{b.vendor}</div>
            <Input value={form.vendor} onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))} placeholder={b.vendorPh} />
          </div>
          <div>
            <div className="mb-2 text-xs text-muted">{c.amount}</div>
            <Input value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="1200" />
          </div>
          <div>
            <div className="mb-2 text-xs text-muted">{b.dueDate}</div>
            <Input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
          </div>
          <div>
            <div className="mb-2 text-xs text-muted">{b.category}</div>
            <select className="h-10 w-full rounded-full border border-border bg-white px-4 text-sm outline-none"
              value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              <option value="Software">{b.categories.software}</option>
              <option value="Services">{b.categories.services}</option>
              <option value="Office">{b.categories.office}</option>
              <option value="Ads">{b.categories.ads}</option>
            </select>
          </div>
          <div>
            <div className="mb-2 text-xs text-muted">{c.status}</div>
            <select className="h-10 w-full rounded-full border border-border bg-white px-4 text-sm outline-none"
              value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              <option value="Paid">{b.statuses.paid}</option>
              <option value="Pending">{b.statuses.pending}</option>
              <option value="Overdue">{b.statuses.overdue}</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}
