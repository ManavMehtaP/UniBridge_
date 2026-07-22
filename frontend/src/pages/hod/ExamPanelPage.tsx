import { useState } from 'react'
import { useTableSort } from '@/hooks/shared/useTableSort'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Rocket, ShieldCheck, UserCheck, X } from 'lucide-react'
import { api, errorMessage } from '@/api/client'
import { PageShell } from '@/components/shared/PageShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Table, Th, Td, Tr } from '@/components/ui/Table'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'

interface Coordinator { slot: number; facultyId: string | null; name: string | null; employeeId: string | null }
interface ExamAssignment {
  id: string; phaseId: string; phaseLabel: string; subjectCode: string
  facultyName: string; fromEnrollmentNo: string; toEnrollmentNo: string
  totalStudents: number; markedCount: number
  status: 'Pending' | 'In Progress' | 'Complete' | 'Published'
}

const examApi = {
  coordinators: () => api.get<{ coordinators: Coordinator[]; facultyOptions: { id: string; name: string; employeeId: string }[] }>('/hod/exam/coordinators').then((r) => r.data),
  assign: (slot: number, facultyId: string) => api.post('/hod/exam/coordinators', { slot, facultyId }).then((r) => r.data),
  remove: (slot: number) => api.delete(`/hod/exam/coordinators/${slot}`).then((r) => r.data),
  context: () => api.get<{ phases: { id: string; label: string }[] }>('/hod/exam/context').then((r) => r.data),
  assignments: (phaseId?: string) => api.get<{ data: ExamAssignment[] }>('/hod/exam/assignments', { params: { phaseId: phaseId || undefined } }).then((r) => r.data),
  publish: (phaseId: string) => api.post<{ studentCount: number }>('/hod/exam/publish', { phaseId }).then((r) => r.data),
}

const STATUS_TONE = { Pending: 'neutral', 'In Progress': 'warning', Complete: 'success', Published: 'purple' } as const

export default function ExamPanelPage() {
  const qc = useQueryClient()
  const [phaseFilter, setPhaseFilter] = useState('')
  const [publishPhase, setPublishPhase] = useState('')
  const [confirmPublish, setConfirmPublish] = useState(false)

  const coords = useQuery({ queryKey: ['hod', 'exam', 'coordinators'], queryFn: examApi.coordinators })
  const ctx = useQuery({ queryKey: ['hod', 'exam', 'context'], queryFn: examApi.context })
  // overwatcher — refresh every 5 minutes while the page is open
  const tracking = useQuery({
    queryKey: ['hod', 'exam', 'assignments', phaseFilter],
    queryFn: () => examApi.assignments(phaseFilter),
    refetchInterval: 300_000,
  })

  const publish = useMutation({
    mutationFn: () => examApi.publish(publishPhase),
    onSuccess: (r) => {
      toast.success(`Results pushed live for ${r.studentCount} students 🎉`)
      setConfirmPublish(false)
      qc.invalidateQueries({ queryKey: ['hod', 'exam'] })
    },
    onError: (e) => { toast.error(errorMessage(e)); setConfirmPublish(false) },
  })

  const rows = tracking.data?.data ?? []
  const sort = useTableSort(rows)
  const th = { activeKey: sort.sortKey, dir: sort.sortDir, onSort: sort.onSort }
  const phaseRows = rows.filter((a) => a.phaseId === publishPhase)
  const phaseComplete = phaseRows.length > 0 && phaseRows.every((a) => a.status === 'Complete' || a.status === 'Published')

  return (
    <PageShell title="Exam Panel" subtitle="Appoint exam coordinators and track paper checking live">
      <div className="mb-5 grid gap-4 md:grid-cols-2">
        {coords.isLoading ? (
          <><CardSkeleton height={120} /><CardSkeleton height={120} /></>
        ) : (
          (coords.data?.coordinators ?? []).map((c) => (
            <SlotCard key={c.slot} coordinator={c} options={coords.data?.facultyOptions ?? []} onChanged={() => qc.invalidateQueries({ queryKey: ['hod', 'exam'] })} />
          ))
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Result Tracking</h3>
            <p className="text-xs text-text-muted">Auto-refreshes every 5 minutes · checker saves stay draft until you push live</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)} className="w-36">
              <option value="">All phases</option>
              {(ctx.data?.phases ?? []).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </Select>
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
        {tracking.isLoading ? (
          <div className="p-4"><CardSkeleton height={160} /></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<ShieldCheck size={22} />} title="No paper-check assignments yet" description="Your exam coordinators haven't assigned any papers." />
        ) : (
          <Table>
            <thead><tr>
              <Th sortKey="phaseLabel" {...th}>Phase</Th><Th sortKey="subjectCode" {...th}>Subject</Th><Th sortKey="fromEnrollmentNo" {...th}>Enrollment Range</Th><Th sortKey="facultyName" {...th}>Checker</Th><Th sortKey="markedCount" {...th}>Progress</Th><Th sortKey="status" {...th}>Status</Th>
            </tr></thead>
            <tbody>
              {sort.rows.map((a) => (
                <Tr key={a.id}>
                  <Td>{a.phaseLabel}</Td>
                  <Td className="font-medium">{a.subjectCode}</Td>
                  <Td className="whitespace-nowrap text-xs">{a.fromEnrollmentNo} – {a.toEnrollmentNo}</Td>
                  <Td>{a.facultyName}</Td>
                  <Td className="min-w-[140px]">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={a.totalStudents === 0 ? 0 : (a.markedCount / a.totalStudents) * 100} tone={a.markedCount === a.totalStudents ? 'success' : 'warning'} className="w-20" />
                      <span className="text-xs text-text-muted">{a.markedCount}/{a.totalStudents}</span>
                    </div>
                  </Td>
                  <Td><Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <ConfirmDialog
        open={confirmPublish}
        title="Push results live?"
        message="Every student in the assigned ranges will see their marks and get a notification. This cannot be undone."
        loading={publish.isPending}
        onConfirm={() => publish.mutate()}
        onCancel={() => setConfirmPublish(false)}
      />
    </PageShell>
  )
}

function SlotCard({ coordinator, options, onChanged }: { coordinator: Coordinator; options: { id: string; name: string; employeeId: string }[]; onChanged: () => void }) {
  const [picked, setPicked] = useState('')

  const assign = useMutation({
    mutationFn: () => examApi.assign(coordinator.slot, picked),
    onSuccess: () => { toast.success(`Exam-Coordinator-${coordinator.slot} assigned`); setPicked(''); onChanged() },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const remove = useMutation({
    mutationFn: () => examApi.remove(coordinator.slot),
    onSuccess: () => { toast.success('Coordinator removed'); onChanged() },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Exam-Coordinator-{coordinator.slot}</h3>
        {coordinator.facultyId && (
          <button onClick={() => remove.mutate()} className="text-text-muted hover:text-danger" title="Remove coordinator"><X size={15} /></button>
        )}
      </div>
      {coordinator.facultyId ? (
        <div className="flex items-center gap-2">
          <UserCheck size={16} className="text-success" />
          <div>
            <div className="text-sm font-medium text-text-primary">{coordinator.name}</div>
            <div className="text-xs text-text-muted">{coordinator.employeeId}</div>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Select value={picked} onChange={(e) => setPicked(e.target.value)} placeholder="Select faculty"
            options={options.map((f) => ({ value: f.id, label: `${f.name} (${f.employeeId})` }))} className="flex-1" />
          <Button onClick={() => assign.mutate()} disabled={!picked} loading={assign.isPending}>Assign</Button>
        </div>
      )}
    </Card>
  )
}
