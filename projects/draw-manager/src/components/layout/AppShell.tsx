'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from './Sidebar'

interface AppShellProps {
  activeProjects: Array<{ id: string; owner_name: string; address: string; status: string }>
  children: React.ReactNode
}

export default function AppShell({ activeProjects, children }: AppShellProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 h-14 bg-white border-b border-gray-200 z-30 flex items-center justify-between px-3">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="w-10 h-10 -ml-1 flex items-center justify-center rounded-md text-gray-700 hover:bg-gray-100 active:bg-gray-200"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h1 className="text-sm font-bold text-gray-900 truncate">
          <span className="text-blue-600">Odyssey</span> Draw Manager
        </h1>
        <button
          onClick={handleLogout}
          className="w-9 h-9 bg-blue-600 rounded-full text-white text-xs font-bold flex items-center justify-center hover:bg-blue-700"
          aria-label="Sign out"
          title="Sign out"
        >
          S
        </button>
      </header>

      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar activeProjects={activeProjects} />
      </div>

      {/* Mobile drawer */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-30"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        className={`md:hidden fixed inset-y-0 left-0 w-72 max-w-[85%] z-40 transform transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar activeProjects={activeProjects} onNavigate={() => setOpen(false)} />
      </div>

      <main className="flex-1 overflow-y-auto overflow-x-hidden pt-14 md:pt-0">
        {children}
      </main>
    </div>
  )
}
