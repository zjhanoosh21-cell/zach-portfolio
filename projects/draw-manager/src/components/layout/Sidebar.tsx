'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const toolsNav = [
  { href: '/history', label: 'Payment history', icon: '☰' },
  { href: '/documents', label: 'Documents', icon: '☐' },
  { href: '/analytics', label: 'Analytics', icon: '▪' },
]

const accountNav = [
  { href: '/settings', label: 'Settings', icon: '⊙' },
]

interface SidebarProps {
  activeProjects: Array<{ id: string; owner_name: string; address: string; status: string }>
  onNavigate?: () => void
}

export default function Sidebar({ activeProjects, onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
    router.refresh()
  }

  function isActive(href: string) {
    if (href === '/projects') return pathname === '/projects'
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-sm font-bold text-gray-900">
          <span className="text-blue-600">Odyssey</span> Draw Manager
        </h1>
        <button
          onClick={handleLogout}
          className="w-7 h-7 bg-blue-600 rounded-full text-white text-xs font-bold flex items-center justify-center hover:bg-blue-700"
          title="Sign out"
        >
          S
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {/* Main */}
        <div>
          <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Main</p>
          <NavLink href="/projects" label="My projects" icon="▦" active={isActive('/projects')} onNavigate={onNavigate} />
          <NavLink href="/vendors" label="Vendors" icon="◈" active={isActive('/vendors')} onNavigate={onNavigate} />

          {/* Active / In-draw projects */}
          {activeProjects.length > 0 && (
            <div className="mt-1 border-t border-gray-100 pt-1">
              {activeProjects.map((p) => {
                const shortName = p.owner_name.split(' ')[0]
                const isInDraw = p.status === 'in_draw'
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    onClick={onNavigate}
                    className={`flex items-center gap-2 px-2 py-2.5 min-h-10 rounded-md text-sm transition-colors ${
                      pathname === `/projects/${p.id}`
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className="text-xs w-4 text-center opacity-60">▸</span>
                    <span className="flex-1 truncate">{shortName}</span>
                    {isInDraw && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded font-semibold leading-none">
                        Draw
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Tools */}
        <div>
          <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Reports</p>
          {toolsNav.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} active={isActive(item.href)} onNavigate={onNavigate} />
          ))}
        </div>
      </nav>

      {/* Account */}
      <div className="border-t border-gray-200 p-2">
        <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Account</p>
        {accountNav.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} active={isActive(item.href)} onNavigate={onNavigate} />
        ))}
      </div>
    </aside>
  )
}

function NavLink({ href, label, icon, active, onNavigate }: { href: string; label: string; icon: string; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-2 px-2 py-2.5 min-h-10 rounded-md text-sm transition-colors ${
        active
          ? 'bg-blue-50 text-blue-700 font-medium'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <span className="text-xs w-4 text-center opacity-60">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
