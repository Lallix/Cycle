import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, BarChart3, CreditCard, List, Settings } from 'lucide-react'

const navItems = [
  { to: '/',         icon: LayoutDashboard, label: 'Home',     exact: true },
  { to: '/budget',   icon: CreditCard,      label: 'Budget' },
  { to: '/expenses', icon: List,            label: 'Expenses' },
  { to: '/reports',  icon: BarChart3,       label: 'Reports' },
  { to: '/settings', icon: Settings,        label: 'Settings' },
]

export default function AppLayout() {
  return (
    <div className="flex flex-col bg-bg" style={{ height: '100dvh' }}>
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <Outlet />
      </main>

      <nav className="flex-shrink-0 bg-bg border-t border-border"
           style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-stretch" style={{ height: '60px' }}>
          {navItems.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-95
                 ${isActive ? 'text-gold' : 'text-muted'}`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all
                    ${isActive ? 'bg-gold/10' : ''}`}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  </div>
                  <span className="text-xs font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
