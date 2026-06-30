import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useBudget } from '../context/BudgetContext'
import { getGreeting } from '../lib/format'
import HeroCard from '../components/dashboard/HeroCard'
import UpcomingBills from '../components/dashboard/UpcomingBills'
import BudgetSnapshot from '../components/dashboard/BudgetSnapshot'
import RecentExpenses from '../components/dashboard/RecentExpenses'
import SavingsModal from '../components/savings/SavingsModal'
import LoadingScreen from '../components/ui/LoadingScreen'
import BrandLogo from '../components/branding/BrandLogo'
import { RefreshCw, PiggyBank, ChevronRight, LayoutGrid } from 'lucide-react'

export default function DashboardPage() {
  const { profile } = useAuth()
  const { loading, refreshing, refresh, totals } = useBudget()
  const navigate = useNavigate()
  const [savingsOpen, setSavingsOpen] = useState(false)

  if (loading) return <LoadingScreen message="Loading your budget..." />

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  return (
    <div className="min-h-full bg-bg animate-stagger-1">

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 pb-2"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)' }}
      >
        <div>
          <p className="text-xs text-subtle"
            style={{ fontFamily: 'Inter, sans-serif' }}>
            {getGreeting()},
          </p>
          <h1 className="heading text-lg text-fg">{firstName}</h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Refresh */}
          <button
            onClick={refresh}
            disabled={refreshing}
            style={{
              width: 38, height: 38,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 12, border: '0.5px solid #2A2A2A',
              background: '#1B1B1B', cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <RefreshCw size={16} color={refreshing ? '#FFD166' : '#717179'}
              className={refreshing ? 'animate-spin' : ''} />
          </button>

          {/* Savings */}
          <button
            onClick={() => setSavingsOpen(true)}
            style={{
              width: 38, height: 38,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 12,
              border: '0.5px solid rgba(255,209,102,0.25)',
              background: 'rgba(255,209,102,0.08)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <PiggyBank size={18} color="#FFD166" />
          </button>

          {/* Brand mark — decorative only */}
          <div style={{ pointerEvents: 'none' }}>
            <BrandLogo size={32} animated />
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="animate-stagger-1">
        <HeroCard />
      </div>

      {/* Manage Budget entry point */}
      <div className="px-4 mb-4 animate-stagger-2">
        <button
          onClick={() => navigate('/budget')}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border border-border tappable"
          style={{ background: '#1B1B1B' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,209,102,0.1)' }}
            >
              <LayoutGrid size={16} className="text-gold" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-fg"
                style={{ fontFamily: 'Inter, sans-serif' }}>
                Manage budget
              </p>
              <p className="text-xs text-subtle"
                style={{ fontFamily: 'Inter, sans-serif' }}>
                Fixed expenses · Variable categories
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-subtle" />
        </button>
      </div>

      {/* Upcoming bills */}
      <div className="animate-stagger-2">
        <UpcomingBills />
      </div>

      {/* Budget snapshot */}
      <div className="animate-stagger-3">
        <BudgetSnapshot />
      </div>

      {/* Recent transactions */}
      <div className="animate-stagger-4" style={{ marginTop: 8 }}>
        <RecentExpenses />
      </div>

      {/* Bottom spacer for nav */}
      <div className="h-28" />

      {/* Savings modal */}
      <SavingsModal open={savingsOpen} onClose={() => setSavingsOpen(false)} />
    </div>
  )
}
