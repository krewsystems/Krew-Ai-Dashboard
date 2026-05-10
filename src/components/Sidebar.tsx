'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

function GridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1h5v5H1V1zm8 0h5v5H9V1zM1 9h5v5H1V9zm8 0h5v5H9V9z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  )
}

function BuildingIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 13V4l5-2.5L12 4v9M2 13h11M5 13V9h5v4" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  )
}

function CostIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M7.5 4v7M5.5 5.5h3a1 1 0 0 1 0 2h-2a1 1 0 0 0 0 2h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function SignOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3M9 10l3-3-3-3M12 7H5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

const navItems = [
  { href: '/dashboard', label: 'overview', icon: GridIcon, exact: true },
  { href: '/dashboard/brands', label: 'brands', icon: BuildingIcon, exact: false },
  { href: '/dashboard/costs', label: 'costs', icon: CostIcon, exact: false },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'KR'

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-[220px] h-full border-r border-[#1a1a1a] dark:border-[#1a1a1a] flex flex-col bg-[#0a0a0a] dark:bg-[#0a0a0a] light:bg-white light:border-gray-200 shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1a1a1a] dark:border-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white dark:bg-white rounded flex items-center justify-center">
            <span className="text-black text-[10px] font-black tracking-tighter">K</span>
          </div>
          <span className="text-white dark:text-white font-semibold text-sm tracking-tight">krew</span>
        </div>
        <p className="text-[#4b5563] dark:text-[#4b5563] text-[10px] mt-1.5 uppercase tracking-widest font-medium">admin console</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
              isActive(item.href, item.exact)
                ? 'bg-[#1a1a1a] dark:bg-[#1a1a1a] text-white dark:text-white'
                : 'text-[#6b7280] dark:text-[#6b7280] hover:text-white dark:hover:text-white hover:bg-[#111111] dark:hover:bg-[#111111]'
            }`}
          >
            <item.icon />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-[#1a1a1a] dark:border-[#1a1a1a] space-y-2">
        <div className="flex items-center gap-2.5 px-2 py-1">
          <div className="w-6 h-6 rounded-full bg-[#1f1f1f] dark:bg-[#1f1f1f] flex items-center justify-center text-[10px] font-semibold text-[#9ca3af] dark:text-[#9ca3af] shrink-0">
            {initials}
          </div>
          <span className="text-[11px] text-[#6b7280] dark:text-[#6b7280] truncate flex-1">{user?.email}</span>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 px-2 py-1.5 w-full rounded-lg text-[12px] text-[#6b7280] dark:text-[#6b7280] hover:text-white dark:hover:text-white hover:bg-[#111111] dark:hover:bg-[#111111] transition-colors"
        >
          <SignOutIcon />
          sign out
        </button>
      </div>
    </aside>
  )
}
