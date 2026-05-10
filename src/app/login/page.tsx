'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { signIn, user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard')
  }, [user, loading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const { error } = await signIn(email)
    if (error) {
      setError('access denied')
      setSubmitting(false)
    } else {
      router.replace('/dashboard')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-white/60 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-black text-sm font-black tracking-tighter">K</span>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">krew</span>
        </div>
        <p className="text-[#4b5563] text-sm">admin dashboard</p>
      </div>

      {/* Form */}
      <div className="w-full max-w-[340px]">
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#6b7280] font-medium block mb-1.5">
              email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#111111] border border-[#1f1f1f] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#2d2d2d] placeholder-[#4b5563] transition-colors"
              placeholder="you@krew.co"
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-white text-black font-semibold py-3 rounded-xl text-sm hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-black/20 border-t-black/70 animate-spin inline-block" />
                signing in...
              </span>
            ) : 'continue'}
          </button>
        </form>

        <p className="text-center text-[#374151] text-xs mt-6">
          private — authorized personnel only
        </p>
      </div>
    </div>
  )
}
