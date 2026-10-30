import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as authApi from '../api/auth'
import { setUnauthorizedHandler } from '../api/client'
import { AuthContext, type AuthContextValue, type AuthStatus } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [username, setUsername] = useState<string | null>(null)

  // Session state lives only in memory; the HttpOnly cookie is the source of truth.
  useEffect(() => {
    let active = true
    authApi
      .getMe()
      .then((session) => {
        if (!active) return
        setUsername(session.username)
        setStatus('authenticated')
      })
      .catch(() => {
        if (!active) return
        setUsername(null)
        setStatus('anonymous')
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUsername(null)
      setStatus('anonymous')
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  const login = useCallback(async (user: string, password: string) => {
    const session = await authApi.login({ username: user, password })
    setUsername(session.username)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      setUsername(null)
      setStatus('anonymous')
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ status, username, login, logout }),
    [status, username, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
