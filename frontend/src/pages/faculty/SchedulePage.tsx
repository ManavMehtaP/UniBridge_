import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowRight, CalendarCheck2, CheckCircle2, Clock } from 'lucide-react'
import { facultyApi } from '@/api/faculty'
import { useFacultyScope } from '@/hooks/faculty/useFacultyScope'
import { subjectVisual, fmtTime, roomTone } from '@/lib/schedule'
import { cn } from '@/lib/utils'
import type { TimetableSlot } from '@/types/faculty'
import { PageShell } from '@/components/shared/PageShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CardSkeleton } from '@/components/ui/Skeleton'

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function SchedulePage() {
  const scope = useFacultyScope()
  const today = useQuery({ queryKey: ['faculty', 'timetable', 'today'], queryFn: facultyApi.timetableToday })
  const weekly = useQuery({ queryKey: ['faculty', 'timetable'], queryFn: facultyApi.timetable })

  const byDay = useMemo(() => {
    const m = new Map<number, TimetableSlot[]>()
    for (const s of weekly.data?.slots ?? []) {
      const d = s.dayOfWeek ?? 0
      if (!m.has(d)) m.set(d, [])
      m.get(d)!.push(s)
    }
    for (const list of m.values()) list.sort((a, b) => a.slotStart.localeCompare(b.slotStart))
    return m
  }, [weekly.data])

  const todaySlots = (today.data?.slots ?? []).slice().sort((a, b) => a.slotStart.localeCompare(b.slotStart))

  return (
    <PageShell
      title="My Schedule"
      subtitle={scope.data ? scope.data.activeSemester.label : 'Your lectures this week'}
    >
      {/* Today's schedule — the lead */}
      <Card className="p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-primary">Today&rsquo;s Schedule</h2>
          <span className="text-xs font-medium text-text-muted">
            {today.data ? format(new Date(today.data.date), 'EEEE, d MMM') : ''}
          </span>
        </div>
        {today.isLoading ? (
          <CardSkeleton height={120} />
        ) : todaySlots.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-border-light bg-surface-2 px-4 py-6">
            <CalendarCheck2 size={22} className="text-text-muted/60" />
            <div>
              <div className="text-[13px] font-semibold text-text-secondary">No lectures today</div>
              <div className="text-xs text-text-muted">Enjoy your day!</div>
            </div>
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {todaySlots.map((s) => {
              const { Icon, wrap } = subjectVisual(s.subject?.code)
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border-light bg-surface p-3">
                  <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', wrap)}>
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-text-primary">{s.subject?.code}</span>
                      {s.batch?.code && <Badge tone="primary">{s.batch.code}</Badge>}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-text-secondary">
                      <Clock size={12} /> {fmtTime(s.slotStart)} – {fmtTime(s.slotEnd)}
                    </div>
                  </div>
                  {s.attendanceMarked ? (
                    <Badge tone="success" className="shrink-0"><CheckCircle2 size={12} /> Marked</Badge>
                  ) : (
                    <Link to="/faculty/attendance" className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white hover:bg-primary-dark">
                      Mark <ArrowRight size={12} />
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Weekly timetable */}
      <Card className="mt-3 p-4 md:p-5">
        <h2 className="mb-3 text-sm font-bold text-text-primary">Weekly Timetable</h2>
        {weekly.isLoading ? (
          <CardSkeleton height={280} />
        ) : (weekly.data?.slots.length ?? 0) === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-border-light bg-surface-2 px-4 py-6">
            <CalendarCheck2 size={22} className="text-text-muted/60" />
            <div>
              <div className="text-[13px] font-semibold text-text-secondary">No timetable yet</div>
              <div className="text-xs text-text-muted">Your HOD assigns your lecture slots.</div>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {[1, 2, 3, 4, 5, 6].map((dow) => {
              const daySlots = byDay.get(dow) ?? []
              if (daySlots.length === 0) return null
              return (
                <div key={dow} className="flex gap-3 rounded-xl border border-border-light p-2.5">
                  <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-surface-2 py-2 text-text-secondary">
                    <span className="text-[11px] font-semibold uppercase tracking-wide">{DAYS[dow].slice(0, 3)}</span>
                  </div>
                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
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
                              <div className="text-[11px] text-text-muted">Batch {s.batch?.code}</div>
                            </div>
                          </div>
                          <div className="mt-2.5 text-[11px] font-medium text-text-secondary">{fmtTime(s.slotStart)} – {fmtTime(s.slotEnd)}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </PageShell>
  )
}
