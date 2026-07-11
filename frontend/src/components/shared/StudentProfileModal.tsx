import { useQuery } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Spinner } from '@/components/ui/Spinner'
import { AttendancePctCell } from '@/components/shared/AttendancePctCell'

// ponytail: shared across HOD/Faculty/Dean. Each portal passes its own fetchers.
export interface StudentDetail {
  enrollmentNo: string; name: string; email: string; phone: string | null; branch: string
  admissionYear?: number | null; status?: 'ACTIVE' | 'AT_RISK' | 'INACTIVE'
  currentEnrollment?: { batchCode: string; semesterLabel: string; rollNo: string; attendancePct: number } | null
}
export interface StudentJourney {
  journey: Array<{ semesterNumber: number; semesterLabel: string; yearLevel: string; batchCode: string; rollNo: string; academicYear: string; isCurrent: boolean }>
}

export function StudentProfileModal({
  enrollmentNo,
  onClose,
  getFn,
  historyFn,
  queryKey,
}: {
  enrollmentNo: string
  onClose: () => void
  getFn: (enrollmentNo: string) => Promise<StudentDetail>
  historyFn: (enrollmentNo: string) => Promise<StudentJourney>
  queryKey: string
}) {
  const detail = useQuery({ queryKey: [queryKey, 'student', enrollmentNo], queryFn: () => getFn(enrollmentNo) })
  const history = useQuery({ queryKey: [queryKey, 'student', enrollmentNo, 'history'], queryFn: () => historyFn(enrollmentNo) })
  const d = detail.data

  return (
    <Modal open onClose={onClose} title="Student Profile" size="lg">
      {detail.isLoading || !d ? (
        <div className="flex justify-center py-10"><Spinner size={26} /></div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar name={d.name} size={56} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-text-primary">{d.name}</h3>
                {d.status && (
                  <Badge tone={d.status === 'AT_RISK' ? 'danger' : d.status === 'INACTIVE' ? 'neutral' : 'success'}>
                    {d.status.replace('_', ' ')}
                  </Badge>
                )}
              </div>
              <p className="font-mono text-xs text-text-secondary">{d.enrollmentNo}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Email" value={d.email} />
            <Field label="Phone" value={d.phone ?? '—'} />
            <Field label="Branch" value={d.branch} />
            <Field label="Admission Year" value={String(d.admissionYear ?? '—')} />
            {d.currentEnrollment && (
              <>
                <Field label="Batch" value={d.currentEnrollment.batchCode} />
                <Field label="Semester" value={d.currentEnrollment.semesterLabel} />
                <Field label="Roll No." value={d.currentEnrollment.rollNo} />
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Attendance</div>
                  <AttendancePctCell pct={d.currentEnrollment.attendancePct} />
                </div>
              </>
            )}
          </div>

          <div>
            <div className="mb-3 text-sm font-semibold text-text-primary">Academic Journey</div>
            {history.isLoading ? (
              <Spinner />
            ) : history.data && history.data.journey.length > 0 ? (
              <ol className="relative space-y-4 border-l-2 border-border pl-5">
                {history.data.journey.map((j, i) => (
                  <li key={i} className="relative">
                    <span className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 ${j.isCurrent ? 'border-primary bg-primary' : 'border-border bg-surface'}`} />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-text-primary">Semester {j.semesterNumber}</span>
                      <Badge tone="primary">{j.yearLevel}</Badge>
                      <span className="text-xs text-text-muted">{j.academicYear}</span>
                      {j.isCurrent && <Badge tone="success">Current</Badge>}
                    </div>
                    <div className="mt-0.5 text-xs text-text-secondary">Batch {j.batchCode} · Roll {j.rollNo}</div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-text-muted">No history available.</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">{label}</div>
      <div className="text-sm text-text-primary">{value}</div>
    </div>
  )
}
