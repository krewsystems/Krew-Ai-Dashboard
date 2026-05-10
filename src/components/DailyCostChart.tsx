'use client'

import { fmtCost } from '@/lib/fmt'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { DailyData } from '@/lib/types'

function formatDay(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-[#6b7280] mb-1">{label}</p>
      <p className="text-white font-semibold">${fmtCost(Number(payload[0].value))}</p>
    </div>
  )
}

interface DailyCostChartProps {
  data: DailyData[]
}

export default function DailyCostChart({ data }: DailyCostChartProps) {
  const formatted = data.map(d => ({
    day: formatDay(d.date),
    cost: d.cost,
  }))

  return (
    <div className="bg-[#111111] dark:bg-[#111111] border border-[#1f1f1f] dark:border-[#1f1f1f] rounded-xl p-5">
      <p className="text-[10px] uppercase tracking-widest text-[#6b7280] dark:text-[#6b7280] font-medium mb-4">
        daily cost — last 7 days
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={formatted} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'Inter, sans-serif' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'Inter, sans-serif' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => v === 0 ? '$0' : `$${v.toFixed(2)}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1a1a1a' }} />
          <Bar dataKey="cost" fill="#ffffff" radius={[3, 3, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
