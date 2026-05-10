'use client'

import { useState, useRef, useEffect } from 'react'

export type TimeframeKey = 'today' | 'yesterday' | 'last_week' | 'last_month' | 'all_time' | 'custom'

export interface TimeframeValue {
  key: TimeframeKey
  from: string // ISO date string (start of day UTC)
  to: string   // ISO date string (end of day UTC)
  label: string
}

function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString()
}

function endOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999)).toISOString()
}

function getPreset(key: Exclude<TimeframeKey, 'custom'>): TimeframeValue {
  const now = new Date()
  switch (key) {
    case 'today': {
      return { key, from: startOfDayUTC(now), to: endOfDayUTC(now), label: 'Today' }
    }
    case 'yesterday': {
      const d = new Date(now)
      d.setUTCDate(d.getUTCDate() - 1)
      return { key, from: startOfDayUTC(d), to: endOfDayUTC(d), label: 'Yesterday' }
    }
    case 'last_week': {
      const end = new Date(now)
      const start = new Date(now)
      start.setUTCDate(start.getUTCDate() - 6)
      return { key, from: startOfDayUTC(start), to: endOfDayUTC(end), label: 'Last 7 days' }
    }
    case 'last_month': {
      const end = new Date(now)
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      return { key, from: start.toISOString(), to: endOfDayUTC(end), label: 'This month' }
    }
    case 'all_time': {
      return { key, from: '2000-01-01T00:00:00.000Z', to: endOfDayUTC(now), label: 'All time' }
    }
  }
}

const PRESETS: { key: Exclude<TimeframeKey, 'custom'>; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last_week', label: 'Last 7 days' },
  { key: 'last_month', label: 'This month' },
  { key: 'all_time', label: 'All time' },
]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface TimeframeSelectorProps {
  value: TimeframeValue
  onChange: (v: TimeframeValue) => void
}

export { getPreset }

export default function TimeframeSelector({ value, onChange }: TimeframeSelectorProps) {
  const [open, setOpen] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setShowCalendar(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selectPreset(key: Exclude<TimeframeKey, 'custom'>) {
    onChange(getPreset(key))
    setOpen(false)
    setShowCalendar(false)
  }

  function selectDate(day: number) {
    const d = new Date(Date.UTC(calYear, calMonth, day))
    const iso = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    onChange({ key: 'custom', from: startOfDayUTC(d), to: endOfDayUTC(d), label })
    setOpen(false)
    setShowCalendar(false)
  }

  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDayOfWeek(calYear, calMonth)
  const todayISO = new Date().toISOString().split('T')[0]

  // selected day ISO for highlighting
  const selectedISO = value.key === 'custom' ? value.from.split('T')[0] : null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); setShowCalendar(false) }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#1f1f1f] bg-[#111111] text-[#9ca3af] text-xs hover:border-[#333] transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="opacity-50">
          <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M1 7h14" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 1v4M11 1v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {value.label}
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="opacity-40">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 bg-[#111111] border border-[#1f1f1f] rounded-xl shadow-2xl overflow-hidden min-w-[200px]">
          {!showCalendar ? (
            <div className="py-1">
              {PRESETS.map(p => (
                <button
                  key={p.key}
                  onClick={() => selectPreset(p.key)}
                  className={`w-full text-left px-4 py-2 text-xs transition-colors ${
                    value.key === p.key
                      ? 'text-white bg-[#1a1a1a]'
                      : 'text-[#9ca3af] hover:text-white hover:bg-[#1a1a1a]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <div className="border-t border-[#1f1f1f] my-1" />
              <button
                onClick={() => setShowCalendar(true)}
                className={`w-full text-left px-4 py-2 text-xs transition-colors ${
                  value.key === 'custom'
                    ? 'text-white bg-[#1a1a1a]'
                    : 'text-[#9ca3af] hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                Pick a date...
              </button>
            </div>
          ) : (
            <div className="p-3 w-[280px]">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => {
                    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1) }
                    else setCalMonth(calMonth - 1)
                  }}
                  className="text-[#6b7280] hover:text-white p-1 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <span className="text-xs text-white font-medium">
                  {MONTH_NAMES[calMonth]} {calYear}
                </span>
                <button
                  onClick={() => {
                    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1) }
                    else setCalMonth(calMonth + 1)
                  }}
                  className="text-[#6b7280] hover:text-white p-1 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-0 mb-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <div key={d} className="text-center text-[9px] text-[#4b5563] font-medium py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days */}
              <div className="grid grid-cols-7 gap-0">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`e-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const iso = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const isToday = iso === todayISO
                  const isSelected = iso === selectedISO
                  const isFuture = iso > todayISO

                  return (
                    <button
                      key={day}
                      disabled={isFuture}
                      onClick={() => selectDate(day)}
                      className={`text-[11px] py-1.5 rounded transition-colors ${
                        isSelected
                          ? 'bg-white text-black font-semibold'
                          : isToday
                            ? 'text-white font-semibold hover:bg-[#1f1f1f]'
                            : isFuture
                              ? 'text-[#2a2a2a] cursor-not-allowed'
                              : 'text-[#9ca3af] hover:bg-[#1f1f1f] hover:text-white'
                      }`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>

              {/* Back button */}
              <button
                onClick={() => setShowCalendar(false)}
                className="mt-2 text-[10px] text-[#6b7280] hover:text-white transition-colors"
              >
                &larr; back to presets
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
