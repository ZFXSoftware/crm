import { cn } from '../../lib/cn'

type Props = {
  tone?: 'green' | 'blue' | 'amber' | 'red' | 'gray' | 'purple'
  children: React.ReactNode
  className?: string
}

const tones: Record<NonNullable<Props['tone']>, string> = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  purple: 'bg-purple-50 text-purple-700 border-purple-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  red: 'bg-rose-50 text-rose-700 border-rose-100',
  gray: 'bg-slate-50 text-slate-700 border-slate-100',
}

export function Badge({ tone = 'gray', children, className }: Props) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium', tones[tone], className)}>
      {children}
    </span>
  )
}
