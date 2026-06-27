/**
 * Format currency in ZAR
 */
export function formatMoney(amount, currency = 'ZAR', compact = false) {
  if (amount === null || amount === undefined) return 'R0'
  const num = parseFloat(amount)
  if (isNaN(num)) return 'R0'

  if (compact && Math.abs(num) >= 1000) {
    return `R${(num / 1000).toFixed(1)}k`
  }

  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Format compact money (removes trailing zeros for whole amounts)
 */
export function formatMoneyCompact(amount) {
  const num = parseFloat(amount)
  if (isNaN(num)) return 'R0'
  if (num === Math.floor(num)) {
    return `R${num.toLocaleString('en-ZA')}`
  }
  return formatMoney(amount)
}

/**
 * Category icon map
 */
export const CATEGORY_ICONS = {
  'Groceries': '🛒',
  'Transport': '🚌',
  'Transport / OV': '🚌',
  'Eating Out': '🍽️',
  'Entertainment': '🎬',
  'Clothing': '👗',
  'Kids / School': '🎒',
  'Medical': '💊',
  'Petrol / Fuel': '⛽',
  'General': '💳',
  'Fixed Expenses': '🔒',
  'Rent': '🏠',
  'Medical Aid': '❤️',
  'Bank Charges': '🏦',
  'Netflix': '📺',
  'Xbox': '🎮',
  'Internet': '📡',
  'School Fees': '📚',
  'Electricity': '⚡',
  'Bond': '🏡',
  'Savings': '💰',
  'Income': '💵',
}

/**
 * Get icon for category (fallback to emoji)
 */
export function getCategoryIcon(name) {
  return CATEGORY_ICONS[name] || '💳'
}

/**
 * Account colors and icons
 */
export const ACCOUNT_CONFIG = {
  Capitec: { color: '#3DD598', bg: 'rgba(61,213,152,0.15)', label: 'Capitec' },
  FNB: { color: '#D4AF37', bg: 'rgba(212,175,55,0.15)', label: 'FNB' },
  Cash: { color: '#888888', bg: 'rgba(136,136,136,0.15)', label: 'Cash' },
}

/**
 * Get account badge styles
 */
export function getAccountConfig(account) {
  return ACCOUNT_CONFIG[account] || ACCOUNT_CONFIG.Cash
}

/**
 * Progress bar color based on percentage
 */
export function getProgressColor(percentage) {
  if (percentage >= 100) return '#FF6B6B'  // danger
  if (percentage >= 80) return '#FFB347'   // warning
  return '#3DD598'                          // success
}

/**
 * Get status color for budget
 */
export function getBudgetStatus(spent, budget) {
  if (!budget) return 'none'
  const pct = (spent / budget) * 100
  if (pct >= 100) return 'over'
  if (pct >= 80) return 'warning'
  return 'ok'
}

/**
 * Available emoji icons for categories
 */
export const EMOJI_OPTIONS = [
  '🛒', '🍽️', '🚌', '🎬', '👗', '🎒', '💊', '⛽',
  '🏠', '💳', '📱', '✈️', '🎮', '📺', '🏋️', '☕',
  '🐾', '🎵', '📚', '🛠️', '💰', '🎁', '🏥', '🏦',
  '⚡', '📡', '🌐', '🍕', '🚗', '🏡', '❤️', '🎯',
]

/**
 * Available colors for categories
 */
export const COLOR_OPTIONS = [
  '#D4AF37', '#3DD598', '#FF6B6B', '#FFB347',
  '#9B59B6', '#E91E63', '#00BCD4', '#4CAF50',
  '#FF9800', '#2196F3', '#795548', '#607D8B',
]

/**
 * Format a date relative to now
 */
export function formatRelativeDate(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24))

  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff} days ago`

  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

/**
 * Format due day as ordinal
 */
export function formatOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/**
 * Quick amount presets
 */
export const QUICK_AMOUNTS = [50, 100, 200, 500]

/**
 * Truncate text
 */
export function truncate(str, length = 24) {
  if (!str) return ''
  return str.length > length ? str.substring(0, length) + '…' : str
}

/**
 * Generate a greeting based on time of day
 */
export function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
