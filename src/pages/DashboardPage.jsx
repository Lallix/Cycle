import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useBudget } from '../context/BudgetContext'
import UpcomingBills from '../components/dashboard/UpcomingBills'
import RecentExpenses from '../components/dashboard/RecentExpenses'
import PlannedItems from '../components/dashboard/PlannedItems'
import ReviewPrompt from '../components/dashboard/ReviewPrompt'
import CoverAccounts from '../components/dashboard/CoverAccounts'
import SavingsModal from '../components/savings/SavingsModal'
import LoadingScreen from '../components/ui/LoadingScreen'
import { ModeToggleButton } from '../components/ui/ThemeSwitch'
import { VibeHeader, VibeHero, VibeBlocks, VibeTiles } from '../components/vibe/VibeDashboard'

// Home: 3D ring hero, what each account needs this cycle, candy-block
// types, vibe-check tiles, then planned items, bills due and recent spend.
export default function DashboardPage() {
  const { profile } = useAuth()
  const { loading } = useBudget()
  const [savingsOpen, setSavingsOpen] = useState(false)

  if (loading) return <LoadingScreen message="Loading your budget..." />

  const firstName = (profile?.full_name?.split(' ')[0] || 'there').toLowerCase()

  return (
    <div className="min-h-full animate-stagger-1">
      <VibeHeader
        firstName={firstName}
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ModeToggleButton />
            <button
              onClick={() => setSavingsOpen(true)}
              aria-label="Savings"
              className="vibe-avatar"
            >🐷</button>
          </div>
        }
      />
      <VibeHero />
      <div className="mt-4"><ReviewPrompt /></div>
      <CoverAccounts />
      <VibeBlocks />
      <VibeTiles />
      <PlannedItems />
      <UpcomingBills />
      <div style={{ marginTop: 8 }}><RecentExpenses /></div>
      <div className="h-32" />
      <SavingsModal open={savingsOpen} onClose={() => setSavingsOpen(false)} />
    </div>
  )
}
