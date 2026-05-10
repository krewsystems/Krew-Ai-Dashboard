interface StatCardProps {
  label: string
  value: string
  subtext?: string
  highlight?: boolean
}

export default function StatCard({ label, value, subtext, highlight }: StatCardProps) {
  return (
    <div className={`rounded-xl p-5 border transition-colors ${
      highlight
        ? 'bg-white dark:bg-white border-white'
        : 'bg-[#111111] dark:bg-[#111111] border-[#1f1f1f] dark:border-[#1f1f1f]'
    }`}>
      <p className={`text-[10px] uppercase tracking-widest font-medium mb-2 ${
        highlight ? 'text-black/50' : 'text-[#6b7280] dark:text-[#6b7280]'
      }`}>
        {label}
      </p>
      <p className={`text-2xl font-bold tracking-tight ${
        highlight ? 'text-black' : 'text-white dark:text-white'
      }`}>
        {value}
      </p>
      {subtext && (
        <p className={`text-xs mt-1.5 ${
          highlight ? 'text-black/50' : 'text-[#6b7280] dark:text-[#6b7280]'
        }`}>
          {subtext}
        </p>
      )}
    </div>
  )
}
