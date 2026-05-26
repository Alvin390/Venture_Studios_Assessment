import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Columns3,
  Briefcase,
  Users,
  UserCog,
  LogOut,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn, getInitials, colorFromName } from '@/lib/utils'
import toast from 'react-hot-toast'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/kanban',    icon: Columns3,        label: 'Kanban' },
  { to: '/jobs',      icon: Briefcase,       label: 'Jobs' },
  { to: '/candidates',icon: Users,           label: 'Candidates' },
]

const ADMIN_NAV = [
  { to: '/admin/accounts', icon: UserCog, label: 'Accounts' },
]

export default function Sidebar() {
  const { profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
    toast.success('Signed out successfully.')
  }

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col h-full bg-surface-raised border-r border-surface-border">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-surface-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-semibold text-text-primary text-sm tracking-tight">
            TalentFlow
          </span>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-accent-muted text-accent-light'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-overlay'
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Admin
              </span>
            </div>
            {ADMIN_NAV.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-accent-muted text-accent-light'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-overlay'
                  )
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User section */}
      {profile && (
        <div className="border-t border-surface-border p-3">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
              style={{ backgroundColor: colorFromName(profile.full_name) }}
            >
              {getInitials(profile.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {profile.full_name}
              </p>
              <p className="text-xs text-text-muted capitalize">{profile.role}</p>
            </div>
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              className="text-text-muted hover:text-text-secondary p-1 rounded transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
