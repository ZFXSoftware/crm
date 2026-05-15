import { cn } from '../lib/cn'
import { useAuth } from '../lib/AuthContext'
import { useT } from '../lib/i18n'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Wallet, LineChart, Users, Target, LayoutDashboard, Settings, Shield, FileText, Download, PieChart, LogOut } from 'lucide-react'

type Section = 'finances' | 'sales' | 'admin' | 'analytics'
type Item = { label: string; to: string; icon: React.ReactNode; roles?: string[] }

const tabVisibility: Record<string, Section[]> = {
  Admin:   ['sales', 'finances', 'analytics', 'admin'],
  Manager: ['sales', 'finances', 'analytics', 'admin'],
  Analyst: ['sales', 'finances', 'analytics'],
}

export function getVisibleSections(role: string): Section[] {
  return tabVisibility[role] ?? ['sales']
}

export function Sidebar({ section, activePath, onNavigate }: {
  section: Section; activePath: string; onNavigate: (to: string) => void
}) {
  const { user, logout } = useAuth()
  const { t } = useT()
  const s = t.layout.sidebar
  const navigate = useNavigate()
  const role = user?.role ?? 'Analyst'

  const itemsBySection: Record<Section, Item[]> = {
    sales: [
      { label: s.performance, to: '/sales/performance', icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: s.pipeline,    to: '/sales/pipeline',    icon: <BarChart3 className="h-4 w-4" /> },
      { label: s.customers,   to: '/sales/customers',   icon: <Users className="h-4 w-4" /> },
      { label: s.targets,     to: '/sales/targets',     icon: <Target className="h-4 w-4" /> },
    ],
    finances: [
      { label: s.bills,   to: '/finances/bills',   icon: <Wallet className="h-4 w-4" /> },
      { label: s.revenue, to: '/finances/revenue', icon: <LineChart className="h-4 w-4" /> },
      { label: s.roi,     to: '/finances/roi',     icon: <PieChart className="h-4 w-4" /> },
      { label: s.growth,  to: '/finances/growth',  icon: <BarChart3 className="h-4 w-4" /> },
    ],
    admin: [
      { label: s.settings,    to: '/admin/settings',    icon: <Settings className="h-4 w-4" />, roles: ['Admin'] },
      { label: s.users,       to: '/admin/users',       icon: <Users className="h-4 w-4" />,   roles: ['Admin', 'Manager'] },
      { label: s.permissions, to: '/admin/permissions', icon: <Shield className="h-4 w-4" />,  roles: ['Admin'] },
    ],
    analytics: [
      { label: s.reports,  to: '/analytics/reports',  icon: <FileText className="h-4 w-4" /> },
      { label: s.insights, to: '/analytics/insights', icon: <BarChart3 className="h-4 w-4" /> },
      { label: s.exports,  to: '/analytics/exports',  icon: <Download className="h-4 w-4" /> },
    ],
  }

  const items = (itemsBySection[section] ?? []).filter(item => !item.roles || item.roles.includes(role))
  const resolvedActive = activePath.startsWith('/sales/customers/') ? '/sales/customers' : activePath

  function handleLogout() { logout(); navigate('/login') }

  return (
    <aside className="w-[260px] shrink-0">
      <div className="rounded-card border border-border bg-white shadow-soft">
        <div className="px-5 pt-5">
          <div className="text-xs font-semibold text-slate-900">{t.layout.workspace}</div>
          <div className="mt-1 text-sm font-semibold">{t.layout.appName}</div>
          <div className="mt-1 text-xs text-muted">{t.layout.subtitle}</div>
        </div>
        <div className="mt-5 border-t border-border px-3 py-3">
          {items.map(it => {
            const active = resolvedActive === it.to
            return (
              <button key={it.to} onClick={() => onNavigate(it.to)}
                className={cn('flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition', active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100')}>
                <span className={cn('grid h-8 w-8 place-items-center rounded-xl border', active ? 'border-white/20 bg-white/10' : 'border-border bg-white')}>
                  {it.icon}
                </span>
                <span className="font-medium">{it.label}</span>
              </button>
            )
          })}
        </div>
        <div className="border-t border-border px-4 py-4">
          {user && (
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-900">{user.name}</div>
                <div className="truncate text-xs text-muted">{user.role}</div>
              </div>
              <button onClick={handleLogout} title={t.layout.logout}
                className="ml-2 grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-border bg-white text-muted transition hover:bg-red-50 hover:text-red-600">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
