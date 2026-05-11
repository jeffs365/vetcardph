export function parseDateInput(value: string) {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid date value.')
  }

  return parsed
}

export function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function intervalToDays(value: number, unit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR') {
  switch (unit) {
    case 'DAY':
      return value
    case 'WEEK':
      return value * 7
    case 'MONTH':
      return value * 30
    case 'YEAR':
      return value * 365
  }
}

export function addInterval(date: Date, value: number, unit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR') {
  if (unit === 'DAY') {
    return addDays(date, value)
  }

  if (unit === 'WEEK') {
    return addDays(date, value * 7)
  }

  const result = new Date(date)
  const originalDay = result.getDate()

  result.setDate(1)

  if (unit === 'MONTH') {
    result.setMonth(result.getMonth() + value)
  } else {
    result.setFullYear(result.getFullYear() + value)
  }

  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
  result.setDate(Math.min(originalDay, lastDay))

  return result
}

export function startOfDay(date: Date) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

export function endOfDay(date: Date) {
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}
