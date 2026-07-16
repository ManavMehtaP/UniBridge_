import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { addDays, format, isSameDay, startOfWeek } from 'date-fns'
import { CalendarCheck2, ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { studentApi } from '@/api/student'
import { subjectVisual, fmtTime, roomTone } from '@/lib/schedule'
import { cn } from '@/lib/utils'
import { PageShell } from '@/components/shared/PageShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { CardSkeleton } from '@/components/ui/Skeleton'

type Slot = { id: string; dayOfWeek?: number; slotStart: string; slotEnd: string; subject?: { code: string; name?: string }; facultyName?: string; room?: string }

// Recurring weekly timetable, shown against a real week's dates (Mon–Sat). dayOfWeek 1=Mon … 6=Sat.
const WEEKDAYS = [1, 2, 3, 4, 5, 6]

export default function TimetablePage() {
  const timetable = useQuery({ queryKey: ['student', 'timetable'], queryFn: studentApi.timetable })
  const slots = (timetable.data as { slots?: Slot[] })?.slots ?? []

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const weekEnd = addDays(weekStart, 5)
  const today = new Date()

  const byDay = useMemo(() => {
    const m = new Map<number, Slot[]>()
    for (const s of slots) {
      const d = s.dayOfWeek ?? 0
      if (!m.has(d)) m.set(d, [])
      m.get(d)!.push(s)
    }
    for (const list of m.values()) list.sort((a, b) => a.slotStart.localeCompare(b.slotStart))
    return m
  }, [slots])

  const weekNav = (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-lg border border-border bg-surface">
        <button aria-label="Previous week" onClick={() => setWeekStart((w) => addDays(w, -7))} className="flex h-9 w-9 items-center justify-center text-text-secondary hover:text-primary">
          <ChevronLeft size={16} />
        </button>
        <span className="min-w-[150px] border-x border-border px-3 text-center text-[13px] font-semibold text-text-primary">
          {format(weekStart, 'd')} – {format(weekEnd, 'd MMM, yyyy')}
        </span>
        <button aria-label="Next week" onClick={() => setWeekStart((w) => addDays(w, 7))} className="flex h-9 w-9 items-center justify-center text-text-secondary hover:text-primary">
          <ChevronRight size={16} />
        </button>
      </div>
      <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</Button>
    </div>
  )

  return (
    <PageShell title="Timetable" subtitle="Your weekly class schedule" action={weekNav}>
      <Card className="p-4 md:p-5">
        <h2 className="mb-3 text-sm font-bold text-text-primary">Weekly Schedule</h2>
        {timetable.isLoading ? (
          <CardSkeleton height={320} />
        ) : (
          <div className="space-y-2.5">
            {WEEKDAYS.map((dow, i) => {
              const date = addDays(weekStart, i)
              const isToday = isSameDay(date, today)
              const daySlots = byDay.get(dow) ?? []
              return (
                <div key={dow} className={cn('flex gap-3 rounded-xl border p-2.5', isToday ? 'border-primary/40 bg-primary-light/25' : 'border-border-light')}>
                  <div className={cn('flex w-14 shrink-0 flex-col items-center justify-center rounded-lg py-2', isToday ? 'bg-primary text-white' : 'bg-surface-2 text-text-secondary')}>
                    <span className="text-[11px] font-semibold uppercase tracking-wide">{format(date, 'EEE')}</span>
                    <span className="text-xl font-bold leading-tight">{format(date, 'd')}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    {daySlots.length === 0 ? (
                      <div className="flex h-full items-center gap-3 px-2 py-3">
                        <CalendarCheck2 size={22} className="shrink-0 text-text-muted/60" />
                        <div>
                          <div className="text-[13px] font-semibold text-text-secondary">No classes scheduled</div>
                          <div className="text-xs text-text-muted">Enjoy your day!</div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {daySlots.map((s) => {
                          const { Icon, wrap } = subjectVisual(s.subject?.code)
                          return (
                            <div key={s.id} className="relative rounded-lg border border-border-light bg-surface p-3 transition-colors hover:border-border">
                              {s.room && <Badge tone={roomTone(s.room)} className="absolute right-2 top-2">Room {s.room}</Badge>}
                              <div className="flex items-start gap-2.5 pr-14">
                                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', wrap)}>
                                  <Icon size={18} />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-bold text-text-primary">{s.subject?.code}</div>
                                  <div className="line-clamp-2 text-[11px] leading-tight text-text-muted">{s.subject?.name}</div>
                                </div>
                              </div>
                              <div className="mt-2.5 text-[11px] font-medium text-text-secondary">{fmtTime(s.slotStart)} – {fmtTime(s.slotEnd)}</div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-xs text-text-muted">
        <span className="flex items-center gap-1.5"><Info size={13} /> Timetable is subject to change. Please check regularly for updates.</span>
        <span>Recurring weekly schedule</span>
      </div>
    </PageShell>
  )
}
