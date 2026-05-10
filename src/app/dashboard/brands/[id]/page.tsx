'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { UsageLog, UsageLogWithBrand, TypeBreakdown } from '@/lib/types'
import { fmtCost } from '@/lib/fmt'
import StatCard from '@/components/StatCard'
import SkeletonCard from '@/components/SkeletonCard'
import MessageTypeDonut from '@/components/MessageTypeDonut'
import TimeframeSelector, { getPreset, type TimeframeValue } from '@/components/TimeframeSelector'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const TYPE_STYLES: Record<string, string> = {
  text: 'bg-[#1c1c1c] text-[#9ca3af]',
  voice: 'bg-[#1e1030] text-[#a78bfa]',
  image: 'bg-[#0e1f35] text-[#60a5fa]',
  story: 'bg-[#1f1200] text-[#f59e0b]',
}

function isoDay(d: Date) { return d.toISOString().split('T')[0] }

function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--chart-tooltip-bg)', borderColor: 'var(--chart-tooltip-border)' }} className="border rounded-lg px-3 py-2 text-xs shadow-xl">
      <p style={{ color: 'var(--chart-tooltip-label)' }} className="mb-1">{label}</p>
      <p style={{ color: 'var(--chart-tooltip-value)' }} className="font-semibold">${fmtCost(Number(payload[0].value))}</p>
    </div>
  )
}

export default function BrandDetailPage() {
  const params = useParams()
  const router = useRouter()
  const brandId = params.id as string

  const [timeframe, setTimeframe] = useState<TimeframeValue>(getPreset('all_time'))
  const [brandName, setBrandName] = useState('')
  const [logs, setLogs] = useState<UsageLogWithBrand[]>([])
  const [typeBreakdown, setTypeBreakdown] = useState<TypeBreakdown[]>([])
  const [chartData, setChartData] = useState<{ label: string; cost: number }[]>([])
  const [chartTitle, setChartTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  const fetchBrand = useCallback(async (tf: TimeframeValue) => {
    setLoading(true)
    try {
      const [brandRes, logsRes] = await Promise.all([
        supabase.from('brands').select('id, name').eq('id', brandId).single(),
        supabase
          .from('luna_usage_logs')
          .select('*')
          .eq('brand_id', brandId)
          .gte('created_at', tf.from)
          .lte('created_at', tf.to)
          .order('created_at', { ascending: false }),
      ])

      if (brandRes.error) throw new Error(`brand: ${brandRes.error.message}`)
      if (logsRes.error) throw new Error(`logs: ${logsRes.error.message}`)

      const brand = brandRes.data
      setBrandName(brand?.name ?? 'Unknown Brand')

      const allLogs = (logsRes.data ?? []) as UsageLog[]
      const withBrand: UsageLogWithBrand[] = allLogs.map(l => ({ ...l, brands: brand }))
      setLogs(withBrand)

      // Type breakdown
      const typeMap: Record<string, { count: number; cost: number }> = {}
      allLogs.forEach(l => {
        const t = l.message_type ?? 'text'
        if (!typeMap[t]) typeMap[t] = { count: 0, cost: 0 }
        typeMap[t].count++
        typeMap[t].cost += l.cost_usd ?? 0
      })
      setTypeBreakdown(Object.entries(typeMap).map(([type, d]) => ({ type, ...d })))

      // Build chart data
      const isSingleDay = tf.key === 'today' || tf.key === 'yesterday' || tf.key === 'custom'

      if (isSingleDay) {
        // Hourly chart for single-day views
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
          for (let i = 0; i < 30; i++) {
            const d = new Date()
            d.setUTCDate(d.getUTCDate() - (29 - i))
            dayMap[isoDay(d)] = 0
          }
        } else {
          const start = new Date(tf.from)
          const end = new Date(tf.to)
          for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
            dayMap[isoDay(d)] = 0
          }
        }
        allLogs.forEach(l => {
          const key = l.created_at.split('T')[0]
          if (key in dayMap) dayMap[key] += l.cost_usd ?? 0
        })
        setChartData(
          Object.entries(dayMap).map(([date, cost]) => ({
            label: new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            cost,
          }))
        )
        setChartTitle(tf.key === 'all_time' ? 'daily cost — last 30 days' : `daily cost — ${tf.label.toLowerCase()}`)
      }
    } catch (err: unknown) {
      console.error('[BrandDetail]', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [brandId])

  useEffect(() => { fetchBrand(timeframe) }, [fetchBrand, timeframe])
  useEffect(() => { setPage(0) }, [filter, timeframe])

  const totalCost = logs.reduce((s, l) => s + (l.cost_usd ?? 0), 0)
  const totalReplies = logs.length
  const avgCostPerReply = totalReplies > 0 ? totalCost / totalReplies : 0

  const filteredLogs = (filter === 'all' ? logs : logs.filter(l => l.message_type === filter))
  const pagedLogs = filteredLogs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE))

  const periodLabel = timeframe.label.toLowerCase()

  if (error) {
    return (
      <div className="p-6">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-[#6b7280] hover:text-white transition-colors text-xs mb-4">
          <BackIcon /> back to brands
        </button>
        <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-5 py-4 text-red-400 text-sm">
          <p className="font-semibold mb-1">connection error</p>
          <p className="font-mono text-xs opacity-80">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[#6b7280] hover:text-white transition-colors text-xs mb-3"
          >
            <BackIcon />
            back to brands
          </button>
          <h1 className="text-white text-lg font-semibold tracking-tight">
            {loading
              ? <span className="inline-block h-5 w-48 bg-[#1f1f1f] rounded animate-pulse" />
              : brandName}
          </h1>
        </div>
        <TimeframeSelector value={timeframe} onChange={setTimeframe} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label={`cost — ${periodLabel}`} value={`$${fmtCost(totalCost)}`} />
            <StatCard label={`replies — ${periodLabel}`} value={totalReplies.toLocaleString()} />
            <StatCard label={`avg cost / reply`} value={`$${fmtCost(avgCostPerReply)}`} />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-5">
          <p className="text-[10px] uppercase tracking-widest text-[#6b7280] font-medium mb-4">
            {chartTitle}
          </p>
          {loading ? (
            <div className="h-48 bg-[#1a1a1a] rounded animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#6b7280', fontSize: 9, fontFamily: 'Inter, sans-serif' }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.max(0, Math.floor(chartData.length / 6) - 1)}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 9, fontFamily: 'Inter, sans-serif' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${fmtCost(v)}`}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="var(--chart-line)"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3, fill: 'var(--chart-line)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {!loading && <MessageTypeDonut data={typeBreakdown} label={`message types — ${periodLabel}`} />}
      </div>

      {/* Log table */}
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#1a1a1a] flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-[#6b7280] font-medium">
            activity log
            {!loading && <span className="ml-2 text-[#4b5563]">({filteredLogs.length})</span>}
          </p>
          <div className="flex items-center gap-1.5">
            {['all', 'text', 'voice', 'image', 'story'].map(f => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(0) }}
                className={`px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider font-medium transition-colors ${
                  filter === f ? 'bg-white text-black' : 'text-[#6b7280] hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 py-2.5 border-b border-[#1a1a1a]">
          <span className="text-[10px] uppercase tracking-widest text-[#4b5563] font-medium w-20">type</span>
          <span className="text-[10px] uppercase tracking-widest text-[#4b5563] font-medium w-20">model</span>
          <span className="text-[10px] uppercase tracking-widest text-[#4b5563] font-medium flex-1">tokens</span>
          <span className="text-[10px] uppercase tracking-widest text-[#4b5563] font-medium w-20 text-right">cost</span>
          <span className="text-[10px] uppercase tracking-widest text-[#4b5563] font-medium w-32 text-right">time</span>
        </div>

        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-[#1a1a1a] animate-pulse">
              <div className="h-5 bg-[#1f1f1f] rounded w-14" />
              <div className="h-3 bg-[#1f1f1f] rounded w-16" />
              <div className="h-3 bg-[#1f1f1f] rounded flex-1" />
              <div className="h-3 bg-[#1f1f1f] rounded w-12" />
              <div className="h-3 bg-[#1f1f1f] rounded w-28" />
            </div>
          ))
        ) : pagedLogs.length === 0 ? (
          <div className="py-10 text-center text-[#4b5563] text-sm">no data for this period</div>
        ) : (
          pagedLogs.map(log => (
            <div key={log.id} className="flex items-center gap-3 px-5 py-2.5 border-b border-[#1a1a1a] last:border-b-0 hover:bg-[#0d0d0d] transition-colors">
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold w-20 text-center ${TYPE_STYLES[log.message_type] ?? TYPE_STYLES.text}`}>
                {log.message_type}
              </span>
              <span className="text-[11px] text-[#9ca3af] w-20">{log.model}</span>
              <span className="text-[11px] text-[#6b7280] flex-1">{(log.total_tokens ?? 0).toLocaleString()} tokens</span>
              <span className="text-[12px] font-medium text-white w-20 text-right">${fmtCost(log.cost_usd ?? 0)}</span>
              <span className="text-[10px] text-[#4b5563] font-mono w-32 text-right">
                {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}

        {!loading && totalPages > 1 && (
          <div className="px-5 py-3 border-t border-[#1a1a1a] flex items-center justify-between">
            <span className="text-[11px] text-[#6b7280]">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] text-[11px] text-[#9ca3af] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                prev
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] text-[11px] text-[#9ca3af] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
