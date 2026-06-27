import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useBudget } from '../context/BudgetContext'
import { getGreeting } from '../lib/format'
import HeroCard from '../components/dashboard/HeroCard'
import UpcomingBills from '../components/dashboard/UpcomingBills'
import BudgetSnapshot from '../components/dashboard/BudgetSnapshot'
import RecentExpenses from '../components/dashboard/RecentExpenses'
import AddExpenseSheet from '../components/expenses/AddExpenseSheet'
import SavingsModal from '../components/savings/SavingsModal'
import LoadingScreen from '../components/ui/LoadingScreen'
import BrandLogo from '../components/branding/BrandLogo'
import { Plus, PiggyBank, RefreshCw } from 'lucide-react'

export default function DashboardPage() {
  const { profile } = useAuth()
  const { loading, refreshing, refresh } = useBudget()
  const [addExpenseOpen, setAddExpenseOpen] = useState(false)
  const [savingsOpen, setSavingsOpen] = useState(false)

  if (loading) return <LoadingScreen message="Loading your budget..." />

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  return (
    <div className="min-h-full bg-bg animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)' }}
      >
        <div>
          <p className="text-xs text-muted">{getGreeting()},</p>
          <h1 className="text-lg font-semibold text-text-primary">{firstName}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refresh}
            disabled={refreshing}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-bg-elevated border border-border tappable"
          >
            <RefreshCw size={16} className={`text-muted ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setSavingsOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-bg-elevated border border-border tappable"
          >
            <PiggyBank size={18} className="text-gold" />
          </button>
          <BrandLogo size={32} />
        </div>
      </div>

      {/* Hero card */}
      <HeroCard />

      {/* Upcoming bills */}
      <UpcomingBills />

      {/* Budget snapshot */}
      <BudgetSnapshot />

      {/* Recent expenses */}
      <RecentExpenses />

      {/* Spacer for FAB */}
      <div className="h-24" />

      {/* FAB */}
      <button
        className="fab"
        onClick={() => setAddExpenseOpen(true)}
        aria-label="Add expense"
      >
        <Plus size={26} strokeWidth={2.5} className="text-bg font-bold" />
      </button>

      {/* Sheets */}
      <AddExpenseSheet open={addExpenseOpen} onClose={() => setAddExpenseOpen(false)} />
      <SavingsModal open={savingsOpen} onClose={() => setSavingsOpen(false)} />
    </div>
  )
}
