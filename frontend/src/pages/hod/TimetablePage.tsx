import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CalendarDays, CalendarRange, LayoutList, MapPin, Plus, Trash2, Upload } from 'lucide-react'
import { addDays, format, startOfWeek } from 'date-fns'
import { hodApi } from '@/api/hod'
import { errorMessage } from '@/api/client'
import { useHodScope } from '@/hooks/hod/useHodScope'
import type { HodTimetableSlot } from '@/types/hod'
import { cn } from '@/lib/utils'
import { PageShell } from '@/components/shared/PageShell'
import { HistoryBanner } from '@/components/hod/HistoryBanner'
import { useHistoryStore } from '@/stores/historyStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { CsvUploadModal } from '@/components/shared/CsvUploadModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Full Tailwind scales (blue/green/violet/amber/cyan/rose are NOT overridden in the config).
type Palette = { border: string; bg: string; dot: string; code: string }
const BASE: Palette[] = [
  { border: 'border-l-blue-500', bg: 'bg-blue-50', dot: 'bg-blue-500', code: 'text-blue-700' },
  { border: 'border-l-green-500', bg: 'bg-green-50', dot: 'bg-green-500', code: 'text-green-700' },
  { border: 'border-l-violet-500', bg: 'bg-violet-50', dot: 'bg-violet-500', code: 'text-violet-700' },
  { border: 'border-l-amber-500', bg: 'bg-amber-50', dot: 'bg-amber-500', code: 'text-amber-700' },
]
const LAB: Palette = { border: 'border-l-cyan-500', bg: 'bg-cyan-50', dot: 'bg-cyan-500', code: 'text-cyan-700' }
const OTHER: Palette = { border: 'border-l-rose-500', bg: 'bg-rose-50', dot: 'bg-rose-500', code: 'text-rose-700' }

const isLab = (s: { subjectCode: string; subjectName: string }) => /lab|practical/i.test(`${s.subjectCode} ${s.subjectName}`)
const isOther = (s: { subjectCode: string; subjectName: string }) => /seminar|activity|mentor|sport|workshop/i.test(`${s.subjectCode} ${s.subjectName}`)

export default function HodTimetablePage() {
  const qc = useQueryClient()
  const scope = useHodScope()
  const history = useHistoryStore()
  const readOnly = !!history.semesterId
  const [batchId, setBatchId] = useState('')
  const [view, setView] = useState<'week' | 'list'>('week')
  const [editing, setEditing] = useState<HodTimetableSlot | { dayOfWeek: number; slotStart?: string; slotEnd?: string } | null>(null)
  const [deleteOf, setDeleteOf] = useState<HodTimetableSlot | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [replaceExisting, setReplaceExisting] = useState(false)

  const batches = scope.data?.batches ?? []
  // default to the first owned batch once scope loads
  useEffect(() => {
    if (!batchId && batches.length) setBatchId(batches[0].id)
  }, [batches, batchId])

  const list = useQuery({
    queryKey: ['hod', 'timetable', batchId, history.semesterId],
    queryFn: () => hodApi.timetable.list({ batchId, semesterId: history.semesterId || undefined }),
    enabled: !!batchId,
  })

  const del = useMutation({
    mutationFn: (id: string) => hodApi.timetable.remove(id),
    onSuccess: () => { toast.success('Lecture removed'); qc.invalidateQueries({ queryKey: ['hod', 'timetable'] }); setDeleteOf(null) },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const clearBatch = useMutation({
    mutationFn: async () => {
      // fire deletes in parallel — dozens of slots max per batch, well under any limit
      await Promise.all((list.data?.slots ?? []).map((s) => hodApi.timetable.remove(s.id)))
    },
    onSuccess: () => { toast.success('Timetable cleared for this batch'); qc.invalidateQueries({ queryKey: ['hod', 'timetable'] }); setConfirmClear(false) },
    onError: (e) => { toast.error(errorMessage(e)); setConfirmClear(false) },
  })

  const slots = list.data?.slots ?? []

  // stable colour per subject: labs → cyan, seminars/activities → rose, else rotate blue/green/violet/amber
  const colorBySubject = useMemo(() => {
    const map = new Map<string, Palette>()
    let i = 0
    for (const s of [...slots].sort((a, b) => a.subjectCode.localeCompare(b.subjectCode))) {
      if (map.has(s.subjectId)) continue
      map.set(s.subjectId, isLab(s) ? LAB : isOther(s) ? OTHER : BASE[i++ % BASE.length])
    }
    return map
  }, [slots])

  // distinct time rows (e.g. 09:00–10:00), sorted
  const timeRows = useMemo(() => {
    const keys = new Set(slots.map((s) => `${s.slotStart}|${s.slotEnd}`))
    return [...keys].map((k) => { const [start, end] = k.split('|'); return { start, end, key: k } }).sort((a, b) => a.start.localeCompare(b.start))
  }, [slots])

  const slotAt = (dow: number, key: string) => slots.find((s) => s.dayOfWeek === dow && `${s.slotStart}|${s.slotEnd}` === key)

  const weekDays = useMemo(() => {
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
    return [0, 1, 2, 3, 4, 5].map((i) => { const d = addDays(monday, i); return { dow: i + 1, name: DAYS[i], date: format(d, 'MMM d') } })
  }, [])

  const legend = useMemo(() => {
    const seen = new Map<string, { code: string; name: string; color: Palette }>()
    for (const s of slots) if (!seen.has(s.subjectId)) seen.set(s.subjectId, { code: s.subjectCode, name: s.subjectName, color: colorBySubject.get(s.subjectId)! })
    return [...seen.values()].sort((a, b) => a.code.localeCompare(b.code))
  }, [slots, colorBySubject])

  const daysUsed = [...new Set(slots.map((s) => s.dayOfWeek))].sort((a, b) => a - b)
  const workingDays = daysUsed.length ? `${DAYS[daysUsed[0] - 1]} – ${DAYS[daysUsed[daysUsed.length - 1] - 1]}` : '—'

  return (
    <PageShell
      title="Timetable"
      subtitle="Manage and view class schedules for all batches"
      action={
        readOnly ? undefined : (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" leftIcon={<Trash2 size={15} />} onClick={() => setConfirmClear(true)} disabled={!batchId || slots.length === 0}>Delete Timetable</Button>
          <Button variant="outline" leftIcon={<Upload size={15} />} onClick={() => setShowUpload(true)}>Upload CSV</Button>
          <Button leftIcon={<Plus size={15} />} onClick={() => setEditing({ dayOfWeek: 1 })} disabled={!batchId}>Add Lecture</Button>
        </div>
        )
      }
    >
      <HistoryBanner />
      {/* Controls — batches you manage are shown as pills; timetable auto-loads for the selected one */}
      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Batch</span>
          <div className="flex flex-wrap gap-1 rounded-sm bg-surface-2 p-1">
            {batches.map((b) => (
              <button
                key={b.id}
                onClick={() => setBatchId(b.id)}
                className={cn('rounded-xs px-3 py-1.5 text-xs font-semibold transition-colors',
                  batchId === b.id ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:bg-surface')}
              >
                {b.code}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-1 rounded-sm bg-surface-2 p-1">
            <ViewTab active={view === 'week'} onClick={() => setView('week')} icon={<CalendarRange size={14} />}>Week View</ViewTab>
            <ViewTab active={view === 'list'} onClick={() => setView('list')} icon={<LayoutList size={14} />}>List View</ViewTab>
          </div>
        </div>
      </Card>

      {!batchId ? (
        <EmptyState icon={<CalendarDays size={22} />} title="No batches yet" description="Create a batch to build its timetable." />
      ) : list.isLoading ? (
        <CardSkeleton height={360} />
      ) : slots.length === 0 ? (
        <Card>
          <EmptyState icon={<CalendarDays size={22} />} title="No lectures scheduled" description="Add the first lecture for this batch." action={<Button leftIcon={<Plus size={15} />} onClick={() => setEditing({ dayOfWeek: 1 })}>Add Lecture</Button>} />
        </Card>
      ) : view === 'week' ? (
        <WeekGrid
          weekDays={weekDays}
          timeRows={timeRows}
          slotAt={slotAt}
          colorBySubject={colorBySubject}
          onEdit={(s) => setEditing(s)}
          onAdd={(dow, start, end) => setEditing({ dayOfWeek: dow, slotStart: start, slotEnd: end })}
        />
      ) : (
        <ListView slots={slots} colorBySubject={colorBySubject} onEdit={(s) => setEditing(s)} />
      )}

      {/* Legend + stats */}
      {slots.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Card className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-2 p-4">
            {legend.map((l) => (
              <div key={l.code} className="flex items-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full', l.color.dot)} />
                <div className="leading-tight">
                  <div className="text-xs font-semibold text-text-primary">{l.code}</div>
                  <div className="text-[10px] text-text-muted">{l.name}</div>
                </div>
              </div>
            ))}
          </Card>
          <div className="flex gap-3">
            <StatChip icon={<CalendarDays size={16} />} label="Total Lectures" value={`${slots.length} / week`} />
            <StatChip icon={<CalendarRange size={16} />} label="Working Days" value={workingDays} />
          </div>
        </div>
      )}

      {editing && batchId && (
        <SlotModal
          slot={'id' in editing ? editing : null}
          defaultDay={'dayOfWeek' in editing ? editing.dayOfWeek : 1}
          defaultStart={'slotStart' in editing ? editing.slotStart : undefined}
          defaultEnd={'slotEnd' in editing ? editing.slotEnd : undefined}
          batchId={batchId}
          onClose={() => setEditing(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['hod', 'timetable'] })}
          onRequestDelete={'id' in editing ? () => { setDeleteOf(editing as HodTimetableSlot); setEditing(null) } : undefined}
        />
      )}

      <ConfirmDialog
        open={!!deleteOf}
        title="Delete lecture?"
        message={<>Delete <b>{deleteOf?.subjectCode}</b> {deleteOf ? `${deleteOf.slotStart}–${deleteOf.slotEnd}` : ''}?</>}
        destructive
        loading={del.isPending}
        onConfirm={() => deleteOf && del.mutate(deleteOf.id)}
        onCancel={() => setDeleteOf(null)}
      />

      <ConfirmDialog
        open={confirmClear}
        title="Delete this batch's timetable?"
        message={<>Remove <b>all {slots.length} lectures</b> from this batch's schedule? Cannot be undone.</>}
        destructive confirmLabel="Delete All"
        loading={clearBatch.isPending}
        onConfirm={() => clearBatch.mutate()}
        onCancel={() => setConfirmClear(false)}
      />

      <CsvUploadModal
        open={showUpload}
        onClose={() => { setShowUpload(false); setReplaceExisting(false) }}
        title="Upload Timetable"
        onUpload={hodApi.timetable.uploadCsv}
        onDownloadTemplate={hodApi.timetable.downloadTemplate}
        requiredColumns={['batch', 'day', 'start', 'end', 'subject']}
        optionalColumns={['room', 'mentor_code']}
        buildForm={(form) => {
          if (scope.data?.activeSemester.id) form.append('semesterId', scope.data.activeSemester.id)
          if (replaceExisting) form.append('replaceExisting', '1')
        }}
        extraFields={
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-border bg-warning-light/30 px-3 py-2">
              <input type="checkbox" checked={replaceExisting} onChange={(e) => setReplaceExisting(e.target.checked)} className="h-4 w-4 accent-warning" />
              <span className="text-xs font-medium text-text-primary">
                Replace existing timetable — delete every current lecture in the CSV's batches before importing.
              </span>
            </label>
            <p className="text-xs text-text-muted"><b>day</b> = Mon–Sat or 1–6 · <b>mentor_code</b> = the faculty's 3-char code.</p>
          </div>
        }
      />
    </PageShell>
  )
}

function ViewTab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn('flex items-center gap-1.5 rounded-xs px-3 py-1.5 text-xs font-semibold transition-colors',
      active ? 'bg-surface text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary')}>
      {icon}{children}
    </button>
  )
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary-light text-primary">{icon}</div>
      <div className="leading-tight">
        <div className="text-[11px] text-text-muted">{label}</div>
        <div className="text-sm font-bold text-text-primary">{value}</div>
      </div>
    </Card>
  )
}

type WeekDay = { dow: number; name: string; date: string }
type TimeRow = { start: string; end: string; key: string }

function WeekGrid({ weekDays, timeRows, slotAt, colorBySubject, onEdit, onAdd }: {
  weekDays: WeekDay[]
  timeRows: TimeRow[]
  slotAt: (dow: number, key: string) => HodTimetableSlot | undefined
  colorBySubject: Map<string, Palette>
  onEdit: (s: HodTimetableSlot) => void
  onAdd: (dow: number, start: string, end: string) => void
}) {
  return (
    <Card className="overflow-hidden">
      <div className="scrollbar-thin overflow-x-auto">
        <div className="min-w-[880px]">
          {/* header */}
          <div className="grid" style={{ gridTemplateColumns: `84px repeat(6, minmax(130px, 1fr))` }}>
            <div className="border-b border-r border-border bg-surface-2 px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Time</div>
            {weekDays.map((d) => (
              <div key={d.dow} className="border-b border-border bg-surface-2 px-3 py-2.5 text-center">
                <div className="text-sm font-bold text-text-primary">{d.name}</div>
                <div className="text-[11px] text-text-muted">{d.date}</div>
              </div>
            ))}
          </div>
          {/* rows */}
          {timeRows.map((t) => (
            <div key={t.key} className="grid" style={{ gridTemplateColumns: `84px repeat(6, minmax(130px, 1fr))` }}>
              <div className="flex flex-col justify-center border-b border-r border-border bg-surface-2 px-3 py-4 text-center">
                <div className="text-[11px] font-semibold text-text-primary">{t.start}</div>
                <div className="text-[10px] text-text-muted">{t.end}</div>
              </div>
              {weekDays.map((d) => {
                const s = slotAt(d.dow, t.key)
                if (!s) {
                  return (
                    <button
                      key={d.dow}
                      onClick={() => onAdd(d.dow, t.start, t.end)}
                      className="group flex items-center justify-center border-b border-l border-border-light p-2 transition-colors hover:bg-surface-2"
                    >
                      <Plus size={14} className="text-transparent transition-colors group-hover:text-text-muted" />
                    </button>
                  )
                }
                const c = colorBySubject.get(s.subjectId) ?? BASE[0]
                return (
                  <button
                    key={d.dow}
                    onClick={() => onEdit(s)}
                    className={cn('m-1 rounded-sm border border-border-light border-l-4 p-2 text-left transition-shadow hover:shadow-md', c.border, c.bg)}
                  >
                    <div className={cn('text-[13px] font-bold', c.code)}>{s.subjectCode}</div>
                    <div className="truncate text-[11px] font-medium text-text-secondary">{s.subjectName}</div>
                    {s.facultyName && <div className="truncate text-[11px] text-text-muted">{s.facultyName}</div>}
                    {s.room && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-text-muted">
                        <MapPin size={10} /> {s.room}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function ListView({ slots, colorBySubject, onEdit }: { slots: HodTimetableSlot[]; colorBySubject: Map<string, Palette>; onEdit: (s: HodTimetableSlot) => void }) {
  const byDay = new Map<number, HodTimetableSlot[]>()
  for (const s of slots) { const a = byDay.get(s.dayOfWeek) ?? []; a.push(s); byDay.set(s.dayOfWeek, a) }
  const days = [...byDay.keys()].sort((a, b) => a - b)
  return (
    <div className="space-y-3">
      {days.map((d) => (
        <Card key={d} className="p-4">
          <h3 className="mb-2 text-sm font-bold text-text-primary">{DAYS[d - 1]}</h3>
          <div className="space-y-1.5">
            {byDay.get(d)!.slice().sort((a, b) => a.slotStart.localeCompare(b.slotStart)).map((s) => {
              const c = colorBySubject.get(s.subjectId) ?? BASE[0]
              return (
                <button key={s.id} onClick={() => onEdit(s)} className={cn('flex w-full items-center gap-3 rounded-sm border border-border-light border-l-4 p-2.5 text-left transition-shadow hover:shadow-md', c.border, c.bg)}>
                  <div className="w-24 shrink-0 text-xs font-semibold text-text-primary">{s.slotStart}–{s.slotEnd}</div>
                  <div className="min-w-0 flex-1">
                    <span className={cn('text-[13px] font-bold', c.code)}>{s.subjectCode}</span>
                    <span className="ml-2 text-xs text-text-secondary">{s.subjectName}</span>
                  </div>
                  {s.facultyName && <div className="hidden text-xs text-text-muted sm:block">{s.facultyName}</div>}
                  {s.room && <div className="flex items-center gap-1 text-[11px] text-text-muted"><MapPin size={11} />{s.room}</div>}
                </button>
              )
            })}
          </div>
        </Card>
      ))}
    </div>
  )
}

function SlotModal({ slot, defaultDay, defaultStart, defaultEnd, batchId, onClose, onSaved, onRequestDelete }: {
  slot: HodTimetableSlot | null
  defaultDay: number
  defaultStart?: string
  defaultEnd?: string
  batchId: string
  onClose: () => void
  onSaved: () => void
  onRequestDelete?: () => void
}) {
  const [dayOfWeek, setDayOfWeek] = useState(slot?.dayOfWeek ?? defaultDay)
  const [subjectId, setSubjectId] = useState(slot?.subjectId ?? '')
  const [facultyId, setFacultyId] = useState(slot?.facultyId ?? '')
  const [slotStart, setSlotStart] = useState(slot?.slotStart ?? defaultStart ?? '09:00')
  const [slotEnd, setSlotEnd] = useState(slot?.slotEnd ?? defaultEnd ?? '10:00')
  const [room, setRoom] = useState(slot?.room ?? '')

  const scope = useHodScope()
  const subjects = useQuery({
    queryKey: ['hod', 'subjects', scope.data?.activeSemester.id],
    queryFn: () => hodApi.subjects.list({ semesterId: scope.data?.activeSemester.id }),
    enabled: !!scope.data?.activeSemester.id,
  })

  const save = useMutation({
    mutationFn: () => {
      const body = { batchId, subjectId, facultyId: facultyId || null, dayOfWeek, slotStart, slotEnd, room: room || null }
      return slot ? hodApi.timetable.update(slot.id, body) : hodApi.timetable.create(body)
    },
    onSuccess: () => { toast.success('Saved'); onSaved(); onClose() },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const subjectOpts = subjects.data?.data.map((s) => ({ value: s.id, label: `${s.code} — ${s.name}` })) ?? []
  // Only faculty assigned to the chosen subject can be picked for its slot.
  const subjectFaculty = subjects.data?.data.find((s) => s.id === subjectId)?.faculty ?? []
  const facultyOpts = subjectFaculty.map((f) => ({ value: f.id, label: f.name }))

  function pickSubject(newSubjectId: string) {
    setSubjectId(newSubjectId)
    const teachers = subjects.data?.data.find((s) => s.id === newSubjectId)?.faculty ?? []
    if (!teachers.some((f) => f.id === facultyId)) setFacultyId('')
  }

  return (
    <Modal
      open onClose={onClose} title={slot ? 'Edit Lecture' : 'Add Lecture'}
      footer={
        <>
          {onRequestDelete && <Button variant="outline" className="mr-auto text-danger" onClick={onRequestDelete}>Delete</Button>}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!subjectId || !slotStart || !slotEnd}>Save</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Day">
            <Select value={String(dayOfWeek)} onChange={(e) => setDayOfWeek(Number(e.target.value))}>
              {DAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
            </Select>
          </Field>
          <Field label="Room">
            <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Lab 3 / Hall B" />
          </Field>
          <Field label="Start Time *"><Input type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} /></Field>
          <Field label="End Time *"><Input type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} /></Field>
        </div>
        <Field label="Subject *">
          <Select value={subjectId} onChange={(e) => pickSubject(e.target.value)} placeholder="Select subject" options={subjectOpts} />
        </Field>
        <Field label="Faculty (optional)">
          <Select
            value={facultyId ?? ''}
            onChange={(e) => setFacultyId(e.target.value)}
            placeholder={!subjectId ? 'Select a subject first' : facultyOpts.length ? 'Unassigned' : 'No faculty teach this subject'}
            options={facultyOpts}
            disabled={!subjectId || facultyOpts.length === 0}
          />
        </Field>
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</label>
      {children}
    </div>
  )
}
