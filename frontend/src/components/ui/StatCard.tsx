import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from './Card'

type Trend = 'up' | 'down' | 'neutral'

export interface StatCardProps {
  value: React.ReactNode
  label: string
  icon?: React.ReactNode
  iconBg?: string
  delta?: string
  trend?: Trend
  className?: string
}

// Delta pill: green for up, red for down, muted for flat — reads at a glance without shouting.
const trendPill: Record<Trend, string> = {
  up: 'bg-success-light text-success',
  down: 'bg-danger-light text-danger',
  neutral: 'bg-surface-2 text-text-muted',
}
const TrendIcon = { up: TrendingUp, down: TrendingDown, neutral: Minus }

export function StatCard({ value, label, icon, iconBg, delta, trend = 'neutral', className }: StatCardProps) {
  const Icon = TrendIcon[trend]
  return (
    <Card className={cn('p-4 transition-shadow hover:shadow-md', className)}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl font-bold tracking-tight text-text-primary">{value}</div>
          <div className="mt-0.5 text-xs font-medium text-text-secondary">{label}</div>
        </div>
        {icon && (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-sm"
            style={{ background: iconBg ?? 'var(--primary-light)' }}
          >
            {icon}
          </div>
        )}
      </div>
      {delta && (
        <div className="mt-3">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', trendPill[trend])}>
            <Icon size={12} /> {delta}
          </span>
        </div>
      )}
    </Card>
  )
}
