import { Select } from './ui/Select'
import { cn } from '../lib/cn'

type Filter = {
  label: string
  value: string
  onChange: (v: string) => void
  options: { label: string; value: string }[]
}

export default function PageHeader({
  title,
  subtitle,
  filters = [],
  right,
  className,
}: {
  title: string
  subtitle: string
  filters?: Filter[]
  right?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-2xl font-semibold tracking-tight">{title}</div>
          <div className="mt-1 text-sm text-muted">{subtitle}</div>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      {filters.length ? (
        <div className="grid gap-4 md:grid-cols-3">
          {filters.map((f) => (
            <Select key={f.label} label={f.label} value={f.value} onChange={f.onChange} options={f.options} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
