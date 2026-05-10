'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { ModelBreakdown, TypeBreakdown } from '@/lib/types'
import { fmtCost } from '@/lib/fmt'
import SkeletonCard from '@/components/SkeletonCard'
import MarginCalculator from '@/components/MarginCalculator'
import TimeframeSelector, { getPreset, type TimeframeValue } from '@/components/TimeframeSelector'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

const MODEL_COLORS: Record<string, string> = {
  'gpt-4.1': '#6b7280',
  'gpt-4o-mini': '#6b7280',
  'gpt-4o': '#a78bfa',
  'whisper-1': '#60a5fa',
}

const TYPE_COLORS: Record<string, string> = {
  text: '#6b7280',
  voice: '#a78bfa',
  image: '#60a5fa',
  story: '#f59e0b',
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

export default function CostsPage() {
  const [timeframe, setTimeframe] = useState<TimeframeValue>(getPreset('last_month'))
  const [totalCost, setTotalCost] = useState(0)
  const [totalReplies, setTotalReplies] = useState(0)
  const [blendedCostPerReply, setBlendedCostPerReply] = useState(0)
  const [modelBreakdown, setModelBreakdown] = useState<ModelBreakdown[]>([])
  const [typeBreakdown, setTypeBreakdown] = useState<TypeBreakdown[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCosts = useCallback(async (tf: TimeframeValue) => {
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('luna_usage_logs')
        .select('cost_usd, model, message_type, created_at')
        .gte('created_at', tf.from)
        .lte('created_at', tf.to)

      if (err) throw err

      const logs = data ?? []

      const cost = logs.reduce((s, l) => s + (l.cost_usd ?? 0), 0)
      const replies = logs.length
      setTotalCost(cost)
      setTotalReplies(replies)
      setBlendedCostPerReply(replies > 0 ? cost / replies : 0)

      // Model breakdown
      const modelMap: Record<string, { count: number; cost: number }> = {}
      logs.forEach(l => {
        const m = l.model ?? 'unknown'
        if (!modelMap[m]) modelMap[m] = { count: 0, cost: 0 }
        modelMap[m].count++
        modelMap[m].cost += l.cost_usd ?? 0
      })
      setModelBreakdown(
        Object.entries(modelMap)
          .map(([model, d]) => ({ model, count: d.count, cost: d.cost }))
          .sort((a, b) => b.cost - a.cost)
      )

      // Type breakdown
      const typeMap: Record<string, { count: number; cost: number }> = {}
      logs.forEach(l => {
        const t = l.message_type ?? 'text'
        if (!typeMap[t]) typeMap[t] = { count: 0, cost: 0 }
        typeMap[t].count++
        typeMap[t].cost += l.cost_usd ?? 0
      })
      setTypeBreakdown(
        Object.entries(typeMap)
          .map(([type, d]) => ({ type, count: d.count, cost: d.cost }))
          .sort((a, b) => b.cost - a.cost)
      )
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load costs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCosts(timeframe) }, [fetchCosts, timeframe])

  const periodLabel = timeframe.label.toLowerCase()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-lg font-semibold tracking-tight">costs</h1>
          <p className="text-[#6b7280] text-xs mt-0.5">AI spend analysis and margin projections</p>
        </div>
        <TimeframeSelector value={timeframe} onChange={setTimeframe} />
      </div>

      {error && (
        <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-5 py-4 text-red-400 text-sm">{error}</div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-5">
              <p className="text-[10px] uppercase tracking-widest text-[#6b7280] font-medium mb-2">total cost — {periodLabel}</p>
              <p className="text-2xl font-bold text-white">${fmtCost(totalCost)}</p>
              <p className="text-xs text-[#6b7280] mt-1.5">{totalReplies.toLocaleString()} replies</p>
            </div>

            <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-5">
              <p className="text-[10px] uppercase tracking-widest text-[#6b7280] font-medium mb-2">blended cost / reply</p>
              <p className="text-2xl font-bold text-white">${fmtCost(blendedCostPerReply)}</p>
              <p className="text-xs text-[#6b7280] mt-1.5">{periodLabel}</p>
            </div>

            <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-5">
              <p className="text-[10px] uppercase tracking-widest text-[#6b7280] font-medium mb-2">models used</p>
              <p className="text-2xl font-bold text-white">{modelBreakdown.length}</p>
              <p className="text-xs text-[#6b7280] mt-1.5">{periodLabel}</p>
            </div>
          </>
        )}
      </div>

      {/* Breakdown charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By model */}
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-5">
          <p className="text-[10px] uppercase tracking-widest text-[#6b7280] font-medium mb-4">cost by model — {periodLabel}</p>
          {loading ? (
            <div className="h-40 bg-[#1a1a1a] rounded animate-pulse" />
          ) : modelBreakdown.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-[#4b5563] text-sm">no data for this period</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart
                  data={modelBreakdown.map(m => ({ name: m.model === 'gpt-4o-mini' ? '4o-mini' : m.model === 'gpt-4o' ? '4o' : m.model, cost: m.cost, model: m.model }))}
                  margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${fmtCost(Number(v))}`} width={50} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--chart-cursor)' }} />
                  <Bar dataKey="cost" radius={[3, 3, 0, 0]} maxBarSize={60}>
                    {modelBreakdown.map((m, i) => (
                      <Cell key={i} fill={MODEL_COLORS[m.model] ?? '#6b7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2 border-t border-[#1a1a1a] pt-3">
                {modelBreakdown.map(m => (
                  <div key={m.model} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: MODEL_COLORS[m.model] ?? '#6b7280' }} />
                      <span className="text-[#9ca3af]">{m.model}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[#6b7280]">{m.count.toLocaleString()} calls</span>
                      <span className="text-white font-medium w-16 text-right">${fmtCost(m.cost)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* By type */}
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-5">
          <p className="text-[10px] uppercase tracking-widest text-[#6b7280] font-medium mb-4">cost by type — {periodLabel}</p>
          {loading ? (
            <div className="h-40 bg-[#1a1a1a] rounded animate-pulse" />
          ) : typeBreakdown.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-[#4b5563] text-sm">no data for this period</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart
                  data={typeBreakdown.map(t => ({ name: t.type, cost: t.cost }))}
                  margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${fmtCost(Number(v))}`} width={50} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--chart-cursor)' }} />
                  <Bar dataKey="cost" radius={[3, 3, 0, 0]} maxBarSize={60}>
                    {typeBreakdown.map((t, i) => (
                      <Cell key={i} fill={TYPE_COLORS[t.type] ?? '#6b7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2 border-t border-[#1a1a1a] pt-3">
                {typeBreakdown.map(t => (
                  <div key={t.type} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[t.type] ?? '#6b7280' }} />
                      <span className="text-[#9ca3af] capitalize">{t.type}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[#6b7280]">{t.count.toLocaleString()} replies</span>
                      <span className="text-white font-medium w-16 text-right">${fmtCost(t.cost)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Margin calculator */}
      <MarginCalculator blendedCostPerReply={blendedCostPerReply} />
    </div>
  )
}
