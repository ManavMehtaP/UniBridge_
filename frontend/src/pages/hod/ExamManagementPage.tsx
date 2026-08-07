import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AlertTriangle, CheckCircle2, Lock, LockOpen, Plus, RefreshCw, Rocket, Send, Trash2, Undo2, UserCheck, Users, Wand2, X } from 'lucide-react'
import { examApi, type ExamRow, type ExamSchedule, type ExamPhaseWindow, type PaperCheckFacultyRow } from '@/api/exam'
import { api, errorMessage } from '@/api/client'
import { cn } from '@/lib/utils'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Tabs'
import { Table, Td, Th, Tr } from '@/components/ui/Table'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'

const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : '')

const TABS = [
  { key: 'calendar', label: 'Calendar' },
  { key: 'blocks', label: 'Blocks' },
  { key: 'supervision', label: 'Supervision' },
  { key: 'paper', label: 'Paper Checking' },
  { key: 'standby', label: 'Standby' },
  { key: 'external', label: 'External Faculty' },
  { key: 'conflicts', label: 'Conflicts & Publish' },
]

export default function ExamManagementPage({ coordinator = false }: { coordinator?: boolean } = {}) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['exam'] })
  const [examId, setExamId] = useState('')
  const [tab, setTab] = useState('calendar')
  const [scheduleId, setScheduleId] = useState('')
  const [newExamOpen, setNewExamOpen] = useState(false)
  const [deleteExamOpen, setDeleteExamOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [excludeHods, setExcludeHods] = useState(false)

  const exams = useQuery({ queryKey: ['exam', 'list'], queryFn: examApi.list })
  useEffect(() => { if (!examId && exams.data?.exams[0]) setExamId(exams.data.exams[0].id) }, [exams.data, examId])
  const detail = useQuery({ queryKey: ['exam', 'detail', examId], queryFn: () => examApi.get(examId), enabled: !!examId })
  const dash = useQuery({ queryKey: ['exam', 'dash', examId], queryFn: () => examApi.dashboard(examId), enabled: !!examId })
  const schedules = detail.data?.schedules ?? []
  useEffect(() => { if (schedules.length && !schedules.find((s) => s.id === scheduleId)) setScheduleId(schedules[0].id) }, [schedules, scheduleId])

  const create = useMutation({ mutationFn: examApi.create, onSuccess: () => { toast.success('Exam created'); setNewExamOpen(false); setNewName(''); invalidate() }, onError: (e) => toast.error(errorMessage(e)) })
  const genBlocks = useMutation({ mutationFn: () => examApi.generateBlocks(examId), onSuccess: (r: { blocks?: number; students?: number }) => { toast.success(`Generated ${r.blocks ?? 0} blocks (${r.students ?? 0} students)`); invalidate() }, onError: (e) => toast.error(errorMessage(e)) })
  const publish = useMutation({ mutationFn: () => examApi.publish(examId), onSuccess: (r: { notified?: number }) => { toast.success(`Duties published · ${r.notified ?? 0} faculty notified`); invalidate() }, onError: (e) => toast.error(errorMessage(e)) })
  const unpublish = useMutation({ mutationFn: () => examApi.unpublish(examId), onSuccess: () => { toast.success('Unpublished'); invalidate() }, onError: (e) => toast.error(errorMessage(e)) })
  const publishResults = useMutation({ mutationFn: () => examApi.publishResults(examId), onSuccess: (r: { students?: number }) => { toast.success(`Results live · ${r.students ?? 0} students notified 🎉`); invalidate() }, onError: (e) => toast.error(errorMessage(e)) })
  const remove = useMutation({
    mutationFn: () => examApi.remove(examId),
    onSuccess: () => {
      const deletedId = examId
      const nextExamId = (exams.data?.exams ?? []).find((exam) => exam.id !== deletedId)?.id ?? ''
      qc.setQueryData<{ yearLevel: string; exams: ExamRow[] }>(['exam', 'list'], (current) => current ? { ...current, exams: current.exams.filter((exam) => exam.id !== deletedId) } : current)
      toast.success('Exam and all related data deleted')
      setDeleteExamOpen(false)
      setExamId(nextExamId)
      invalidate()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const published = detail.data?.exam.status === 'PUBLISHED'

  return (
    <PageShell title={coordinator ? 'Exam Coordination' : 'Examination System'} subtitle={coordinator ? 'Manage supervision, standby, blocks & paper checking — reassign live for emergencies' : 'Year-level exam blocks, supervision & paper-checking allocation'}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Select className="w-56" value={examId} onChange={(e) => setExamId(e.target.value)}
            options={(exams.data?.exams ?? []).map((x) => ({ value: x.id, label: `${x.name} (${x.status})` }))} placeholder="Select exam" />
          <Button variant="outline" leftIcon={<Plus size={15} />} onClick={() => setNewExamOpen(true)}>New Exam</Button>
        </div>
      }>
      {!examId ? (
        <EmptyState title="No examinations yet" description="Create an examination session (e.g. T-1 Internal) to begin." />
      ) : (
        <>
          {dash.data && (
            <div className="mb-5 grid grid-cols-2 gap-3.5 md:grid-cols-4 xl:grid-cols-6">
              <StatCard value={dash.data.totalSchedules} label="Exam Days" />
              <StatCard value={dash.data.generatedBlocks} label="Blocks" />
              <StatCard value={dash.data.allocatedBlocks} label="Allocated" />
              <StatCard value={dash.data.pendingBlocks} label="Pending" icon={<AlertTriangle size={16} className="text-warning" />} iconBg="var(--warning-light)" />
              <StatCard value={dash.data.standbyFaculties} label="Standby" />
              <StatCard value={dash.data.externalFaculties} label="External" />
            </div>
          )}

          {!coordinator && <CoordinatorsSection />}

          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{detail.data?.exam.name}</span>
              <Badge tone={published ? 'success' : 'warning'}>{published ? 'Published' : 'Draft'}</Badge>
              {detail.data && <Badge tone="primary">{detail.data.exam.yearLevel}</Badge>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" leftIcon={<RefreshCw size={14} />} loading={genBlocks.isPending} disabled={published} onClick={() => genBlocks.mutate()}>Generate Blocks</Button>
              {published
                ? <Button variant="outline" size="sm" leftIcon={<Undo2 size={14} />} loading={unpublish.isPending} onClick={() => unpublish.mutate()}>Unpublish</Button>
                : <Button size="sm" leftIcon={<Send size={14} />} loading={publish.isPending} onClick={() => publish.mutate()}>Publish Duties</Button>}
              <Button variant="outline" size="sm" leftIcon={<Rocket size={14} />} loading={publishResults.isPending} onClick={() => publishResults.mutate()} title="Push checked marks live to students">Publish Results</Button>
              {!coordinator && <Button variant="danger" size="sm" leftIcon={<Trash2 size={14} />} onClick={() => setDeleteExamOpen(true)}>Delete Exam</Button>}
            </div>
          </div>

          <Tabs className="mb-4" value={tab} onChange={setTab} tabs={TABS} />

          {tab === 'calendar' && <CalendarTab examId={examId} schedules={schedules} phase={detail.data?.phase ?? null} published={published} onChange={invalidate} />}
          {tab === 'blocks' && <BlocksTab examId={examId} />}
          {tab === 'external' && <ExternalTab examId={examId} />}
          {(tab === 'supervision' || tab === 'paper' || tab === 'standby') && (
            <div className="space-y-3">
              <Select className="w-full max-w-md" value={scheduleId} onChange={(e) => setScheduleId(e.target.value)}
                options={schedules.map((s) => ({ value: s.id, label: `${s.subjectCode} · ${fmtDate(s.date)} · ${s.startTime}` }))} placeholder="Select an exam day" />
              {!scheduleId ? <EmptyState title="Pick an exam day" description="Choose a subject/day above to allocate." />
                : tab === 'supervision' ? <SupervisionTab scheduleId={scheduleId} />
                : tab === 'paper' ? <PaperTab scheduleId={scheduleId} />
                : <StandbyTab scheduleId={scheduleId} />}
            </div>
          )}
          {tab === 'conflicts' && <ConflictsTab examId={examId} />}
        </>
      )}

      <Modal open={newExamOpen} onClose={() => setNewExamOpen(false)} title="New examination" size="sm"
        footer={<><Button variant="outline" onClick={() => setNewExamOpen(false)}>Cancel</Button>
          <Button loading={create.isPending} onClick={() => newName.trim() && create.mutate({ name: newName, excludeHods })}>Create</Button></>}>
        <Input label="Exam name" placeholder="T-1 Internal Examination" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={excludeHods} onChange={(e) => setExcludeHods(e.target.checked)} className="h-4 w-4 accent-primary" /> Exclude HODs from supervision duty</label>
      </Modal>
      <Modal open={deleteExamOpen} onClose={() => !remove.isPending && setDeleteExamOpen(false)} title="Delete examination" size="sm"
        footer={<><Button variant="outline" disabled={remove.isPending} onClick={() => setDeleteExamOpen(false)}>Cancel</Button>
          <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>Delete permanently</Button></>}>
        <div className="space-y-3 text-sm text-text-secondary">
          <div className="flex items-start gap-3 rounded-sm border border-danger/20 bg-danger/5 p-3 text-danger">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <p>This permanently deletes <strong>{detail.data?.exam.name}</strong> and all schedules, student blocks, allocations, external faculty, and audit data.</p>
          </div>
          <p>This action cannot be undone.</p>
        </div>
      </Modal>
    </PageShell>
  )
}

// ── Calendar ──
function addDaysIso(iso: string, n: number) { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
function clampIso(iso: string, min: string, max: string) { return iso < min ? min : iso > max ? max : iso }

function CalendarTab({ examId, schedules, phase, published, onChange }: { examId: string; schedules: ExamSchedule[]; phase: ExamPhaseWindow | null; published: boolean; onChange: () => void }) {
  const subjects = useQuery({ queryKey: ['exam', 'subjects', examId], queryFn: () => examApi.yearSubjects(examId) })
  const [form, setForm] = useState({ subjectId: '', date: '', startTime: '14:00', endTime: '16:00', coding: false, onStart: '16:30', onEnd: '17:45', onBlockSize: 12 })
  const add = useMutation({
    mutationFn: () => examApi.addSchedule(examId, {
      subjectId: form.subjectId, date: form.date, startTime: form.startTime, endTime: form.endTime,
      ...(form.coding ? { coding: true, online: { startTime: form.onStart, endTime: form.onEnd, blockSize: Number(form.onBlockSize), supervisorsPerBlock: 2 } } : {}),
    }),
    onSuccess: () => { toast.success(form.coding ? 'Offline + online papers added' : 'Exam day added'); setForm((f) => ({ ...f, subjectId: '', date: '', coding: false })); onChange() },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const del = useMutation({ mutationFn: (id: string) => examApi.deleteSchedule(id), onSuccess: () => { toast.success('Removed'); onChange() }, onError: (e) => toast.error(errorMessage(e)) })
  // #2 Subjects already on the exam calendar drop out of the picker.
  const scheduledIds = new Set(schedules.map((s) => s.subjectId))
  const available = (subjects.data ?? []).filter((s) => !scheduledIds.has(s.id))
  const selected = (subjects.data ?? []).find((s) => s.id === form.subjectId)
  // #1 Date is auto-fetched from the Academic Calendar. Prefer the SELECTED subject's own
  // exam date (matched from the calendar); fall back to the next open day in the phase window.
  const fallbackDate = phase ? clampIso(addDaysIso(phase.startDate, schedules.length), phase.startDate, phase.endDate) : ''
  function pickSubject(subjectId: string) {
    const subj = (subjects.data ?? []).find((s) => s.id === subjectId)
    setForm((f) => ({ ...f, subjectId, date: subj?.examDate ?? fallbackDate }))
  }
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2 overflow-hidden">
        <CardHeader title="Exam Calendar" subtitle="One subject per slot; timing drives all allocation" />
        {schedules.length === 0 ? <EmptyState title="No exam days yet" description="Add a subject/date/time on the right." className="border-0" /> : (
          <Table>
            <thead><tr><Th>Subject</Th><Th>Date</Th><Th>Time</Th><Th>Students</Th><Th /></tr></thead>
            <tbody>
              {schedules.map((s) => (
                <Tr key={s.id}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.subjectCode}</span>
                      {s.mode === 'ONLINE'
                        ? <Badge tone="purple">Online {s.componentMax != null ? `/${s.componentMax}` : ''}</Badge>
                        : s.componentMax != null ? <Badge tone="neutral">Offline /{s.componentMax}</Badge> : null}
                      {s.supervisorsPerBlock > 1 && <span className="text-[10px] text-text-muted">{s.supervisorsPerBlock} inv/block</span>}
                    </div>
                    <div className="text-[11px] text-text-muted">{s.subjectName}</div>
                  </Td>
                  <Td>{fmtDate(s.date)}</Td>
                  <Td className="tabular-nums">{s.startTime}–{s.endTime}</Td>
                  <Td className="tabular-nums">{s.studentCount}</Td>
                  <Td className="text-right">{!published && <button title="Remove" onClick={() => del.mutate(s.id)} className="text-text-muted hover:text-danger"><Trash2 size={15} /></button>}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Card>
        <CardHeader title="Add exam day" />
        <CardBody className="space-y-3">
          <div><label className="mb-1 block text-xs font-medium text-text-muted">Subject</label>
            <Select value={form.subjectId} onChange={(e) => pickSubject(e.target.value)}
              placeholder={available.length ? 'Choose subject' : 'All subjects scheduled'}
              options={available.map((s) => ({ value: s.id, label: `${s.code} — ${s.name}${s.examDate ? ` · ${fmtDate(s.examDate)}` : ''}` }))} /></div>
          <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
            min={phase?.startDate} max={phase?.endDate} />
          {!phase
            ? <p className="-mt-1 text-[11px] text-warning">No phase linked — link this exam to a T-phase in the calendar to auto-fill dates.</p>
            : selected?.examDate
            ? <p className="-mt-1 text-[11px] text-success">From Academic Calendar — {selected.code} exam on {fmtDate(selected.examDate)}</p>
            : selected
            ? <p className="-mt-1 text-[11px] text-warning">{selected.code} has no exam entry in the calendar — using next open day in {phase.label}.</p>
            : <p className="-mt-1 text-[11px] text-text-muted">Pick a subject — its date is fetched from the Academic Calendar ({phase.label}: {fmtDate(phase.startDate)} – {fmtDate(phase.endDate)}).</p>}
          <div className="grid grid-cols-2 gap-2">
            <Input label={form.coding ? 'Offline start' : 'Start'} type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            <Input label={form.coding ? 'Offline end' : 'End'} type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.coding} onChange={(e) => setForm({ ...form, coding: e.target.checked })} className="h-4 w-4 accent-primary" />
            Coding subject — add an <b>online</b> paper too
          </label>
          {form.coding && (
            <div className="space-y-2 rounded-sm border border-border bg-surface-2 p-2.5">
              <p className="text-[11px] text-text-muted">Marks split automatically: {phase?.label === 'T4' ? 'offline 35 + online 15 = 50' : 'offline 16 + online 9 = 25'}. Online uses smaller lab blocks with 2 invigilators each.</p>
              <div className="grid grid-cols-2 gap-2">
                <Input label="Online start" type="time" value={form.onStart} onChange={(e) => setForm({ ...form, onStart: e.target.value })} />
                <Input label="Online end" type="time" value={form.onEnd} onChange={(e) => setForm({ ...form, onEnd: e.target.value })} />
              </div>
              <Input label="Online block size (lab seats)" type="number" min={4} max={40} value={String(form.onBlockSize)} onChange={(e) => setForm({ ...form, onBlockSize: Number(e.target.value) })} />
            </div>
          )}
          <Button className="w-full" leftIcon={<Plus size={15} />} loading={add.isPending} disabled={published || !form.subjectId || !form.date}
            onClick={() => add.mutate()}>{form.coding ? 'Add offline + online' : 'Add to calendar'}</Button>
        </CardBody>
      </Card>
    </div>
  )
}

// ── Blocks ──
function BlocksTab({ examId }: { examId: string }) {
  const qc = useQueryClient()
  const blocks = useQuery({ queryKey: ['exam', 'blocks', examId], queryFn: () => examApi.blocks(examId) })
  const room = useMutation({ mutationFn: ({ id, room }: { id: string; room: string }) => examApi.setBlockRoom(id, room), onSuccess: () => qc.invalidateQueries({ queryKey: ['exam'] }), onError: (e) => toast.error(errorMessage(e)) })
  const lock = useMutation({ mutationFn: ({ id, isLocked }: { id: string; isLocked: boolean }) => examApi.lockBlock(id, isLocked), onSuccess: () => qc.invalidateQueries({ queryKey: ['exam'] }), onError: (e) => toast.error(errorMessage(e)) })
  if (blocks.isLoading) return <p className="text-sm text-text-muted">Loading blocks…</p>
  if (!blocks.data?.length) return <EmptyState title="No blocks generated" description="Use “Generate Blocks” above to build 20-student blocks per HOD." />
  return (
    <Card className="overflow-hidden">
      <Table>
        <thead><tr><Th>Block</Th><Th>Owner HOD</Th><Th>Students</Th><Th>Enrollment range</Th><Th>Room</Th><Th /></tr></thead>
        <tbody>
          {blocks.data.map((b) => (
            <Tr key={b.id}>
              <Td className="font-semibold">Block {b.blockNumber}{b.isLocked && <Lock size={12} className="ml-1 inline text-teal" />}</Td>
              <Td>{b.ownerHodName}</Td>
              <Td className="tabular-nums">{b.studentCount}</Td>
              <Td className="font-mono text-[11px]">{b.firstEnrollment} – {b.lastEnrollment}</Td>
              <Td>
                <input defaultValue={b.room ?? ''} placeholder="Room" onBlur={(e) => e.target.value !== (b.room ?? '') && room.mutate({ id: b.id, room: e.target.value })}
                  className="w-24 rounded-sm border border-border bg-surface px-2 py-1 text-xs" />
              </Td>
              <Td className="text-right">
                <button title={b.isLocked ? 'Unlock' : 'Lock'} onClick={() => lock.mutate({ id: b.id, isLocked: !b.isLocked })} className="text-text-muted hover:text-teal">
                  {b.isLocked ? <Lock size={15} /> : <LockOpen size={15} />}
                </button>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </Card>
  )
}

// ── Reusable faculty select/deselect dialog ──
interface PickerFaculty { id: string; label: string; hint?: string; preselected: boolean }
function FacultyPickerModal({ open, title, subtitle, faculty, loading, confirmLabel = 'Allocate', maxSelect, onClose, onConfirm }: {
  open: boolean; title: string; subtitle?: string; faculty: PickerFaculty[]; loading?: boolean
  confirmLabel?: string; maxSelect?: number
  onClose: () => void; onConfirm: (ids: string[]) => void
}) {
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  useEffect(() => { if (open) { setSel(new Set(faculty.filter((f) => f.preselected).map((f) => f.id))); setQ('') } }, [open, faculty])
  const toggle = (id: string) => setSel((s) => {
    const n = new Set(s)
    if (n.has(id)) n.delete(id)
    else { if (maxSelect && n.size >= maxSelect) return s; n.add(id) }
    return n
  })
  const needle = q.trim().toLowerCase()
  const shown = needle ? faculty.filter((f) => f.label.toLowerCase().includes(needle)) : faculty
  return (
    <Modal open={open} onClose={onClose} title={title} size="md"
      footer={<><span className="mr-auto text-xs text-text-muted">{sel.size} selected{maxSelect ? ` / ${maxSelect}` : ''}</span>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button loading={loading} disabled={sel.size === 0} onClick={() => onConfirm([...sel])}>{confirmLabel} ({sel.size})</Button></>}>
      {subtitle && <p className="mb-2 text-xs text-text-muted">{subtitle}</p>}
      <Input placeholder="Search faculty by name or ID…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-2" />
      {!maxSelect && (
        <div className="mb-2 flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setSel(new Set(faculty.map((f) => f.id)))}>Select all</Button>
          <Button size="sm" variant="ghost" onClick={() => setSel(new Set())}>Clear</Button>
        </div>
      )}
      <div className="max-h-80 space-y-1 overflow-y-auto">
        {shown.length === 0 ? <p className="py-6 text-center text-sm text-text-muted">No faculty found.</p> : shown.map((f) => {
          const checked = sel.has(f.id)
          const blocked = !checked && !!maxSelect && sel.size >= maxSelect
          return (
            <label key={f.id} className={cn('flex items-center gap-2 rounded-sm border border-border px-3 py-2 text-sm', blocked ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-surface-2')}>
              <input type="checkbox" checked={checked} disabled={blocked} onChange={() => toggle(f.id)} className="h-4 w-4 accent-primary" />
              <span className="font-medium text-text-primary">{f.label}</span>
              {f.hint && <span className="ml-auto text-[11px] text-text-muted">{f.hint}</span>}
            </label>
          )
        })}
      </div>
    </Modal>
  )
}

// ── Supervision ──
function SupervisionTab({ scheduleId }: { scheduleId: string }) {
  const qc = useQueryClient()
  const [pick, setPick] = useState(false)
  const list = useQuery({ queryKey: ['exam', 'supervision', scheduleId], queryFn: () => examApi.supervision(scheduleId) })
  // Free faculty updates live — an emergency morning swap must see who's actually free now.
  const avail = useQuery({ queryKey: ['exam', 'availability', scheduleId], queryFn: () => examApi.availability(scheduleId), refetchInterval: 15_000 })
  const gen = useMutation({ mutationFn: (ids?: string[]) => examApi.generateSupervision(scheduleId, ids), onSuccess: (r: { unfilled?: number }) => { toast.success(r.unfilled ? `Allocated · ${r.unfilled} unfilled` : 'Supervision allocated'); setPick(false); qc.invalidateQueries({ queryKey: ['exam'] }) }, onError: (e) => toast.error(errorMessage(e)) })
  const edit = useMutation({ mutationFn: ({ id, facultyId }: { id: string; facultyId: string }) => examApi.editSupervision(id, { facultyId }), onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['exam'] }) }, onError: (e) => toast.error(errorMessage(e)) })
  const freeFac = (avail.data?.faculties ?? []).filter((f) => f.free)
  // Only free faculty can invigilate — busy ones are hidden. Availability is already
  // sorted own-year first, then year by year.
  const pickerFaculty: PickerFaculty[] = freeFac.map((f) => ({
    id: f.facultyId, label: `${f.name} (${f.employeeId})`,
    hint: f.isOwnYear ? 'own year' : f.year ?? '', preselected: true,
  }))
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Supervision Allocation" subtitle={avail.data ? `Window ${avail.data.window} · ${freeFac.length} free faculty` : undefined}
        action={<div className="flex gap-2">
          <Button size="sm" variant="outline" leftIcon={<Users size={14} />} onClick={() => setPick(true)}>Select Faculty</Button>
          <Button size="sm" leftIcon={<Wand2 size={14} />} loading={gen.isPending && !pick} onClick={() => gen.mutate(undefined)}>Auto (all free)</Button>
        </div>} />
      {!list.data?.length ? <EmptyState title="Not allocated" description="“Select Faculty” to choose an invigilation pool, or “Auto” to use every free faculty (own year first, then nearby years, then external)." className="border-0" /> : (
        <Table>
          <thead><tr><Th>Block</Th><Th>Room</Th><Th>Supervisor</Th><Th>Source</Th><Th>Reassign (free only)</Th></tr></thead>
          <tbody>
            {list.data.map((a) => (
              <Tr key={a.id}>
                <Td className="font-semibold">Block {a.blockNumber}{a.slot > 1 ? <span className="ml-1 text-[10px] font-normal text-text-muted">inv {a.slot}</span> : ''}</Td>
                <Td>{a.room ?? '—'}</Td>
                <Td>{a.supervisor}</Td>
                <Td><Badge tone={a.source === 'OWN_YEAR' ? 'success' : a.source === 'EXTERNAL' ? 'warning' : 'primary'}>{a.source.replace('_', ' ')}</Badge></Td>
                <Td>
                  <Select className="min-w-[200px]" value={a.facultyId ?? ''} onChange={(e) => e.target.value && edit.mutate({ id: a.id, facultyId: e.target.value })}
                    options={[{ value: '', label: 'Change…' }, ...freeFac.map((f) => ({ value: f.facultyId, label: `${f.name} (${f.employeeId})${f.isOwnYear ? '' : ` · ${f.year}`}` }))]} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      <FacultyPickerModal open={pick} title="Select supervision faculty" subtitle="Free faculty only, own year first. Busy faculty are hidden."
        faculty={pickerFaculty} loading={gen.isPending} onClose={() => setPick(false)} onConfirm={(ids) => gen.mutate(ids)} />
    </Card>
  )
}

// ── Paper checking ──
function PaperTab({ scheduleId }: { scheduleId: string }) {
  const qc = useQueryClient()
  const [pick, setPick] = useState(false)
  const list = useQuery({ queryKey: ['exam', 'paper', scheduleId], queryFn: () => examApi.paperChecking(scheduleId), refetchInterval: 30_000 })
  // Loaded always (not just for the picker) so the per-row reassign dropdown has options.
  const faculty = useQuery({ queryKey: ['exam', 'paperFaculty', scheduleId], queryFn: () => examApi.paperCheckingFaculty(scheduleId) })
  const gen = useMutation({ mutationFn: (ids?: string[]) => examApi.generatePaperChecking(scheduleId, ids), onSuccess: () => { toast.success('Paper checking allocated'); setPick(false); qc.invalidateQueries({ queryKey: ['exam'] }) }, onError: (e) => toast.error(errorMessage(e)) })
  // Paper allocation stays changeable even after the exam is over.
  const reassign = useMutation({ mutationFn: ({ id, facultyId }: { id: string; facultyId: string }) => examApi.editPaperChecking(id, facultyId), onSuccess: () => { toast.success('Checker reassigned'); qc.invalidateQueries({ queryKey: ['exam'] }) }, onError: (e) => toast.error(errorMessage(e)) })
  const checkerOptions = (faculty.data?.faculties ?? []).map((f: PaperCheckFacultyRow) => ({ value: f.id, label: `${f.name} (${f.employeeId})${f.isSubjectFaculty ? ' · subject' : f.isOwnYear ? ' · own year' : f.year ? ` · ${f.year}` : ''}` }))
  const pickerFaculty: PickerFaculty[] = (faculty.data?.faculties ?? []).map((f: PaperCheckFacultyRow) => ({
    id: f.id, label: `${f.name} (${f.employeeId})`,
    hint: f.isSubjectFaculty ? 'subject teacher' : f.isOwnYear ? 'own year' : f.year ?? '', preselected: f.isSubjectFaculty,
  }))
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Paper Checking Allocation" subtitle="Continuous block ranges → checkers · marks entered per block · live to HOD"
        action={<div className="flex gap-2">
          <Button size="sm" variant="outline" leftIcon={<Users size={14} />} onClick={() => setPick(true)}>Select Faculty</Button>
          <Button size="sm" leftIcon={<Wand2 size={14} />} loading={gen.isPending && !pick} onClick={() => gen.mutate(undefined)}>Auto (subject faculty)</Button>
        </div>} />
      {!list.data?.length ? <EmptyState title="Not allocated" description="“Select Faculty” to choose checkers, or “Auto” to split continuous block ranges among the subject's teachers." className="border-0" /> : (
        <Table>
          <thead><tr><Th>Checker</Th><Th>Block range</Th><Th>Blocks</Th><Th>Marking progress</Th><Th>Status</Th><Th>Reassign</Th></tr></thead>
          <tbody>
            {list.data.map((p) => (
              <Tr key={p.id}>
                <Td className="font-medium">{p.faculty}</Td>
                <Td>{p.range}</Td>
                <Td className="tabular-nums">{p.blockCount}</Td>
                <Td className="min-w-[150px]">
                  <div className="flex items-center gap-2">
                    <ProgressBar value={p.totalStudents === 0 ? 0 : (p.markedCount / p.totalStudents) * 100} tone={p.markedCount === p.totalStudents ? 'success' : 'warning'} className="w-20" />
                    <span className="text-xs text-text-muted">{p.markedCount}/{p.totalStudents}</span>
                  </div>
                </Td>
                <Td><Badge tone={p.status === 'Published' ? 'purple' : p.status === 'Complete' ? 'success' : p.status === 'In Progress' ? 'warning' : 'neutral'}>{p.status}</Badge></Td>
                <Td>
                  <Select className="min-w-[190px]" value={p.facultyId} onChange={(e) => e.target.value && e.target.value !== p.facultyId && reassign.mutate({ id: p.id, facultyId: e.target.value })}
                    options={[{ value: p.facultyId, label: 'Change checker…' }, ...checkerOptions.filter((o) => o.value !== p.facultyId)]} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      <FacultyPickerModal open={pick} title="Select paper-checking faculty" subtitle="Subject teachers are pre-selected; add faculty from other years for support."
        faculty={pickerFaculty} loading={gen.isPending} onClose={() => setPick(false)} onConfirm={(ids) => gen.mutate(ids)} />
    </Card>
  )
}

// ── Exam coordinators (per active semester) ──
interface Coordinator { slot: number; facultyId: string | null; name: string | null; employeeId: string | null }
function CoordinatorsSection() {
  const qc = useQueryClient()
  const coords = useQuery({
    queryKey: ['hod', 'exam', 'coordinators'],
    queryFn: () => api.get<{ coordinators: Coordinator[]; facultyOptions: { id: string; name: string; employeeId: string }[] }>('/hod/exam/coordinators').then((r) => r.data),
  })
  const options = coords.data?.facultyOptions ?? []
  const refresh = () => qc.invalidateQueries({ queryKey: ['hod', 'exam', 'coordinators'] })
  const assign = useMutation({ mutationFn: ({ slot, facultyId }: { slot: number; facultyId: string }) => api.post('/hod/exam/coordinators', { slot, facultyId }), onSuccess: () => { toast.success('Coordinator assigned'); refresh() }, onError: (e) => toast.error(errorMessage(e)) })
  const remove = useMutation({ mutationFn: (slot: number) => api.delete(`/hod/exam/coordinators/${slot}`), onSuccess: () => { toast.success('Coordinator removed'); refresh() }, onError: (e) => toast.error(errorMessage(e)) })
  return (
    <Card className="mb-4 p-4">
      <div className="mb-3 flex items-center gap-2"><UserCheck size={16} className="text-purple" /><h3 className="text-sm font-semibold text-text-primary">Exam Coordinators</h3><span className="text-xs text-text-muted">— manage papers &amp; enter marks; never get supervision duty</span></div>
      <div className="grid gap-3 md:grid-cols-2">
        {(coords.data?.coordinators ?? []).map((c) => (
          <CoordSlot key={c.slot} c={c} options={options} onAssign={(fid) => assign.mutate({ slot: c.slot, facultyId: fid })} onRemove={() => remove.mutate(c.slot)} />
        ))}
      </div>
    </Card>
  )
}
function CoordSlot({ c, options, onAssign, onRemove }: { c: Coordinator; options: { id: string; name: string; employeeId: string }[]; onAssign: (id: string) => void; onRemove: () => void }) {
  const [picked, setPicked] = useState('')
  return (
    <div className="flex items-center gap-2 rounded-sm border border-border bg-surface-2 px-3 py-2">
      <span className="text-xs font-medium text-text-muted">Coordinator {c.slot}</span>
      {c.facultyId ? (
        <><div className="ml-1"><div className="text-sm font-medium text-text-primary">{c.name}</div><div className="text-[11px] text-text-muted">{c.employeeId}</div></div>
          <button onClick={onRemove} className="ml-auto text-text-muted hover:text-danger" title="Remove"><X size={15} /></button></>
      ) : (
        <><Select className="ml-1 flex-1" value={picked} onChange={(e) => setPicked(e.target.value)} placeholder="Select faculty" searchable searchPlaceholder="Search faculty…"
            options={options.map((f) => ({ value: f.id, label: `${f.name} (${f.employeeId})` }))} />
          <Button size="sm" disabled={!picked} onClick={() => { onAssign(picked); setPicked('') }}>Assign</Button></>
      )}
    </div>
  )
}

// ── Standby ──
function StandbyTab({ scheduleId }: { scheduleId: string }) {
  const qc = useQueryClient()
  const [pick, setPick] = useState(false)
  const list = useQuery({ queryKey: ['exam', 'standby', scheduleId], queryFn: () => examApi.standby(scheduleId) })
  const faculty = useQuery({ queryKey: ['exam', 'paperFaculty', scheduleId], queryFn: () => examApi.paperCheckingFaculty(scheduleId), enabled: pick })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['exam'] })
  const gen = useMutation({ mutationFn: () => examApi.generateStandby(scheduleId), onSuccess: () => { toast.success('Standby selected'); invalidate() }, onError: (e) => toast.error(errorMessage(e)) })
  const setList = useMutation({ mutationFn: (ids: string[]) => examApi.setStandbyList(scheduleId, ids), onSuccess: () => { toast.success('Standby set'); setPick(false); invalidate() }, onError: (e) => toast.error(errorMessage(e)) })
  const options = (faculty.data?.faculties ?? [])
  const pickerFaculty: PickerFaculty[] = options.map((f: PaperCheckFacultyRow) => ({
    id: f.id, label: `${f.name} (${f.employeeId})`,
    hint: f.isSubjectFaculty ? 'subject teacher' : f.isOwnYear ? 'own year' : f.year ?? '', preselected: false,
  }))
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Standby Faculty" subtitle="Up to 2 subject faculty on standby (not on active duty)"
        action={<div className="flex gap-2">
          <Button size="sm" variant="outline" leftIcon={<Users size={14} />} onClick={() => setPick(true)}>Select / Change</Button>
          <Button size="sm" leftIcon={<Wand2 size={14} />} loading={gen.isPending} onClick={() => gen.mutate()}>Auto-select</Button>
        </div>} />
      {!list.data?.length ? <EmptyState title="No standby" description="“Select / Change” to hand-pick up to 2, or “Auto-select” to pick 2 free subject faculty." className="border-0" /> : (
        <Table>
          <thead><tr><Th>Slot</Th><Th>Faculty</Th><Th>Status</Th><Th>Change</Th></tr></thead>
          <tbody>
            {list.data.map((s) => (
              <Tr key={s.slot}>
                <Td>Standby {s.slot}</Td>
                <Td>{s.faculty}</Td>
                <Td><Badge tone={s.isActive ? 'success' : 'neutral'}>{s.isActive ? 'Active' : 'Standby'}</Badge></Td>
                <Td>
                  <Button size="sm" variant="ghost" onClick={() => setPick(true)}>Change…</Button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      <FacultyPickerModal open={pick} title="Select standby faculty" subtitle="Subject teachers first. Pick up to 2 — they cover if a supervisor is absent." maxSelect={2}
        confirmLabel="Set standby" faculty={pickerFaculty} loading={setList.isPending} onClose={() => setPick(false)} onConfirm={(ids) => setList.mutate(ids)} />
    </Card>
  )
}

// ── External faculty ──
function ExternalTab({ examId }: { examId: string }) {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['exam', 'external', examId], queryFn: () => examApi.external(examId) })
  const [form, setForm] = useState({ name: '', mobile: '', college: '', experience: '', remarks: '' })
  const add = useMutation({ mutationFn: () => examApi.addExternal(examId, form), onSuccess: () => { toast.success('External faculty added'); setForm({ name: '', mobile: '', college: '', experience: '', remarks: '' }); qc.invalidateQueries({ queryKey: ['exam'] }) }, onError: (e) => toast.error(errorMessage(e)) })
  const del = useMutation({ mutationFn: (id: string) => examApi.removeExternal(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['exam'] }), onError: (e) => toast.error(errorMessage(e)) })
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2 overflow-hidden">
        <CardHeader title="External Invigilators" subtitle="Temporary — used only for this examination" />
        {!list.data?.length ? <EmptyState title="None added" description="Add external invigilators on the right; they can then be used in supervision." className="border-0" /> : (
          <Table>
            <thead><tr><Th>Name</Th><Th>College</Th><Th>Mobile</Th><Th>Experience</Th><Th /></tr></thead>
            <tbody>
              {list.data.map((e) => (
                <Tr key={e.id}><Td className="font-medium">{e.name}</Td><Td>{e.college ?? '—'}</Td><Td>{e.mobile ?? '—'}</Td><Td>{e.experience ?? '—'}</Td>
                  <Td className="text-right"><button onClick={() => del.mutate(e.id)} className="text-text-muted hover:text-danger"><Trash2 size={15} /></button></Td></Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Card>
        <CardHeader title="Add external" />
        <CardBody className="space-y-2">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          <Input label="College" value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} />
          <Input label="Experience" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
          <Button className="w-full" leftIcon={<Plus size={15} />} loading={add.isPending} disabled={!form.name.trim()} onClick={() => add.mutate()}>Add</Button>
        </CardBody>
      </Card>
    </div>
  )
}

// ── Conflicts & publish ──
function ConflictsTab({ examId }: { examId: string }) {
  const conflicts = useQuery({ queryKey: ['exam', 'conflicts', examId], queryFn: () => examApi.conflicts(examId) })
  return (
    <Card>
      <CardHeader title="Conflict Detection" subtitle="Validation runs automatically before publishing" />
      <CardBody>
        {conflicts.isLoading ? <p className="text-sm text-text-muted">Checking…</p>
          : conflicts.data?.ok ? (
            <div className="flex items-center gap-2 rounded-md bg-success-light px-4 py-3 text-sm text-success"><CheckCircle2 size={18} /> No conflicts detected — ready to publish.</div>
          ) : (
            <ul className="space-y-2">
              {conflicts.data?.conflicts.map((c, i) => (
                <li key={i} className="flex items-start gap-2 rounded-md bg-danger-light px-4 py-2 text-sm text-danger">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" /><span><b>{c.type.replace(/_/g, ' ')}:</b> {c.detail}</span>
                </li>
              ))}
            </ul>
          )}
      </CardBody>
    </Card>
  )
}
