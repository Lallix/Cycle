// Auto-categorisation for imported statement lines.
// 1. The user's payee rules (cycle_payee_rules), lowest priority number first.
// 2. Otherwise the bank's own category, mapped onto the user's category names.

// Payee key: the description without card numbers, references and amounts,
// so "KFC Benoni (Card 8746)" and "KFC Benoni (Card 7132)" are the same payee.
export function payeeKey(description) {
  return description
    .toLowerCase()
    .replace(/\(card \d+\)/g, '')
    .replace(/\([^)]*\d{4,}[^)]*\)/g, '')     // (2996191924), (R6 000.00) …
    .replace(/\b(ref|reference)\b.*$/g, '')
    .replace(/\d{4,}/g, '')
    .replace(/[^a-z0-9&'*.\- ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Bank category → candidate names in the user's category list (first match wins).
const BANK_CATEGORY_MAP = {
  Groceries: ['Groceries'],
  Water: ['Groceries'],
  'Other Food': ['Groceries'],
  Takeaways: ['Eating out & takeaways', 'Eating Out', 'Takeaways'],
  Restaurants: ['Eating out & takeaways', 'Eating Out', 'Restaurants'],
  Fuel: ['Fuel & transport', 'Petrol', 'Fuel', 'Transport'],
  Parking: ['Fuel & transport', 'Transport'],
  'Vehicle Maintenance': ['Car maintenance & licence', 'Car maintenance', 'Transport'],
  'Vehicle Insurance': ['Insurance - Autogen', 'Insurance'],
  'Home Insurance': ['Insurance - Autogen', 'Insurance'],
  Electricity: ['Electricity'],
  'Municipal Bill': ['Municipal - Ekurhuleni', 'Municipal', 'Rates'],
  Internet: ['Internet & phone - Afrihost', 'Internet'],
  Cellphone: ['Internet & phone - Afrihost', 'Cellphone', 'Airtime'],
  'Digital Subscriptions': ['Subscriptions'],
  Alcohol: ['Liquor & vape', 'Entertainment'],
  Tobacco: ['Liquor & vape'],
  'Going Out': ['Entertainment & outings', 'Entertainment'],
  Activities: ['Entertainment & outings', 'Entertainment'],
  Movies: ['Entertainment & outings', 'Entertainment'],
  'Other Entertainment': ['Entertainment & outings', 'Entertainment'],
  'Sport & Hobbies': ['Entertainment & outings', 'Entertainment'],
  Holiday: ['Entertainment & outings', 'Travel'],
  'Clothing & Shoes': ['Clothing'],
  'Personal Care': ['Personal care & health', 'Medical'],
  Pharmacy: ['Personal care & health', 'Medical'],
  'Doctors & Therapists': ['Personal care & health', 'Medical'],
  Pets: ['Pets'],
  'Home Improvements': ['Home & garden'],
  'Home Maintenance': ['Home & garden'],
  Garden: ['Home & garden'],
  'Furniture & Appliances': ['Home & garden', 'Electronics & big purchases'],
  'Other Household': ['Household shopping'],
  Housekeeping: ['Household shopping'],
  'Other Personal & Family': ['Household shopping'],
  Education: ['School extras', 'Kids / School'],
  'Books/Stationery': ['School extras', 'Kids / School'],
  'Children & Dependants': ['Kids pocket money', 'Kids / School'],
  Gifts: ['Gifts & helping others', 'Gifts'],
  Donations: ['Gifts & helping others', 'Gifts'],
  'Online Store': ['Online shopping'],
  'Cash Withdrawal': ['Cash withdrawals'],
  Fees: ['Bank fees', 'Bank Charges'],
  Interest: ['Interest & credit fees'],
  Transfer: ['Own-account transfers', 'Transfers'],
  Savings: ['Own-account transfers', 'Savings'],
  'Account Payment Received': ['Own-account transfers'],
}

export function buildCategoriser(categories, rules) {
  const byName = new Map(categories.map(c => [c.name.toLowerCase(), c]))
  const compiled = rules
    .filter(r => r.is_active !== false)
    .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))
    .map(r => {
      try { return { ...r, re: new RegExp(r.pattern, 'i') } }
      catch { return null }                  // skip a rule with a broken pattern
    })
    .filter(Boolean)

  return function categorise(line, accountId) {
    const key = payeeKey(line.description)
    // A fee split off a purchase row (Capitec PDF) is a bank fee, not the payee's
    for (const r of line.splitFee ? [] : compiled) {
      if (r.account_id && r.account_id !== accountId) continue
      if (r.re.test(line.description) || r.re.test(key)) {
        return { categoryId: r.category_id, via: 'rule' }
      }
    }
    const candidates = line.isFee ? BANK_CATEGORY_MAP.Fees : BANK_CATEGORY_MAP[line.bankCategory]
    for (const name of candidates || []) {
      const cat = byName.get(name.toLowerCase())
      if (cat) return { categoryId: cat.id, via: 'bank' }
    }
    return { categoryId: null, via: null }
  }
}
