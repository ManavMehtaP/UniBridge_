import { BookOpen, Circle, Flag, Plane, PartyPopper, PenLine, Sparkles, Sun, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { HodCalendarEvent } from '@/types/hod'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// One place that decides how every event type looks: a soft tinted chip, a colour dot,
// an icon and a human label — reused by the grid, the legend and the side panels.
export const EVENT_META: Record<HodCalendarEvent['type'], { label: string; icon: LucideIcon; chip: string; dot: string }> = {
  REGULAR_TEACHING: { label: 'Regular Teaching', icon: BookOpen, chip: 'bg-success-light text-success', dot: 'bg-success' },
  EXAM: { label: 'Exam', icon: PenLine, chip: 'bg-warning-light text-warning', dot: 'bg-warning' },
  PUBLIC_HOLIDAY: { label: 'Public Holiday', icon: PartyPopper, chip: 'bg-danger-light text-danger', dot: 'bg-danger' },
  HOLIDAY: { label: 'Holiday', icon: Sun, chip: 'bg-success-light text-success', dot: 'bg-success' },
  READING_HOLIDAY: { label: 'Reading Day', icon: BookOpen, chip: 'bg-teal-light text-teal', dot: 'bg-teal' },
  SEMESTER_BREAK: { label: 'Break', icon: Plane, chip: 'bg-purple-light text-purple', dot: 'bg-purple' },
  CULTURAL: { label: 'Cultural', icon: Sparkles, chip: 'bg-purple-light text-purple', dot: 'bg-purple' },
  ACTIVITY: { label: 'Activity', icon: Zap, chip: 'bg-primary-light text-primary', dot: 'bg-primary' },
  PHASE: { label: 'Phase', icon: Flag, chip: 'bg-primary-light text-primary', dot: 'bg-primary' },
  OTHER: { label: 'Other', icon: Circle, chip: 'bg-surface-2 text-text-secondary', dot: 'bg-text-muted' },
}

// Back-compat: some callers still reference a solid tone class per type.
export const EVENT_TONE: Record<HodCalendarEvent['type'], string> = {
  REGULAR_TEACHING: 'bg-success',
  EXAM: 'bg-warning', PUBLIC_HOLIDAY: 'bg-danger', HOLIDAY: 'bg-success', READING_HOLIDAY: 'bg-teal',
  SEMESTER_BREAK: 'bg-purple', CULTURAL: 'bg-purple', ACTIVITY: 'bg-primary', PHASE: 'bg-primary', OTHER: 'bg-text-muted',
}

export function CalendarGrid({
  events,
  year,
  month,
  onDayClick,
  onEventClick,
  readonly,
}: {
  events: HodCalendarEvent[]
  year: number
  month: number // 0-indexed
  onDayClick?: (date: string) => void
  onEventClick?: (e: HodCalendarEvent) => void
  readonly?: boolean
}) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // events can span multiple days (startDate → endDate); place them on every day in range
  const byDate = new Map<string, HodCalendarEvent[]>()
  events.forEach((e) => {
    const start = (e.startDate ?? e.date).slice(0, 10)
    const end = (e.endDate ?? e.date).slice(0, 10)
    for (let d = new Date(start + 'T00:00:00'); d <= new Date(end + 'T00:00:00'); d.setDate(d.getDate() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      byDate.set(key, [...(byDate.get(key) ?? []), e])
    }
  })

  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="grid grid-cols-7 bg-surface-2/60">
        {WEEKDAYS.map((d, i) => (
          <div key={d} className={cn('py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-text-muted', (i === 0 || i === 6) && 'text-danger/70')}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const col = i % 7
          const isWeekend = col === 0 || col === 6
          if (day == null) return <div key={i} className="min-h-[74px] border-t border-r border-border-light bg-surface-2/30 last:border-r-0" />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const allDayEvents = byDate.get(dateStr) ?? []
          // A teaching day is a plain working day — show it as a subtle tint + tiny label,
          // never as a chip that competes with real events (exams, holidays).
          const isTeaching = allDayEvents.some((e) => e.type === 'REGULAR_TEACHING')
          const dayEvents = allDayEvents.filter((e) => e.type !== 'REGULAR_TEACHING')
          const isToday = dateStr === todayStr
          return (
            <div
              key={i}
              onClick={() => !readonly && onDayClick?.(dateStr)}
              className={cn(
                'group relative min-h-[74px] border-t border-r border-border-light p-1 transition-colors',
                col === 6 && 'border-r-0',
                isWeekend && !isToday && 'bg-surface-2/25',
                isTeaching && !isToday && 'bg-success-light/40',
                isToday && 'bg-primary-light/25',
                !readonly && 'cursor-pointer hover:bg-primary-light/40',
              )}
            >
              <div className="mb-0.5 flex items-center justify-between">
                <span className={cn('flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold',
                  isToday ? 'bg-primary text-white shadow-sm' : isWeekend ? 'text-danger/60' : 'text-text-secondary')}>{day}</span>
                {isTeaching && <span className="flex items-center gap-0.5 text-[9px] font-medium text-success"><BookOpen size={9} />Lectures</span>}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 2).map((e, k) => {
                  const meta = EVENT_META[e.type] ?? EVENT_META.OTHER
                  const Icon = meta.icon
                  return (
                    <button
                      key={`${e.id}-${k}`}
                      onClick={(ev) => { ev.stopPropagation(); onEventClick?.(e) }}
                      title={e.title}
                      className={cn('flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[10px] font-medium leading-tight', meta.chip)}
                    >
                      <Icon size={10} className="shrink-0" />
                      <span className="truncate">{e.title}</span>
                    </button>
                  )
                })}
                {dayEvents.length > 2 && <div className="px-1 text-[9px] font-medium text-text-muted">+{dayEvents.length - 2} more</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
