import { cn } from '../../lib/cn'
import { ChevronDown } from 'lucide-react'

type Option = { label: string; value: string }
type Props = {
  label: string
  value: string
  onChange: (v: string) => void
  options: Option[]
  className?: string
}

export function Select({ label, value, onChange, options, className }: Props) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-border bg-white" />
        <span>{label}</span>
      </div>

      <div className="relative">
        <select
          className="h-10 w-full appearance-none rounded-full border border-border bg-white px-4 pr-10 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </div>
    </div>
  )
}
