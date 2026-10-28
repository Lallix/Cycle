import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BarChart3, Wallet, Settings, Plus } from 'lucide-react'
import AddExpenseSheet from '../expenses/AddExpenseSheet'

// 4 + 1 nav layout
// Home · Budget · [Add FAB] · Activity · Settings
// Activity holds Transactions, Overview and Year

const LEFT_NAV  = [
  { to: '/',            icon: LayoutDashboard, label: 'Home',         exact: true },
  { to: '/budget',      icon: Wallet,          label: 'Budget' },
]
const RIGHT_NAV = [
  { to: '/activity',    icon: BarChart3,       label: 'Activity' },
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
      {/* Page content — fade transition on route change */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div style={{ animation: 'pageFadeIn 0.25s ease-out both' }}>
          <Outlet />
        </div>
      </main>
      <style>{`
        @keyframes pageFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Bottom nav */}
      <nav
        className="app-nav flex-shrink-0 bg-bg border-t border-border relative"
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
              className="app-fab flex items-center justify-center rounded-full transition-all duration-200 active:scale-90 no-select"
              style={{
                width: 52,
                height: 52,
                background: 'rgb(var(--c-accent))',
                boxShadow: '0 0 0 0 transparent, 0 4px 12px rgba(0,0,0,0.4)',
                marginTop: -18,  // lifts above the nav bar
                border: '3px solid rgb(var(--c-bg))',
              }}
              aria-label="Add transaction"
            >
              <Plus size={24} strokeWidth={2.5} color="rgb(var(--c-on-accent))" />
            </button>
            <span className="app-fab-label" style={{
              fontSize: 10,
              color: 'rgb(var(--c-text-3))',
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

      <AddExpenseSheet open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
