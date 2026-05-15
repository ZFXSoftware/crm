export function priorityClasses(priority: string) {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-700 border-red-200'

    case 'medium':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'

    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}