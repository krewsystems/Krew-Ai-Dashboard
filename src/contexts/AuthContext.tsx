'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { ALLOWED_EMAILS } from '@/lib/allowedEmails'

interface SimpleUser {
  email: string
}

interface AuthContextType {
  user: SimpleUser | null
  loading: boolean
  signIn: (email: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const SESSION_KEY = 'krew-admin-session'

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SimpleUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as SimpleUser
        if (parsed.email && ALLOWED_EMAILS.includes(parsed.email)) {
          setUser(parsed)
        }
      }
    } catch {
      // ignore
    }
    setLoading(false)
  }, [])

  const signIn = async (email: string): Promise<{ error: string | null }> => {
    const trimmed = email.trim().toLowerCase()
    if (!ALLOWED_EMAILS.includes(trimmed)) return { error: 'access denied' }
    const session: SimpleUser = { email: trimmed }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setUser(session)
    return { error: null }
  }

  const signOut = async () => {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
