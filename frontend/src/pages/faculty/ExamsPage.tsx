import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, ClipboardCheck, Plus, Rocket, ShieldCheck, Trash2 } from 'lucide-react'
import { api, errorMessage } from '@/api/client'
import { PageShell } from '@/components/shared/PageShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Table, Th, Td, Tr } from '@/components/ui/Table'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'

interface ExamAssignment {
  id: string; phaseId: string; phaseLabel: string; subjectCode: string; batchCode: string
  facultyName: string; fromEnrollmentNo: string; toEnrollmentNo: string
  totalStudents: number; markedCount: number
  status: 'Pending' | 'In Progress' | 'Complete' | 'Published'
}
interface ExamContext {
  phases: { id: string; label: string; number: number; entryMax: number }[]
  subjects: { id: string; code: string; name: string }[]
  batches: { id: string; code: string }[]
  faculty: { id: string; name: string; employeeId: string }[]
}
interface AssignmentStudents {
  assignment: { id: string; phaseLabel: string; entryMax: number; subjectCode: string; subjectName: string; batchCode: string; isPublished: boolean }
  students: { enrollmentId: string; rollNo: string; enrollmentNo: string; name: string; enteredMarks: number | null; grade: string | null; isPublished: boolean }[]
}

const examApi = {
  status: () => api.get<{ isCoordinator: boolean; slot: number | null }>('/faculty/exam/status').then((r) => r.data),
  context: () => api.get<ExamContext>('/faculty/exam/context').then((r) => r.data),
  assignments: (all: boolean, phaseId?: string) =>
    api.get<{ data: ExamAssignment[] }>('/faculty/exam/assignments', { params: { all: all ? '1' : undefined, phaseId: phaseId || undefined } }).then((r) => r.data),
  create: (body: Record<string, string>) => api.post('/faculty/exam/assignments', body).then((r) => r.data),
  remove: (id: string) => api.delete(`/faculty/exam/assignments/${id}`).then((r) => r.data),
  students: (id: string) => api.get<AssignmentStudents>(`/faculty/exam/assignments/${id}/students`).then((r) => r.data),
  saveMarks: (id: string, marks: { enrollmentId: string; marks: number | null }[]) =>
    api.post(`/faculty/exam/assignments/${id}/marks`, { marks }).then((r) => r.data),
  publish: (phaseId: string) => api.post<{ studentCount: number }>('/faculty/exam/publish', { phaseId }).then((r) => r.data),
}

const STATUS_TONE = { Pending: 'neutral', 'In Progress': 'warning', Complete: 'success', Published: 'purple' } as const

export default function FacultyExamsPage() {
  const [openId, setOpenId] = useState<string | null>(null)
  const status = useQuery({ queryKey: ['faculty', 'exam', 'status'], queryFn: examApi.status })
  const mine = useQuery({ queryKey: ['faculty', 'exam', 'mine'], queryFn: () => examApi.assignments(false) })

  if (openId) return <MarksEntry assignmentId={openId} onBack={() => setOpenId(null)} />

  return (
    <PageShell
      title="Exams"
      subtitle={status.data?.isCoordinator ? `You are Exam-Coordinator-${status.data.slot}` : 'Your paper-checking duties'}
    >
      <Card className="overflow-hidden">
        <div className="border-b border-border p-4">
          <h3 className="text-sm font-semibold text-text-primary">My Paper Sets</h3>
          <p className="text-xs text-text-muted">T1–T3 are out of 25 · T4 is entered out of 50 and stored as ÷2</p>
        </div>
        {mine.isLoading ? (
          <div className="p-4"><CardSkeleton height={140} /></div>
        ) : (mine.data?.data ?? []).length === 0 ? (
          <EmptyState icon={<ClipboardCheck size={22} />} title="No papers assigned" description="The exam coordinator hasn't assigned you any papers yet." />
        ) : (
          <Table>
            <thead><tr><Th>Phase</Th><Th>Subject</Th><Th>Batch</Th><Th>Enrollment Range</Th><Th>Progress</Th><Th>Status</Th><Th /></tr></thead>
            <tbody>
              {mine.data?.data.map((a) => (
                <Tr key={a.id} className="cursor-pointer" onClick={() => setOpenId(a.id)}>
                  <Td>{a.phaseLabel}</Td>
                  <Td className="font-medium">{a.subjectCode}</Td>
                  <Td>{a.batchCode}</Td>
                  <Td className="whitespace-nowrap text-xs">{a.fromEnrollmentNo} – {a.toEnrollmentNo}</Td>
                  <Td className="min-w-[130px]">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={a.totalStudents === 0 ? 0 : (a.markedCount / a.totalStudents) * 100} tone={a.markedCount === a.totalStudents ? 'success' : 'warning'} className="w-20" />
                      <span className="text-xs text-text-muted">{a.markedCount}/{a.totalStudents}</span>
                    </div>
                  </Td>
                  <Td><Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge></Td>
                  <Td><Button size="sm" variant="outline">{a.status === 'Published' ? 'View' : 'Enter Marks'}</Button></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {status.data?.isCoordinator && <CoordinatorDesk />}
    </PageShell>
  )
}

// ─── Marks entry (checker view) ─────────────────────────────
function MarksEntry({ assignmentId, onBack }: { assignmentId: string; onBack: () => void }) {
  const qc = useQueryClient()
  const detail = useQuery({ queryKey: ['faculty', 'exam', 'students', assignmentId], queryFn: () => examApi.students(assignmentId) })
  const [marks, setMarks] = useState<Record<string, string>>({})

  useEffect(() => {
    if (detail.data) {
      setMarks(Object.fromEntries(detail.data.students.map((s) => [s.enrollmentId, s.enteredMarks == null ? '' : String(s.enteredMarks)])))
    }
  }, [detail.data])

  const save = useMutation({
    mutationFn: () =>
      examApi.saveMarks(assignmentId, Object.entries(marks).map(([enrollmentId, v]) => ({ enrollmentId, marks: v === '' ? null : Number(v) }))),
    onSuccess: (r: { saved: number }) => { toast.success(`Saved marks for ${r.saved} students`); qc.invalidateQueries({ queryKey: ['faculty', 'exam'] }) },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const a = detail.data?.assignment
  const entryMax = a?.entryMax ?? 25
  const invalid = Object.values(marks).some((v) => v !== '' && (!Number.isFinite(Number(v)) || Number(v) < 0 || Number(v) > entryMax))

  return (
    <PageShell
      title={a ? `${a.subjectCode} — ${a.phaseLabel}` : 'Enter Marks'}
      subtitle={a ? `Batch ${a.batchCode} · out of ${entryMax}${entryMax === 50 ? ' (stored ÷2, max 25)' : ''}` : ''}
      action={
        <div className="flex gap-2">
          <Button variant="outline" leftIcon={<ArrowLeft size={15} />} onClick={onBack}>Back</Button>
          {!a?.isPublished && <Button onClick={() => save.mutate()} loading={save.isPending} disabled={invalid || detail.isLoading}>Save Marks</Button>}
        </div>
      }
    >
      {a?.isPublished && <div className="mb-4"><Badge tone="purple">Published — read only</Badge></div>}
      {detail.isLoading ? (
        <CardSkeleton height={300} />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <thead><tr><Th>Roll No</Th><Th>Enrollment No</Th><Th>Student</Th><Th>Marks / {entryMax}</Th><Th>Grade</Th></tr></thead>
            <tbody>
              {detail.data?.students.map((s) => (
                <Tr key={s.enrollmentId}>
                  <Td className="whitespace-nowrap">{s.rollNo}</Td>
                  <Td className="whitespace-nowrap text-xs">{s.enrollmentNo}</Td>
                  <Td className="font-medium">{s.name}</Td>
                  <Td>
                    <Input
                      type="number" min={0} max={entryMax} step={0.5}
                      value={marks[s.enrollmentId] ?? ''}
                      disabled={a?.isPublished}
                      onChange={(e) => setMarks((m) => ({ ...m, [s.enrollmentId]: e.target.value }))}
                      className="h-8 w-24"
                    />
                  </Td>
                  <Td>{s.grade ?? '—'}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </PageShell>
  )
}

// ─── Coordinator desk ───────────────────────────────────────
function CoordinatorDesk() {
  const qc = useQueryClient()
  const ctx = useQuery({ queryKey: ['faculty', 'exam', 'context'], queryFn: examApi.context })
  const all = useQuery({ queryKey: ['faculty', 'exam', 'all'], queryFn: () => examApi.assignments(true), refetchInterval: 10_000 })
  const [form, setForm] = useState({ phaseId: '', subjectId: '', batchId: '', facultyId: '', fromEnrollmentNo: '', toEnrollmentNo: '' })
  const [deleteOf, setDeleteOf] = useState<ExamAssignment | null>(null)
  const [publishPhase, setPublishPhase] = useState('')
  const [confirmPublish, setConfirmPublish] = useState(false)

  const refresh = () => qc.invalidateQueries({ queryKey: ['faculty', 'exam'] })

  const create = useMutation({
    mutationFn: () => examApi.create(form),
    onSuccess: (r: { studentCount: number }) => {
      toast.success(`Assigned ${r.studentCount} papers`)
      setForm((f) => ({ ...f, facultyId: '', fromEnrollmentNo: '', toEnrollmentNo: '' }))
      refresh()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const del = useMutation({
    mutationFn: (id: string) => examApi.remove(id),
    onSuccess: () => { toast.success('Assignment removed'); setDeleteOf(null); refresh() },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const publish = useMutation({
    mutationFn: () => examApi.publish(publishPhase),
    onSuccess: (r) => { toast.success(`Results pushed live for ${r.studentCount} students 🎉`); setConfirmPublish(false); refresh() },
    onError: (e) => { toast.error(errorMessage(e)); setConfirmPublish(false) },
  })

  const rows = all.data?.data ?? []
  const formReady = Object.values(form).every(Boolean)
  const phaseRows = rows.filter((r) => r.phaseId === publishPhase)
  const phaseComplete = phaseRows.length > 0 && phaseRows.every((r) => r.status === 'Complete' || r.status === 'Published')

  return (
    <>
      <Card className="mt-5 p-4">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck size={16} className="text-purple" />
          <h3 className="text-sm font-semibold text-text-primary">Coordinator Desk — Assign Papers</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Select value={form.phaseId} onChange={(e) => setForm((f) => ({ ...f, phaseId: e.target.value }))} placeholder="Phase"
            options={(ctx.data?.phases ?? []).map((p) => ({ value: p.id, label: `${p.label} (/${p.entryMax})` }))} />
          <Select value={form.subjectId} onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))} placeholder="Subject"
            options={(ctx.data?.subjects ?? []).map((s) => ({ value: s.id, label: s.code }))} />
          <Select value={form.batchId} onChange={(e) => setForm((f) => ({ ...f, batchId: e.target.value }))} placeholder="Batch"
            options={(ctx.data?.batches ?? []).map((b) => ({ value: b.id, label: `Batch ${b.code}` }))} />
          <Select value={form.facultyId} onChange={(e) => setForm((f) => ({ ...f, facultyId: e.target.value }))} placeholder="Checker"
            options={(ctx.data?.faculty ?? []).map((f) => ({ value: f.id, label: f.name }))} />
          <Input placeholder="From enrollment no" value={form.fromEnrollmentNo} onChange={(e) => setForm((f) => ({ ...f, fromEnrollmentNo: e.target.value }))} />
          <Input placeholder="To enrollment no" value={form.toEnrollmentNo} onChange={(e) => setForm((f) => ({ ...f, toEnrollmentNo: e.target.value }))} />
        </div>
        <div className="mt-3 flex justify-end">
          <Button leftIcon={<Plus size={15} />} onClick={() => create.mutate()} disabled={!formReady} loading={create.isPending}>Assign Papers</Button>
        </div>
      </Card>

      <Card className="mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">All Assignments — Status</h3>
            <p className="text-xs text-text-muted">Auto-refreshes every 10 seconds</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={publishPhase} onChange={(e) => setPublishPhase(e.target.value)} placeholder="Phase to publish"
              options={(ctx.data?.phases ?? []).map((p) => ({ value: p.id, label: p.label }))} className="w-40" />
            <Button leftIcon={<Rocket size={15} />} disabled={!publishPhase || !phaseComplete} onClick={() => setConfirmPublish(true)}>
              Push Live
            </Button>
          </div>
        </div>
        {publishPhase && !phaseComplete && (
          <div className="border-b border-border bg-warning-light/40 px-4 py-2 text-xs text-warning">
            {phaseRows.length === 0 ? 'No assignments exist for this phase yet.' : 'All assignments must be Complete before pushing live.'}
          </div>
        )}
        {rows.length === 0 ? (
          <EmptyState icon={<ClipboardCheck size={22} />} title="No assignments yet" description="Assign papers to faculty above." />
        ) : (
          <Table>
            <thead><tr><Th>Phase</Th><Th>Subject</Th><Th>Batch</Th><Th>Range</Th><Th>Checker</Th><Th>Progress</Th><Th>Status</Th><Th /></tr></thead>
            <tbody>
              {rows.map((a) => (
                <Tr key={a.id}>
                  <Td>{a.phaseLabel}</Td>
                  <Td className="font-medium">{a.subjectCode}</Td>
                  <Td>{a.batchCode}</Td>
                  <Td className="whitespace-nowrap text-xs">{a.fromEnrollmentNo} – {a.toEnrollmentNo}</Td>
                  <Td>{a.facultyName}</Td>
                  <Td className="min-w-[130px]">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={a.totalStudents === 0 ? 0 : (a.markedCount / a.totalStudents) * 100} tone={a.markedCount === a.totalStudents ? 'success' : 'warning'} className="w-20" />
                      <span className="text-xs text-text-muted">{a.markedCount}/{a.totalStudents}</span>
                    </div>
                  </Td>
                  <Td><Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge></Td>
                  <Td>
                    {a.status !== 'Published' && (
                      <button onClick={() => setDeleteOf(a)} className="text-text-muted hover:text-danger" title="Remove assignment"><Trash2 size={14} /></button>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <ConfirmDialog
        open={!!deleteOf}
        title="Remove assignment?"
        message={<>Remove <b>{deleteOf?.subjectCode} {deleteOf?.phaseLabel}</b> ({deleteOf?.fromEnrollmentNo} – {deleteOf?.toEnrollmentNo}) from {deleteOf?.facultyName}? Entered marks are kept.</>}
        destructive
        loading={del.isPending}
        onConfirm={() => deleteOf && del.mutate(deleteOf.id)}
        onCancel={() => setDeleteOf(null)}
      />
      <ConfirmDialog
        open={confirmPublish}
        title="Push results live?"
        message="Every student in the assigned ranges will see their marks and get a notification. This cannot be undone."
        loading={publish.isPending}
        onConfirm={() => publish.mutate()}
        onCancel={() => setConfirmPublish(false)}
      />
    </>
  )
}
