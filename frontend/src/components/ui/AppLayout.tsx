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
    <div className="flex h-screen bg-gray-50">
      <aside className="w-56 flex flex-col bg-white border-r border-gray-200/80 shrink-0">

        <div className="h-14 flex items-center px-4 border-b border-gray-200/80">
          <span className="text-lg font-semibold tracking-tight text-gray-900">Abelha</span>
        </div>

        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-2 py-3 border-t border-gray-200/80">
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name ?? user?.email}
            </p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-150"
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
