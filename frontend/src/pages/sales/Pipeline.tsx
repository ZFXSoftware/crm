import { useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input, Modal } from '../../components/ui/Modal'
import { dealsApi, adminApi, type Deal, type AuthUser } from '../../lib/api'
import { useApi } from '../../lib/useApi'
import { useT } from '../../lib/i18n'

const STAGES: Deal['stage'][] = ['Discovery', 'Qualified', 'Proposal', 'Negotiation', 'Won']
const STAGE_PROBABILITY: Record<Deal['stage'], number> = {
  Discovery:25, Qualified:50, Proposal:65, Negotiation:78, Won:100, Lost:0,
}

function money(n: number) {
  return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 }).format(n)
}

const emptyForm = { company:'', owner:'', stage:'Discovery' as Deal['stage'], value:'10000', probability:'25' }
type EditModal = { open: false } | { open: true; deal: Deal }

export default function SalesPipeline() {
  const { t } = useT()
  const p = t.pipeline
  const c = t.common

  const [segment, setSegment]         = useState('all')
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [view, setView]               = useState('board')
  const [moving, setMoving]           = useState<string | null>(null)
  const [addOpen, setAddOpen]         = useState(false)
  const [addForm, setAddForm]         = useState(emptyForm)
  const [saving, setSaving]           = useState(false)
  const [editModal, setEditModal]     = useState<EditModal>({ open: false })
  const [editForm, setEditForm]       = useState(emptyForm)
  const [deleting, setDeleting]       = useState(false)

  const { data, loading, error, refetch } = useApi(() => dealsApi.list({ owner: ownerFilter }), [ownerFilter])
  const { data: usersData } = useApi(() => adminApi.users({ status: 'Active' }), [])

  const deals = data ?? []
  const activeUsers: AuthUser[] = usersData ?? []

  const filtered = useMemo(() =>
    deals.filter(d => segment === 'all' ? true : d.value >= 20000),
    [deals, segment])

  const totals = useMemo(() => ({
    total:    filtered.reduce((s, d) => s + d.value, 0),
    weighted: filtered.reduce((s, d) => s + d.value * (d.probability / 100), 0),
  }), [filtered])

  function openAdd() {
    setAddForm({ ...emptyForm, owner: activeUsers[0]?.name ?? '' })
    setAddOpen(true)
  }

  function handleAddStageChange(stage: Deal['stage']) {
    setAddForm(prev => ({ ...prev, stage, probability: String(STAGE_PROBABILITY[stage]) }))
  }

  async function addDeal() {
    if (!addForm.company.trim()) return alert(`${c.company} ${c.name.toLowerCase()} é obrigatório.`)
    if (!addForm.owner) return alert(`${p.ownerLabel} é obrigatório.`)
    setSaving(true)
    try {
      await dealsApi.create({ company:addForm.company.trim(), owner:addForm.owner, stage:addForm.stage, value:Math.max(0,Number(addForm.value)||0), probability:Math.min(100,Math.max(0,Number(addForm.probability)||0)) })
      refetch(); setAddOpen(false); setAddForm(emptyForm)
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  function openEdit(deal: Deal) {
    setEditForm({ company:deal.company, owner:deal.owner, stage:deal.stage, value:String(deal.value), probability:String(deal.probability) })
    setEditModal({ open:true, deal })
  }

  function handleEditStageChange(stage: Deal['stage']) {
    setEditForm(prev => ({ ...prev, stage, probability: String(STAGE_PROBABILITY[stage]) }))
  }

  async function saveEdit() {
    if (!editModal.open) return
    setSaving(true)
    try {
      await dealsApi.update(editModal.deal.id, { company:editForm.company.trim(), owner:editForm.owner, stage:editForm.stage, value:Math.max(0,Number(editForm.value)||0), probability:Math.min(100,Math.max(0,Number(editForm.probability)||0)) })
      refetch(); setEditModal({ open:false })
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  async function deleteDeal() {
    if (!editModal.open) return
    if (!confirm(`${c.delete} ${editModal.deal.company}?`)) return
    setDeleting(true)
    try { await dealsApi.remove(editModal.deal.id); refetch(); setEditModal({ open:false }) }
    catch (e: any) { alert(e.message) }
    finally { setDeleting(false) }
  }

  async function move(dealId: string, dir: -1|1, e: React.MouseEvent) {
    e.stopPropagation()
    setMoving(dealId)
    try { await dealsApi.move(dealId, dir===1?'next':'prev'); refetch() }
    catch (e: any) { alert((e as any).message) }
    finally { setMoving(null) }
  }

  const ownerOptions = [
    { label: p.filters.allOwners, value: 'all' },
    ...activeUsers.map(u => ({ label: u.name, value: u.name })),
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title={p.title}
        subtitle={p.subtitle}
        filters={[
          { label: 'Segment', value: segment, onChange: setSegment, options: [
            { label: p.filters.allSegments, value: 'all'        },
            { label: p.filters.enterprise,  value: 'enterprise' },
          ]},
          { label: p.ownerLabel, value: ownerFilter, onChange: setOwnerFilter, options: ownerOptions },
          { label: 'View', value: view, onChange: setView, options: [
            { label: p.filters.board,   value: 'board'   },
            { label: p.filters.compact, value: 'compact' },
          ]},
        ]}
        right={
          <div className="flex items-center gap-2">
            <Badge tone="blue">{c.total}: {money(totals.total)}</Badge>
            <Badge tone="green">{p.weighted}: {money(Math.round(totals.weighted))}</Badge>
            <Button onClick={openAdd}>{p.addDeal}</Button>
          </div>
        }
      />

      {error && <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{c.backendError}</div>}

      <div className="grid gap-4 lg:grid-cols-5">
        {STAGES.map(stage => (
          <Card key={stage} className="min-h-[520px]">
            <CardHeader>
              <CardTitle>{stage}</CardTitle>
              <CardSubtitle>{filtered.filter(d => d.stage===stage).length} {p.deals}</CardSubtitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading
                ? <div className="rounded-card border border-dashed border-border bg-slate-50 p-4 text-xs text-muted animate-pulse">{c.loading}</div>
                : filtered.filter(d => d.stage===stage).map(deal => (
                    <div key={deal.id} onClick={() => openEdit(deal)}
                      className="cursor-pointer rounded-card border border-border bg-white p-4 transition hover:shadow-md hover:border-slate-300">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">{deal.company}</div>
                          <div className="mt-1 text-xs text-muted">{deal.id} · {deal.owner}</div>
                        </div>
                        <Badge tone={deal.stage==='Won'?'green':deal.stage==='Negotiation'?'purple':'gray'}>{deal.probability}%</Badge>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-sm font-semibold">{money(deal.value)}</div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="border border-border bg-white"
                            onClick={e => move(deal.id,-1,e)} disabled={deal.stage==='Discovery'||moving===deal.id} title={p.prevStage}>←</Button>
                          <Button size="sm" variant="ghost" className="border border-border bg-white"
                            onClick={e => move(deal.id,1,e)} disabled={deal.stage==='Won'||moving===deal.id} title={p.nextStage}>→</Button>
                        </div>
                      </div>
                    </div>
                  ))}
              {!loading && filtered.filter(d => d.stage===stage).length===0 && (
                <div className="rounded-card border border-dashed border-border bg-slate-50 p-4 text-xs text-muted">{p.noDealStage}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal: Add Deal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={p.addDealTitle} subtitle={p.addDealSub}
        footer={<><Button variant="ghost" className="border border-border bg-white" onClick={() => setAddOpen(false)}>{c.cancel}</Button><Button onClick={addDeal} disabled={saving}>{saving ? c.saving : c.create}</Button></>}>
        <DealForm form={addForm} setForm={setAddForm} onStageChange={handleAddStageChange} users={activeUsers} t={p} c={c} />
      </Modal>

      {/* Modal: Edit Deal */}
      <Modal open={editModal.open} onClose={() => setEditModal({ open:false })}
        title={editModal.open ? `${p.editDealTitle} — ${editModal.deal.company}` : p.editDealTitle}
        subtitle={editModal.open ? `ID ${editModal.deal.id}` : ''}
        footer={
          <div className="flex w-full items-center justify-between">
            <Button variant="ghost" className="border border-red-200 bg-white text-red-600 hover:bg-red-50" onClick={deleteDeal} disabled={deleting}>
              {deleting ? c.deleting : c.delete}
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" className="border border-border bg-white" onClick={() => setEditModal({ open:false })}>{c.cancel}</Button>
              <Button onClick={saveEdit} disabled={saving}>{saving ? c.saving : c.save}</Button>
            </div>
          </div>
        }>
        <DealForm form={editForm} setForm={setEditForm} onStageChange={handleEditStageChange} users={activeUsers} t={p} c={c} />
      </Modal>
    </div>
  )
}

function DealForm({ form, setForm, onStageChange, users, t: p, c }: {
  form: { company:string; owner:string; stage:Deal['stage']; value:string; probability:string }
  setForm: React.Dispatch<React.SetStateAction<typeof form>>
  onStageChange: (stage: Deal['stage']) => void
  users: AuthUser[]
  t: Record<string, any>
  c: Record<string, any>
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="md:col-span-2">
        <div className="mb-2 text-xs text-muted">{c.company}</div>
        <Input value={form.company} onChange={e => setForm(prev => ({ ...prev, company:e.target.value }))} placeholder={p.companyPh} />
      </div>
      <div>
        <div className="mb-2 text-xs text-muted">{p.ownerLabel}</div>
        {users.length > 0 ? (
          <select className="h-10 w-full rounded-full border border-border bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            value={form.owner} onChange={e => setForm(prev => ({ ...prev, owner:e.target.value }))}>
            {users.map(u => <option key={u.id} value={u.name}>{u.name} ({u.role})</option>)}
          </select>
        ) : (
          <Input value={form.owner} onChange={e => setForm(prev => ({ ...prev, owner:e.target.value }))} placeholder={p.ownerPh} />
        )}
      </div>
      <div>
        <div className="mb-2 text-xs text-muted">Stage</div>
        <select className="h-10 w-full rounded-full border border-border bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          value={form.stage} onChange={e => onStageChange(e.target.value as Deal['stage'])}>
          {(['Discovery','Qualified','Proposal','Negotiation','Won'] as Deal['stage'][]).map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <div className="mb-2 text-xs text-muted">{c.amount} (USD)</div>
        <Input value={form.value} onChange={e => setForm(prev => ({ ...prev, value:e.target.value }))} placeholder={p.valuePh} />
      </div>
      <div>
        <div className="mb-2 text-xs text-muted">Probability (%)</div>
        <Input value={form.probability} onChange={e => setForm(prev => ({ ...prev, probability:e.target.value }))} placeholder={p.probabilityPh} />
      </div>
    </div>
  )
}
