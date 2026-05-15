import { cn } from '../../lib/cn'

export function Card(props: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn('rounded-card border border-border bg-surface shadow-soft', props.className)}
    >
      {props.children}
    </div>
  )
}

export function CardHeader(props: React.PropsWithChildren<{ className?: string }>) {
  return <div className={cn('px-6 pt-5', props.className)}>{props.children}</div>
}

export function CardTitle(props: React.PropsWithChildren<{ className?: string }>) {
  return <div className={cn('text-sm font-semibold text-slate-900', props.className)}>{props.children}</div>
}

export function CardSubtitle(props: React.PropsWithChildren<{ className?: string }>) {
  return <div className={cn('mt-1 text-xs text-muted', props.className)}>{props.children}</div>
}

export function CardContent(props: React.PropsWithChildren<{ className?: string }>) {
  return <div className={cn('px-6 pb-5', props.className)}>{props.children}</div>
}
