import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input, Modal } from '../../components/ui/Modal'
import { customersApi, tasksApi, type Contact, type Deal, type Task, type Activity } from '../../lib/api'
import { useApi } from '../../lib/useApi'
import { useT } from '../../lib/i18n'

function money(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}
function relativeDate(s: string) {
  const diff = Date.now() - new Date(s).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}min atrás`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

const PLAN_TONE: Record<string, 'purple'|'blue'|'gray'> = { Enterprise:'purple', Growth:'blue', Starter:'gray' }
const STATUS_TONE: Record<string, 'green'|'blue'|'amber'> = { Active:'green', Trial:'blue', 'At Risk':'amber' }
const STAGE_TONE: Record<string, 'green'|'purple'|'gray'> = { Won:'green', Negotiation:'purple' }

export default function SalesCustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const { t } = useT()
  const d = t.customers.detail
  const c = t.common
  const navigate = useNavigate()

  const { data: customer, loading, error, refetch } = useApi(() => customersApi.get(id!), [id])

  const [noteOpen, setNoteOpen]       = useState(false)
  const [noteText, setNoteText]       = useState('')
  const [noteSaving, setNoteSaving]   = useState(false)

  const [contactOpen, setContactOpen]   = useState(false)
  const [contactForm, setContactForm]   = useState({ name:'', email:'', phone:'', title:'' })
  const [contactSaving, setContactSaving] = useState(false)

  const [taskOpen, setTaskOpen]     = useState(false)
  const [taskForm, setTaskForm]     = useState({ title:'', due_date:'' })
  const [taskSaving, setTaskSaving] = useState(false)

  const [editOpen, setEditOpen]     = useState(false)
  const [editForm, setEditForm]     = useState({ name:'', email:'', company:'', plan:'', status:'', mrr:'', notes:'' })
  const [editSaving, setEditSaving] = useState(false)

  async function saveNote() {
    if (!noteText.trim()) return
    setNoteSaving(true)
    try { await customersApi.addNote(id!, noteText); refetch(); setNoteOpen(false); setNoteText('') }
    catch (e: any) { alert(e.message) }
    finally { setNoteSaving(false) }
  }

  async function saveContact() {
    if (!contactForm.name.trim()) return alert(`${c.name} é obrigatório`)
    setContactSaving(true)
    try { await customersApi.addContact(id!, contactForm); refetch(); setContactOpen(false); setContactForm({ name:'',email:'',phone:'',title:'' }) }
    catch (e: any) { alert(e.message) }
    finally { setContactSaving(false) }
  }

  async function deleteContact(cid: number) {
    if (!confirm(`${c.remove}?`)) return
    try { await customersApi.deleteContact(id!, cid); refetch() }
    catch (e: any) { alert(e.message) }
  }

  async function saveTask() {
    if (!taskForm.title.trim()) return alert(`${c.title} é obrigatório`)
    setTaskSaving(true)
    try { await tasksApi.create({ title:taskForm.title, due_date:taskForm.due_date||undefined, customer_id:id }); refetch(); setTaskOpen(false); setTaskForm({ title:'',due_date:'' }) }
    catch (e: any) { alert(e.message) }
    finally { setTaskSaving(false) }
  }

  async function toggleTask(task: Task) {
    try { await tasksApi.update(task.id, { status:task.status==='Open'?'Done':'Open' }); refetch() }
    catch (e: any) { alert(e.message) }
  }

  function openEdit() {
    if (!customer) return
    setEditForm({ name:customer.name, email:customer.email, company:customer.company, plan:customer.plan, status:customer.status, mrr:String(customer.mrr), notes:customer.notes??'' })
    setEditOpen(true)
  }

  async function saveEdit() {
    setEditSaving(true)
    try { await customersApi.update(id!, { ...editForm, mrr:Number(editForm.mrr) } as any); refetch(); setEditOpen(false) }
    catch (e: any) { alert(e.message) }
    finally { setEditSaving(false) }
  }

  async function deleteCustomer() {
    if (!confirm(`${c.delete} ${customer?.name}?`)) return
    try { await customersApi.remove(id!); navigate('/sales/customers') }
    catch (e: any) { alert(e.message) }
  }

  if (loading) return <div className="py-20 text-center text-sm text-muted">{c.loading}</div>
  if (error || !customer) return <div className="py-20 text-center text-sm text-red-600">{c.backendError}</div>

  const deals: Deal[]         = (customer as any).deals ?? []
  const contacts: Contact[]   = (customer as any).contacts ?? []
  const tasks: Task[]         = (customer as any).tasks ?? []
  const activities: Activity[] = (customer as any).activities ?? []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => navigate('/sales/customers')} className="mb-2 text-xs text-muted hover:text-slate-700">← {t.customers.title}</button>
          <h1 className="text-2xl font-semibold text-slate-900">{customer.name}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted">
            <span>{customer.company}</span><span>·</span><span>{customer.email}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={PLAN_TONE[customer.plan] ?? 'gray'}>{customer.plan}</Badge>
          <Badge tone={STATUS_TONE[customer.status] ?? 'gray'}>{customer.status}</Badge>
          <Button variant="ghost" className="border border-border bg-white" onClick={openEdit}>{c.edit}</Button>
          <Button variant="ghost" className="border border-red-200 bg-white text-red-600 hover:bg-red-50" onClick={deleteCustomer}>{c.delete}</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader><CardTitle>MRR</CardTitle><CardSubtitle>{d.monthlyRec}</CardSubtitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{money(customer.mrr)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{d.openDeals}</CardTitle><CardSubtitle>{d.pipeline}</CardSubtitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{deals.filter(dl => !['Won','Lost'].includes(dl.stage)).length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Tasks</CardTitle><CardSubtitle>{d.openFollowUps}</CardSubtitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{tasks.filter(tk => tk.status==='Open').length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{d.lastContact}</CardTitle><CardSubtitle>{d.mostRecent}</CardSubtitle></CardHeader>
          <CardContent><div className="text-xl font-semibold">{customer.last_contact}</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">

          {/* Deals */}
          <Card>
            <CardHeader><CardTitle>Deals</CardTitle><CardSubtitle>{deals.length} total</CardSubtitle></CardHeader>
            <CardContent>
              {deals.length === 0
                ? <div className="text-sm text-muted">{d.noDeals}</div>
                : <div className="space-y-2">
                    {deals.map(dl => (
                      <div key={dl.id} className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3">
                        <div>
                          <div className="text-sm font-semibold">{dl.company}</div>
                          <div className="text-xs text-muted">{dl.id} · {dl.owner}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{money(dl.value)}</span>
                          <Badge tone={STAGE_TONE[dl.stage] ?? 'gray'}>{dl.stage}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>}
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div><CardTitle>Tasks</CardTitle><CardSubtitle>{d.followUps}</CardSubtitle></div>
                <Button size="sm" onClick={() => setTaskOpen(true)}>+ {d.addTask.replace('Adicionar ','').replace('Add ','')}</Button>
              </div>
            </CardHeader>
            <CardContent>
              {tasks.length === 0
                ? <div className="text-sm text-muted">{d.noTasks}</div>
                : <div className="space-y-2">
                    {tasks.map(tk => (
                      <div key={tk.id} className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3">
                        <button onClick={() => toggleTask(tk)} className={`h-5 w-5 shrink-0 rounded border-2 transition ${tk.status==='Done'?'border-slate-900 bg-slate-900':'border-border'}`}>
                          {tk.status==='Done' && <svg viewBox="0 0 10 10" className="h-full w-full text-white" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                        </button>
                        <div className="flex-1">
                          <div className={`text-sm ${tk.status==='Done'?'text-muted line-through':'font-medium'}`}>{tk.title}</div>
                          {tk.due_date && <div className="text-xs text-muted">Due {tk.due_date}</div>}
                        </div>
                      </div>
                    ))}
                  </div>}
            </CardContent>
          </Card>

          {/* Contacts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div><CardTitle>Contacts</CardTitle><CardSubtitle>{contacts.length} total</CardSubtitle></div>
                <Button size="sm" onClick={() => setContactOpen(true)}>+ {d.addContact.replace('Adicionar ','').replace('Add ','')}</Button>
              </div>
            </CardHeader>
            <CardContent>
              {contacts.length === 0
                ? <div className="text-sm text-muted">{d.noContacts}</div>
                : <div className="space-y-2">
                    {contacts.map(ct => (
                      <div key={ct.id} className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3">
                        <div>
                          <div className="text-sm font-semibold">{ct.name}</div>
                          <div className="text-xs text-muted">{[ct.title,ct.email,ct.phone].filter(Boolean).join(' · ')}</div>
                        </div>
                        <button onClick={() => deleteContact(ct.id)} className="text-xs text-muted hover:text-red-600">{c.remove}</button>
                      </div>
                    ))}
                  </div>}
            </CardContent>
          </Card>
        </div>

        {/* Right col */}
        <div className="space-y-5">
          {customer.notes && (
            <Card>
              <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-slate-700 whitespace-pre-wrap">{customer.notes}</p></CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div><CardTitle>{d.history}</CardTitle><CardSubtitle>{d.mostRecent}</CardSubtitle></div>
                <Button size="sm" variant="ghost" className="border border-border bg-white" onClick={() => setNoteOpen(true)}>+ Note</Button>
              </div>
            </CardHeader>
            <CardContent>
              {activities.length === 0
                ? <div className="text-sm text-muted">{d.noActivities}</div>
                : <div className="space-y-3">
                    {activities.map(a => (
                      <div key={a.id} className="flex gap-3">
                        <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                        <div>
                          <div className="text-sm text-slate-700">{a.description}</div>
                          <div className="mt-0.5 text-xs text-muted">{relativeDate(a.created_at)}{a.user_name?` · ${a.user_name}`:''}</div>
                        </div>
                      </div>
                    ))}
                  </div>}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal: Note */}
      <Modal open={noteOpen} onClose={() => setNoteOpen(false)} title={d.addNote} subtitle={d.noteSub}
        footer={<><Button variant="ghost" className="border border-border bg-white" onClick={() => setNoteOpen(false)}>{c.cancel}</Button><Button onClick={saveNote} disabled={noteSaving}>{noteSaving ? c.saving : c.save}</Button></>}>
        <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder={d.notePh} rows={4}
          className="w-full rounded-2xl border border-border bg-white p-4 text-sm outline-none focus:ring-2 focus:ring-slate-200 resize-none" />
      </Modal>

      {/* Modal: Contact */}
      <Modal open={contactOpen} onClose={() => setContactOpen(false)} title={d.addContact} subtitle={d.contactSub}
        footer={<><Button variant="ghost" className="border border-border bg-white" onClick={() => setContactOpen(false)}>{c.cancel}</Button><Button onClick={saveContact} disabled={contactSaving}>{contactSaving ? c.saving : c.save}</Button></>}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2"><div className="mb-2 text-xs text-muted">{c.name} *</div><Input value={contactForm.name} onChange={e => setContactForm(p=>({...p,name:e.target.value}))} placeholder="Jane Smith" /></div>
          <div><div className="mb-2 text-xs text-muted">{c.title}</div><Input value={contactForm.title} onChange={e => setContactForm(p=>({...p,title:e.target.value}))} placeholder="CFO" /></div>
          <div><div className="mb-2 text-xs text-muted">{c.email}</div><Input value={contactForm.email} onChange={e => setContactForm(p=>({...p,email:e.target.value}))} placeholder="jane@company.com" /></div>
          <div><div className="mb-2 text-xs text-muted">{c.phone}</div><Input value={contactForm.phone} onChange={e => setContactForm(p=>({...p,phone:e.target.value}))} placeholder="+55 11 99999-9999" /></div>
        </div>
      </Modal>

      {/* Modal: Task */}
      <Modal open={taskOpen} onClose={() => setTaskOpen(false)} title={d.addTask} subtitle={d.taskSub}
        footer={<><Button variant="ghost" className="border border-border bg-white" onClick={() => setTaskOpen(false)}>{c.cancel}</Button><Button onClick={saveTask} disabled={taskSaving}>{taskSaving ? c.saving : c.save}</Button></>}>
        <div className="space-y-3">
          <div><div className="mb-2 text-xs text-muted">{c.title} *</div><Input value={taskForm.title} onChange={e => setTaskForm(p=>({...p,title:e.target.value}))} placeholder="Follow up about renewal" /></div>
          <div><div className="mb-2 text-xs text-muted">{c.date}</div><Input type="date" value={taskForm.due_date} onChange={e => setTaskForm(p=>({...p,due_date:e.target.value}))} /></div>
        </div>
      </Modal>

      {/* Modal: Edit */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={d.editTitle} subtitle={`ID: ${id}`}
        footer={<><Button variant="ghost" className="border border-border bg-white" onClick={() => setEditOpen(false)}>{c.cancel}</Button><Button onClick={saveEdit} disabled={editSaving}>{editSaving ? c.saving : c.save}</Button></>}>
        <div className="grid gap-3 md:grid-cols-2">
          <div><div className="mb-2 text-xs text-muted">{c.name}</div><Input value={editForm.name} onChange={e => setEditForm(p=>({...p,name:e.target.value}))} /></div>
          <div><div className="mb-2 text-xs text-muted">{c.email}</div><Input value={editForm.email} onChange={e => setEditForm(p=>({...p,email:e.target.value}))} /></div>
          <div><div className="mb-2 text-xs text-muted">{c.company}</div><Input value={editForm.company} onChange={e => setEditForm(p=>({...p,company:e.target.value}))} /></div>
          <div><div className="mb-2 text-xs text-muted">MRR</div><Input value={editForm.mrr} onChange={e => setEditForm(p=>({...p,mrr:e.target.value}))} /></div>
          <div>
            <div className="mb-2 text-xs text-muted">Plan</div>
            <select className="h-10 w-full rounded-full border border-border bg-white px-4 text-sm outline-none" value={editForm.plan} onChange={e => setEditForm(p=>({...p,plan:e.target.value}))}>
              <option value="Starter">{t.customers.plans.starter}</option>
              <option value="Growth">{t.customers.plans.growth}</option>
              <option value="Enterprise">{t.customers.plans.enterprise}</option>
            </select>
          </div>
          <div>
            <div className="mb-2 text-xs text-muted">{c.status}</div>
            <select className="h-10 w-full rounded-full border border-border bg-white px-4 text-sm outline-none" value={editForm.status} onChange={e => setEditForm(p=>({...p,status:e.target.value}))}>
              <option value="Active">{t.customers.statuses.active}</option>
              <option value="Trial">{t.customers.statuses.trial}</option>
              <option value="At Risk">{t.customers.statuses.atRisk}</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <div className="mb-2 text-xs text-muted">Notes</div>
            <textarea value={editForm.notes} onChange={e => setEditForm(p=>({...p,notes:e.target.value}))} rows={3}
              className="w-full rounded-2xl border border-border bg-white p-4 text-sm outline-none focus:ring-2 focus:ring-slate-200 resize-none" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
