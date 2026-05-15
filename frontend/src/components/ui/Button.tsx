import { cn } from '../../lib/cn'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost'
  size?: 'sm' | 'md'
}

export function Button({ className, variant = 'primary', size = 'md', ...rest }: Props) {
  const base =
    'inline-flex items-center justify-center rounded-full font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60 disabled:cursor-not-allowed'
  const variants: Record<string, string> = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800',
    ghost: 'bg-transparent text-slate-900 hover:bg-slate-100',
  }
  const sizes: Record<string, string> = {
    sm: 'h-8 px-4 text-xs',
    md: 'h-9 px-5 text-sm',
  }
  return <button className={cn(base, variants[variant], sizes[size], className)} {...rest} />
}
