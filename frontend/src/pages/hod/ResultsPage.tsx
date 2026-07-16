import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ClipboardList, Pencil, Search, ShieldCheck, Upload } from 'lucide-react'
import { hodApi } from '@/api/hod'
import { errorMessage } from '@/api/client'
import { useHodScope } from '@/hooks/hod/useHodScope'
import { useHistoryStore } from '@/stores/historyStore'
import { HistoryBanner } from '@/components/hod/HistoryBanner'
import { cn } from '@/lib/utils'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Table, Td, Th, Tr } from '@/components/ui/Table'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'

// Results are entered by exam checkers and pushed live by the exam coordinators
// (see /hod/exams). This page is the HOD's browser + correction tool.

interface UploadContext {
  phases: { id: string; label: string; number: number }[]
  subjects: { id: string; code: string; name: string }[]
  batches: { id: string; code: string }[]
}
interface PreviewRow {
  resultId: string | null
  enrollmentNo: string
  name: string
  marksObtained: number | null
  maxMarks: number | null
  grade: string | null
  status: string
  isPublished: boolean
}
interface Preview {
  studentCount: number
  avgMarks: number
  belowPassCount: number
  isPublished: boolean
  results: PreviewRow[]
}

export default function ResultsPage() {
  const scope = useHodScope()
  const history = useHistoryStore()
  const semesterId = history.semesterId ?? scope.data?.activeSemester.id

  const [phaseId, setPhaseId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [batchId, setBatchId] = useState('')
  const [editOf, setEditOf] = useState<PreviewRow | null>(null)
  const [search, setSearch] = useState('')

  const ctx = useQuery({
    queryKey: ['hod', 'results', 'ctx', semesterId],
    queryFn: () => hodApi.results.uploadContext(semesterId) as Promise<UploadContext>,
    enabled: !!semesterId,
  })
  const phaseStatus = useQuery({
    queryKey: ['hod', 'results', 'phase-status', semesterId],
    queryFn: () => hodApi.results.phaseStatus(semesterId) as Promise<{ phases: { phase: string; subjectsTotal: number; subjectsUploaded: number; status: string }[] }>,
    enabled: !!semesterId,
  })
  const hist = useQuery({
    queryKey: ['hod', 'results', 'history'],
    queryFn: () => hodApi.results.uploadHistory(1, 8) as Promise<{ data: { phase: string; subjectCode: string; batchCode: string; uploadedAt: string; studentCount: number }[] }>,
  })

  const ready = !!phaseId && !!subjectId && !!batchId
  const preview = useQuery({
    queryKey: ['hod', 'results', 'preview', phaseId, subjectId, batchId],
    queryFn: () => hodApi.results.preview(phaseId, subjectId, batchId) as Promise<Preview>,
    enabled: ready,
    refetchInterval: 15_000, // live view while checkers are entering marks
  })

  const allRows = preview.data?.results ?? []
  const enteredCount = allRows.filter((r) => r.marksObtained != null).length
  const q = search.trim().toLowerCase()
  const rows = q ? allRows.filter((r) => r.name.toLowerCase().includes(q) || r.enrollmentNo.toLowerCase().includes(q)) : allRows

  return (
    <PageShell
      title="Results"
      subtitle="Marks are entered by exam checkers and pushed live by your coordinators — browse and correct here"
      action={
        <Link to="/hod/exams">
          <Button variant="outline" leftIcon={<ShieldCheck size={15} />}>Exam Panel</Button>
        </Link>
      }
    >
      <HistoryBanner />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Filter bar */}
          <Card>
            <CardBody>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Labeled label="Phase">
                  <Select value={phaseId} onChange={(e) => setPhaseId(e.target.value)} placeholder="Select phase"
                    options={ctx.data?.phases.map((p) => ({ value: p.id, label: p.label })) ?? []} />
                </Labeled>
                <Labeled label="Subject">
                  <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} placeholder="Select subject"
                    options={ctx.data?.subjects.map((s) => ({ value: s.id, label: s.code })) ?? []} />
                </Labeled>
                <Labeled label="Batch">
                  <Select value={batchId} onChange={(e) => setBatchId(e.target.value)} placeholder="Select batch"
                    options={ctx.data?.batches.map((b) => ({ value: b.id, label: b.code })) ?? []} />
                </Labeled>
              </div>
            </CardBody>
          </Card>

          {/* Results table */}
          {!ready ? (
            <Card>
              <EmptyState icon={<ClipboardList size={22} />} title="Pick a paper" description="Select phase, subject and batch to view results." />
            </Card>
          ) : preview.isLoading || !preview.data ? (
            <Card><CardBody className="flex justify-center py-10"><Spinner /></CardBody></Card>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniStat label="Students" value={preview.data.studentCount} />
                <MiniStat label="Marks Entered" value={`${enteredCount}/${preview.data.studentCount}`} />
                <MiniStat label="Avg Marks" value={`${Math.round(preview.data.avgMarks)}%`} />
                <MiniStat label="Below Pass" value={preview.data.belowPassCount} tone="danger" />
              </div>

              <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <span className="text-sm font-semibold text-text-primary">Marks</span>
                  <div className="flex items-center gap-2">
                    <Input
                      leftIcon={<Search size={14} />}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search name or enrollment no…"
                      className="h-8 w-56"
                    />
                    <Badge tone={preview.data.isPublished ? 'purple' : enteredCount === 0 ? 'neutral' : 'warning'}>
                      {preview.data.isPublished ? 'Live for students' : enteredCount < preview.data.studentCount ? 'Checking in progress' : 'Awaiting coordinator push'}
                    </Badge>
                  </div>
                </div>
                <Table>
                  <thead><tr><Th>Student</Th><Th>Marks</Th><Th>Grade</Th><Th>Status</Th><Th /></tr></thead>
                  <tbody>
                    {rows.length === 0 && (
                      <Tr><Td colSpan={5} className="py-6 text-center text-text-muted">No students match “{search}”.</Td></Tr>
                    )}
                    {rows.map((r) => (
                      <Tr key={r.enrollmentNo}>
                        <Td>
                          <div className="font-medium">{r.name}</div>
                          <div className="font-mono text-[11px] text-text-muted">{r.enrollmentNo}</div>
                        </Td>
                        <Td>{r.marksObtained != null ? `${r.marksObtained}/${r.maxMarks}` : <span className="text-text-muted">—</span>}</Td>
                        <Td>{r.grade ? <Badge tone={r.grade === 'F' ? 'danger' : 'neutral'}>{r.grade}</Badge> : '—'}</Td>
                        <Td>
                          <Badge tone={r.status === 'Fail' ? 'danger' : r.status === 'Pending' ? 'neutral' : 'success'}>{r.status}</Badge>
                        </Td>
                        <Td>
                          {r.resultId && (
                            <button onClick={() => setEditOf(r)} className="text-text-muted hover:text-primary" title="Correct marks">
                              <Pencil size={14} />
                            </button>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Phase Completion" />
            <CardBody className="space-y-2 pt-0">
              {phaseStatus.data?.phases.map((p) => (
                <div key={p.phase} className="flex items-center justify-between rounded-sm border border-border px-3 py-2">
                  <span className="text-sm font-semibold">{p.phase}</span>
                  <span className="text-xs text-text-muted">{p.subjectsUploaded}/{p.subjectsTotal}</span>
                  <Badge tone={p.status === 'Complete' ? 'success' : p.status === 'In Progress' ? 'warning' : 'neutral'}>{p.status}</Badge>
                </div>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Recent Mark Entries" />
            <CardBody className="space-y-2 pt-0">
              {history.data?.data.map((h, i) => (
                <div key={i} className="flex items-center gap-2 border-b border-border-light py-2 text-sm last:border-0">
                  <Upload size={14} className="text-text-muted" />
                  <span className="font-semibold">{h.phase}</span>
                  <span className="text-text-secondary">{h.subjectCode} · {h.batchCode}</span>
                  <span className="ml-auto text-xs text-text-muted">{h.studentCount}</span>
                </div>
              ))}
              {history.data && history.data.data.length === 0 && <p className="py-4 text-center text-xs text-text-muted">No marks entered yet.</p>}
            </CardBody>
          </Card>
        </div>
      </div>

      <EditMarksModal row={editOf} onClose={() => setEditOf(null)} />
    </PageShell>
  )
}

function EditMarksModal({ row, onClose }: { row: PreviewRow | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [marks, setMarks] = useState('')
  const max = row?.maxMarks ?? 25

  const save = useMutation({
    mutationFn: () => {
      const m = Number(marks)
      return hodApi.results.updateOne(row!.resultId!, m, gradeFor(m, max))
    },
    onSuccess: () => {
      toast.success('Marks corrected')
      qc.invalidateQueries({ queryKey: ['hod', 'results'] })
      onClose()
      setMarks('')
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const invalid = marks === '' || !Number.isFinite(Number(marks)) || Number(marks) < 0 || Number(marks) > max

  return (
    <Modal
      open={!!row}
      onClose={() => { onClose(); setMarks('') }}
      title={`Correct marks — ${row?.name ?? ''}`}
      footer={
        <>
          <Button variant="outline" onClick={() => { onClose(); setMarks('') }}>Cancel</Button>
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={invalid}>Save Correction</Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-text-muted">
          Current: <b>{row?.marksObtained}/{row?.maxMarks}</b> ({row?.grade}){row?.isPublished ? ' · already live for the student' : ''}
        </p>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">New marks (out of {max})</label>
          <Input type="number" min={0} max={max} step={0.5} value={marks} onChange={(e) => setMarks(e.target.value)} placeholder={String(row?.marksObtained ?? '')} />
        </div>
      </div>
    </Modal>
  )
}

function gradeFor(marks: number, max: number): string {
  const pct = (marks / max) * 100
  if (pct >= 90) return 'A+'
  if (pct >= 80) return 'A'
  if (pct >= 70) return 'B'
  if (pct >= 60) return 'C'
  if (pct >= 50) return 'D'
  return 'F'
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</label>{children}</div>
}
function MiniStat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'danger' }) {
  return (
    <div className="rounded-sm border border-border bg-surface-2 p-3 text-center">
      <div className={cn('text-xl font-bold', tone === 'danger' ? 'text-danger' : 'text-text-primary')}>{value}</div>
      <div className="text-xs text-text-muted">{label}</div>
    </div>
  )
}
