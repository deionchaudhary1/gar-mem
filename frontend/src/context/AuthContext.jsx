import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import client from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await client.get('/auth/me')
      setUser(res.data)
      return res.data
    } catch {
      setUser(null)
      return null
    }
  }, [])

  useEffect(() => {
    let active = true
    client
      .get('/auth/me')
      .then((res) => {
        if (active) setUser(res.data)
      })
      .catch(() => {
        if (active) setUser(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const id = client.interceptors.response.use(
      (res) => res,
      (err) => {
        if (
          err?.response?.status === 401 &&
          !['/auth/login', '/auth/signup'].includes(err?.config?.url)
        ) {
          setUser(null)
        }
        return Promise.reject(err)
      },
    )
    return () => client.interceptors.response.eject(id)
  }, [])

  const login = useCallback(async (identifier, password) => {
    const res = await client.post('/auth/login', { identifier, password })
    setUser(res.data)
    return res.data
  }, [])

  const signup = useCallback(async (email, username, password) => {
    const res = await client.post('/auth/signup', { email, username, password })
    setUser(res.data)
    return res.data
  }, [])

  const logout = useCallback(async () => {
    try {
      await client.post('/auth/logout')
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, signup, logout, refresh, setUser }),
    [user, loading, login, signup, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
