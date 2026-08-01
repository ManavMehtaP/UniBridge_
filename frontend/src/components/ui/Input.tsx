import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode
  invalid?: boolean
  label?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, leftIcon, invalid, label, ...props },
  ref,
) {
  const field = (
    <div className="relative flex items-center">
      {leftIcon && (
        <span className="pointer-events-none absolute left-3 text-text-muted">{leftIcon}</span>
      )}
      <input
        ref={ref}
        className={cn(
          'h-10 w-full rounded-sm border bg-surface px-3 text-sm text-text-primary',
          'placeholder:text-text-muted transition-colors outline-none',
          'focus:border-primary focus:ring-4 focus:ring-primary/10',
          leftIcon && 'pl-10',
          invalid ? 'border-danger' : 'border-border',
          className,
        )}
        {...props}
      />
    </div>
  )
  if (!label) return field
  // Wrapping <label> focuses the input on click — no htmlFor wiring needed.
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</span>
      {field}
    </label>
  )
})
