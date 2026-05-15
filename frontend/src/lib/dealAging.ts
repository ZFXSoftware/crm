export function daysInStage(date?: string) {
  if (!date) return 0

  const parsed = new Date(date)

  if (isNaN(parsed.getTime())) return 0

  const now = Date.now()

  return Math.max(
    0,
    Math.floor(
      (now - parsed.getTime()) /
      (1000 * 60 * 60 * 24)
    )
  )
}

export function agingClasses(days: number) {
  if (days >= 10) {
    return 'text-red-600'
  }

  if (days >= 5) {
    return 'text-yellow-600'
  }

  return 'text-green-600'
}