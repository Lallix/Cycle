import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useBudget } from '../context/BudgetContext'
import { useToast } from '../components/ui/Toast'
import { formatMoney } from '../lib/format'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import BottomSheet from '../components/ui/BottomSheet'
import LoadingScreen from '../components/ui/LoadingScreen'
import BrandLogo from '../components/branding/BrandLogo'
import {
  User, Bell, Wallet, RefreshCw, Fingerprint, LogOut,
  ChevronRight, Shield, Database, Info, Plus, Edit2
} from 'lucide-react'

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'

export default function SettingsPage() {
  const {
    user, profile, signOut, updateProfile,
    biometricAvailable, biometricEnabled,
    registerBiometric, disableBiometric
  } = useAuth()
  const { loading, categories, addCategory, updateCategory, loadCategories } = useBudget()
  const toast = useToast()

  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [editCatOpen, setEditCatOpen] = useState(false)
  const [addIncomeOpen, setAddIncomeOpen] = useState(false)
  const [catForm, setCatForm] = useState({ name: '', icon: '💳', color: '#D4AF37', budget_amount: '', type: 'variable' })
  const [editingCat, setEditingCat] = useState(null)
  const [profileForm, setProfileForm] = useState({ full_name: profile?.full_name || '', cycle_start_day: profile?.cycle_start_day || 25, monthly_income: incomeRecords?.[0]?.amount || 5360 })
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [incomeForm, setIncomeForm] = useState({ amount: '', source: 'Salary' })

  const { addIncome } = useBudget()

  const ICONS = ['💳', '🛒', '🍽️', '🚌', '🎬', '👗', '🎒', '💊', '⛽', '🏠', '📱', '✈️', '🎮', '📺', '🏋️', '☕']
  const COLORS = ['#D4AF37', '#3DD598', '#FF6B6B', '#FFB347', '#9B59B6', '#E91E63', '#00BCD4', '#4CAF50', '#FF9800']

  async function handleSaveProfile() {
    setSaving(true)
    try {
      await updateProfile({
        full_name: profileForm.full_name,
        cycle_start_day: parseInt(profileForm.cycle_start_day),
        // monthly_income handled via cycle_income table
      })
      toast('Profile updated ✓', 'success')
      setEditProfileOpen(false)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveCategory() {
    if (!catForm.name) return
    setSaving(true)
    try {
      const data = {
        name: catForm.name,
        icon: catForm.icon,
        color: catForm.colour,
        budget_amount: catForm.budget_amount ? parseFloat(catForm.budget_amount) : null,
        type: 'variable',
      }
      if (editingCat) {
        await updateCategory(editingCat.id, data)
        toast('Category updated ✓', 'success')
      } else {
        await addCategory(data)
        toast('Category added ✓', 'success')
      }
      setEditCatOpen(false)
      setCatForm({ name: '', icon: '💳', color: '#D4AF37', budget_amount: '', type: 'variable' })
      setEditingCat(null)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    setSigningOut(true)
    try {
      await signOut()
    } catch (err) {
      toast(err.message, 'error')
      setSigningOut(false)
    }
  }

  async function handleBiometricToggle() {
    if (biometricEnabled) {
      disableBiometric()
      toast('Biometric login disabled', 'info')
    } else {
      const success = await registerBiometric()
      if (success) toast('Biometric login enabled ✓', 'success')
      else toast('Could not register biometric', 'error')
    }
  }

  async function handleAddIncome() {
    if (!incomeForm.amount) return
    setSaving(true)
    try {
      await addIncome({
        source: incomeForm.source,
        amount: parseFloat(incomeForm.amount),
        date: new Date().toISOString().split('T')[0],
      })
      toast('Income recorded ✓', 'success')
      setAddIncomeOpen(false)
      setIncomeForm({ amount: '', source: 'Salary' })
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingScreen />

  const variableCategories = categories.filter(c => c.type === 'variable')

  return (
    <div className="min-h-full bg-bg animate-fade-in"
      style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom) + 1rem)' }}
    >
      <PageHeader title="Settings" />

      {/* Profile */}
      <div className="px-4 mb-5">
        <h2 className="section-label">Profile</h2>
        <div className="bg-bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center gap-4 px-4 py-4">
            <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
              <span className="text-xl">{profile?.full_name?.[0] || '?'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-text-primary">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-muted truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => {
                setProfileForm({ full_name: profile?.full_name || '', cycle_start_day: profile?.cycle_start_day || 25, monthly_income: incomeRecords?.[0]?.amount || 5360 })
                setEditProfileOpen(true)
              }}
              className="tappable"
            >
              <Edit2 size={18} className="text-muted" />
            </button>
          </div>

          <div className="border-t border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-text-secondary">Budget cycle starts</span>
            <span className="text-sm font-mono text-gold">Day {profile?.cycle_start_day || 25}</span>
          </div>
          <div className="border-t border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-text-secondary">Monthly income</span>
            <span className="text-sm font-mono text-success">{formatMoney(incomeRecords?.[0]?.amount || 5360)}</span>
          </div>
        </div>
      </div>

      {/* Income */}
      <div className="px-4 mb-5">
        <h2 className="section-label">Income</h2>
        <div className="bg-bg-card rounded-2xl border border-border overflow-hidden">
          <button
            onClick={() => setAddIncomeOpen(true)}
            className="w-full flex items-center justify-between px-4 py-3.5 tappable"
          >
            <div className="flex items-center gap-3">
              <Wallet size={18} className="text-success" />
              <span className="text-sm text-text-primary">Record income received</span>
            </div>
            <ChevronRight size={16} className="text-muted" />
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="px-4 mb-5">
        <h2 className="section-label">Security</h2>
        <div className="bg-bg-card rounded-2xl border border-border overflow-hidden">
          {biometricAvailable && (
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
              <div className="flex items-center gap-3">
                <Fingerprint size={18} className="text-gold" />
                <div>
                  <p className="text-sm text-text-primary">Biometric Login</p>
                  <p className="text-xs text-muted">Face ID / Fingerprint</p>
                </div>
              </div>
              <button
                onClick={handleBiometricToggle}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${biometricEnabled ? 'bg-gold' : 'bg-border'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${biometricEnabled ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          )}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Shield size={18} className="text-muted" />
            <div>
              <p className="text-sm text-text-secondary">Role: <span className="text-gold capitalize">{profile?.is_admin ? 'admin' : 'user'}</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-label">Categories</h2>
          <button
            onClick={() => {
              setEditingCat(null)
              setCatForm({ name: '', icon: '💳', color: '#D4AF37', budget_amount: '', type: 'variable' })
              setEditCatOpen(true)
            }}
            className="text-xs text-gold tappable"
          >
            + Add
          </button>
        </div>
        <div className="bg-bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
          {variableCategories.map(cat => (
            <div
              key={cat.id}
              className="flex items-center gap-3 px-4 py-3 tappable"
              onClick={() => {
                setEditingCat(cat)
                setCatForm({
                  name: cat.name,
                  icon: cat.icon,
                  color: cat.color,
                  budget_amount: cat.budget_amount ? String(cat.budget_amount) : '',
                  type: cat.type,
                })
                setEditCatOpen(true)
              }}
            >
              <span className="text-xl">{cat.icon}</span>
              <span className="flex-1 text-sm text-text-primary">{cat.name}</span>
              {cat.budget_amount && (
                <span className="font-mono text-xs text-muted">
                  {formatMoney(cat.budget_amount, 'ZAR', true)}/mo
                </span>
              )}
              <ChevronRight size={14} className="text-muted" />
            </div>
          ))}
        </div>
      </div>

      {/* App info */}
      <div className="px-4 mb-5">
        <h2 className="section-label">App</h2>
        <div className="bg-bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
            <Info size={18} className="text-muted" />
            <span className="text-sm text-text-secondary">Version</span>
            <span className="ml-auto text-sm font-mono text-muted">1.0.0</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Database size={18} className="text-muted" />
            <span className="text-sm text-text-secondary">Data</span>
            <span className="ml-auto text-xs text-muted">Supabase Cloud</span>
          </div>
        </div>
      </div>

      {/* Sign out */}
      <div className="px-4 mb-8">
        <Button
          variant="danger"
          onClick={handleLogout}
          loading={signingOut}
          fullWidth
          className="flex items-center gap-2"
        >
          <LogOut size={16} />
          Sign Out
        </Button>
      </div>

      {/* Branding */}
      <div className="flex flex-col items-center gap-2 pb-8">
        <BrandLogo size={32} />
        <p className="text-xs text-muted">Cycle · Budget App</p>
      </div>

      {/* Edit Profile Sheet */}
      <BottomSheet open={editProfileOpen} onClose={() => setEditProfileOpen(false)} title="Edit Profile">
        <div className="px-5 pb-8 space-y-4">
          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Full Name</label>
            <input
              type="text"
              value={profileForm.full_name}
              onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))}
              className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-gold transition-all"
            />
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Cycle Start Day</label>
            <select
              value={profileForm.cycle_start_day}
              onChange={e => setProfileForm(f => ({ ...f, cycle_start_day: e.target.value }))}
              className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-gold transition-all"
              style={{ colorScheme: 'dark' }}
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>Day {d} of each month</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Monthly Income</label>
            <input
              type="number"
              inputMode="decimal"
              value={profileForm.monthly_income}
              onChange={e => setProfileForm(f => ({ ...f, monthly_income: e.target.value }))}
              className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary font-mono placeholder:text-muted focus:outline-none focus:border-gold transition-all"
            />
          </div>
          <Button onClick={handleSaveProfile} loading={saving} fullWidth size="lg" className="mt-2">
            Save Profile
          </Button>
        </div>
      </BottomSheet>

      {/* Category Sheet */}
      <BottomSheet
        open={editCatOpen}
        onClose={() => { setEditCatOpen(false); setEditingCat(null) }}
        title={editingCat ? 'Edit Category' : 'Add Category'}
      >
        <div className="px-5 pb-8 space-y-4">
          {/* Icon picker */}
          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(icon => (
                <button
                  key={icon}
                  onClick={() => setCatForm(f => ({ ...f, icon }))}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border transition-all active:scale-95
                    ${catForm.icon === icon ? 'border-gold bg-gold/10' : 'border-border bg-bg-elevated'}`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Name</label>
            <input
              type="text"
              placeholder="Category name"
              value={catForm.name}
              onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-gold transition-all"
            />
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Monthly Budget (optional)</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="Leave blank for unbudgeted"
              value={catForm.budget_amount}
              onChange={e => setCatForm(f => ({ ...f, budget_amount: e.target.value }))}
              className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-gold transition-all font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setCatForm(f => ({ ...f, color }))}
                  className={`w-8 h-8 rounded-full border-2 transition-all active:scale-95 ${catForm.colour === color ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <Button onClick={handleSaveCategory} loading={saving} fullWidth size="lg" className="mt-2">
            {editingCat ? 'Save Changes' : 'Add Category'}
          </Button>
        </div>
      </BottomSheet>

      {/* Income Sheet */}
      <BottomSheet open={addIncomeOpen} onClose={() => setAddIncomeOpen(false)} title="Record Income">
        <div className="px-5 pb-8 space-y-4">
          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Source</label>
            <input
              type="text"
              placeholder="Salary, Freelance, etc."
              value={incomeForm.source}
              onChange={e => setIncomeForm(f => ({ ...f, source: e.target.value }))}
              className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-gold transition-all"
            />
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Amount</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="R0.00"
              value={incomeForm.amount}
              onChange={e => setIncomeForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-gold transition-all font-mono text-lg"
              autoFocus
            />
          </div>
          <Button onClick={handleAddIncome} loading={saving} fullWidth size="lg" className="mt-2">
            Record Income
          </Button>
        </div>
      </BottomSheet>
            {/* Version */}
        <p className="text-center text-xs text-muted pb-4">
          Cycle · v{APP_VERSION}
        </p>
      </div>
  )
}
