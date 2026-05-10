export default function SkeletonCard({ tall }: { tall?: boolean }) {
  return (
    <div className={`bg-[#111111] dark:bg-[#111111] border border-[#1f1f1f] dark:border-[#1f1f1f] rounded-xl p-5 animate-pulse ${tall ? 'h-64' : ''}`}>
      <div className="h-2.5 bg-[#1f1f1f] dark:bg-[#1f1f1f] rounded w-20 mb-3" />
      <div className="h-8 bg-[#1f1f1f] dark:bg-[#1f1f1f] rounded w-28 mb-2.5" />
      <div className="h-2.5 bg-[#1f1f1f] dark:bg-[#1f1f1f] rounded w-16" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-3 border-b border-[#1a1a1a] animate-pulse">
      <div className="h-3 bg-[#1f1f1f] rounded w-32" />
      <div className="h-5 bg-[#1f1f1f] rounded w-14" />
      <div className="h-3 bg-[#1f1f1f] rounded w-24 flex-1" />
      <div className="h-3 bg-[#1f1f1f] rounded w-16" />
      <div className="h-3 bg-[#1f1f1f] rounded w-12" />
      <div className="h-3 bg-[#1f1f1f] rounded w-14" />
    </div>
  )
}
