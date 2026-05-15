import { cn } from '../../lib/cn'

type Props = {
  open: boolean
  title: string
  subtitle?: string
  children: React.ReactNode
  onClose: () => void
  footer?: React.ReactNode
}

export function Modal({ open, title, subtitle, children, onClose, footer }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-card border border-border bg-white shadow-soft">
        <div className="px-6 pt-5">
          <div className="text-sm font-semibold">{title}</div>
          {subtitle ? <div className="mt-1 text-xs text-muted">{subtitle}</div> : null}
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer ? <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  )
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'h-10 w-full rounded-full border border-border bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-slate-200',
        props.className,
      )}
    />
  )
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        'w-full rounded-card border border-border bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-200',
        props.className,
      )}
    />
  )
}
