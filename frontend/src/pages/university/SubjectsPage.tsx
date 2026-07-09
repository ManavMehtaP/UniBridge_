import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { BookOpen, Download, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { universityApi, type UniSubject } from '@/api/university'
import { errorMessage } from '@/api/client'
import { PageShell } from '@/components/shared/PageShell'
import { FilterBar } from '@/components/shared/FilterBar'
import { CsvUploadModal } from '@/components/shared/CsvUploadModal'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Table, Td, Th, Tr } from '@/components/ui/Table'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

const TYPES = ['THEORY', 'PRACTICAL', 'LAB', 'TUTORIAL']

export default function UniSubjectsPage() {
  const qc = useQueryClient()
  const [academicYearId, setAcademicYearId] = useState('')
  const [semesterId, setSemesterId] = useState('')
  const [branch, setBranch] = useState('')
  const [editing, setEditing] = useState<UniSubject | 'new' | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [deleteOf, setDeleteOf] = useState<UniSubject | null>(null)

  const years = useQuery({ queryKey: ['uni', 'years'], queryFn: universityApi.years })
  const branches = useQuery({ queryKey: ['uni', 'branches'], queryFn: universityApi.branches })
  const list = useQuery({
    queryKey: ['uni', 'subjects', academicYearId, semesterId, branch],
    queryFn: () => universityApi.subjects({ academicYearId: academicYearId || undefined, semesterId: semesterId || undefined, branch: branch || undefined }),
  })

  const yearSemesters = useMemo(() => years.data?.data.find((y) => y.id === academicYearId)?.semesters ?? [], [years.data, academicYearId])
  const invalidate = () => qc.invalidateQueries({ queryKey: ['uni', 'subjects'] })

  const del = useMutation({
    mutationFn: (id: string) => universityApi.deleteSubject(id),
    onSuccess: () => { toast.success('Subject deleted'); invalidate(); setDeleteOf(null) },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <PageShell
      title="Subjects"
      subtitle="Manage all subjects by year, semester, and branch"
      action={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" leftIcon={<Download size={15} />} onClick={() => universityApi.downloadSubjectsTemplate()}>Template</Button>
          <Button variant="outline" leftIcon={<Upload size={15} />} onClick={() => setShowUpload(true)}>Upload CSV</Button>
          <Button leftIcon={<Plus size={15} />} onClick={() => setEditing('new')}>Add Subject</Button>
        </div>
      }
    >
      <FilterBar>
        <Select className="w-40" value={academicYearId} onChange={(e) => { setAcademicYearId(e.target.value); setSemesterId('') }} placeholder="All Years"
          options={(years.data?.data ?? []).map((y) => ({ value: y.id, label: y.label }))} />
        <Select className="w-40" value={semesterId} onChange={(e) => setSemesterId(e.target.value)} placeholder="All Semesters" disabled={!academicYearId}
          options={yearSemesters.map((s) => ({ value: s.id, label: s.label }))} />
        <Select className="w-40" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="All Branches"
          options={(branches.data?.data ?? []).map((b) => ({ value: b.code, label: b.code }))} />
      </FilterBar>

      <Card className="overflow-hidden">
        {list.isLoading ? (
          <div className="p-4"><TableSkeleton rows={6} cols={7} /></div>
        ) : (list.data?.data ?? []).length === 0 ? (
          <EmptyState icon={<BookOpen size={22} />} title="No subjects" description="Add a subject or upload a CSV." className="border-0" />
        ) : (
          <Table>
            <thead><tr>
              <Th>Code</Th><Th>Name</Th><Th>Year</Th><Th>Semester</Th><Th>Branch</Th><Th>Credits</Th><Th>Type</Th><Th className="text-right">Actions</Th>
            </tr></thead>
            <tbody>
              {list.data?.data.map((s) => (
                <Tr key={s.id}>
                  <Td className="font-semibold">{s.code}</Td>
                  <Td>{s.name}</Td>
                  <Td>{s.academicYearLabel}</Td>
                  <Td>Sem {s.semesterNumber}</Td>
                  <Td>{s.branch ? <Badge tone="primary">{s.branch}</Badge> : <span className="text-text-muted">—</span>}</Td>
                  <Td className="tabular-nums">{s.credits}</Td>
                  <Td><Badge tone="neutral">{s.type}</Badge></Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditing(s)} className="flex h-8 w-8 items-center justify-center rounded-sm text-text-secondary hover:bg-primary-light hover:text-primary" title="Edit"><Pencil size={15} /></button>
                      <button onClick={() => setDeleteOf(s)} className="flex h-8 w-8 items-center justify-center rounded-sm text-text-secondary hover:bg-danger-light hover:text-danger" title="Delete"><Trash2 size={15} /></button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {editing && (
        <SubjectFormModal
          subject={editing === 'new' ? null : editing}
          years={years.data?.data ?? []}
          branches={(branches.data?.data ?? []).map((b) => b.code)}
          onClose={() => setEditing(null)}
          onSaved={invalidate}
        />
      )}

      <CsvUploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        title="Upload Subjects"
        onUpload={universityApi.uploadSubjectsCsv}
        onDownloadTemplate={universityApi.downloadSubjectsTemplate}
        requiredColumns={['academic_year', 'semester_number', 'branch', 'code', 'name']}
        optionalColumns={['credits', 'type']}
        extraFields={<p className="text-xs text-text-muted">Existing subjects (same semester + code) are updated in place.</p>}
      />

      <ConfirmDialog
        open={!!deleteOf}
        title="Delete subject?"
        message={<>Delete <b>{deleteOf?.code}</b>? Blocked if it has results or attendance.</>}
        destructive confirmLabel="Delete"
        loading={del.isPending}
        onConfirm={() => deleteOf && del.mutate(deleteOf.id)}
        onCancel={() => setDeleteOf(null)}
      />
    </PageShell>
  )
}

function SubjectFormModal({ subject, years, branches, onClose, onSaved }: {
  subject: UniSubject | null
  years: { id: string; label: string; semesters: { id: string; number: number; label: string }[] }[]
  branches: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const [academicYearId, setAcademicYearId] = useState(subject?.academicYearId ?? '')
  const [semesterId, setSemesterId] = useState(subject?.semesterId ?? '')
  const [branch, setBranch] = useState(subject?.branch ?? '')
  const [code, setCode] = useState(subject?.code ?? '')
  const [name, setName] = useState(subject?.name ?? '')
  const [credits, setCredits] = useState(subject?.credits ?? 4)
  const [type, setType] = useState(subject?.type ?? 'THEORY')

  const yearSemesters = years.find((y) => y.id === academicYearId)?.semesters ?? []

  const save = useMutation({
    mutationFn: () => subject
      ? universityApi.updateSubject(subject.id, { code, name, credits, type, branch })
      : universityApi.createSubject({ semesterId, code, name, credits, type, branch }),
    onSuccess: () => { toast.success('Subject saved'); onSaved(); onClose() },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const canSave = !!(code && name && (subject || (semesterId && branch)))

  return (
    <Modal open onClose={onClose} title={subject ? 'Edit Subject' : 'Add Subject'}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => save.mutate()} loading={save.isPending} disabled={!canSave}>Save</Button></>}>
      <div className="space-y-3">
        {!subject && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Academic Year *">
              <Select value={academicYearId} onChange={(e) => { setAcademicYearId(e.target.value); setSemesterId('') }} placeholder="Select"
                options={years.map((y) => ({ value: y.id, label: y.label }))} />
            </Field>
            <Field label="Semester *">
              <Select value={semesterId} onChange={(e) => setSemesterId(e.target.value)} placeholder="Select" disabled={!academicYearId}
                options={yearSemesters.map((s) => ({ value: s.id, label: s.label }))} />
            </Field>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Branch *"><Select value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="Select" options={branches.map((b) => ({ value: b, label: b }))} /></Field>
          <Field label="Type"><Select value={type} onChange={(e) => setType(e.target.value)} options={TYPES.map((t) => ({ value: t, label: t }))} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Code *"><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="TOC" /></Field>
          <Field label="Credits"><Input type="number" min={1} max={10} value={credits} onChange={(e) => setCredits(Number(e.target.value))} /></Field>
        </div>
        <Field label="Name *"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Theory of Computation" /></Field>
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</label>{children}</div>
}
