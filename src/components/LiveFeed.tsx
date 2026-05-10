'use client'

import { useState, useEffect } from 'react'
import type { UsageLogWithBrand } from '@/lib/types'
import { fmtCost } from '@/lib/fmt'

const PER_PAGE = 50

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
  lastUpdated?: Date | null
}

export default function LiveFeed({ logs, lastUpdated }: LiveFeedProps) {
  const [page, setPage] = useState(0)

  // Reset to first page when logs change (e.g. timeframe switch)
  useEffect(() => { setPage(0) }, [logs.length])

  const totalPages = Math.max(1, Math.ceil(logs.length / PER_PAGE))
  const pageLogs = logs.slice(page * PER_PAGE, (page + 1) * PER_PAGE)

  return (
    <div className="bg-[#111111] dark:bg-[#111111] border border-[#1f1f1f] dark:border-[#1f1f1f] rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#1a1a1a] dark:border-[#1a1a1a] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-[10px] uppercase tracking-widest text-[#6b7280] dark:text-[#6b7280] font-medium">
            request log
          </p>
          <span className="text-[10px] text-[#4b5563]">
            {logs.length} total
          </span>
        </div>
        {lastUpdated && (
          <span className="text-[10px] text-[#6b7280] tracking-wide">
            last updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Africa/Cairo' })}
          </span>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="py-12 text-center text-[#4b5563] dark:text-[#4b5563] text-sm">
          no data for this period
        </div>
      ) : (
        <>
          <div className="divide-y divide-[#1a1a1a] dark:divide-[#1a1a1a]">
            {pageLogs.map((log, i) => (
              <div
                key={log.id}
                className={`flex items-center gap-3 px-5 py-2.5 hover:bg-[#0d0d0d] dark:hover:bg-[#0d0d0d] transition-colors ${page === 0 && i === 0 ? 'animate-fade-in' : ''}`}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-[#1a1a1a] flex items-center justify-between">
              <span className="text-[10px] text-[#4b5563]">
                {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, logs.length)} of {logs.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                  className="px-2.5 py-1 rounded text-[11px] text-[#9ca3af] hover:text-white hover:bg-[#1a1a1a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  prev
                </button>
                {Array.from({ length: totalPages }).map((_, i) => {
                  // Show first, last, current, and neighbors
                  if (i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1) {
                    return (
                      <button
                        key={i}
                        onClick={() => setPage(i)}
                        className={`w-7 h-7 rounded text-[11px] transition-colors ${
                          i === page
                            ? 'bg-white text-black font-semibold'
                            : 'text-[#9ca3af] hover:text-white hover:bg-[#1a1a1a]'
                        }`}
                      >
                        {i + 1}
                      </button>
                    )
                  }
                  // Show ellipsis
                  if (i === 1 && page > 2) return <span key={i} className="text-[#4b5563] text-[11px] px-1">...</span>
                  if (i === totalPages - 2 && page < totalPages - 3) return <span key={i} className="text-[#4b5563] text-[11px] px-1">...</span>
                  return null
                })}
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                  className="px-2.5 py-1 rounded text-[11px] text-[#9ca3af] hover:text-white hover:bg-[#1a1a1a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
