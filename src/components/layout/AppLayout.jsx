import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BarChart3, List, Settings, Plus } from 'lucide-react'
import AddExpenseSheet from '../expenses/AddExpenseSheet'

// 4 + 1 nav layout — design bible section 7
// Home · Transactions · [Add FAB] · Reports · Settings
// Budget is accessed via Manage Budget on the home screen

const LEFT_NAV  = [
  { to: '/',            icon: LayoutDashboard, label: 'Home',         exact: true },
  { to: '/expenses',    icon: List,            label: 'Transactions' },
]
const RIGHT_NAV = [
  { to: '/reports',     icon: BarChart3,       label: 'Reports' },
  { to: '/settings',    icon: Settings,        label: 'Settings' },
]

function NavItem({ to, icon: Icon, label, exact }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 active:scale-90 no-select
         ${isActive ? 'text-gold' : 'text-subtle'}`
      }
    >
      {({ isActive }) => (
        <>
          <div className={`flex items-center justify-center w-9 h-9 rounded-2xl transition-all duration-200
            ${isActive ? 'bg-gold/10' : ''}`}>
            <Icon size={21} strokeWidth={isActive ? 2.2 : 1.6} />
          </div>
          <span style={{
            fontSize: 10,
            fontFamily: 'Inter, sans-serif',
            fontWeight: isActive ? 500 : 400,
            letterSpacing: '0.02em',
          }}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}

export default function AppLayout() {
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="flex flex-col bg-bg" style={{ height: '100dvh' }}>
      {/* Page content */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav
        className="flex-shrink-0 bg-bg border-t border-border relative"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-stretch" style={{ height: 60 }}>

          {/* Left items */}
          {LEFT_NAV.map(item => (
            <NavItem key={item.to} {...item} />
          ))}

          {/* Centre Add button — elevated gold FAB */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center justify-center rounded-full transition-all duration-200 active:scale-90 no-select"
              style={{
                width: 52,
                height: 52,
                background: '#FFD166',
                boxShadow: '0 0 20px rgba(255,209,102,0.35), 0 4px 12px rgba(0,0,0,0.4)',
                marginTop: -18,  // lifts above the nav bar
                border: '3px solid #0D0D0D',
              }}
              aria-label="Add transaction"
            >
              <Plus size={24} strokeWidth={2.5} color="#0D0D0D" />
            </button>
            <span style={{
              fontSize: 10,
              color: '#717179',
              fontFamily: 'Inter, sans-serif',
              marginTop: 3,
              letterSpacing: '0.02em',
            }}>
              Add
            </span>
          </div>

          {/* Right items */}
          {RIGHT_NAV.map(item => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>
      </nav>

      {/* Add expense sheet — lives here so it's accessible from the nav FAB */}
      <AddExpenseSheet open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
