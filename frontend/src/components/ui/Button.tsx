import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white shadow-md hover:brightness-[1.06]',
  secondary: 'bg-primary-light text-primary hover:bg-primary-mid',
  ghost: 'bg-transparent text-text-secondary hover:bg-surface-2',
  outline: 'bg-surface text-text-primary border border-border hover:bg-surface-2',
  danger: 'bg-danger text-white hover:bg-red-700 shadow-sm',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-[15px] gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, leftIcon, rightIcon, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-sm font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        'disabled:opacity-60 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
})
