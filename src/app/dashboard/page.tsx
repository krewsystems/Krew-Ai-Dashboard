'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { UsageLog, Brand, UsageLogWithBrand } from '@/lib/types'
import { fmtCost } from '@/lib/fmt'
import StatCard from '@/components/StatCard'
import SkeletonCard from '@/components/SkeletonCard'
import DailyCostChart from '@/components/DailyCostChart'
import MessageTypeDonut from '@/components/MessageTypeDonut'
import LiveFeed from '@/components/LiveFeed'

interface OverviewStats {
  totalCostToday: number
  totalCostMonth: number
  totalRepliesToday: number
  totalRepliesMonth: number
  mostExpensiveBrandToday: { name: string; cost: number } | null
  mostActiveBrandToday: { name: string; count: number } | null
}

interface DailyData { date: string; cost: number }
interface TypeBreakdown { type: string; count: number; cost: number }

function isoDay(d: Date) { return d.toISOString().split('T')[0] }
function todayUTC() { return new Date().toISOString().split('T')[0] + 'T00:00:00.000Z' }
function monthUTC() {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString()
}

export default function OverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [dailyData, setDailyData] = useState<DailyData[]>([])
  const [typeBreakdown, setTypeBreakdown] = useState<TypeBreakdown[]>([])
  const [liveLogs, setLiveLogs] = useState<UsageLogWithBrand[]>([])
  const [brandMap, setBrandMap] = useState<Record<string, Brand>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [realtimeOk, setRealtimeOk] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      // 1. Fetch brands lookup (no FK dependency)
      const { data: brandsData, error: brandsErr } = await supabase
        .from('brands')
        .select('id, name')

      if (brandsErr) throw new Error(`brands: ${brandsErr.message}`)

      const map: Record<string, Brand> = {}
        ; (brandsData ?? []).forEach(b => { map[b.id] = b })
      setBrandMap(map)

      const todayISO = todayUTC()
      const monthISO = monthUTC()

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6)
      sevenDaysAgo.setUTCHours(0, 0, 0, 0)

      // 2. Parallel: recent 200 logs (no date filter), month stats, week stats
      const [recentRes, monthRes, weekRes] = await Promise.all([
        supabase
          .from('luna_usage_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('luna_usage_logs')
          .select('brand_id, cost_usd, message_type, created_at')
          .gte('created_at', monthISO),
        supabase
          .from('luna_usage_logs')
          .select('cost_usd, created_at')
          .gte('created_at', sevenDaysAgo.toISOString()),
      ])

      if (recentRes.error) throw new Error(`logs: ${recentRes.error.message}`)
      if (monthRes.error) throw new Error(`month: ${monthRes.error.message}`)

      const recentLogs = (recentRes.data ?? []) as UsageLog[]
      const monthLogs = monthRes.data ?? []

      // Attach brand names to recent logs
      const logsWithBrand: UsageLogWithBrand[] = recentLogs.map(l => ({
        ...l,
        brands: map[l.brand_id] ?? null,
      }))
      setLiveLogs(logsWithBrand)

      // Today stats (filter from recent logs in JS using UTC date)
      const todayLogs = monthLogs.filter(l => l.created_at >= todayISO)
      const totalCostToday = todayLogs.reduce((s, l) => s + (l.cost_usd ?? 0), 0)
      const totalRepliesToday = todayLogs.length

      // Month stats
      const totalCostMonth = monthLogs.reduce((s, l) => s + (l.cost_usd ?? 0), 0)
      const totalRepliesMonth = monthLogs.length

      // Most expensive / active brand today
      const brandCosts: Record<string, { name: string; cost: number }> = {}
      const brandCounts: Record<string, { name: string; count: number }> = {}
      todayLogs.forEach(l => {
        const name = map[l.brand_id]?.name ?? 'Unknown'
        if (!brandCosts[l.brand_id]) brandCosts[l.brand_id] = { name, cost: 0 }
        brandCosts[l.brand_id].cost += l.cost_usd ?? 0
        if (!brandCounts[l.brand_id]) brandCounts[l.brand_id] = { name, count: 0 }
        brandCounts[l.brand_id].count++
      })

      // Message type breakdown from month logs
      const typeMap: Record<string, { count: number; cost: number }> = {}
      monthLogs.forEach(l => {
        const t = l.message_type ?? 'text'
        if (!typeMap[t]) typeMap[t] = { count: 0, cost: 0 }
        typeMap[t].count++
        typeMap[t].cost += l.cost_usd ?? 0
      })
      setTypeBreakdown(Object.entries(typeMap).map(([type, d]) => ({ type, ...d })))

      // Daily cost (last 7 days)
      const dayMap: Record<string, number> = {}
      for (let i = 0; i < 7; i++) {
        const d = new Date()
        d.setUTCDate(d.getUTCDate() - (6 - i))
        dayMap[isoDay(d)] = 0
      }
        ; (weekRes.data ?? []).forEach(l => {
          const key = l.created_at.split('T')[0]
          if (key in dayMap) dayMap[key] += l.cost_usd ?? 0
        })
      setDailyData(Object.entries(dayMap).map(([date, cost]) => ({ date, cost })))

      setStats({
        totalCostToday,
        totalCostMonth,
        totalRepliesToday,
        totalRepliesMonth,
        mostExpensiveBrandToday: Object.values(brandCosts).sort((a, b) => b.cost - a.cost)[0] ?? null,
        mostActiveBrandToday: Object.values(brandCounts).sort((a, b) => b.count - a.count)[0] ?? null,
      })
    } catch (err: unknown) {
      console.error('[Overview]', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  // Realtime subscription
  useEffect(() => {
    fetchAll()

    const channel = supabase
      .channel('overview-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'luna_usage_logs' },
        (payload) => {
          const newLog = payload.new as UsageLog
          const withBrand: UsageLogWithBrand = {
            ...newLog,
            brands: brandMap[newLog.brand_id] ?? null,
          }

          setLiveLogs(prev => [withBrand, ...prev.slice(0, 199)])

          const todayISO = todayUTC()
          const monthISO = monthUTC()
          const isToday = newLog.created_at >= todayISO
          const isMonth = newLog.created_at >= monthISO

          setStats(prev => {
            if (!prev) return prev
            return {
              ...prev,
              totalCostToday: isToday ? prev.totalCostToday + (newLog.cost_usd ?? 0) : prev.totalCostToday,
              totalRepliesToday: isToday ? prev.totalRepliesToday + 1 : prev.totalRepliesToday,
              totalCostMonth: isMonth ? prev.totalCostMonth + (newLog.cost_usd ?? 0) : prev.totalCostMonth,
              totalRepliesMonth: isMonth ? prev.totalRepliesMonth + 1 : prev.totalRepliesMonth,
            }
          })

          setTypeBreakdown(prev => {
            const t = newLog.message_type ?? 'text'
            const ex = prev.find(x => x.type === t)
            if (ex) return prev.map(x => x.type === t ? { ...x, count: x.count + 1, cost: x.cost + (newLog.cost_usd ?? 0) } : x)
            return [...prev, { type: t, count: 1, cost: newLog.cost_usd ?? 0 }]
          })

          const todayKey = new Date().toISOString().split('T')[0]
          setDailyData(prev => prev.map(d => d.date === todayKey ? { ...d, cost: d.cost + (newLog.cost_usd ?? 0) } : d))
        }
      )
      .subscribe(status => setRealtimeOk(status === 'SUBSCRIBED'))

    return () => { supabase.removeChannel(channel) }
  }, [fetchAll, brandMap])

  if (error) {
    return (
      <div className="p-6 space-y-3">
        <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-5 py-4 text-red-400 text-sm">
          <p className="font-semibold mb-1">connection error</p>
          <p className="font-mono text-xs opacity-80">{error}</p>
          <p className="text-xs mt-2 text-red-400/60">
            check that RLS is disabled (or anon read policies exist) on luna_usage_logs and brands tables in supabase dashboard
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-lg font-semibold tracking-tight">overview</h1>
          <p className="text-[#6b7280] text-xs mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${realtimeOk ? 'bg-emerald-500 animate-pulse-slow' : 'bg-[#4b5563]'}`} />
          <span className="text-[10px] text-[#6b7280] uppercase tracking-widest">{realtimeOk ? 'live' : 'connecting'}</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label="total cost today" value={`$${fmtCost(stats?.totalCostToday ?? 0)}`} />
            <StatCard label="total cost this month" value={`$${fmtCost(stats?.totalCostMonth ?? 0)}`} />
            <StatCard label="replies today" value={(stats?.totalRepliesToday ?? 0).toLocaleString()} />
            <StatCard label="replies this month" value={(stats?.totalRepliesMonth ?? 0).toLocaleString()} />
            <StatCard
              label="top brand today"
              value={stats?.mostExpensiveBrandToday?.name ?? '—'}
              subtext={stats?.mostExpensiveBrandToday ? `$${fmtCost(stats.mostExpensiveBrandToday.cost)}` : undefined}
            />
            <StatCard
              label="most active brand"
              value={stats?.mostActiveBrandToday?.name ?? '—'}
              subtext={stats?.mostActiveBrandToday ? `${stats.mostActiveBrandToday.count} replies` : undefined}
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (<><SkeletonCard tall /><SkeletonCard tall /></>) : (
          <><DailyCostChart data={dailyData} /><MessageTypeDonut data={typeBreakdown} /></>
        )}
      </div>

      {/* Live feed */}
      <LiveFeed logs={liveLogs} isLive={realtimeOk} />
    </div>
  )
}
