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

// Logos come from each bank's own website (public/banks).
const LOGO = name => `${import.meta.env?.BASE_URL ?? '/'}banks/${name}`

export const ACCOUNT_CONFIG = {
  Capitec:   { color: '#2F7BFF', bg: 'rgba(47,123,255,0.16)',   label: 'Capitec',       logo: LOGO('capitec.svg') },
  FNB:       { color: 'rgb(var(--c-accent))', bg: 'rgba(212,175,55,0.15)',   label: 'FNB', logo: LOGO('fnb.svg') },
  Absa:      { color: '#dc0032', bg: 'rgba(220,0,50,0.15)',     label: 'Absa',          logo: LOGO('absa.png') },
  Standard:  { color: '#0033a0', bg: 'rgba(0,51,160,0.15)',     label: 'Standard Bank', logo: LOGO('standard.png') },
  Nedbank:   { color: '#007b40', bg: 'rgba(0,123,64,0.15)',     label: 'Nedbank',       logo: LOGO('nedbank.svg') },
  Investec:  { color: '#002b5c', bg: 'rgba(0,43,92,0.15)',      label: 'Investec',      logo: LOGO('investec.png') },
  TymeBank:  { color: '#ff6200', bg: 'rgba(255,98,0,0.15)',     label: 'TymeBank',      logo: LOGO('gotyme.png') },
  Discovery: { color: '#7b2d8b', bg: 'rgba(123,45,139,0.15)',   label: 'Discovery',     logo: LOGO('discovery.png') },
  African:   { color: '#c8a000', bg: 'rgba(200,160,0,0.15)',    label: 'African Bank',  logo: LOGO('african.png') },
  Bidvest:   { color: '#555555', bg: 'rgba(85,85,85,0.15)',     label: 'Bidvest',       logo: LOGO('bidvest.png') },
  Cash:      { color: '#888888', bg: 'rgba(136,136,136,0.15)', label: 'Cash' },
}

export function getAccountConfig(account) {
  return ACCOUNT_CONFIG[account] || ACCOUNT_CONFIG.Cash
}

// Credit cards are red whatever the bank, so card spend stands out.
const CREDIT_CARD = { color: '#FF4D5E', bg: 'rgba(255,77,94,0.16)' }

// Colour and label for an account record (cycle_accounts row).
export function accountStyle(acc) {
  if (!acc) return ACCOUNT_CONFIG.Cash
  const bankCfg = getAccountConfig(acc.bank || acc.name)
  if (acc.kind === 'credit_card') {
    return { ...CREDIT_CARD, logo: bankCfg.logo, kind: acc.kind, label: `${bankCfg.label === 'Cash' ? acc.name : bankCfg.label} card` }
  }
  return { ...bankCfg, kind: acc.kind, label: bankCfg === ACCOUNT_CONFIG.Cash ? acc.name : bankCfg.label }
}

// Colour and label for a transaction: by its linked account when there is
// one (imports), otherwise by the account name typed on it.
export function accountStyleForTx(tx, accounts = []) {
  const acc = tx.account_id && accounts.find(a => a.id === tx.account_id)
  return acc ? accountStyle(acc) : getAccountConfig(tx.account)
}

export function getProgressColor(pct) {
  if (pct >= 100) return 'rgb(var(--c-negative))'
  if (pct >= 80)  return 'rgb(var(--c-warning))'
  return 'rgb(var(--c-positive))'
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
  'rgb(var(--c-accent))','rgb(var(--c-positive))','rgb(var(--c-negative))','rgb(var(--c-warning))','#9B59B6',
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
