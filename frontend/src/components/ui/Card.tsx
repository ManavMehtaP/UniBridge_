import { cn } from '@/lib/utils'

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-card border border-border bg-surface shadow-card', className)}
      {...props}
    />
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-5', className)}>
      <div>
        {title && <h3 className="text-[17px] font-semibold text-text-primary">{title}</h3>}
        {subtitle && <p className="mt-1 text-xs text-text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />
}
