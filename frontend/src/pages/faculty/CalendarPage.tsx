import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { facultyApi } from '@/api/faculty'
import { PageShell } from '@/components/shared/PageShell'
import { CalendarGrid, EVENT_META } from '@/components/shared/CalendarGrid'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import type { HodCalendarEvent } from '@/types/hod'
import { format } from 'date-fns'

type RawEvent = { id: string; date: string; startDate?: string; endDate?: string; title: string; type: string }
const toEvents = (rows: RawEvent[]): HodCalendarEvent[] =>
  rows.map((e) => ({ id: e.id, date: e.date, startDate: e.startDate ?? e.date, endDate: e.endDate ?? e.date, title: e.title, type: (e.type as HodCalendarEvent['type']) ?? 'OTHER' }))

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

  const monthEvents = toEvents((events.data as { data?: RawEvent[] })?.data ?? [])
  const upcomingRows = ((upcoming.data as { data?: RawEvent[] })?.data ?? [])

  return (
    <PageShell title="Calendar" subtitle="Academic events and phase timeline">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader
            title={d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            action={
              <div className="flex items-center gap-1">
                <button onClick={() => setD(new Date(year, month - 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-sm border border-border hover:bg-surface-2"><ChevronLeft size={16} /></button>
                <Button variant="outline" size="sm" onClick={() => setD(new Date())}>Today</Button>
                <button onClick={() => setD(new Date(year, month + 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-sm border border-border hover:bg-surface-2"><ChevronRight size={16} /></button>
              </div>
            }
          />
          <CardBody className="pt-0">
            {events.isLoading ? <CardSkeleton height={420} /> : <CalendarGrid events={monthEvents} year={year} month={month} readonly />}
            <div className="mt-3 flex flex-wrap gap-2">
              {(['REGULAR_TEACHING', 'EXAM', 'PUBLIC_HOLIDAY', 'HOLIDAY', 'READING_HOLIDAY', 'SEMESTER_BREAK', 'CULTURAL'] as HodCalendarEvent['type'][]).map((t) => {
                const m = EVENT_META[t]; const Icon = m.icon
                return <span key={t} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', m.chip)}><Icon size={10} />{m.label}</span>
              })}
            </div>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Upcoming Events" />
            <CardBody className="pt-0">
              {upcomingRows.length === 0 ? (
                <p className="text-xs text-text-muted">No upcoming events.</p>
              ) : (
                <ul className="space-y-2">
                  {upcomingRows.map((e) => {
                    const m = EVENT_META[(e.type as HodCalendarEvent['type'])] ?? EVENT_META.OTHER
                    return (
                      <li key={e.id} className="flex items-start gap-2">
                        <div className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', m.dot)} />
                        <div className="flex-1">
                          <div className="text-[13px] font-semibold text-text-primary">{e.title}</div>
                          <div className="text-xs text-text-muted">{new Date(e.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                        </div>
                      </li>
                    )
                  })}
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
                  {(timeline.data as { phases?: { label: string; startDate?: string; endDate?: string; examDate?: string; isComplete: boolean }[] })?.phases?.map((p) => (
                    <li key={p.label} className="flex items-center justify-between gap-3 rounded-sm bg-surface-2 px-3 py-2">
                      <div>
                        <div className="text-sm font-semibold">{p.label}</div>
                        {p.startDate && p.endDate && <div className="text-xs text-text-muted">{format(new Date(p.startDate), 'MMM d')} - {format(new Date(p.endDate), 'MMM d')}{p.examDate ? ` · Exam ${format(new Date(p.examDate), 'MMM d')}` : ''}</div>}
                      </div>
                      <Badge tone={p.isComplete ? 'success' : 'neutral'}>{p.isComplete ? 'Complete' : 'Pending'}</Badge>
                    </li>
                  )) ?? <EmptyState title="No phases" className="border-0" />}
                  {timeline.data && ((timeline.data as { phases?: unknown[] })?.phases ?? []).length === 0 && <EmptyState title="No phases" className="border-0" />}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}
