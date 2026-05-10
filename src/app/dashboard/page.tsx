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
import TimeframeSelector, { getPreset, type TimeframeValue } from '@/components/TimeframeSelector'
import TokensModal from '@/components/TokensModal'

interface OverviewStats {
  totalCost: number
  totalReplies: number
  totalTokens: number
  topBrand: { name: string; cost: number } | null
  mostActiveBrand: { name: string; count: number } | null
}

interface TypeBreakdown { type: string; count: number; cost: number; tokens: number }

function isoDay(d: Date) { return d.toISOString().split('T')[0] }

export default function OverviewPage() {
  const [timeframe, setTimeframe] = useState<TimeframeValue>(getPreset('today'))
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [chartData, setChartData] = useState<{ label: string; cost: number }[]>([])
  const [chartTitle, setChartTitle] = useState('')
  const [typeBreakdown, setTypeBreakdown] = useState<TypeBreakdown[]>([])
  const [logs, setLogs] = useState<UsageLogWithBrand[]>([])
  const [brandMap, setBrandMap] = useState<Record<string, Brand>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [showTokensModal, setShowTokensModal] = useState(false)

  const fetchData = useCallback(async (tf: TimeframeValue) => {
    setLoading(true)
    try {
      // 1. Fetch brands lookup
      const { data: brandsData, error: brandsErr } = await supabase
        .from('brands')
        .select('id, name')

      if (brandsErr) throw new Error(`brands: ${brandsErr.message}`)

      const map: Record<string, Brand> = {}
      ;(brandsData ?? []).forEach(b => { map[b.id] = b })
      setBrandMap(map)

      // 2. Fetch logs for the selected timeframe + daily chart data
      const [logsRes, dailyRes] = await Promise.all([
        supabase
          .from('luna_usage_logs')
          .select('*')
          .gte('created_at', tf.from)
          .lte('created_at', tf.to)
          .order('created_at', { ascending: false })
          .limit(1000),
        // For daily chart: if single day, fetch last 7 days; otherwise fetch the range
        tf.key === 'today' || tf.key === 'yesterday' || tf.key === 'custom' || tf.key === 'all_time'
          ? supabase
              .from('luna_usage_logs')
              .select('cost_usd, created_at')
              .gte('created_at', (() => {
                const d = new Date()
                d.setUTCDate(d.getUTCDate() - 6)
                d.setUTCHours(0, 0, 0, 0)
                return d.toISOString()
              })())
          : supabase
              .from('luna_usage_logs')
              .select('cost_usd, created_at')
              .gte('created_at', tf.from)
              .lte('created_at', tf.to),
      ])

      if (logsRes.error) throw new Error(`logs: ${logsRes.error.message}`)

      const allLogs = (logsRes.data ?? []) as UsageLog[]

      // Attach brand names
      const logsWithBrand: UsageLogWithBrand[] = allLogs.map(l => ({
        ...l,
        brands: map[l.brand_id] ?? null,
      }))
      setLogs(logsWithBrand)

      // Stats
      const totalCost = allLogs.reduce((s, l) => s + (l.cost_usd ?? 0), 0)
      const totalReplies = allLogs.length
      const totalTokens = allLogs.reduce((s, l) => s + (l.total_tokens ?? 0), 0)

      const brandCosts: Record<string, { name: string; cost: number }> = {}
      const brandCounts: Record<string, { name: string; count: number }> = {}
      allLogs.forEach(l => {
        const name = map[l.brand_id]?.name ?? 'Unknown'
        if (!brandCosts[l.brand_id]) brandCosts[l.brand_id] = { name, cost: 0 }
        brandCosts[l.brand_id].cost += l.cost_usd ?? 0
        if (!brandCounts[l.brand_id]) brandCounts[l.brand_id] = { name, count: 0 }
        brandCounts[l.brand_id].count++
      })

      setStats({
        totalCost,
        totalReplies,
        totalTokens,
        topBrand: Object.values(brandCosts).sort((a, b) => b.cost - a.cost)[0] ?? null,
        mostActiveBrand: Object.values(brandCounts).sort((a, b) => b.count - a.count)[0] ?? null,
      })

      // Type breakdown
      const typeMap: Record<string, { count: number; cost: number; tokens: number }> = {}
      allLogs.forEach(l => {
        const t = l.message_type ?? 'text'
        if (!typeMap[t]) typeMap[t] = { count: 0, cost: 0, tokens: 0 }
        typeMap[t].count++
        typeMap[t].cost += l.cost_usd ?? 0
        typeMap[t].tokens += l.total_tokens ?? 0
      })
      setTypeBreakdown(Object.entries(typeMap).map(([type, d]) => ({ type, ...d })))

      // Build chart data
      const isSingleDay = tf.key === 'today' || tf.key === 'yesterday' || tf.key === 'custom'

      if (isSingleDay) {
        // Hourly chart
        const hourMap: Record<number, number> = {}
        for (let h = 0; h < 24; h++) hourMap[h] = 0
        allLogs.forEach(l => {
          const h = new Date(l.created_at).getUTCHours()
          hourMap[h] += l.cost_usd ?? 0
        })
        setChartData(
          Object.entries(hourMap).map(([h, cost]) => ({
            label: `${String(h).padStart(2, '0')}:00`,
            cost,
          }))
        )
        setChartTitle(`hourly cost — ${tf.label.toLowerCase()}`)
      } else {
        // Daily chart
        const dayMap: Record<string, number> = {}
        if (tf.key === 'all_time') {
          for (let i = 0; i < 7; i++) {
            const d = new Date()
            d.setUTCDate(d.getUTCDate() - (6 - i))
            dayMap[isoDay(d)] = 0
          }
        } else {
          const start = new Date(tf.from)
          const end = new Date(tf.to)
          for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
            dayMap[isoDay(d)] = 0
          }
        }
        ;(dailyRes.data ?? []).forEach((l: { cost_usd: number; created_at: string }) => {
          const key = l.created_at.split('T')[0]
          if (key in dayMap) dayMap[key] += l.cost_usd ?? 0
        })
        setChartData(
          Object.entries(dayMap).map(([date, cost]) => ({
            label: new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            cost,
          }))
        )
        setChartTitle(tf.key === 'all_time' ? 'daily cost — last 7 days' : `daily cost — ${tf.label.toLowerCase()}`)
      }

      setLastUpdated(new Date())
    } catch (err: unknown) {
      console.error('[Overview]', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch on mount and when timeframe changes
  useEffect(() => {
    fetchData(timeframe)
  }, [timeframe, fetchData])

  // Realtime subscription — only update if the new log falls within the current timeframe
  useEffect(() => {
    const channel = supabase
      .channel('overview-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'luna_usage_logs' },
        (payload) => {
          const newLog = payload.new as UsageLog
          const logTime = newLog.created_at

          // Only add to view if it falls within the selected timeframe
          if (logTime >= timeframe.from && logTime <= timeframe.to) {
            const withBrand: UsageLogWithBrand = {
              ...newLog,
              brands: brandMap[newLog.brand_id] ?? null,
            }

            setLogs(prev => [withBrand, ...prev])

            setStats(prev => {
              if (!prev) return prev
              return {
                ...prev,
                totalCost: prev.totalCost + (newLog.cost_usd ?? 0),
                totalReplies: prev.totalReplies + 1,
                totalTokens: prev.totalTokens + (newLog.total_tokens ?? 0),
              }
            })

            setTypeBreakdown(prev => {
              const t = newLog.message_type ?? 'text'
              const ex = prev.find(x => x.type === t)
              if (ex) return prev.map(x => x.type === t ? { ...x, count: x.count + 1, cost: x.cost + (newLog.cost_usd ?? 0), tokens: x.tokens + (newLog.total_tokens ?? 0) } : x)
              return [...prev, { type: t, count: 1, cost: newLog.cost_usd ?? 0, tokens: newLog.total_tokens ?? 0 }]
            })

            const isSingleDay = timeframe.key === 'today' || timeframe.key === 'yesterday' || timeframe.key === 'custom'
            if (isSingleDay) {
              const h = `${String(new Date(newLog.created_at).getUTCHours()).padStart(2, '0')}:00`
              setChartData(prev => prev.map(d => d.label === h ? { ...d, cost: d.cost + (newLog.cost_usd ?? 0) } : d))
            } else {
              const logDay = new Date(newLog.created_at.split('T')[0] + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              setChartData(prev => prev.map(d => d.label === logDay ? { ...d, cost: d.cost + (newLog.cost_usd ?? 0) } : d))
            }

            setLastUpdated(new Date())
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [timeframe, brandMap])

  // Period label for stat cards
  const periodLabel = timeframe.label.toLowerCase()

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
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[10px] text-[#6b7280] tracking-wide">
              last updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Africa/Cairo' })}
            </span>
          )}
          <TimeframeSelector value={timeframe} onChange={setTimeframe} />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label={`total cost — ${periodLabel}`} value={`$${fmtCost(stats?.totalCost ?? 0)}`} />
            <StatCard label={`replies — ${periodLabel}`} value={(stats?.totalReplies ?? 0).toLocaleString()} />
            <StatCard label={`tokens — ${periodLabel}`} value={(stats?.totalTokens ?? 0).toLocaleString()} onClick={() => setShowTokensModal(true)} />
            <StatCard
              label={`top brand — ${periodLabel}`}
              value={stats?.topBrand?.name ?? '—'}
              subtext={stats?.topBrand ? `$${fmtCost(stats.topBrand.cost)}` : undefined}
            />
            <StatCard
              label={`most active — ${periodLabel}`}
              value={stats?.mostActiveBrand?.name ?? '—'}
              subtext={stats?.mostActiveBrand ? `${stats.mostActiveBrand.count} replies` : undefined}
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (<><SkeletonCard tall /><SkeletonCard tall /></>) : (
          <>
            <DailyCostChart data={chartData} title={chartTitle} />
            <MessageTypeDonut data={typeBreakdown} label={`message types — ${periodLabel}`} />
          </>
        )}
      </div>

      {/* Feed */}
      <LiveFeed logs={logs} lastUpdated={lastUpdated} />

      {showTokensModal && (
        <TokensModal
          data={typeBreakdown.map(t => ({ type: t.type, tokens: t.tokens, count: t.count }))}
          totalTokens={stats?.totalTokens ?? 0}
          periodLabel={periodLabel}
          onClose={() => setShowTokensModal(false)}
        />
      )}
    </div>
  )
}
