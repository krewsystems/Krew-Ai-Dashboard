'use client'

import { useEffect } from 'react'

const TYPE_COLORS: Record<string, string> = {
  text: '#6b7280',
  voice: '#a78bfa',
  image: '#60a5fa',
  story: '#f59e0b',
}

interface TokensByType {
  type: string
  tokens: number
  count: number
}

interface TokensModalProps {
  data: TokensByType[]
  totalTokens: number
  periodLabel: string
  onClose: () => void
}

export default function TokensModal({ data, totalTokens, periodLabel, onClose }: TokensModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const sorted = [...data].sort((a, b) => b.tokens - a.tokens)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative bg-[#111111] border border-[#1f1f1f] rounded-2xl w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[#1a1a1a] flex items-start justify-between">
          <div>
            <p className="text-white font-semibold text-sm">tokens by type</p>
            <p className="text-[#6b7280] text-[10px] uppercase tracking-widest mt-0.5">{periodLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#4b5563] hover:text-white transition-colors mt-0.5"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Total */}
        <div className="px-5 py-4 border-b border-[#1a1a1a]">
          <p className="text-[10px] uppercase tracking-widest text-[#6b7280] mb-1">total</p>
          <p className="text-2xl font-bold text-white">{totalTokens.toLocaleString()}</p>
          <p className="text-[10px] text-[#4b5563] mt-0.5">tokens</p>
        </div>

        {/* Breakdown */}
        <div className="px-5 py-4 space-y-3">
          {sorted.length === 0 ? (
            <p className="text-[#4b5563] text-sm text-center py-4">no data</p>
          ) : sorted.map(item => {
            const pct = totalTokens > 0 ? Math.round((item.tokens / totalTokens) * 100) : 0
            const color = TYPE_COLORS[item.type] ?? '#6b7280'
            return (
              <div key={item.type}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-[12px] text-[#9ca3af] capitalize">{item.type}</span>
                    <span className="text-[10px] text-[#4b5563]">{item.count} req</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-white">{item.tokens.toLocaleString()}</span>
                    <span className="text-[10px] text-[#4b5563] w-8 text-right">{pct}%</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
