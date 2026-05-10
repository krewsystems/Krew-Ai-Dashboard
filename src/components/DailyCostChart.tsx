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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--chart-tooltip-bg)', borderColor: 'var(--chart-tooltip-border)' }} className="border rounded-lg px-3 py-2 text-xs shadow-xl">
      <p style={{ color: 'var(--chart-tooltip-label)' }} className="mb-1">{label}</p>
      <p style={{ color: 'var(--chart-tooltip-value)' }} className="font-semibold">${fmtCost(Number(payload[0].value))}</p>
    </div>
  )
}

interface DailyCostChartProps {
  data: { label: string; cost: number }[]
  title?: string
}

export default function DailyCostChart({ data, title }: DailyCostChartProps) {
  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-5">
      <p className="text-[10px] uppercase tracking-widest text-[#6b7280] font-medium mb-4">
        {title ?? 'daily cost'}
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'Inter, sans-serif' }}
            axisLine={false}
            tickLine={false}
            interval={Math.max(0, Math.floor(data.length / 6) - 1)}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'Inter, sans-serif' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => v === 0 ? '$0' : `$${v.toFixed(2)}`}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--chart-cursor)' }} />
          <Bar dataKey="cost" fill="var(--chart-bar)" radius={[3, 3, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
