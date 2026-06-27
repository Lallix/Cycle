export function formatMoney(amount, compact = false) {
  const num = parseFloat(amount) || 0
  if (compact && Math.abs(num) >= 1000) {
    return `R ${(num / 1000).toFixed(1)}k`
  }
  return `R ${num.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const CATEGORY_ICONS = {
  Groceries: '🛒', Petrol: '⛽', 'Eating Out': '🍽️', Transport: '🚌',
  Entertainment: '🎬', Clothing: '👕', 'Kids / School': '🎒', Medical: '💊',
  Rent: '🏠', Insurance: '🛡️', Savings: '💰', Subscriptions: '📱',
  Gym: '🏋️', Travel: '✈️', Unbudgeted: '❓',
}

export function getCategoryIcon(name) {
  return CATEGORY_ICONS[name] || '💳'
}

export const ACCOUNT_CONFIG = {
  Capitec:   { color: '#007aff', bg: 'rgba(0,122,255,0.15)',    label: 'Capitec' },
  FNB:       { color: '#D4AF37', bg: 'rgba(212,175,55,0.15)',   label: 'FNB' },
  Absa:      { color: '#dc0032', bg: 'rgba(220,0,50,0.15)',     label: 'Absa' },
  Standard:  { color: '#0033a0', bg: 'rgba(0,51,160,0.15)',     label: 'Standard Bank' },
  Nedbank:   { color: '#007b40', bg: 'rgba(0,123,64,0.15)',     label: 'Nedbank' },
  Investec:  { color: '#002b5c', bg: 'rgba(0,43,92,0.15)',      label: 'Investec' },
  TymeBank:  { color: '#ff6200', bg: 'rgba(255,98,0,0.15)',     label: 'TymeBank' },
  Discovery: { color: '#7b2d8b', bg: 'rgba(123,45,139,0.15)',   label: 'Discovery' },
  African:   { color: '#c8a000', bg: 'rgba(200,160,0,0.15)',    label: 'African Bank' },
  Bidvest:   { color: '#555555', bg: 'rgba(85,85,85,0.15)',     label: 'Bidvest' },
  Cash:      { color: '#888888', bg: 'rgba(136,136,136,0.15)', label: 'Cash' },
}

export function getAccountConfig(account) {
  return ACCOUNT_CONFIG[account] || ACCOUNT_CONFIG.Cash
}

export function getProgressColor(pct) {
  if (pct >= 100) return '#FF6B6B'
  if (pct >= 80)  return '#FFB347'
  return '#3DD598'
}

export function getBudgetStatus(spent, budget) {
  if (!budget) return 'unbudgeted'
  const pct = (spent / budget) * 100
  if (pct >= 100) return 'over'
  if (pct >= 80)  return 'warning'
  return 'ok'
}

export const QUICK_AMOUNTS = [50, 100, 200, 500]

export const EMOJI_OPTIONS = [
  '🛒','⛽','🍽️','🚌','🎬','👕','🎒','💊','🏠','📱',
  '✈️','🎮','📺','🏋️','☕','💳','🛡️','💰','❓','🎁',
]

export const COLOR_OPTIONS = [
  '#D4AF37','#3DD598','#FF6B6B','#FFB347','#9B59B6',
  '#E91E63','#00BCD4','#4CAF50','#FF9800','#607D8B',
]

export function getGreeting(name) {
  const h = new Date().getHours()
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  return name ? `${greet}, ${name.split(' ')[0]}` : greet
}

export function formatRelativeDate(dateStr) {
  if (!dateStr) return ''
  const date  = new Date(dateStr)
  const today = new Date()
  const diff  = Math.floor((today - date) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7)   return `${diff} days ago`
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

export function formatOrdinal(n) {
  const s = ['th','st','nd','rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
