import { cn } from '../lib/cn'
import { useAuth } from '../lib/AuthContext'
import { useT, type Locale } from '../lib/i18n'
import { getVisibleSections } from './Sidebar'

type Section = 'finances' | 'sales' | 'admin' | 'analytics'

export function TopTabs({ section, onChange }: { section: Section; onChange: (s: Section) => void }) {
  const { user } = useAuth()
  const { t, locale, setLocale } = useT()
  const role = user?.role ?? 'Analyst'

  const ALL_TABS: { key: Section; label: string }[] = [
    { key: 'sales',     label: t.layout.tabs.sales     },
    { key: 'finances',  label: t.layout.tabs.finances  },
    { key: 'analytics', label: t.layout.tabs.analytics },
    { key: 'admin',     label: t.layout.tabs.admin     },
  ]

  const visibleSections = getVisibleSections(role)
  const tabs = ALL_TABS.filter(tab => visibleSections.includes(tab.key))

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Logo */}
      <div className="flex shrink-0 items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-white shadow-soft">
          <div className="h-5 w-5 rounded-md bg-slate-900" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">{t.layout.appName}</div>
          <div className="text-xs text-muted">{t.layout.appSlogan}</div>
        </div>
      </div>

      {/* Tabs filtradas por role */}
      <div className="flex items-center gap-1 rounded-full border border-border bg-white p-1 shadow-soft">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              'h-9 rounded-full px-5 text-sm font-medium transition',
              section === tab.key ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Seletor de idioma + usuário */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Language switcher */}
        <div className="flex items-center gap-1 rounded-full border border-border bg-white px-1 py-1 shadow-soft">
          {(['pt-BR', 'en'] as Locale[]).map((l) => (
            <button
              key={l}
              onClick={() => setLocale(l)}
              className={cn(
                'h-7 rounded-full px-3 text-xs font-medium transition',
                locale === l ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              {l === 'pt-BR' ? '🇧🇷 PT' : '🇺🇸 EN'}
            </button>
          ))}
        </div>

        {/* Usuário */}
        <div className="flex shrink-0 items-center gap-3 rounded-full border border-border bg-white px-4 py-2 shadow-soft">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="leading-tight">
            <div className="text-xs font-semibold">{user?.name ?? '…'}</div>
            <div className="text-[11px] text-muted">{user?.role ?? ''}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

