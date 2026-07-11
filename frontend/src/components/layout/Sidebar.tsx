import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { useAuthStore, useUser } from '@/stores/authStore'
import { authApi } from '@/api/auth'
import { SidebarNavItem } from './SidebarNavItem'
import { SemesterHistorySelector } from './SemesterHistorySelector'
import type { NavSection } from './navItems/types'

const roleLabel: Record<string, string> = {
  HOD: 'HOD Portal',
  FACULTY: 'Faculty Portal',
  STUDENT: 'Student Portal',
  UNIVERSITY: 'University Portal',
}

export function Sidebar({
  sections,
  role,
  onNavigate,
  className,
}: {
  sections: NavSection[]
  role: 'HOD' | 'FACULTY' | 'STUDENT' | 'UNIVERSITY'
  onNavigate?: () => void
  className?: string
}) {
  const user = useUser()
  const { refreshToken, clearAuth } = useAuthStore()

  async function handleLogout() {
    try {
      if (refreshToken) await authApi.logout(refreshToken)
    } catch {
      /* ignore network errors on logout */
    } finally {
      clearAuth()
      window.location.replace('/login')
    }
  }

  return (
    <aside
      className={cn(
        'flex h-full w-sidebar flex-col border-r border-border bg-surface',
        className,
      )}
    >
      {/* Brand */}
      <div className="flex h-topbar items-center gap-2.5 border-b border-border px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary text-sm font-bold text-white">
          LJ
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold text-text-primary">UniPortal</div>
          <div className="text-[11px] font-medium text-text-muted">{roleLabel[role]}</div>
        </div>
      </div>

      {/* Semester history (HOD only — under the logo) */}
      {role === 'HOD' && <SemesterHistorySelector />}

      {/* Nav */}
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        {sections.map((s) => (
          <div key={s.section} className="mb-4">
            <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              {s.section}
            </div>
            <div className="space-y-0.5">
              {s.items.map((item) => (
                <SidebarNavItem key={item.id} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={user?.name} size={34} />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13px] font-semibold text-text-primary">
              {user?.name ?? '—'}
            </div>
            <div className="truncate text-[11px] text-text-muted">{roleLabel[role]}</div>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Log out"
            title="Log out"
            className="flex h-8 w-8 items-center justify-center rounded-sm text-text-muted hover:bg-danger-light hover:text-danger"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
