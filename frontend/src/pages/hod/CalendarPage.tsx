import { useRef, useState } from 'react'
import { ExportMenu } from '@/components/shared/ExportMenu'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CalendarPlus, ChevronLeft, ChevronRight, Eraser, Trash2, Upload } from 'lucide-react'
import { hodApi } from '@/api/hod'
import { errorMessage } from '@/api/client'
import { useHodScope } from '@/hooks/hod/useHodScope'
import type { HodCalendarEvent } from '@/types/hod'
import { PageShell } from '@/components/shared/PageShell'
import { CalendarGrid, EVENT_META } from '@/components/shared/CalendarGrid'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { format } from 'date-fns'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const TYPES = ['REGULAR_TEACHING', 'HOLIDAY', 'PUBLIC_HOLIDAY', 'READING_HOLIDAY', 'SEMESTER_BREAK', 'EXAM', 'CULTURAL', 'ACTIVITY', 'PHASE', 'OTHER']
const TYPE_LABEL: Record<string, string> = { REGULAR_TEACHING: 'Regular Teaching', HOLIDAY: 'Holiday', PUBLIC_HOLIDAY: 'Public Holiday', READING_HOLIDAY: 'Reading Holiday', SEMESTER_BREAK: 'Semester Break', EXAM: 'Exam', CULTURAL: 'Cultural', ACTIVITY: 'Activity', PHASE: 'Phase', OTHER: 'Other' }
// Types that make a day non-working (attendance disabled, timetable hidden).
const NON_WORKING_TYPES = new Set(['HOLIDAY', 'PUBLIC_HOLIDAY', 'READING_HOLIDAY', 'SEMESTER_BREAK'])
const LEGEND_TYPES: HodCalendarEvent['type'][] = ['REGULAR_TEACHING', 'EXAM', 'PUBLIC_HOLIDAY', 'HOLIDAY', 'READING_HOLIDAY', 'SEMESTER_BREAK', 'CULTURAL', 'ACTIVITY']

export default function CalendarPage() {
  const qc = useQueryClient()
  const acadInputRef = useRef<HTMLInputElement>(null)
  const scope = useHodScope()
  const semesterId = scope.data?.activeSemester.id
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [editing, setEditing] = useState<Partial<HodCalendarEvent> | null>(null)

  const events = useQuery({
    queryKey: ['hod', 'calendar', year, month],
    queryFn: () => hodApi.calendar.events({ year, month: month + 1 }),
  })
  const upcoming = useQuery({ queryKey: ['hod', 'calendar', 'upcoming'], queryFn: () => hodApi.calendar.upcoming(6) })
  const timeline = useQuery({ queryKey: ['hod', 'calendar', 'timeline', semesterId], queryFn: () => hodApi.calendar.phaseTimeline(semesterId), enabled: !!semesterId })
  const subjects = useQuery({ queryKey: ['hod', 'subjects', semesterId], queryFn: () => hodApi.subjects.list({ semesterId }), enabled: !!semesterId })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['hod', 'calendar'] })
  }

  const save = useMutation({
    mutationFn: (e: Partial<HodCalendarEvent>) => {
      const start = (e.startDate ?? e.date ?? '').slice(0, 10)
      const end = (e.endDate ?? e.date ?? start).slice(0, 10)
      const body = { title: e.title, type: e.type, startDate: start, endDate: end, description: e.description, visibleTo: 'ALL', semesterId }
      return e.id ? hodApi.calendar.update(e.id, body) : hodApi.calendar.create(body)
    },
    onSuccess: () => { toast.success('Event saved'); invalidate(); setEditing(null) },
    onError: (err) => toast.error(errorMessage(err)),
  })
  const del = useMutation({
    mutationFn: (id: string) => hodApi.calendar.remove(id),
    onSuccess: () => { toast.success('Event deleted'); invalidate(); setEditing(null) },
    onError: (err) => toast.error(errorMessage(err)),
  })
  const clearCal = useMutation({
    mutationFn: () => hodApi.calendar.clear(),
    onSuccess: (r) => { toast.success(`Cleared ${r.cleared} events`); invalidate() },
    onError: (err) => toast.error(errorMessage(err)),
  })
  const importAcademic = useMutation({
    mutationFn: (file: File) => hodApi.calendar.importAcademic(file, true),
    onSuccess: (r) => {
      toast.success(`Imported ${r.events} events, including ${r.teachingDays} Regular Teaching days`)
      invalidate(); qc.invalidateQueries({ queryKey: ['hod', 'exam'] })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  function prevMonth() { if (month === 0) { setMonth(11); setYear((y) => y - 1) } else setMonth((m) => m - 1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear((y) => y + 1) } else setMonth((m) => m + 1) }

  return (
    <PageShell
      title="Academic Calendar"
      subtitle="Holidays, exams and phase schedule"
      action={
        <div className="flex flex-wrap gap-2">
          <input ref={acadInputRef} type="file" accept=".xlsx" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importAcademic.mutate(f); e.target.value = '' }} />
          <Button variant="outline" leftIcon={<Upload size={15} />} loading={importAcademic.isPending}
            onClick={() => acadInputRef.current?.click()}>Upload Academic Calendar</Button>
          <Button variant="outline" leftIcon={<Eraser size={15} />} loading={clearCal.isPending}
            onClick={() => window.confirm('Clear the ENTIRE academic calendar? This removes every event for all faculty and students.') && clearCal.mutate()}>Clear</Button>
          <ExportMenu onExport={(f) => hodApi.calendar.export(undefined, f)} />
          <Button leftIcon={<CalendarPlus size={15} />} onClick={() => setEditing({ date: format(new Date(), 'yyyy-MM-dd'), type: 'OTHER' })}>Add Event</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title={`${MONTHS[month]} ${year}`}
              action={
                <div className="flex gap-1">
                  <button onClick={prevMonth} className="flex h-8 w-8 items-center justify-center rounded-sm border border-border hover:bg-surface-2"><ChevronLeft size={16} /></button>
                  <button onClick={() => { setMonth(now.getMonth()); setYear(now.getFullYear()) }} className="rounded-sm border border-border px-3 text-xs font-medium hover:bg-surface-2">Today</button>
                  <button onClick={nextMonth} className="flex h-8 w-8 items-center justify-center rounded-sm border border-border hover:bg-surface-2"><ChevronRight size={16} /></button>
                </div>
              }
            />
            <CardBody className="pt-0">
              <CalendarGrid
                events={events.data?.data ?? []}
                year={year}
                month={month}
                onDayClick={(date) => setEditing({ date, startDate: date, endDate: date, type: 'OTHER' })}
                onEventClick={(e) => setEditing(e)}
              />
              {/* legend */}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border-light pt-4">
                {LEGEND_TYPES.map((t) => {
                  const meta = EVENT_META[t]
                  const Icon = meta.icon
                  return (
                    <span key={t} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${meta.chip}`}>
                      <Icon size={12} /> {meta.label}
                    </span>
                  )
                })}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Upcoming Events" />
            <CardBody className="space-y-1 pt-0">
              {upcoming.data?.data.map((e) => {
                const meta = EVENT_META[e.type] ?? EVENT_META.OTHER
                const Icon = meta.icon
                return (
                  <div key={e.id} className="flex items-center gap-3 rounded-md px-1.5 py-2 hover:bg-surface-2/60">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.chip}`}>
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-text-primary">{e.title}</div>
                      <div className="text-xs text-text-muted">{format(new Date(e.date), 'EEE, MMM d')} · {meta.label}</div>
                    </div>
                  </div>
                )
              })}
              {upcoming.data && upcoming.data.data.length === 0 && (
                <p className="py-6 text-center text-xs text-text-muted">No upcoming events this term.</p>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Phase Timeline" />
            <CardBody className="space-y-3 pt-0">
              {timeline.data?.phases.map((p) => (
                <div key={p.label} className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${p.isComplete ? 'bg-success' : 'bg-primary'}`}>{p.label}</div>
                  <div className="flex-1 text-xs">
                    <div className="font-medium text-text-primary">{format(new Date(p.startDate), 'MMM d')} – {format(new Date(p.endDate), 'MMM d')}</div>
                    {p.examDate && <div className="text-text-muted">Exam: {format(new Date(p.examDate), 'MMM d')}</div>}
                  </div>
                  <Badge tone={p.isComplete ? 'success' : 'primary'}>{p.isComplete ? 'Done' : 'Upcoming'}</Badge>
                </div>
              ))}
              {timeline.data && timeline.data.phases.length === 0 && <p className="py-3 text-center text-xs text-text-muted">No phases scheduled for this semester yet.</p>}
            </CardBody>
          </Card>
        </div>
      </div>

      {editing && (
        <Modal
          open
          onClose={() => setEditing(null)}
          title={editing.id ? 'Edit Event' : 'Add Event'}
          footer={
            <>
              {editing.id && (
                <Button variant="danger" leftIcon={<Trash2 size={15} />} onClick={() => del.mutate(editing.id!)} loading={del.isPending} className="mr-auto">Delete</Button>
              )}
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => save.mutate(editing)} loading={save.isPending} disabled={!editing.title || !(editing.startDate ?? editing.date)}>Save</Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Labeled label="Start Date *">
                <Input type="date" value={(editing.startDate ?? editing.date ?? '').slice(0, 10)}
                  onChange={(e) => setEditing((s) => {
                    const v = e.target.value
                    const end = s?.endDate && s.endDate >= v ? s.endDate : v
                    return { ...s, startDate: v, endDate: end, date: v }
                  })} />
              </Labeled>
              <Labeled label="End Date *">
                <Input type="date" value={(editing.endDate ?? editing.startDate ?? editing.date ?? '').slice(0, 10)}
                  min={(editing.startDate ?? editing.date ?? '').slice(0, 10)}
                  onChange={(e) => setEditing((s) => ({ ...s, endDate: e.target.value }))} />
              </Labeled>
              <Labeled label="Type">
                <Select value={editing.type ?? 'OTHER'} onChange={(e) => setEditing((s) => ({ ...s, type: e.target.value as HodCalendarEvent['type'] }))} options={TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))} />
                {NON_WORKING_TYPES.has(editing.type ?? '') && <p className="mt-1 text-[10px] font-medium text-warning">Disables attendance &amp; hides the timetable on this day</p>}
              </Labeled>
            </div>
            {editing.type === 'EXAM' && (
              <Labeled label="Subject">
                <Select
                  value=""
                  onChange={(e) => { const code = subjects.data?.data.find((s) => s.id === e.target.value)?.code; if (code) setEditing((s) => ({ ...s, title: `${code} Exam` })) }}
                  placeholder="Pick subject → sets title"
                  options={(subjects.data?.data ?? []).map((s) => ({ value: s.id, label: `${s.code} — ${s.name}` }))}
                />
              </Labeled>
            )}
            <Labeled label="Title *"><Input value={editing.title ?? ''} onChange={(e) => setEditing((s) => ({ ...s, title: e.target.value }))} placeholder={editing.type === 'READING_HOLIDAY' ? 'Reading Holiday' : 'Event title'} /></Labeled>
            <Labeled label="Description"><Textarea value={editing.description ?? ''} onChange={(e) => setEditing((s) => ({ ...s, description: e.target.value }))} /></Labeled>
          </div>
        </Modal>
      )}
    </PageShell>
  )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</label>{children}</div>
}
