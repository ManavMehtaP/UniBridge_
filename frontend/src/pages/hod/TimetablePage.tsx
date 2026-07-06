import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react'
import { hodApi } from '@/api/hod'
import { errorMessage } from '@/api/client'
import { useHodScope } from '@/hooks/hod/useHodScope'
import type { HodTimetableSlot } from '@/types/hod'
import { PageShell } from '@/components/shared/PageShell'
import { FilterBar } from '@/components/shared/FilterBar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function HodTimetablePage() {
  const qc = useQueryClient()
  const scope = useHodScope()
  const [batchId, setBatchId] = useState('')
  const [editing, setEditing] = useState<HodTimetableSlot | { dayOfWeek: number } | null>(null)
  const [deleteOf, setDeleteOf] = useState<HodTimetableSlot | null>(null)

  const list = useQuery({
    queryKey: ['hod', 'timetable', batchId],
    queryFn: () => hodApi.timetable.list({ batchId: batchId || undefined }),
    enabled: !!scope.data,
  })

  const del = useMutation({
    mutationFn: (id: string) => hodApi.timetable.remove(id),
    onSuccess: () => { toast.success('Slot removed'); qc.invalidateQueries({ queryKey: ['hod', 'timetable'] }); setDeleteOf(null) },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const batchOpts = scope.data?.batches.map((b) => ({ value: b.id, label: b.code })) ?? []

  const byDay = useMemo(() => {
    const m = new Map<number, HodTimetableSlot[]>()
    list.data?.slots.forEach((s) => {
      const arr = m.get(s.dayOfWeek) ?? []
      arr.push(s)
      m.set(s.dayOfWeek, arr)
    })
    return m
  }, [list.data])

  return (
    <PageShell
      title="Timetable"
      subtitle={scope.data?.activeSemester ? `${scope.data.activeSemester.label} — weekly slots by batch` : 'Set weekly class schedule'}
      action={<Button leftIcon={<Plus size={15} />} onClick={() => setEditing({ dayOfWeek: 1 })} disabled={!batchId}>Add Slot</Button>}
    >
      <FilterBar>
        <Select className="w-52" value={batchId} onChange={(e) => setBatchId(e.target.value)} placeholder="Select batch" options={batchOpts} />
        {!batchId && <span className="text-xs text-text-muted">Pick a batch to view or edit its timetable.</span>}
      </FilterBar>

      {!batchId ? (
        <EmptyState icon={<CalendarDays size={22} />} title="Pick a batch" description="Each batch has its own weekly timetable." />
      ) : list.isLoading ? (
        <CardSkeleton height={240} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((d) => {
            const slots = (byDay.get(d) ?? []).slice().sort((a, b) => a.slotStart.localeCompare(b.slotStart))
            return (
              <Card key={d} className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-text-primary">{DAYS[d - 1]}</h3>
                  <button onClick={() => setEditing({ dayOfWeek: d })} className="text-xs font-semibold text-primary hover:underline">+ Add</button>
                </div>
                {slots.length === 0 ? (
                  <p className="rounded-sm bg-surface-2 py-6 text-center text-xs text-text-muted">No lectures</p>
                ) : (
                  <ul className="space-y-1.5">
                    {slots.map((s) => (
                      <li key={s.id} className="group rounded-sm border border-border-light p-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-primary">{s.slotStart}–{s.slotEnd}</div>
                            <div className="text-[13px] font-semibold text-text-primary">{s.subjectCode}</div>
                            <div className="truncate text-[11px] text-text-muted">{s.subjectName}</div>
                            {s.facultyName && <div className="text-[11px] text-text-secondary">{s.facultyName}</div>}
                            {s.room && <Badge tone="neutral" className="mt-1">Room {s.room}</Badge>}
                          </div>
                          <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                            <button onClick={() => setEditing(s)} className="text-text-muted hover:text-primary" title="Edit"><Pencil size={13} /></button>
                            <button onClick={() => setDeleteOf(s)} className="text-text-muted hover:text-danger" title="Delete"><Trash2 size={13} /></button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {editing && batchId && (
        <SlotModal
          slot={'id' in editing ? editing : null}
          defaultDay={'dayOfWeek' in editing ? editing.dayOfWeek : 1}
          batchId={batchId}
          onClose={() => setEditing(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['hod', 'timetable'] })}
        />
      )}

      <ConfirmDialog
        open={!!deleteOf}
        title="Delete slot?"
        message={<>Delete <b>{deleteOf?.subjectCode}</b> {deleteOf ? `${deleteOf.slotStart}–${deleteOf.slotEnd}` : ''}?</>}
        destructive
        loading={del.isPending}
        onConfirm={() => deleteOf && del.mutate(deleteOf.id)}
        onCancel={() => setDeleteOf(null)}
      />
    </PageShell>
  )
}

function SlotModal({ slot, defaultDay, batchId, onClose, onSaved }: { slot: HodTimetableSlot | null; defaultDay: number; batchId: string; onClose: () => void; onSaved: () => void }) {
  const [dayOfWeek, setDayOfWeek] = useState(slot?.dayOfWeek ?? defaultDay)
  const [subjectId, setSubjectId] = useState(slot?.subjectId ?? '')
  const [facultyId, setFacultyId] = useState(slot?.facultyId ?? '')
  const [slotStart, setSlotStart] = useState(slot?.slotStart ?? '09:00')
  const [slotEnd, setSlotEnd] = useState(slot?.slotEnd ?? '10:00')
  const [room, setRoom] = useState(slot?.room ?? '')

  const scope = useHodScope()
  const subjects = useQuery({
    queryKey: ['hod', 'subjects', scope.data?.activeSemester.id],
    queryFn: () => hodApi.subjects.list({ semesterId: scope.data?.activeSemester.id }),
    enabled: !!scope.data?.activeSemester.id,
  })
  const faculty = useQuery({ queryKey: ['hod', 'faculty-all'], queryFn: () => hodApi.faculty.list({ limit: 100 }) })

  const save = useMutation({
    mutationFn: () => {
      const body = { batchId, subjectId, facultyId: facultyId || null, dayOfWeek, slotStart, slotEnd, room: room || null }
      return slot ? hodApi.timetable.update(slot.id, body) : hodApi.timetable.create(body)
    },
    onSuccess: () => { toast.success('Saved'); onSaved(); onClose() },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const subjectOpts = subjects.data?.data.map((s) => ({ value: s.id, label: `${s.code} — ${s.name}` })) ?? []
  const facultyOpts = (faculty.data?.data ?? []).filter((f) => !f.isHod).map((f) => ({ value: f.id, label: f.name }))

  return (
    <Modal
      open onClose={onClose} title={slot ? 'Edit Slot' : 'Add Slot'}
      footer={
        <>
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
          <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} placeholder="Select subject" options={subjectOpts} />
        </Field>
        <Field label="Faculty (optional)">
          <Select value={facultyId ?? ''} onChange={(e) => setFacultyId(e.target.value)} placeholder="Unassigned" options={facultyOpts} />
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
