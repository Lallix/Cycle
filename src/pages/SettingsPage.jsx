import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useBudget } from '../context/BudgetContext'
import { useToast } from '../components/ui/Toast'
import { formatMoney, COLOR_OPTIONS, getAccountConfig, accountStyle } from '../lib/format'
import PageHeader from '../components/ui/PageHeader'
import BankLogo from '../components/ui/BankLogo'
import CategorySortToggle, { useCategorySort, sortCategories } from '../components/ui/CategorySort'
import Button from '../components/ui/Button'
import BottomSheet from '../components/ui/BottomSheet'
import AccountPicker from '../components/ui/AccountPicker'
import { User, Wallet, LogOut, Plus, Edit2, Trash2, RefreshCw, Smile, FileUp, ChevronDown, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ThemeSwitch from '../components/ui/ThemeSwitch'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'
import { TYPE_OPTIONS } from '../lib/spend'
import { normaliseType } from '../lib/totals'

// Colour of each category type, as on the Budget screen
const TYPE_ORDER = ['income', 'fixed', 'predicted', 'unplanned', 'once_off', 'debt', 'transfer']

const TYPE_TONE = {
  income: 'rgb(var(--c-positive))', fixed: 'rgb(var(--c-fixed))', predicted: 'rgb(var(--c-predicted))',
  unplanned: 'rgb(var(--c-unplanned))', once_off: 'rgb(var(--c-warning))', debt: 'rgb(var(--c-negative))',
}

const BANK_OPTIONS = [
  'Capitec', 'FNB', 'Absa', 'Standard', 'Nedbank',
  'Investec', 'TymeBank', 'Discovery', 'African', 'Bidvest',
]

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'

const BLANK_CAT = { name: '', icon: '🛒', colour: 'rgb(var(--c-accent))', type: 'predicted' }

export default function SettingsPage() {
  const { user, profile, signOut, updateProfile, biometricAvailable, biometricEnabled, registerBiometric, disableBiometric } = useAuth()
  const { categories, archivedCategories, restoreCategory, accounts, addCategory, updateCategory, deleteCategory, addAccount, updateAccount, deleteAccount } = useBudget()
  const toast = useToast()
  const navigate = useNavigate()

  const [profileOpen, setProfileOpen]   = useState(false)
  const [catOpen, setCatOpen]           = useState(false)
  const [editingCat, setEditingCat]     = useState(null)
  const [catForm, setCatForm]           = useState(BLANK_CAT)
  const [profileForm, setProfileForm]   = useState({ full_name: '', cycle_start_day: 25 })
  const [saving, setSaving]             = useState(false)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [accountOpen, setAccountOpen]         = useState(false)
  const [accountForm, setAccountForm]         = useState({ name: '', bank: 'Capitec' })
  const [savingAccount, setSavingAccount]     = useState(false)
  const [editingAccount, setEditingAccount]   = useState(null)
  const [archivedOpen, setArchivedOpen]       = useState(false)
  const [catSort, setCatSort]                 = useCategorySort()

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

  // ── Accounts ──────────────────────────────────────────────
  async function handleAddAccount() {
    if (!accountForm.name.trim()) { toast('Enter an account name', 'error'); return }
    setSavingAccount(true)
    try {
      await addAccount({ name: accountForm.name.trim(), bank: accountForm.bank })
      toast('Account added ✓', 'success')
      setAccountOpen(false)
      setAccountForm({ name: '', bank: 'Capitec' })
    } catch (e) { toast(e.message, 'error') }
    finally { setSavingAccount(false) }
  }

  async function handleSetDefault(acc) {
    try {
      // Remove default from all, then set on this one
      for (const a of accounts) {
        if (a.is_default) await updateAccount(a.id, { is_default: false })
      }
      await updateAccount(acc.id, { is_default: true })
      toast(`${acc.bank || acc.name} set as default ✓`, 'success')
    } catch (e) { toast(e.message, 'error') }
  }

  function handleEditAccount(acc) {
    setEditingAccount(acc)
    setAccountForm({ name: acc.name !== acc.bank ? acc.name : '', bank: acc.bank || acc.name })
    setAccountOpen(true)
  }

  async function handleDeleteAccount(acc) {
    try {
      await deleteAccount(acc.id)
      toast('Account removed', 'success')
    } catch (e) { toast(e.message, 'error') }
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
      colour:        cat.colour || 'rgb(var(--c-accent))',
      type:          cat.type || 'predicted',
    })
    setCatOpen(true)
  }

  async function saveCat() {
    if (!catForm.name.trim()) { toast('Category name is required', 'error'); return }
    setSaving(true)
    try {
      const payload = {
        name:          catForm.name.trim(),
        icon:          catForm.icon,
        colour:        catForm.colour,
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

  // Removing archives the category; Undo (10 s) or the Archived list brings it back
  async function handleDeleteCat(cat) {
    try {
      await deleteCategory(cat.id)
      toast(`${cat.name} removed`, 'success', 10000, { label: 'Undo', onClick: () => handleRestoreCat(cat) })
    } catch (e) { toast(e.message, 'error') }
  }

  async function handleRestoreCat(cat) {
    try {
      await restoreCategory(cat.id)
      toast(`${cat.name} is back`, 'success')
    } catch (e) { toast(e.message, 'error') }
  }

  async function handleSignOut() {
    try { await signOut() } catch (e) { toast(e.message, 'error') }
  }

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

        {/* Money in is planned on the budget sheet */}
        <section>
          <p className="text-xs text-muted uppercase tracking-widest mb-2">Money in</p>
          <button
            onClick={() => navigate('/budget')}
            className="w-full flex items-center gap-3 px-4 py-3 border border-border rounded-2xl tappable"
            style={{ background: 'rgb(var(--c-surface))' }}
          >
            <span className="text-lg">💼</span>
            <div className="flex-1 text-left">
              <p className="text-sm text-fg" style={{ fontFamily: 'Inter, sans-serif' }}>Salary and other income</p>
              <p className="text-xs text-muted">Set what you expect to come in on the Budget sheet</p>
            </div>
            <span className="text-xs text-gold">Open →</span>
          </button>
        </section>

        {/* Import statement */}
        <section>
          <button
            onClick={() => navigate('/import')}
            className="w-full flex items-center gap-3 px-4 py-3 border border-border rounded-2xl tappable"
            style={{ background: 'rgb(var(--c-surface))' }}
          >
            <FileUp size={18} className="text-gold" />
            <div className="flex-1 text-left">
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500, color: 'rgb(var(--c-text))' }}>Import bank statement</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgb(var(--c-text-3))' }}>Capitec CSV — main account or credit card</p>
            </div>
          </button>
        </section>

        {/* My Accounts */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted uppercase tracking-widest">My Accounts</p>
            <button onClick={() => setAccountOpen(true)} className="flex items-center gap-1 text-xs text-gold hover:opacity-80">
              <Plus size={13} /> Add
            </button>
          </div>
          <div className="border border-border rounded-2xl overflow-hidden" style={{ background: 'rgb(var(--c-surface))' }}>
            {accounts.length === 0 && (
              <p className="text-sm text-muted px-4 py-4">No accounts yet — add one above</p>
            )}
            {accounts.map(acc => {
              const cfg = accountStyle(acc)
              return (
                <div key={acc.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
                  {/* Bank logo (card and savings accounts get a corner badge) */}
                  <BankLogo st={cfg} size={36} />
                  {/* Bank name (primary) + descriptor (secondary) */}
                  <div className="flex-1 min-w-0">
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500, color: 'rgb(var(--c-text))' }}>
                      {acc.bank || acc.name}
                    </p>
                    {acc.name && acc.name !== acc.bank && (
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgb(var(--c-text-3))', marginTop: 1 }}>
                        {acc.name}
                      </p>
                    )}
                  </div>
                  {/* Default badge or set-default tap */}
                  {acc.is_default ? (
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgb(var(--c-accent) / 0.1)', color: 'rgb(var(--c-accent))', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>
                      Default
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetDefault(acc)}
                      style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'transparent', border: '0.5px solid rgb(var(--c-border-strong))', color: 'rgb(var(--c-text-3))', fontFamily: 'Inter, sans-serif', flexShrink: 0, cursor: 'pointer' }}
                    >
                      Set default
                    </button>
                  )}
                  {/* Edit */}
                  <button onClick={() => handleEditAccount(acc)}
                    className="p-1.5 rounded-lg hover:bg-surface-2 transition-colors flex-shrink-0">
                    <Edit2 size={14} className="text-subtle" />
                  </button>
                  {/* Delete */}
                  <button onClick={() => handleDeleteAccount(acc)}
                    className="p-1.5 rounded-lg hover:bg-danger/10 transition-colors flex-shrink-0">
                    <Trash2 size={14} className="text-subtle hover:text-danger" />
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        {/* Categories: what you sort transactions into. Amounts live on the Budget sheet. */}
        <section>
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs text-muted uppercase tracking-widest">Categories</p>
            <div className="flex items-center gap-3">
              <CategorySortToggle sort={catSort} onChange={setCatSort} />
              <button onClick={openAddCat} className="flex items-center gap-1 text-xs text-gold hover:opacity-80">
                <Plus size={13} /> Add
              </button>
            </div>
          </div>
          <button onClick={() => navigate('/budget')}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 mb-2 border border-border rounded-2xl tappable"
            style={{ background: 'rgb(var(--c-accent) / 0.08)' }}>
            <span className="text-sm text-left" style={{ fontFamily: 'Inter, sans-serif' }}>Budget amounts are set on the Budget screen</span>
            <span className="text-xs text-gold flex-shrink-0">Open →</span>
          </button>
          <div className="bg-surface-1 border border-border rounded-2xl overflow-hidden divide-y divide-border">
            {/* Always grouped by type, in the Budget sheet's order */}
            {TYPE_ORDER.flatMap(type => {
              const group = categories.filter(c => normaliseType(c.type) === type)
              if (!group.length) return []
              return [
                <p key={`h-${type}`} className="px-4 pt-3 pb-1 text-xs uppercase tracking-widest"
                  style={{ color: TYPE_TONE[type] || 'rgb(var(--c-text-3))', fontWeight: 600, background: 'rgb(var(--c-surface-2) / 0.5)' }}>
                  {TYPE_OPTIONS.find(o => o.value === type)?.label} · {group.length}
                </p>,
                ...sortCategories(group, catSort, c => parseFloat(c.budget_amount)).map(cat => (
              <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-lg w-7 text-center">{cat.icon || '💳'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{cat.name}</p>
                  <p className="text-xs" style={{ color: TYPE_TONE[normaliseType(cat.type)] || 'rgb(var(--c-text-3))' }}>
                    {TYPE_OPTIONS.find(o => o.value === normaliseType(cat.type))?.label || 'Unplanned'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditCat(cat)} className="p-1.5 rounded-lg hover:bg-surface-2 transition-colors">
                    <Edit2 size={13} className="text-muted" />
                  </button>
                  <button onClick={() => handleDeleteCat(cat)} aria-label={`Remove ${cat.name}`} title="Remove (can be restored)" className="p-1.5 rounded-lg hover:bg-danger/10 transition-colors">
                    <Trash2 size={13} className="text-muted hover:text-danger" />
                  </button>
                </div>
              </div>
                )),
              ]
            })}
            {categories.length === 0 && (
              <p className="text-sm text-muted px-4 py-4">No categories yet</p>
            )}
          </div>

          {/* Removed categories, kept so they can come back with their history */}
          {archivedCategories.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setArchivedOpen(o => !o)}
                aria-expanded={archivedOpen}
                className="w-full flex items-center justify-between px-1 py-1 text-xs text-muted"
              >
                <span>Removed ({archivedCategories.length}) — tap to restore</span>
                <ChevronDown size={14} style={{ transform: archivedOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              {archivedOpen && (
                <div className="bg-surface-1 border border-border rounded-2xl overflow-hidden divide-y divide-border mt-2">
                  {archivedCategories.map(cat => (
                    <div key={cat.id} className="flex items-center gap-3 px-4 py-3" style={{ opacity: 0.75 }}>
                      <span className="text-lg w-7 text-center">{cat.icon || '💳'}</span>
                      <p className="flex-1 min-w-0 text-sm font-medium truncate">{cat.name}</p>
                      <button
                        onClick={() => handleRestoreCat(cat)}
                        className="flex items-center gap-1 text-xs font-semibold text-gold px-2.5 py-1.5 rounded-lg hover:bg-gold/10"
                        aria-label={`Restore ${cat.name}`}
                      >
                        <RotateCcw size={12} /> Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Look */}
        <section>
          <p className="text-xs text-muted uppercase tracking-widest mb-2">Appearance</p>
          <ThemeSwitch />
        </section>

        {/* Biometric */}
        {biometricAvailable && (
          <section>
            <p className="text-xs text-muted uppercase tracking-widest mb-2">Security</p>
            <div className="border border-border rounded-2xl overflow-hidden" style={{ background: 'rgb(var(--c-surface))' }}>
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
                    background: biometricEnabled ? 'rgb(var(--c-negative) / 0.1)' : 'rgb(var(--c-accent) / 0.1)',
                    color: biometricEnabled ? 'rgb(var(--c-negative))' : 'rgb(var(--c-accent))',
                    border: `0.5px solid ${biometricEnabled ? 'rgb(var(--c-negative) / 0.2)' : 'rgb(var(--c-accent) / 0.2)'}`,
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
          <p className="text-xs" style={{ color: 'rgb(var(--c-text-4))', letterSpacing: '0.08em' }}>Crafted by PGV</p>
        </div>
      </div>

      {/* Add Account Sheet */}
      <BottomSheet open={accountOpen} onClose={() => { setAccountOpen(false); setEditingAccount(null) }} title={editingAccount ? "Edit Account" : "Add Account"}>
        <div className="px-5 space-y-4 pb-8">
          <div>
<label className="text-xs text-muted uppercase tracking-widest block mb-2">Descriptor <span style={{textTransform:'none',color:'rgb(var(--c-text-4))'}}>(optional)</span></label>
            <input
              type="text"
              placeholder="e.g. Cheque Account, Credit Card (optional)"
              value={accountForm.name}
              onChange={e => setAccountForm(f => ({ ...f, name: e.target.value }))}
              style={{ width: '100%', padding: '12px 16px', background: 'rgb(var(--c-surface-2))', border: '0.5px solid rgb(var(--c-border-strong))', borderRadius: 12, color: 'rgb(var(--c-text))', fontFamily: 'Inter, sans-serif', fontSize: 14, outline: 'none' }}
            />
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Bank</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {BANK_OPTIONS.map(bank => {
                const cfg = getAccountConfig(bank)
                const sel = accountForm.bank === bank
                return (
                  <button key={bank} onClick={() => setAccountForm(f => ({ ...f, bank }))}
                    style={{
                      padding: '7px 12px', borderRadius: 10, cursor: 'pointer',
                      border: `0.5px solid ${sel ? cfg.color : 'rgb(var(--c-border-strong))'}`,
                      background: sel ? cfg.bg : 'transparent',
                      color: sel ? cfg.color : 'rgb(var(--c-text-3))',
                      fontFamily: 'Inter, sans-serif', fontSize: 12,
                      transition: 'all 0.15s ease',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <BankLogo st={cfg} size={16} />
                    {bank}
                  </button>
                )
              })}
            </div>
          </div>
          <button
            onClick={handleAddAccount} disabled={savingAccount}
            style={{ width: '100%', padding: '14px 0', background: savingAccount ? 'rgb(var(--c-accent-dark))' : 'rgb(var(--c-accent))', borderRadius: 14, border: 'none', fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'rgb(var(--c-bg))', cursor: 'pointer' }}
          >
            {savingAccount ? 'Saving...' : editingAccount ? 'Save Changes' : 'Add Account'}
          </button>
        </div>
      </BottomSheet>

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
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Icon</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'rgb(var(--c-surface-2))', border: '0.5px solid rgb(var(--c-border-strong))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
              }}>
                {catForm.icon || '💳'}
              </div>
              <button
                onClick={() => setEmojiPickerOpen(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 10,
                  background: 'rgb(var(--c-surface-2))', border: '0.5px solid rgb(var(--c-border-strong))',
                  color: 'rgb(var(--c-accent))', fontFamily: 'Inter, sans-serif', fontSize: 13, cursor: 'pointer',
                }}
              >
                <Smile size={15} />
                {emojiPickerOpen ? 'Close picker' : 'Choose emoji'}
              </button>
            </div>
            {emojiPickerOpen && (
              <div style={{ marginTop: 10, borderRadius: 16, overflow: 'hidden', border: '0.5px solid rgb(var(--c-border))' }}>
                <Picker
                  data={data}
                  theme="dark"
                  onEmojiSelect={(emoji) => {
                    setCatForm(f => ({ ...f, icon: emoji.native }))
                    setEmojiPickerOpen(false)
                  }}
                  previewPosition="none"
                  skinTonePosition="none"
                  maxFrequentRows={2}
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Type</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TYPE_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setCatForm(f => ({ ...f, type: opt.value }))}
                  style={{
                    flex: '1 0 30%', padding: '8px 0', borderRadius: 10, cursor: 'pointer',
                    border: `0.5px solid ${catForm.type === opt.value ? 'rgb(var(--c-accent) / 0.5)' : 'rgb(var(--c-border-strong))'}`,
                    background: catForm.type === opt.value ? 'rgb(var(--c-accent) / 0.1)' : 'transparent',
                    color: catForm.type === opt.value ? 'rgb(var(--c-accent))' : 'rgb(var(--c-text-3))',
                    fontFamily: 'Inter, sans-serif', fontSize: 12,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgb(var(--c-text-4))', marginTop: 6 }}>
              Which section of the Budget screen it sits in. Once-off, debt and transfers stay out of the budget.
            </p>
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
