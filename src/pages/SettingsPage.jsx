import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useBudget } from '../context/BudgetContext'
import { useToast } from '../components/ui/Toast'
import { formatMoney, EMOJI_OPTIONS, COLOR_OPTIONS } from '../lib/format'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import BottomSheet from '../components/ui/BottomSheet'
import { User, Wallet, LogOut, Plus, Edit2, Trash2, RefreshCw } from 'lucide-react'

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'

const BLANK_CAT = { name: '', icon: '🛒', colour: '#D4AF37', budget_amount: '', type: 'variable' }

export default function SettingsPage() {
  const { user, profile, signOut, updateProfile, biometricAvailable, biometricEnabled, registerBiometric, disableBiometric } = useAuth()
  const { categories, incomeRecords, addCategory, updateCategory, deleteCategory, updateIncome, addIncome } = useBudget()
  const toast = useToast()

  const [profileOpen, setProfileOpen]   = useState(false)
  const [catOpen, setCatOpen]           = useState(false)
  const [incomeOpen, setIncomeOpen]     = useState(false)
  const [editingCat, setEditingCat]     = useState(null)
  const [catForm, setCatForm]           = useState(BLANK_CAT)
  const [profileForm, setProfileForm]   = useState({ full_name: '', cycle_start_day: 25 })
  const [incomeAmount, setIncomeAmount] = useState('')
  const [saving, setSaving]             = useState(false)

  // ── Profile ────────────────────────────────────────────────
  function openProfile() {
    setProfileForm({ full_name: profile?.full_name || '', cycle_start_day: profile?.cycle_start_day || 25 })
    setProfileOpen(true)
  }

  async function saveProfile() {
    setSaving(true)
    try {
      await updateProfile({
        full_name:       profileForm.full_name,
        cycle_start_day: parseInt(profileForm.cycle_start_day, 10),
      })
      toast('Profile updated', 'success')
      setProfileOpen(false)
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  // ── Income ─────────────────────────────────────────────────
  function openIncome() {
    setIncomeAmount(incomeRecords?.[0]?.amount ? String(incomeRecords[0].amount) : '')
    setIncomeOpen(true)
  }

  async function saveIncome() {
    if (!incomeAmount || parseFloat(incomeAmount) <= 0) {
      toast('Enter a valid amount', 'error')
      return
    }
    setSaving(true)
    try {
      const existing = incomeRecords?.[0]
      if (existing) {
        await updateIncome(existing.id, parseFloat(incomeAmount))
      } else {
        // No seed record yet — insert one directly
        await addIncome(parseFloat(incomeAmount))
      }
      toast('Income updated', 'success')
      setIncomeOpen(false)
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  // ── Categories ─────────────────────────────────────────────
  function openAddCat() {
    setEditingCat(null)
    setCatForm(BLANK_CAT)
    setCatOpen(true)
  }

  function openEditCat(cat) {
    setEditingCat(cat)
    setCatForm({
      name:          cat.name,
      icon:          cat.icon || '💳',
      colour:        cat.colour || '#D4AF37',
      budget_amount: cat.budget_amount ? String(cat.budget_amount) : '',
      type:          cat.type || 'variable',
    })
    setCatOpen(true)
  }

  async function saveCat() {
    if (!catForm.name.trim()) { toast('Name is required', 'error'); return }
    setSaving(true)
    try {
      const payload = {
        name:          catForm.name.trim(),
        icon:          catForm.icon,
        colour:        catForm.colour,
        budget_amount: catForm.budget_amount ? parseFloat(catForm.budget_amount) : null,
        type:          catForm.type,
      }
      if (editingCat) {
        await updateCategory(editingCat.id, payload)
        toast('Category updated', 'success')
      } else {
        await addCategory(payload)
        toast('Category added', 'success')
      }
      setCatOpen(false)
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleDeleteCat(cat) {
    try {
      await deleteCategory(cat.id)
      toast('Category removed', 'success')
    } catch (e) { toast(e.message, 'error') }
  }

  async function handleSignOut() {
    try { await signOut() } catch (e) { toast(e.message, 'error') }
  }

  const income = incomeRecords?.[0]?.amount || 0

  return (
    <div className="pb-28" style={{ minHeight: '100vh' }}>
      <PageHeader title="Settings" />

      <div className="px-4 space-y-5">

        {/* Profile card */}
        <section>
          <p className="text-xs text-muted uppercase tracking-widest mb-2">Profile</p>
          <div className="bg-surface-1 border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <div className="w-11 h-11 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-lg font-bold text-gold">
                {(profile?.full_name || user?.email || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{profile?.full_name || 'No name set'}</p>
                <p className="text-xs text-muted truncate">{user?.email}</p>
              </div>
              <button onClick={openProfile} className="p-2 rounded-lg hover:bg-surface-2 transition-colors">
                <Edit2 size={16} className="text-muted" />
              </button>
            </div>
            <div className="border-t border-border px-4 py-3 flex justify-between text-sm">
              <span className="text-muted">Cycle start day</span>
              <span className="font-medium">Day {profile?.cycle_start_day || 25}</span>
            </div>
          </div>
        </section>

        {/* Income */}
        <section>
          <p className="text-xs text-muted uppercase tracking-widest mb-2">Income</p>
          <div className="bg-surface-1 border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-muted">Monthly take-home</p>
                <p className="text-xl font-mono font-semibold text-success mt-0.5">{formatMoney(income)}</p>
              </div>
              <button onClick={openIncome} className="p-2 rounded-lg hover:bg-surface-2 transition-colors">
                <Edit2 size={16} className="text-muted" />
              </button>
            </div>
          </div>
        </section>

        {/* Variable budget categories */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted uppercase tracking-widest">Budget Categories</p>
            <button onClick={openAddCat} className="flex items-center gap-1 text-xs text-gold hover:opacity-80">
              <Plus size={13} /> Add
            </button>
          </div>
          <div className="bg-surface-1 border border-border rounded-2xl overflow-hidden divide-y divide-border">
            {categories.filter(c => c.type === 'variable').map(cat => (
              <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-lg w-7 text-center">{cat.icon || '💳'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{cat.name}</p>
                  {cat.budget_amount && (
                    <p className="text-xs text-muted">{formatMoney(cat.budget_amount)}/cycle</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditCat(cat)} className="p-1.5 rounded-lg hover:bg-surface-2 transition-colors">
                    <Edit2 size={13} className="text-muted" />
                  </button>
                  <button onClick={() => handleDeleteCat(cat)} className="p-1.5 rounded-lg hover:bg-danger/10 transition-colors">
                    <Trash2 size={13} className="text-muted hover:text-danger" />
                  </button>
                </div>
              </div>
            ))}
            {categories.filter(c => c.type === 'variable').length === 0 && (
              <p className="text-sm text-muted px-4 py-4">No categories yet</p>
            )}
          </div>
        </section>

        {/* Biometric */}
        {biometricAvailable && (
          <section>
            <p className="text-xs text-muted uppercase tracking-widest mb-2">Security</p>
            <div className="border border-border rounded-2xl overflow-hidden" style={{ background: '#1B1B1B' }}>
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-fg" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {biometricEnabled ? 'Biometric unlock' : 'Enable biometric unlock'}
                  </p>
                  <p className="text-xs text-subtle mt-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {biometricEnabled ? 'Face ID / fingerprint active' : 'Use Face ID or fingerprint to unlock'}
                  </p>
                </div>
                <button
                  onClick={biometricEnabled ? disableBiometric : async () => {
                    const ok = await registerBiometric()
                    if (ok) toast('Biometric unlock enabled', 'success')
                    else toast('Setup failed — try again', 'error')
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-medium transition-all"
                  style={{
                    background: biometricEnabled ? 'rgba(239,68,68,0.1)' : 'rgba(255,209,102,0.1)',
                    color: biometricEnabled ? '#EF4444' : '#FFD166',
                    border: `0.5px solid ${biometricEnabled ? 'rgba(239,68,68,0.2)' : 'rgba(255,209,102,0.2)'}`,
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {biometricEnabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Sign out */}
        <section>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-danger/30 text-danger text-sm font-medium hover:bg-danger/5 transition-colors"
          >
            <LogOut size={16} /> Sign out
          </button>
        </section>

        <div className="flex flex-col items-center gap-1 pb-4 pt-2">
          <p className="text-xs text-muted">Cycle · {APP_VERSION}</p>
          <p className="text-xs" style={{ color: '#3A3530', letterSpacing: '0.08em' }}>Crafted by PGV</p>
        </div>
      </div>

      {/* Edit Profile Sheet */}
      <BottomSheet open={profileOpen} onClose={() => setProfileOpen(false)} title="Edit Profile">
        <div className="px-5 space-y-4 pb-8">
          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Name</label>
            <input
              type="text"
              value={profileForm.full_name}
              onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="Your name"
              className="w-full bg-surface-1 border border-border rounded-xl px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Cycle Start Day</label>
            <select
              value={profileForm.cycle_start_day}
              onChange={e => setProfileForm(f => ({ ...f, cycle_start_day: e.target.value }))}
              className="w-full bg-surface-1 border border-border rounded-xl px-4 py-3 text-sm"
              style={{ colorScheme: 'dark' }}
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>Day {d}</option>
              ))}
            </select>
          </div>
          <Button variant="primary" size="lg" onClick={saveProfile} disabled={saving} className="w-full">
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </BottomSheet>

      {/* Edit Income Sheet */}
      <BottomSheet open={incomeOpen} onClose={() => setIncomeOpen(false)} title="Monthly Income">
        <div className="px-5 space-y-4 pb-8">
          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Take-home amount</label>
            <div className="flex items-center gap-2 bg-surface-1 border border-border rounded-xl px-4 py-3">
              <span className="text-muted font-mono">R</span>
              <input
                type="number"
                inputMode="decimal"
                value={incomeAmount}
                onChange={e => setIncomeAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-transparent font-mono text-lg outline-none"
              />
            </div>
          </div>
          <Button variant="primary" size="lg" onClick={saveIncome} disabled={saving} className="w-full">
            {saving ? 'Saving…' : 'Update Income'}
          </Button>
        </div>
      </BottomSheet>

      {/* Add/Edit Category Sheet */}
      <BottomSheet open={catOpen} onClose={() => setCatOpen(false)} title={editingCat ? 'Edit Category' : 'Add Category'}>
        <div className="px-5 space-y-4 pb-8">
          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Name</label>
            <input
              type="text"
              value={catForm.name}
              onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Groceries"
              className="w-full bg-surface-1 border border-border rounded-xl px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Budget Amount / cycle</label>
            <div className="flex items-center gap-2 bg-surface-1 border border-border rounded-xl px-4 py-3">
              <span className="text-muted font-mono text-sm">R</span>
              <input
                type="number"
                inputMode="decimal"
                value={catForm.budget_amount}
                onChange={e => setCatForm(f => ({ ...f, budget_amount: e.target.value }))}
                placeholder="0.00"
                className="flex-1 bg-transparent font-mono text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Icon</label>
            <div className="grid grid-cols-10 gap-2">
              {EMOJI_OPTIONS.map(em => (
                <button
                  key={em}
                  onClick={() => setCatForm(f => ({ ...f, icon: em }))}
                  className={`text-xl p-1 rounded-lg border transition-all ${catForm.icon === em ? 'border-gold bg-gold/10' : 'border-transparent hover:border-border'}`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Colour</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map(col => (
                <button
                  key={col}
                  onClick={() => setCatForm(f => ({ ...f, colour: col }))}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${catForm.colour === col ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          </div>

          <Button variant="primary" size="lg" onClick={saveCat} disabled={saving} className="w-full">
            {saving ? 'Saving…' : editingCat ? 'Save Changes' : 'Add Category'}
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
