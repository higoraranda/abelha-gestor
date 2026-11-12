import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Inbox, Users, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { logout } from '@/lib/auth'

const navItems = [
  { to: '/inbox',   label: 'Caixa de entrada', Icon: Inbox },
  { to: '/clients', label: 'Clientes',          Icon: Users },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()

  async function handleLogout() {
    await logout()
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-56 flex flex-col bg-card border-r border-border shrink-0">

        <div className="h-14 flex items-center px-4 border-b border-border">
          <span className="text-lg font-semibold tracking-tight text-foreground">Abelha</span>
        </div>

        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-2 py-3 border-t border-border">
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.name ?? user?.email}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background transition-colors duration-150"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
