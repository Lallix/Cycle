import {
  startOfDay,
  endOfDay,
  addMonths,
  subMonths,
  getDaysInMonth,
  differenceInDays,
  format,
  isWithinInterval,
  isBefore,
  isAfter,
  parseISO,
  getDate,
  getMonth,
  getYear,
  setDate,
} from 'date-fns'

/**
 * Get the current budget cycle based on start day
 * Budget cycles are NOT calendar months — they run from day N of month M to day N-1 of month M+1
 */
export function getCurrentCycle(cycleStartDay = 25, referenceDate = new Date()) {
  const today = startOfDay(referenceDate)
  const day = getDate(today)
  const startDay = parseInt(cycleStartDay, 10)

  let cycleStart, cycleEnd

  if (day >= startDay) {
    // We're in the current cycle that started this month
    cycleStart = startOfDay(setDate(today, startDay))
    const nextMonth = addMonths(today, 1)
    cycleEnd = startOfDay(setDate(nextMonth, startDay - 1))
  } else {
    // We're in the cycle that started last month
    const prevMonth = subMonths(today, 1)
    cycleStart = startOfDay(setDate(prevMonth, startDay))
    cycleEnd = startOfDay(setDate(today, startDay - 1))
  }

  const totalDays = differenceInDays(cycleEnd, cycleStart) + 1
  const dayOfCycle = differenceInDays(today, cycleStart) + 1
  const daysRemaining = Math.max(0, differenceInDays(cycleEnd, today))

  return {
    start: cycleStart,
    end: cycleEnd,
    totalDays,
    dayOfCycle,
    daysRemaining,
    label: `${format(cycleStart, 'd MMM')} → ${format(cycleEnd, 'd MMM')} · Day ${dayOfCycle} of ${totalDays}`,
    shortLabel: `${format(cycleStart, 'd MMM')} – ${format(cycleEnd, 'd MMM')}`,
    key: format(cycleStart, 'yyyy-MM'), // Used for paid_this_cycle tracking
  }
}

/**
 * Get the previous budget cycle
 */
export function getPreviousCycle(cycleStartDay = 25, referenceDate = new Date()) {
  const prevMonth = subMonths(referenceDate, 1)
  return getCurrentCycle(cycleStartDay, prevMonth)
}

/**
 * Get last N cycles (most recent first)
 */
export function getLastNCycles(n = 6, cycleStartDay = 25) {
  const cycles = []
  const today = new Date()

  for (let i = 0; i < n; i++) {
    const ref = subMonths(today, i)
    // Adjust reference date to be within the cycle we want
    const adjustedRef = i === 0 ? today : setDate(ref, cycleStartDay)
    cycles.push(getCurrentCycle(cycleStartDay, adjustedRef))
  }

  return cycles
}

/**
 * Check if a date falls within a given cycle
 */
export function isInCycle(date, cycle) {
  const d = typeof date === 'string' ? parseISO(date) : date
  return isWithinInterval(startOfDay(d), {
    start: cycle.start,
    end: cycle.end
  })
}

/**
 * Get the next due date for a recurring expense
 */
export function getNextDueDate(dueDay, cycle) {
  const today = startOfDay(new Date())
  const startDay = parseInt(dueDay, 10)

  // Try this cycle's month
  let candidateDate = startOfDay(setDate(cycle.start, startDay))

  // If the candidate is before cycle start, push to next month
  if (isBefore(candidateDate, cycle.start)) {
    candidateDate = startOfDay(setDate(addMonths(cycle.start, 1), startDay))
  }

  // If the candidate is after cycle end, return it anyway (next cycle)
  return candidateDate
}

/**
 * Get upcoming bills within the next N days from today
 */
export function getUpcomingDays(recurringExpenses, cycle, days = 7) {
  const today = startOfDay(new Date())
  const cutoff = addMonths(today, 0)

  return recurringExpenses
    .filter(exp => exp.active && !exp.paid_this_cycle)
    .map(exp => {
      const dueDate = getNextDueDate(exp.due_day, cycle)
      const daysUntil = differenceInDays(dueDate, today)
      return { ...exp, dueDate, daysUntil }
    })
    .filter(exp => exp.daysUntil >= 0 && exp.daysUntil <= days)
    .sort((a, b) => a.daysUntil - b.daysUntil)
}

/**
 * Calculate daily safe spend
 * (remaining budget ÷ days remaining in cycle)
 */
export function calcDailySafeSpend(remaining, daysRemaining) {
  if (daysRemaining <= 0) return 0
  return Math.max(0, remaining / daysRemaining)
}

/**
 * Format a cycle key from a date
 */
export function getCycleKey(date = new Date()) {
  return format(date, 'yyyy-MM')
}
