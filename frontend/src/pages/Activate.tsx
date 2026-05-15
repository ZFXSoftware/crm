import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import { useT } from '../lib/i18n'

export default function Activate() {
  const { t } = useT()
  const a = t.auth.activate
  const [params] = useSearchParams()
  const token = params.get('token')
  const { login } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!token) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-soft">
        <p className="text-sm text-red-600">{a.tokenNotFound}</p>
      </div>
    </div>
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) return setError('As senhas não coincidem.')
    if (password.length < 6) return setError(a.minChars)
    setLoading(true); setError('')
    try {
      const { token: jwt, user } = await authApi.activate(token!, password)
      localStorage.setItem('crm_token', jwt)
      navigate('/')
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-900 shadow-lg">
            <div className="h-7 w-7 rounded-lg bg-white" />
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-slate-900">{a.title}</div>
            <div className="mt-1 text-sm text-slate-500">{a.subtitle}</div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-white p-8 shadow-soft">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-700">{a.newPassword}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder={a.minChars} required
                className="h-11 w-full rounded-xl border border-border bg-slate-50 px-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-700">{a.confirmPassword}</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder={a.repeatPassword} required
                className="h-11 w-full rounded-xl border border-border bg-slate-50 px-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white" />
            </div>
            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
            <button type="submit" disabled={loading}
              className="h-11 w-full rounded-xl bg-slate-900 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60">
              {loading ? a.activating : a.activateButton}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
