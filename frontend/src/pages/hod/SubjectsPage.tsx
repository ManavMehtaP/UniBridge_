import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { BookOpen, FileText, Pencil, Plus, Trash2, UserPlus, Users, X } from 'lucide-react'
import { hodApi } from '@/api/hod'
import { errorMessage } from '@/api/client'
import { useHodScope } from '@/hooks/hod/useHodScope'
import { useDebounce } from '@/hooks/shared/useDebounce'
import type { SubjectRow } from '@/types/hod'
import { PageShell } from '@/components/shared/PageShell'
import { FilterBar } from '@/components/shared/FilterBar'
import { SearchInput } from '@/components/shared/SearchInput'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { CardSkeleton, StatCardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SubjectFormModal } from './subjects/SubjectFormModal'

type FacultyGroup = { facultyId: string; name: string; batches: string[] }

function groupByFaculty(assignments: NonNullable<SubjectRow['assignments']>): FacultyGroup[] {
  const m = new Map<string, FacultyGroup>()
  for (const a of assignments) {
    const g = m.get(a.facultyId) ?? { facultyId: a.facultyId, name: a.facultyName, batches: [] }
    if (!g.batches.includes(a.batchCode)) g.batches.push(a.batchCode)
    m.set(a.facultyId, g)
  }
  return [...m.values()]
}

export default function SubjectsPage() {
  const qc = useQueryClient()
  const scope = useHodScope()
  const semesterId = scope.data?.activeSemester.id

  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [editing, setEditing] = useState<SubjectRow | 'new' | null>(null)
  const [deleteOf, setDeleteOf] = useState<SubjectRow | null>(null)
  const [manageOf, setManageOf] = useState<string | null>(null)

  const debouncedSearch = useDebounce(search)
  const filters = useMemo(
    () => ({ semesterId, search: debouncedSearch || undefined, type: type || undefined }),
    [semesterId, debouncedSearch, type],
  )

  const list = useQuery({
    queryKey: ['hod', 'subjects', filters],
    queryFn: () => hodApi.subjects.list(filters),
    enabled: !!semesterId,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['hod', 'subjects'] })

  const del = useMutation({
    mutationFn: (id: string) => hodApi.subjects.remove(id),
    onSuccess: () => { toast.success('Subject deleted'); invalidate(); setDeleteOf(null) },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const summary = list.data?.summary
  const subjects = list.data?.data ?? []
  const manageSubject = manageOf ? subjects.find((s) => s.id === manageOf) ?? null : null

  return (
    <PageShell
      title="Subjects"
      subtitle={scope.data ? scope.data.activeSemester.label : 'Manage subjects & faculty'}
      action={<Button leftIcon={<Plus size={15} />} onClick={() => setEditing('new')}>Add Subject</Button>}
    >
      <div className="mb-5 grid grid-cols-2 gap-3.5 md:grid-cols-4">
        {list.isLoading ? (
          <StatCardSkeleton count={4} />
        ) : summary ? (
          <>
            <StatCard value={summary.totalSubjects} label="Total Subjects" icon={<BookOpen size={18} className="text-primary" />} iconBg="var(--primary-light)" />
            <StatCard value={summary.totalCredits} label="Total Credits" icon={<BookOpen size={18} className="text-teal" />} iconBg="var(--teal-light)" />
            <StatCard value={summary.assignedCount} label="With Faculty" icon={<Users size={18} className="text-success" />} iconBg="var(--success-light)" />
            <StatCard value={summary.unassignedCount} label="Unassigned" icon={<Users size={18} className="text-warning" />} iconBg="var(--warning-light)" />
          </>
        ) : null}
      </div>

      <FilterBar>
        <div className="w-64 max-w-full">
          <SearchInput value={search} onChange={setSearch} placeholder="Search subjects" />
        </div>
        <Select className="w-40" value={type} onChange={(e) => setType(e.target.value)} placeholder="All Types">
          <option value="Theory">Theory</option>
          <option value="Practical">Practical</option>
          <option value="Lab">Lab</option>
        </Select>
      </FilterBar>

      {list.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} height={200} />)}</div>
      ) : subjects.length === 0 ? (
        <Card><EmptyState icon={<BookOpen size={22} />} title="No subjects" description="Add a subject to get started." className="border-0" /></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {subjects.map((s) => {
            const groups = groupByFaculty(s.assignments ?? [])
            return (
              <Card key={s.id} className="flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-text-primary">{s.code}</h3>
                      <Badge tone="neutral">{s.type}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-text-secondary">{s.name}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-bold text-primary">{s.credits}</div>
                    <div className="text-[10px] uppercase tracking-wide text-text-muted">credits</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                    Faculty {groups.length > 0 && <span className="text-text-muted">({groups.length})</span>}
                  </span>
                  {s.pyqUploaded && <Badge tone="success" className="gap-1"><FileText size={11} /> PYQ</Badge>}
                </div>

                <div className="mt-2 flex-1 space-y-1.5">
                  {groups.length === 0 ? (
                    <p className="rounded-sm bg-warning-light/40 px-2.5 py-2 text-xs font-medium text-warning">No faculty assigned yet</p>
                  ) : (
                    groups.map((g) => (
                      <div key={g.facultyId} className="flex items-center gap-2 rounded-sm bg-surface-2 px-2.5 py-1.5">
                        <Avatar name={g.name} size={22} />
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text-primary">{g.name}</span>
                        <div className="flex flex-wrap justify-end gap-1">
                          {g.batches.map((b) => <Badge key={b} tone="primary" className="px-1.5 py-0 text-[10px]">{b}</Badge>)}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2 border-t border-border-light pt-3">
                  <Button size="sm" variant="outline" leftIcon={<UserPlus size={14} />} onClick={() => setManageOf(s.id)} className="flex-1">
                    Manage Faculty
                  </Button>
                  <button onClick={() => setEditing(s)} className="flex h-8 w-8 items-center justify-center rounded-sm text-text-secondary hover:bg-primary-light hover:text-primary" title="Edit subject">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => setDeleteOf(s)} className="flex h-8 w-8 items-center justify-center rounded-sm text-text-secondary hover:bg-danger-light hover:text-danger" title="Delete subject">
                    <Trash2 size={15} />
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {editing && semesterId && (
        <SubjectFormModal
          semesterId={semesterId}
          subject={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={invalidate}
        />
      )}

      {manageSubject && semesterId && (
        <ManageFacultyModal
          subject={manageSubject}
          semesterId={semesterId}
          onClose={() => setManageOf(null)}
          onChanged={invalidate}
        />
      )}

      <ConfirmDialog
        open={!!deleteOf}
        title="Delete subject?"
        message={<>Delete <b>{deleteOf?.code}</b>? Blocked if it has results or attendance recorded.</>}
        destructive
        confirmLabel="Delete"
        loading={del.isPending}
        onConfirm={() => deleteOf && del.mutate(deleteOf.id)}
        onCancel={() => setDeleteOf(null)}
      />
    </PageShell>
  )
}

function ManageFacultyModal({ subject, semesterId, onClose, onChanged }: {
  subject: SubjectRow
  semesterId: string
  onClose: () => void
  onChanged: () => void
}) {
  const scope = useHodScope()
  const [facultyId, setFacultyId] = useState('')
  const [batchId, setBatchId] = useState('')

  const faculty = useQuery({ queryKey: ['hod', 'faculty-all'], queryFn: () => hodApi.faculty.list({ limit: 100 }) })
  const facultyOpts = (faculty.data?.data ?? []).filter((f) => !f.isHod).map((f) => ({ value: f.id, label: f.name }))
  const batchOpts = (scope.data?.batches ?? []).map((b) => ({ value: b.id, label: b.code }))

  const assignments = subject.assignments ?? []

  const assign = useMutation({
    mutationFn: () => hodApi.faculty.assign({ facultyId, subjectId: subject.id, batchId, semesterId }),
    onSuccess: () => { toast.success('Faculty assigned'); setFacultyId(''); setBatchId(''); onChanged() },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const unassign = useMutation({
    mutationFn: (id: string) => hodApi.faculty.unassign(id),
    onSuccess: () => { toast.success('Assignment removed'); onChanged() },
    onError: (e) => toast.error(errorMessage(e)),
  })

  // prevent duplicate (faculty, batch) for this subject
  const duplicate = assignments.some((a) => a.facultyId === facultyId && a.batchId === batchId)

  return (
    <Modal
      open onClose={onClose} size="lg"
      title={`Manage Faculty — ${subject.code}`}
      footer={<Button variant="outline" onClick={onClose}>Done</Button>}
    >
      <div className="space-y-4">
        <p className="text-xs text-text-muted">
          A subject can be taught by <b>many faculty</b> — one per batch, or several sharing batches. Assignments below drive the timetable, attendance, and exam-checker options.
        </p>

        {/* current assignments */}
        <div className="space-y-1.5">
          {assignments.length === 0 ? (
            <p className="rounded-sm bg-surface-2 px-3 py-4 text-center text-sm text-text-muted">No faculty assigned yet.</p>
          ) : (
            assignments.map((a) => (
              <div key={a.id} className="flex items-center gap-2.5 rounded-sm border border-border px-3 py-2">
                <Avatar name={a.facultyName} size={26} />
                <span className="flex-1 text-sm font-medium text-text-primary">{a.facultyName}</span>
                <Badge tone="primary">Batch {a.batchCode}</Badge>
                <button
                  onClick={() => unassign.mutate(a.id)}
                  disabled={unassign.isPending}
                  className="flex h-7 w-7 items-center justify-center rounded-sm text-text-muted hover:bg-danger-light hover:text-danger"
                  title="Remove assignment"
                >
                  <X size={15} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* add assignment */}
        <div className="rounded-sm border border-dashed border-border p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Assign a faculty</div>
          <div className="flex flex-wrap items-end gap-2">
            <Select className="min-w-44 flex-1" value={facultyId} onChange={(e) => setFacultyId(e.target.value)} placeholder="Select faculty" options={facultyOpts} />
            <Select className="w-32" value={batchId} onChange={(e) => setBatchId(e.target.value)} placeholder="Batch" options={batchOpts} />
            <Button leftIcon={<Plus size={15} />} onClick={() => assign.mutate()} loading={assign.isPending} disabled={!facultyId || !batchId || duplicate}>
              Add
            </Button>
          </div>
          {duplicate && <p className="mt-1.5 text-xs text-warning">That faculty is already assigned to this batch for this subject.</p>}
        </div>
      </div>
    </Modal>
  )
}
