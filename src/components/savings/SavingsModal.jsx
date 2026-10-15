import { useState } from 'react'
import { useBudget } from '../../context/BudgetContext'
import { useToast } from '../ui/Toast'
import { formatMoney } from '../../lib/format'
import BottomSheet from '../ui/BottomSheet'
import { Plus, ChevronRight, ArrowLeft } from 'lucide-react'
import { differenceInDays } from 'date-fns'

const ICONS = ['🎯', '🏠', '✈️', '🚗', '💍', '📱', '🎓', '🏖️', '💰', '🌍', '🏋️', '🎸', '🏥', '👶', '🐕']
const QUICK = [100, 250, 500, 1000]

function RingMini({ pct = 0 }) {
  const r = 28, circ = 2 * Math.PI * r
  const offset = circ - (Math.min(pct, 100) / 100) * circ
  return (
    <svg width="64" height="64" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r={r} fill="none" stroke="#26262B" strokeWidth="5" />
      <circle cx="32" cy="32" r={r} fill="none" stroke="#E8C36A" strokeWidth="5"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 32 32)"
        style={{ filter: 'drop-shadow(0 0 0 0 transparent)' }}
      />
      <text x="32" y="37" textAnchor="middle"
        style={{ fontFamily: 'Poppins, sans-serif', fontSize: 11, fontWeight: 500, fill: '#E8C36A' }}>
        {Math.round(pct)}%
      </text>
    </svg>
  )
}

export default function SavingsModal({ open, onClose }) {
  const { savingGoals, addSavingGoal, contributeSavings, totals } = useBudget()
  const toast = useToast()

  const [view, setView]               = useState('list')
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [loading, setLoading]         = useState(false)
  const [goalForm, setGoalForm]       = useState({ name: '', icon: '🎯', target: '', targetDate: '' })
  const [amount, setAmount]           = useState('')

  function handleClose() {
    setView('list'); setSelectedGoal(null)
    setGoalForm({ name: '', icon: '🎯', target: '', targetDate: '' })
    setAmount('')
    onClose()
  }

  async function handleAddGoal() {
    if (!goalForm.name.trim() || !goalForm.target) {
      toast('Name and target amount are required', 'error'); return
    }
    setLoading(true)
    try {
      await addSavingGoal({
        name:          goalForm.name.trim(),
        icon:          goalForm.icon,
        target_amount: parseFloat(goalForm.target),
        target_date:   goalForm.targetDate || null,
      })
      toast('Goal created ✓', 'success')
      setView('list')
      setGoalForm({ name: '', icon: '🎯', target: '', targetDate: '' })
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleContribute() {
    if (!selectedGoal || !amount || parseFloat(amount) <= 0) {
      toast('Enter an amount', 'error'); return
    }
    setLoading(true)
    try {
      await contributeSavings(selectedGoal.id, parseFloat(amount))
      toast(`${formatMoney(amount)} added to ${selectedGoal.name} ✓`, 'success')
      setView('list'); setSelectedGoal(null); setAmount('')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const titleMap = {
    list: 'Savings goals',
    add: 'New goal',
    contribute: selectedGoal ? `Add to ${selectedGoal.name}` : 'Contribute',
  }

  const inputStyle = {
    width: '100%', padding: '13px 16px',
    background: '#1F1F23', border: '0.5px solid #34343A',
    borderRadius: 12, color: '#F4F4F5',
    fontFamily: 'Inter, sans-serif', fontSize: 14,
    outline: 'none',
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title={titleMap[view]}>
      <div style={{ padding: '0 20px 32px' }}>

        {/* ── LIST ── */}
        {view === 'list' && (
          <>
            {/* Total */}
            <div style={{
              background: '#1F1F23', borderRadius: 16, border: '0.5px solid #34343A',
              padding: '14px 16px', marginBottom: 16,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#8B8B93', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  Total saved
                </p>
                <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 24, fontWeight: 500, color: '#E8C36A' }}>
                  {formatMoney(totals.savingsTotal)}
                </p>
              </div>
              <button
                onClick={() => setView('add')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 10,
                  background: 'rgba(232,195,106,0.1)', border: '0.5px solid rgba(232,195,106,0.25)',
                  color: '#E8C36A', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} /> New goal
              </button>
            </div>

            {/* Goals */}
            {savingGoals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#8B8B93' }}>
                  No savings goals yet
                </p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#5A5A62', marginTop: 6 }}>
                  Tap "New goal" to get started
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {savingGoals.map(goal => {
                  const pct = goal.target_amount > 0
                    ? (goal.current_amount / goal.target_amount) * 100 : 0
                  const daysLeft = goal.target_date
                    ? differenceInDays(new Date(goal.target_date), new Date()) : null

                  return (
                    <button
                      key={goal.id}
                      onClick={() => { setSelectedGoal(goal); setView('contribute') }}
                      style={{
                        width: '100%', textAlign: 'left', cursor: 'pointer',
                        background: '#1F1F23', borderRadius: 16, border: '0.5px solid #34343A',
                        padding: '14px 16px',
                        display: 'flex', alignItems: 'center', gap: 14,
                        transition: 'border-color 0.15s ease',
                      }}
                    >
                      <RingMini pct={pct} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500, color: '#F4F4F5', marginBottom: 3 }}>
                          {goal.icon} {goal.name}
                        </p>
                        <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 12, color: '#E8C36A' }}>
                          {formatMoney(goal.current_amount)}
                          <span style={{ color: '#8B8B93', fontWeight: 400 }}> / {formatMoney(goal.target_amount)}</span>
                        </p>
                        {daysLeft !== null && (
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#8B8B93', marginTop: 2 }}>
                            {daysLeft > 0 ? `${daysLeft} days to target` : 'Past target date'}
                          </p>
                        )}
                      </div>
                      <ChevronRight size={16} color="#5A5A62" />
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── ADD GOAL ── */}
        {view === 'add' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Icon picker */}
            <div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#8B8B93', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Icon
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ICONS.map(ic => (
                  <button
                    key={ic}
                    onClick={() => setGoalForm(f => ({ ...f, icon: ic }))}
                    style={{
                      width: 44, height: 44, borderRadius: 12, fontSize: 22,
                      border: `0.5px solid ${goalForm.icon === ic ? 'rgba(232,195,106,0.5)' : '#34343A'}`,
                      background: goalForm.icon === ic ? 'rgba(232,195,106,0.1)' : '#1F1F23',
                      cursor: 'pointer', transition: 'all 0.15s ease',
                    }}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#8B8B93', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Goal name
              </p>
              <input
                type="text" placeholder="Emergency fund, Holiday..."
                value={goalForm.name}
                onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))}
                style={inputStyle}
              />
            </div>

            <div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#8B8B93', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Target amount
              </p>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontFamily: 'Poppins, sans-serif', color: '#8B8B93' }}>R</span>
                <input
                  type="number" inputMode="decimal" placeholder="0.00"
                  value={goalForm.target}
                  onChange={e => setGoalForm(f => ({ ...f, target: e.target.value }))}
                  style={{ ...inputStyle, paddingLeft: 32 }}
                />
              </div>
            </div>

            <div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#8B8B93', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Target date <span style={{ textTransform: 'none', color: '#5A5A62' }}>(optional)</span>
              </p>
              <input
                type="date" value={goalForm.targetDate}
                onChange={e => setGoalForm(f => ({ ...f, targetDate: e.target.value }))}
                style={{ ...inputStyle, colorScheme: 'dark' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                onClick={() => setView('list')}
                style={{ ...inputStyle, flex: 1, textAlign: 'center', color: '#8B8B93', cursor: 'pointer', padding: '13px 0' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddGoal}
                disabled={loading}
                style={{
                  flex: 1, padding: '13px 0', background: loading ? '#C9A24E' : '#E8C36A',
                  borderRadius: 12, border: 'none', fontFamily: 'Poppins, sans-serif',
                  fontSize: 14, fontWeight: 600, color: '#0E0E10', cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {loading ? 'Creating...' : 'Create goal'}
              </button>
            </div>
          </div>
        )}

        {/* ── CONTRIBUTE ── */}
        {view === 'contribute' && selectedGoal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Goal summary */}
            <div style={{
              background: '#1F1F23', borderRadius: 14, border: '0.5px solid #34343A',
              padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <RingMini pct={selectedGoal.target_amount > 0
                ? (selectedGoal.current_amount / selectedGoal.target_amount) * 100 : 0} />
              <div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500, color: '#F4F4F5', marginBottom: 3 }}>
                  {selectedGoal.icon} {selectedGoal.name}
                </p>
                <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 12, color: '#E8C36A' }}>
                  {formatMoney(selectedGoal.current_amount)}
                  <span style={{ color: '#8B8B93', fontWeight: 400 }}> / {formatMoney(selectedGoal.target_amount)}</span>
                </p>
              </div>
            </div>

            {/* Amount */}
            <div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#8B8B93', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Amount to add
              </p>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontFamily: 'Poppins, sans-serif', fontSize: 18, color: '#8B8B93' }}>R</span>
                <input
                  type="number" inputMode="decimal" placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  autoFocus
                  style={{ ...inputStyle, paddingLeft: 32, fontSize: 20, fontFamily: 'Poppins, sans-serif' }}
                />
              </div>
            </div>

            {/* Quick amounts */}
            <div style={{ display: 'flex', gap: 8 }}>
              {QUICK.map(q => (
                <button
                  key={q}
                  onClick={() => setAmount(String(q))}
                  style={{
                    flex: 1, padding: '8px 0', textAlign: 'center',
                    background: '#1F1F23', border: '0.5px solid #34343A',
                    borderRadius: 10, color: '#A1A1AA',
                    fontFamily: 'Poppins, sans-serif', fontSize: 12, cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  R{q}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setView('list'); setSelectedGoal(null); setAmount('') }}
                style={{ ...inputStyle, flex: 1, textAlign: 'center', color: '#8B8B93', cursor: 'pointer', padding: '13px 0' }}
              >
                Back
              </button>
              <button
                onClick={handleContribute}
                disabled={loading}
                style={{
                  flex: 1, padding: '13px 0', background: loading ? '#C9A24E' : '#E8C36A',
                  borderRadius: 12, border: 'none', fontFamily: 'Poppins, sans-serif',
                  fontSize: 14, fontWeight: 600, color: '#0E0E10', cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {loading ? 'Adding...' : 'Add funds'}
              </button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
