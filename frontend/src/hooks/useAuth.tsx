import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { UserDTO, TenantMemberDTO } from '../types'
import { authApi } from '../services/api'

interface AuthContextType {
  user: UserDTO | null
  token: string | null
  memberships: TenantMemberDTO[]
  isInternal: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [memberships, setMemberships] = useState<TenantMemberDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    if (storedToken && storedUser) {
      setToken(storedToken)
      try {
        const u = JSON.parse(storedUser)
        setUser(u)
        setMemberships(u.memberships || [])
      } catch {}
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    const { access_token, user: u } = res.data
    // Fetch full profile with memberships
    localStorage.setItem('token', access_token)
    const meRes = await authApi.me()
    const fullUser = meRes.data
    localStorage.setItem('user', JSON.stringify(fullUser))
    setToken(access_token)
    setUser(fullUser)
    setMemberships(fullUser.memberships || [])
  }

  const logout = () => {
    authApi.logout().catch(() => {})
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    setMemberships([])
    window.location.href = '/login'
  }

  const isInternal = memberships.some(m => m.role === 'internal_user')

  return (
    <AuthContext.Provider value={{ user, token, memberships, isInternal, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
