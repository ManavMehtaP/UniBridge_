import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { facultyApi } from '@/api/faculty'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const eventTone: Record<string, 'success' | 'danger' | 'purple' | 'primary' | 'neutral'> = {
  REGULAR_TEACHING: 'success',
  HOLIDAY: 'success', EXAM: 'danger', CULTURAL: 'purple', PHASE: 'primary', OTHER: 'neutral',
}

export default function FacultyCalendarPage() {
  const [d, setD] = useState(() => new Date())
  const year = d.getFullYear()
  const month = d.getMonth() // 0-indexed

  const events = useQuery({
    queryKey: ['faculty', 'calendar', year, month + 1],
    queryFn: () => facultyApi.calendarEvents({ year, month: month + 1 }),
  })
  const upcoming = useQuery({ queryKey: ['faculty', 'upcoming-events'], queryFn: () => facultyApi.upcomingEvents(6) })
  const timeline = useQuery({ queryKey: ['faculty', 'phase-timeline'], queryFn: facultyApi.phaseTimeline })

  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startPad = first.getDay()

  const eventsByDay = new Map<number, { id: string; title: string; type: string }[]>()
  events.data?.data?.forEach((e) => {
    const day = new Date(e.date).getDate()
    if (!eventsByDay.has(day)) eventsByDay.set(day, [])
    eventsByDay.get(day)!.push(e)
  })

  return (
    <PageShell title="Calendar" subtitle="Academic events and phase timeline">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader
            title={d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            action={
              <div className="flex items-center gap-1">
                <button onClick={() => setD(new Date(year, month - 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-sm border border-border hover:bg-surface-2">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => setD(new Date())} className="rounded-sm border border-border px-3 h-8 text-xs font-semibold hover:bg-surface-2">Today</button>
                <button onClick={() => setD(new Date(year, month + 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-sm border border-border hover:bg-surface-2">
                  <ChevronRight size={16} />
                </button>
              </div>
            }
          />
          <CardBody className="pt-0">
            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              {DAYS.map((d) => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startPad }).map((_, i) => <div key={`p-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const isToday = year === new Date().getFullYear() && month === new Date().getMonth() && day === new Date().getDate()
                const dayEvents = eventsByDay.get(day) ?? []
                return (
                  <div key={day} className={cn('min-h-[80px] rounded-sm border border-border-light p-1.5', isToday && 'border-primary bg-primary-light')}>
                    <div className={cn('mb-1 text-xs font-semibold', isToday ? 'text-primary' : 'text-text-primary')}>{day}</div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map((e) => (
                        <div key={e.id} className={cn('truncate rounded-xs px-1 py-0.5 text-[10px] font-medium', `bg-${eventTone[e.type] ?? 'neutral'}-light text-${eventTone[e.type] ?? 'neutral'}`)}>{e.title}</div>
                      ))}
                      {dayEvents.length > 2 && <div className="text-[10px] text-text-muted">+{dayEvents.length - 2}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Upcoming Events" />
            <CardBody className="pt-0">
              {upcoming.data?.data?.length === 0 ? (
                <p className="text-xs text-text-muted">No upcoming events.</p>
              ) : (
                <ul className="space-y-2">
                  {(upcoming.data?.data as { id: string; date: string; title: string; type: string }[])?.map((e) => (
                    <li key={e.id} className="flex items-start gap-2">
                      <div className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', `bg-${eventTone[e.type] ?? 'neutral'}`)} />
                      <div className="flex-1">
                        <div className="text-[13px] font-semibold text-text-primary">{e.title}</div>
                        <div className="text-xs text-text-muted">{new Date(e.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Phase Timeline" />
            <CardBody className="pt-0">
              {timeline.isLoading ? (
                <CardSkeleton height={100} />
              ) : (
                <ul className="space-y-2">
                  {(timeline.data as { phases?: { label: string; examDate?: string; isComplete: boolean }[] })?.phases?.map((p) => (
                    <li key={p.label} className="flex items-center justify-between rounded-sm bg-surface-2 px-3 py-2">
                      <span className="text-sm font-semibold">{p.label}</span>
                      <Badge tone={p.isComplete ? 'success' : 'neutral'}>{p.isComplete ? 'Complete' : 'Pending'}</Badge>
                    </li>
                  )) ?? <EmptyState title="No phases" className="border-0" />}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}
