'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { BrandStats } from '@/lib/types'
import { fmtCost } from '@/lib/fmt'

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function formatDate(ts: string | null) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-[#1a1a1a] animate-pulse">
      <div className="h-3 bg-[#1f1f1f] rounded w-32 flex-1" />
      <div className="h-3 bg-[#1f1f1f] rounded w-16" />
      <div className="h-3 bg-[#1f1f1f] rounded w-20" />
      <div className="h-3 bg-[#1f1f1f] rounded w-16" />
      <div className="h-3 bg-[#1f1f1f] rounded w-20" />
      <div className="h-3 bg-[#1f1f1f] rounded w-16" />
      <div className="h-3 bg-[#1f1f1f] rounded w-28" />
      <div className="h-4 bg-[#1f1f1f] rounded w-6" />
    </div>
  )
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<BrandStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBrands = useCallback(async () => {
    try {
      const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString()

      // Fetch brands and all logs separately — no FK join needed
      const [brandsRes, logsRes] = await Promise.all([
        supabase.from('brands').select('id, name').order('name'),
        supabase.from('luna_usage_logs').select('brand_id, cost_usd, created_at'),
      ])

      if (brandsRes.error) throw new Error(`brands: ${brandsRes.error.message}`)
      if (logsRes.error) throw new Error(`logs: ${logsRes.error.message}`)

      const allLogs = logsRes.data ?? []
      const brandList = brandsRes.data ?? []

      const stats: BrandStats[] = brandList.map(brand => {
        const brandLogs = allLogs.filter(l => l.brand_id === brand.id)
        const monthLogs = brandLogs.filter(l => l.created_at >= monthStart)

        const totalCostAllTime = brandLogs.reduce((s, l) => s + (l.cost_usd ?? 0), 0)
        const totalCostMonth = monthLogs.reduce((s, l) => s + (l.cost_usd ?? 0), 0)
        const totalRepliesAllTime = brandLogs.length
        const totalRepliesMonth = monthLogs.length
        const avgCostPerReply = totalRepliesAllTime > 0 ? totalCostAllTime / totalRepliesAllTime : 0
        const lastActive = brandLogs.length > 0
          ? brandLogs.sort((a, b) => b.created_at.localeCompare(a.created_at))[0].created_at
          : null

        return { id: brand.id, name: brand.name, totalRepliesAllTime, totalRepliesMonth, totalCostAllTime, totalCostMonth, avgCostPerReply, lastActive }
      })

      stats.sort((a, b) => b.totalCostAllTime - a.totalCostAllTime)
      setBrands(stats)
    } catch (err: unknown) {
      console.error('[Brands]', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBrands() }, [fetchBrands])

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-white text-lg font-semibold tracking-tight">brands</h1>
        <p className="text-[#6b7280] text-xs mt-0.5">all brands using Luna</p>
      </div>

      {error && (
        <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-5 py-4 text-red-400 text-sm">
          <p className="font-semibold mb-1">connection error</p>
          <p className="font-mono text-xs opacity-80">{error}</p>
          <p className="text-xs mt-2 text-red-400/60">check RLS policies on luna_usage_logs and brands in supabase dashboard</p>
        </div>
      )}

      <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-[#1a1a1a]">
          <span className="text-[10px] uppercase tracking-widest text-[#6b7280] font-medium flex-1">brand</span>
          <span className="text-[10px] uppercase tracking-widest text-[#6b7280] font-medium w-20 text-right">replies total</span>
          <span className="text-[10px] uppercase tracking-widest text-[#6b7280] font-medium w-20 text-right">replies mo.</span>
          <span className="text-[10px] uppercase tracking-widest text-[#6b7280] font-medium w-24 text-right">cost total</span>
          <span className="text-[10px] uppercase tracking-widest text-[#6b7280] font-medium w-24 text-right">cost mo.</span>
          <span className="text-[10px] uppercase tracking-widest text-[#6b7280] font-medium w-24 text-right">avg / reply</span>
          <span className="text-[10px] uppercase tracking-widest text-[#6b7280] font-medium w-36 text-right">last active</span>
          <span className="w-6" />
        </div>

        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
        ) : brands.length === 0 ? (
          <div className="py-12 text-center text-[#4b5563] text-sm">no brands found</div>
        ) : (
          brands.map(brand => (
            <Link
              key={brand.id}
              href={`/dashboard/brands/${brand.id}`}
              className="flex items-center gap-4 px-5 py-3.5 border-b border-[#1a1a1a] last:border-b-0 hover:bg-[#0d0d0d] transition-colors group"
            >
              <span className="text-sm font-medium text-white flex-1">{brand.name}</span>
              <span className="text-sm text-[#9ca3af] w-20 text-right tabular-nums">
                {brand.totalRepliesAllTime.toLocaleString()}
              </span>
              <span className="text-sm text-[#9ca3af] w-20 text-right tabular-nums">
                {brand.totalRepliesMonth.toLocaleString()}
              </span>
              <span className="text-sm text-white w-24 text-right tabular-nums font-medium">
                ${fmtCost(brand.totalCostAllTime)}
              </span>
              <span className="text-sm text-[#9ca3af] w-24 text-right tabular-nums">
                ${fmtCost(brand.totalCostMonth)}
              </span>
              <span className="text-sm text-[#9ca3af] w-24 text-right tabular-nums">
                ${fmtCost(brand.avgCostPerReply)}
              </span>
              <span className="text-xs text-[#6b7280] w-36 text-right">
                {formatDate(brand.lastActive)}
              </span>
              <span className="text-[#4b5563] group-hover:text-[#6b7280] transition-colors w-6 flex justify-end">
                <ChevronIcon />
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
