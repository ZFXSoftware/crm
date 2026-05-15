import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { TopTabs } from './TopTabs'
import { Sidebar } from './Sidebar'

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  const section = useMemo(() => {
    const p = location.pathname
    if (p.startsWith('/finances')) return 'finances'
    if (p.startsWith('/admin')) return 'admin'
    if (p.startsWith('/analytics')) return 'analytics'
    return 'sales'
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto flex min-h-screen max-w-[1280px] gap-6 px-6 py-6">
        <Sidebar
          section={section}
          activePath={location.pathname}
          onNavigate={(to) => navigate(to)}
        />
        <main className="flex-1 min-w-0">
          <TopTabs section={section} onChange={(s) => navigate(`/${s}/${defaultRouteFor(s)}`)} />
          <div className="mt-5">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

function defaultRouteFor(section: string) {
  switch (section) {
    case 'finances': return 'bills'
    case 'admin': return 'settings'
    case 'analytics': return 'reports'
    default: return 'performance'
  }
}
