import { Link } from 'react-router-dom'
import { useT } from '../lib/i18n'

export default function NotFound() {
  const { t } = useT()
  const n = t.notFound
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 text-center">
      <div className="text-6xl font-bold text-slate-200">404</div>
      <div className="text-xl font-semibold text-slate-800">{n.title}</div>
      <div className="text-sm text-slate-500">{n.subtitle}</div>
      <Link to="/" className="mt-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-700 transition">
        {n.goHome}
      </Link>
    </div>
  )
}
