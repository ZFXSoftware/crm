import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { authApi, type AuthUser } from './api'

type AuthContextType = {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (user: AuthUser) => void
  refreshMe: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('crm_token')
    if (!token) { setLoading(false); return }
    authApi.me()
      .then(setUser)
      .catch(() => localStorage.removeItem('crm_token'))
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const { token, user } = await authApi.login(email, password)
    localStorage.setItem('crm_token', token)
    setUser(user)
  }

  function logout() {
    localStorage.removeItem('crm_token')
    setUser(null)
  }

  // Atualiza o usuário no contexto após editar perfil via PATCH /auth/me
  function updateUser(updated: AuthUser) {
    setUser(updated)
  }

  // Re-fetch do /auth/me para sincronizar qualquer mudança feita externamente
  async function refreshMe() {
    try {
      const me = await authApi.me()
      setUser(me)
    } catch {
      // token inválido — faz logout silencioso
      localStorage.removeItem('crm_token')
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, refreshMe }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
