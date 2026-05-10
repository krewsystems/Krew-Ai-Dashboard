'use client'

import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import type { TypeBreakdown } from '@/lib/types'

const TYPE_COLORS: Record<string, string> = {
  text: '#6b7280',
  voice: '#a78bfa',
  image: '#60a5fa',
  story: '#f59e0b',
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--chart-tooltip-bg)', borderColor: 'var(--chart-tooltip-border)' }} className="border rounded-lg px-3 py-2 text-xs shadow-xl">
      <p style={{ color: 'var(--chart-tooltip-value)' }} className="font-semibold">{payload[0].name}</p>
      <p style={{ color: 'var(--chart-tooltip-label)' }}>{payload[0].value} replies</p>
    </div>
  )
}

interface MessageTypeDonutProps {
  data: TypeBreakdown[]
  label?: string
}

export default function MessageTypeDonut({ data, label }: MessageTypeDonutProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0)

  const chartData = data.map(d => ({
    name: d.type,
    value: d.count,
    pct: total > 0 ? Math.round((d.count / total) * 100) : 0,
    color: TYPE_COLORS[d.type] ?? '#6b7280',
  }))

  return (
    <div className="bg-[#111111] dark:bg-[#111111] border border-[#1f1f1f] dark:border-[#1f1f1f] rounded-xl p-5">
      <p className="text-[10px] uppercase tracking-widest text-[#6b7280] dark:text-[#6b7280] font-medium mb-4">
        {label ?? 'message types'}
      </p>
      {total === 0 ? (
        <div className="h-[180px] flex items-center justify-center text-[#4b5563] dark:text-[#4b5563] text-sm">
          no data yet
        </div>
      ) : (
        <div className="flex items-center gap-6">
          <div className="relative shrink-0">
            <PieChart width={140} height={140}>
              <Pie
                data={chartData}
                innerRadius={42}
                outerRadius={65}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-white dark:text-white">{total}</span>
              <span className="text-[9px] text-[#6b7280] uppercase tracking-wide">total</span>
            </div>
          </div>
          <div className="flex flex-col gap-2.5 flex-1">
            {chartData.map(item => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                <span className="text-[11px] text-[#6b7280] dark:text-[#6b7280] capitalize">{item.name}</span>
                <div className="flex-1" />
                <span className="text-[11px] font-medium text-white dark:text-white">{item.value}</span>
                <span className="text-[10px] text-[#4b5563] dark:text-[#4b5563] w-8 text-right">{item.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
