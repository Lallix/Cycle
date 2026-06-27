import {
  startOfDay, addMonths, subMonths,
  differenceInDays, format, isWithinInterval,
  isBefore, parseISO, getDate, setDate,
} from 'date-fns'

export function getCurrentCycle(cycleStartDay = 25, referenceDate = new Date()) {
  const today    = startOfDay(referenceDate)
  const day      = getDate(today)
  const startDay = parseInt(cycleStartDay, 10)

  let cycleStart, cycleEnd

  if (day >= startDay) {
    cycleStart = startOfDay(setDate(today, startDay))
    cycleEnd   = startOfDay(setDate(addMonths(today, 1), startDay - 1))
  } else {
    const prev = subMonths(today, 1)
    cycleStart = startOfDay(setDate(prev, startDay))
    cycleEnd   = startOfDay(setDate(today, startDay - 1))
  }

  const totalDays     = differenceInDays(cycleEnd, cycleStart) + 1
  const dayOfCycle    = differenceInDays(today, cycleStart) + 1
  const daysRemaining = Math.max(0, differenceInDays(cycleEnd, today))

  return {
    start: cycleStart,
    end:   cycleEnd,
    totalDays,
    dayOfCycle,
    daysRemaining,
    label:      `${format(cycleStart, 'd MMM')} → ${format(cycleEnd, 'd MMM')} · Day ${dayOfCycle} of ${totalDays}`,
    shortLabel: `${format(cycleStart, 'd MMM')} – ${format(cycleEnd, 'd MMM')}`,
    key: format(cycleStart, 'yyyy-MM-dd'),   // full ISO date — matches Postgres date column
  }
}

export function getPreviousCycle(cycleStartDay = 25, referenceDate = new Date()) {
  return getCurrentCycle(cycleStartDay, subMonths(referenceDate, 1))
}

export function getLastNCycles(n = 6, cycleStartDay = 25) {
  const today  = new Date()
  return Array.from({ length: n }, (_, i) => {
    const ref = i === 0 ? today : setDate(subMonths(today, i), cycleStartDay)
    return getCurrentCycle(cycleStartDay, ref)
  })
}

export function isInCycle(date, cycle) {
  const d = typeof date === 'string' ? parseISO(date) : date
  return isWithinInterval(startOfDay(d), { start: cycle.start, end: cycle.end })
}

export function getNextDueDate(dueDay, cycle) {
  const startDay = parseInt(dueDay, 10)
  let candidate  = startOfDay(setDate(cycle.start, startDay))
  if (isBefore(candidate, cycle.start)) {
    candidate = startOfDay(setDate(addMonths(cycle.start, 1), startDay))
  }
  return candidate
}

export function getUpcomingDays(recurringExpenses, cycle, days = 7) {
  const today = startOfDay(new Date())
  return recurringExpenses
    .filter(e => e.is_active)
    .map(e => {
      const dueDate   = getNextDueDate(e.due_day, cycle)
      const daysUntil = differenceInDays(dueDate, today)
      return { ...e, dueDate, daysUntil }
    })
    .filter(e => e.daysUntil >= 0 && e.daysUntil <= days)
    .sort((a, b) => a.daysUntil - b.daysUntil)
}

export function calcDailySafeSpend(remaining, daysRemaining) {
  if (daysRemaining <= 0) return 0
  return Math.max(0, remaining / daysRemaining)
}

export function getCycleKey(date = new Date(), cycleStartDay = 25) {
  return getCurrentCycle(cycleStartDay, date).key
}
