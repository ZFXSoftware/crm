import { useState } from 'react'
import PageHeader from '../../components/PageHeader'
import { Card, CardContent, CardHeader, CardSubtitle, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input, Modal } from '../../components/ui/Modal'
import { adminApi, authApi, type AuthUser } from '../../lib/api'
import { useApi } from '../../lib/useApi'
import { useT } from '../../lib/i18n'

export default function AdminUsers() {
  const { t } = useT()
  const u = t.users
  const c = t.common

  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [form, setForm] = useState({ name:'', email:'', role:'Analyst' })

  const { data, loading, error, refetch } = useApi(() => adminApi.users({ role, status }), [role, status])
  const users = data ?? []

  function toneFor(s: string) {
    if (s === 'Active')    return 'green'
    if (s === 'Invited')   return 'blue'
    if (s === 'Suspended') return 'red'
    return 'gray'
  }

  function statusLabel(s: string) {
    const map: Record<string, string> = {
      Active: u.statuses.active, Invited: u.statuses.invited, Suspended: u.statuses.suspended,
    }
    return map[s] ?? s
  }

  async function invite() {
    if (!form.name.trim() || !form.email.trim()) return alert(`${c.name} e ${c.email} são obrigatórios.`)
    setSaving(true)
    try {
      const res = await authApi.invite({ name: form.name.trim(), email: form.email.trim(), role: form.role })
      setInviteLink(res.invite_link)
      refetch()
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  async function toggleStatus(user: AuthUser) {
    const newStatus = user.status === 'Active' ? 'Suspended' : 'Active'
    try { await adminApi.updateUser(user.id, { status: newStatus }); refetch() }
    catch (e: any) { alert(e.message) }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={u.title}
        subtitle={u.subtitle}
        filters={[
          { label: c.role, value: role, onChange: setRole, options: [
            { label: u.roles.all,     value: 'all'     },
            { label: u.roles.admin,   value: 'Admin'   },
            { label: u.roles.manager, value: 'Manager' },
            { label: u.roles.analyst, value: 'Analyst' },
          ]},
          { label: c.status, value: status, onChange: setStatus, options: [
            { label: u.statuses.all,       value: 'all'       },
            { label: u.statuses.active,    value: 'Active'    },
            { label: u.statuses.invited,   value: 'Invited'   },
            { label: u.statuses.suspended, value: 'Suspended' },
          ]},
        ]}
        right={<Button onClick={() => { setOpen(true); setInviteLink('') }}>{u.invite}</Button>}
      />

      {error && <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{c.backendError}</div>}

      <Card>
        <CardHeader>
          <CardTitle>{u.list}</CardTitle>
          <CardSubtitle>{loading ? c.loading : `${users.length} ${u.title.toLowerCase()}`}</CardSubtitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-card border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-muted">
                <tr>
                  <th className="px-4 py-3">{c.name}</th>
                  <th className="px-4 py-3">{c.role}</th>
                  <th className="px-4 py-3">{c.status}</th>
                  <th className="px-4 py-3">{u.lastSeen}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({length:3}).map((_,i) => (
                      <tr key={i} className="border-t border-border animate-pulse">
                        {Array.from({length:5}).map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 w-20 rounded bg-slate-100" /></td>)}
                      </tr>
                    ))
                  : users.map(user => (
                      <tr key={user.id} className="border-t border-border">
                        <td className="px-4 py-3">
                          <div className="font-semibold">{user.name}</div>
                          <div className="text-xs text-muted">{user.email}</div>
                        </td>
                        <td className="px-4 py-3">{user.role}</td>
                        <td className="px-4 py-3">
                          <Badge tone={toneFor(user.status) as any}>{statusLabel(user.status)}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted text-xs">
                          {user.last_seen ? new Date(user.last_seen).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {user.status !== 'Invited' && (
                            <Button size="sm" variant="ghost" className="border border-border bg-white"
                              onClick={() => toggleStatus(user)}>
                              {user.status === 'Active' ? u.statuses.suspended : u.statuses.active}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)}
        title={u.inviteTitle} subtitle={u.inviteSub}
        footer={
          !inviteLink
            ? <><Button variant="ghost" className="border border-border bg-white" onClick={() => setOpen(false)}>{c.cancel}</Button>
                <Button onClick={invite} disabled={saving}>{saving ? c.saving : u.invite}</Button></>
            : <Button onClick={() => setOpen(false)}>{c.close}</Button>
        }
      >
        {!inviteLink ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <div className="mb-2 text-xs text-muted">{c.name}</div>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name:e.target.value }))} placeholder={u.namePh} />
            </div>
            <div className="md:col-span-2">
              <div className="mb-2 text-xs text-muted">{c.email}</div>
              <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email:e.target.value }))} placeholder={u.emailPh} />
            </div>
            <div className="md:col-span-2">
              <div className="mb-2 text-xs text-muted">{c.role}</div>
              <select className="h-10 w-full rounded-full border border-border bg-white px-4 text-sm outline-none"
                value={form.role} onChange={e => setForm(p => ({ ...p, role:e.target.value }))}>
                <option value="Admin">{u.roles.admin}</option>
                <option value="Manager">{u.roles.manager}</option>
                <option value="Analyst">{u.roles.analyst}</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              ✅ Convite criado com sucesso!
            </div>
            <div>
              <div className="mb-2 text-xs text-muted">Link de ativação</div>
              <div className="flex gap-2">
                <input readOnly value={inviteLink}
                  className="flex-1 rounded-xl border border-border bg-slate-50 px-4 py-2 text-xs text-muted outline-none" />
                <Button size="sm" onClick={() => { navigator.clipboard.writeText(inviteLink) }}>{c.copy}</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
