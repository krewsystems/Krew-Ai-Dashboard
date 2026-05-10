'use client'

import type { UsageLogWithBrand } from '@/lib/types'
import { fmtCost } from '@/lib/fmt'

const TYPE_STYLES: Record<string, string> = {
  text: 'bg-[#1c1c1c] text-[#9ca3af]',
  voice: 'bg-[#1e1030] text-[#a78bfa]',
  image: 'bg-[#0e1f35] text-[#60a5fa]',
  story: 'bg-[#1f1200] text-[#f59e0b]',
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function formatModel(model: string) {
  if (model === 'gpt-4o-mini') return '4o-mini'
  if (model === 'gpt-4o') return '4o'
  if (model === 'whisper-1') return 'whisper'
  return model
}

interface LiveFeedProps {
  logs: UsageLogWithBrand[]
  isLive?: boolean
}

export default function LiveFeed({ logs, isLive }: LiveFeedProps) {
  return (
    <div className="bg-[#111111] dark:bg-[#111111] border border-[#1f1f1f] dark:border-[#1f1f1f] rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#1a1a1a] dark:border-[#1a1a1a] flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-[#6b7280] dark:text-[#6b7280] font-medium">live feed</p>
        {isLive && (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-slow" />
            <span className="text-[10px] text-[#6b7280]">live</span>
          </div>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="py-12 text-center text-[#4b5563] dark:text-[#4b5563] text-sm">
          no data yet
        </div>
      ) : (
        <div className="divide-y divide-[#1a1a1a] dark:divide-[#1a1a1a] max-h-[400px] overflow-y-auto">
          {logs.map((log, i) => (
            <div
              key={log.id}
              className={`flex items-center gap-3 px-5 py-2.5 hover:bg-[#0d0d0d] dark:hover:bg-[#0d0d0d] transition-colors ${i === 0 ? 'animate-fade-in' : ''}`}
            >
              <span className="text-[13px] font-medium text-white dark:text-white w-32 truncate shrink-0">
                {log.brands?.name ?? 'Unknown'}
              </span>
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold shrink-0 ${TYPE_STYLES[log.message_type] ?? TYPE_STYLES.text}`}>
                {log.message_type}
              </span>
              <span className="text-[11px] text-[#6b7280] dark:text-[#6b7280] shrink-0">
                {formatModel(log.model)}
              </span>
              <span className="text-[11px] text-[#4b5563] dark:text-[#4b5563] flex-1 text-right">
                {(log.total_tokens ?? 0).toLocaleString()} tok
              </span>
              <span className="text-[12px] font-medium text-white dark:text-white shrink-0 w-16 text-right">
                ${fmtCost(log.cost_usd ?? 0)}
              </span>
              <span className="text-[10px] text-[#374151] dark:text-[#374151] shrink-0 w-20 text-right font-mono">
                {formatTime(log.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
