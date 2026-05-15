import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ptBR } from './pt-BR'
import { en } from './en'

// ── Tipos ─────────────────────────────────────────────────
export type Locale = 'pt-BR' | 'en'

const TRANSLATIONS = { 'pt-BR': ptBR, en } as const

// ── Contexto ──────────────────────────────────────────────
type I18nContextType = {
  locale: Locale
  t: typeof ptBR | typeof en
  setLocale: (l: Locale) => void
}

const I18nContext = createContext<I18nContextType>({
  locale: 'pt-BR',
  t: ptBR,
  setLocale: () => {},
})

// ── Provider ──────────────────────────────────────────────
const STORAGE_KEY = 'crm_locale'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null
    return saved && saved in TRANSLATIONS ? saved : 'pt-BR'
  })

  function setLocale(l: Locale) {
    setLocaleState(l)
    localStorage.setItem(STORAGE_KEY, l)
  }

  const t = TRANSLATIONS[locale]

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────
export function useT() {
  return useContext(I18nContext)
}

// ── Utilitário de interpolação ────────────────────────────
// Uso: interpolate('Deletar "%s"?', 'Nome do Template') → 'Deletar "Nome do Template"?'
export function interpolate(str: string, ...args: string[]): string {
  return args.reduce((acc, arg) => acc.replace('%s', arg), str)
}
