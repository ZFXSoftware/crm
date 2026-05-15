import { useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input, Modal } from '../../components/ui/Modal'
import { dealsApi, dealNotesApi, adminApi, type Deal, type DealNote, type AuthUser } from '../../lib/api'
import { useApi } from '../../lib/useApi'
import { cn } from '../../lib/cn'
import { useT } from '../../lib/i18n'
import { priorityClasses } from '../../lib/dealPriority'
import {
  DndContext,
  closestCorners,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import {
  daysInStage,
  agingClasses,
} from '../../lib/dealAging'
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
  const [search, setSearch] = useState('')
  const [expandedDeal, setExpandedDeal] = useState<Deal | null>(null)
  const { t } = useT()
  const p = t.pipeline
  const c = t.common

  const [segment, setSegment]           = useState('all')
  const [ownerFilter, setOwnerFilter]   = useState('all')
  const [view, setView]                 = useState('board')
  const [moving, setMoving]             = useState<string | null>(null)
  const [addOpen, setAddOpen]           = useState(false)
  const [addForm, setAddForm]           = useState(emptyForm)
  const [saving, setSaving]             = useState(false)
  const [editModal, setEditModal]       = useState<EditModal>({ open: false })
  const [editForm, setEditForm]         = useState(emptyForm)
  const [deleting, setDeleting]         = useState(false)
  const [dealNotes, setDealNotes]       = useState<DealNote[]>([])
  const [newNote, setNewNote]           = useState('')
  const [loadingNotes, setLoadingNotes] = useState(false)

  const { data, loading, error, refetch } = useApi(() => dealsApi.list({ owner: ownerFilter }), [ownerFilter])
  const { data: usersData } = useApi(() => adminApi.users({ status: 'Active' }), [])

  const deals = data ?? []
  const activeUsers: AuthUser[] = usersData ?? []

  const filtered = useMemo(() => {
    return deals.filter(deal => {
      const matchesSegment =
        segment === 'all'
          ? true
          : deal.value >= 20000

      const q = search.toLowerCase()

      const matchesSearch =
        !q ||
        deal.company.toLowerCase().includes(q) ||
        deal.owner.toLowerCase().includes(q) ||
        deal.id.toLowerCase().includes(q)

      return matchesSegment && matchesSearch
    })
  }, [deals, segment, search])

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
      await dealsApi.create({ company:addForm.company.trim(), owner:addForm.owner, stage:addForm.stage, value:Math.max(0,Number(addForm.value)||0), probability:Math.min(100,Math.max(0,Number(addForm.probability)||0)), stage_updated_at: new Date().toISOString() })
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

  function handleDragEnd(event: any) {
    const { active, over } = event

    if (!over) return

    const dealId = active.id
    const newStage = over.id

    const deal = deals.find(d => d.id === dealId)

    if (!deal || deal.stage === newStage) return

    moveDealToStage(dealId, newStage)
  }

    async function moveDealToStage(
      dealId: string,
      stage: string
    ) {
      try {
        setMoving(dealId)

        await dealsApi.update(dealId, {
          stage: addForm.stage as Deal['stage'],
          probability: STAGE_PROBABILITY[stage as Deal['stage']],
        })

        refetch()
      } catch (err) {
        console.error(err)
      } finally {
        setMoving(null)
      }
    }

  function StageDropZone({
    stage,
    children,
  }: {
    stage: string
    children: React.ReactNode
  }) {
    const { setNodeRef } = useDroppable({
      id: stage,
    })

    return (
      <div ref={setNodeRef} className="h-full">
        {children}
      </div>
    )
  }

  function DraggableDeal({
    deal,
    children,
  }: {
    deal: Deal
    children: React.ReactNode
  }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
    } = useDraggable({
      id: deal.id,
    })

    const style = transform
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        }
      : undefined

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
      >
        {children}
      </div>
    )
  }

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
            <div className="flex items-center gap-3">
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search deals..."
                className="w-64 bg-white"
              />

              <Badge tone="blue">
                {c.total}: {money(totals.total)}
              </Badge>

              <Badge tone="green">
                {p.weighted}: {money(Math.round(totals.weighted))}
              </Badge>

              <Button onClick={openAdd}>
                {p.addDeal}
              </Button>
            </div>
        }
      />

      {error && <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{c.backendError}</div>}

      <DndContext
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
      <div className="grid gap-4 grid auto-cols-[200px] grid-flow-col gap-4 overflow-x-auto">
        {STAGES.map(stage => {
          const stageDeals = filtered.filter(
            d => d.stage === stage
          )

          const totalValue = stageDeals.reduce(
            (sum, d) => sum + d.value,
            0
          )

          const weightedValue = stageDeals.reduce(
            (sum, d) =>
              sum + d.value * (d.probability / 100),
            0
          )
          return (
          <StageDropZone stage={stage}>
          <Card
            key={stage}
            className="min-h-[520px] border-slate-200 bg-slate-50/50"
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{stage}</CardTitle>

                  <CardSubtitle>
                    {stageDeals.length} {p.deals}
                  </CardSubtitle>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Pipeline
                  </span>

                  <span className="font-medium text-slate-700">
                    {money(totalValue)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {p.weighted}
                  </span>

                  <span className="font-medium text-slate-700">
                    {money(weightedValue)}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="max-h-[75vh] space-y-3">
              {loading
                ? <div className="rounded-card border border-dashed border-border bg-slate-50 p-4 text-xs text-muted animate-pulse">{c.loading}</div>
                : stageDeals.map(deal => {
                    const aging = daysInStage(deal.stage_updated_at)
                    return (
                                    <DraggableDeal deal={deal}>
                                      <div
                                        key={deal.id}
                                        onClick={() => openEdit(deal)}
                                        onDoubleClick={async () => {
                                          setExpandedDeal(deal)

                                          setLoadingNotes(true)

                                          try {
                                            const notes = await dealNotesApi.list(deal.id)
                                            setDealNotes(notes)
                                          } finally {
                                            setLoadingNotes(false)
                                          }
                                        }}
                                        className={cn(
                                          'cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg',
                                          deal.priority === 'high' && 'ring-1 ring-red-200'
                                        )}
                                      >
                                      <div className="space-y-4">
                                        <div className="space-y-3">
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                              <div className="line-clamp-2 text-sm font-semibold leading-5 text-slate-900">
                                                {deal.company}
                                              </div>
                                            </div>

                                            <div
                                              className={cn(
                                                'shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide',
                                                deal.priority ? priorityClasses(deal.priority) : priorityClasses('medium')
                                              )}
                                            >
                                              {deal.priority}
                                            </div>
                                          </div>

                                          <div className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
                                            <span>{deal.owner}</span>
                                            <span>•</span>
                                            <span>{deal.id}</span>
                                          </div>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 p-3">
                                          <div className="text-xs text-slate-500">
                                            Opportunity Value
                                          </div>

                                          <div className="mt-1 text-lg font-bold text-slate-900">
                                            {money(deal.value)}
                                          </div>

                                          <div
                                            className={cn(
                                              'mt-2 text-xs font-medium',
                                              agingClasses(aging)
                                            )}
                                          >
                                            {aging} days in stage
                                          </div>
                                        </div>
                                      </div>
                                     
                                    </div>
                                     </DraggableDeal>
                                  )})}
              {!loading && stageDeals.length === 0 && (
                <div className="rounded-card border border-dashed border-border bg-slate-50 p-4 text-xs text-muted">{p.noDealStage}</div>
              )}
            </CardContent>
          </Card>
        </StageDropZone>
        )})}
      </div>
      </DndContext>
      {expandedDeal && (
        <div className="fixed inset-y-0 right-0 z-50 w-[420px] border-l border-slate-200 bg-white shadow-2xl flex flex-col">

          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-slate-200 p-6 shrink-0">
            <div>
              <div className="text-lg font-bold">
                {expandedDeal.company}
              </div>

              <div className="mt-1 text-sm text-slate-500">
                {expandedDeal.id}
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={() => setExpandedDeal(null)}
            >
              ✕
            </Button>
          </div>

          {/* BODY */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            <div>
              <div className="text-xs text-slate-500">
                Owner
              </div>

              <div className="mt-1 font-medium">
                {expandedDeal.owner}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">
                Value
              </div>

              <div className="mt-1 text-2xl font-bold">
                {money(expandedDeal.value)}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">
                Stage
              </div>

              <div className="mt-1">
                {expandedDeal.stage}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">
                  Notes & Activity
                </div>

                <Badge tone="gray">
                  {dealNotes.length}
                </Badge>
              </div>

              <div className="space-y-3">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Write a note..."
                  className="
                    min-h-[120px]
                    w-full
                    rounded-2xl
                    border
                    border-slate-200
                    p-4
                    text-sm
                    outline-none
                    focus:border-slate-400
                  "
                />

                <Button
                  className="w-full"
                  disabled={!newNote.trim()}
                  onClick={async () => {
                    if (!expandedDeal) return

                    const created = await dealNotesApi.create(
                      expandedDeal.id,
                      {
                        content: newNote,
                      }
                    )

                    setDealNotes(prev => [
                      created,
                      ...prev,
                    ])

                    setNewNote('')
                  }}
                >
                  Add Note
                </Button>
              </div>

              <div className="mt-6 space-y-3">
                {loadingNotes && (
                  <div className="text-sm text-slate-500">
                    Loading notes...
                  </div>
                )}

                {!loadingNotes && dealNotes.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                    No notes yet
                  </div>
                )}

                {dealNotes.map(note => (
                  <div
                    key={note.id}
                    className="
                      rounded-2xl
                      border
                      border-slate-200
                      bg-slate-50
                      p-4
                    "
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-slate-900">
                        {note.author || 'User'}
                      </div>

                      <div className="text-xs text-slate-500">
                        {new Date(note.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                      {note.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
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
