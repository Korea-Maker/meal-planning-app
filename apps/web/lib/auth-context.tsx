'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, AuthTokens } from '@meal-planning/shared-types'
import { api } from './api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const clearSession = useCallback(() => {
    api.setAccessToken(null)
    setUser(null)
  }, [])

  const fetchUser = useCallback(async () => {
    try {
      const response = await api.get<{ success: boolean; data: User }>('/users/me')
      setUser(response.data)
    } catch {
      clearSession()
    }
  }, [clearSession])

  useEffect(() => {
    api.setOnAuthFailure(clearSession)
  }, [clearSession])

  useEffect(() => {
    const initAuth = async () => {
      // Try silent refresh via HttpOnly cookie
      const refreshed = await api.silentRefresh()
      if (refreshed) {
        await fetchUser()
      }
      setIsLoading(false)
    }

    initAuth()
  }, [fetchUser])

  const login = async (email: string, password: string) => {
    const response = await api.post<{
      success: boolean
      data: { user: User; tokens: AuthTokens }
    }>('/auth/login', { email, password })

    const { user: userData, tokens } = response.data
    api.setAccessToken(tokens.access_token)
    setUser(userData)
  }

  const register = async (email: string, password: string, name: string) => {
    const response = await api.post<{
      success: boolean
      data: { user: User; tokens: AuthTokens }
    }>('/auth/register', { email, password, name })

    const { user: userData, tokens } = response.data
    api.setAccessToken(tokens.access_token)
    setUser(userData)
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Clear local state even if server call fails
    }
    clearSession()
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
