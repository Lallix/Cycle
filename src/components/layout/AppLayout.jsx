import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, BarChart3, CreditCard, List, Settings } from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home', exact: true },
  { to: '/budget', icon: CreditCard, label: 'Budget' },
  { to: '/expenses', icon: List, label: 'Expenses' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function AppLayout() {
  const location = useLocation()

  return (
    <div className="flex flex-col h-svh bg-bg overflow-hidden">
      {/* Page content */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="flex-shrink-0 bg-bg-surface border-t border-border nav-safe">
        <div className="flex items-stretch" style={{ height: '64px' }}>
          {navItems.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) => `
                flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-150 active:scale-95
                ${isActive ? 'text-gold' : 'text-muted'}
              `}
            >
              {({ isActive }) => (
                <>
                  <div className={`relative flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200
                    ${isActive ? 'bg-gold/10' : ''}
                  `}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                    {isActive && (
                      <div className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-gold" />
                    )}
                  </div>
                  <span className={`text-2xs font-medium tracking-wide ${isActive ? 'text-gold' : 'text-muted'}`}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
