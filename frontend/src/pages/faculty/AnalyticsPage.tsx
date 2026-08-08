import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AlertTriangle, CalendarX, CheckCircle2, GraduationCap, Pencil, Phone, TrendingDown, Users, XCircle } from 'lucide-react'
import { facultyApi } from '@/api/faculty'
import { errorMessage } from '@/api/client'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCardSkeleton, TableSkeleton } from '@/components/ui/Skeleton'
import { Table, Td, Th, Tr } from '@/components/ui/Table'

type FailingExam = { subjectCode: string; phase: string; marksObtained: number; maxMarks: number; pct: number }
type FailingSubject = { subjectCode: string; totalObtained: number; totalMax: number; pct: number }
type Mentee = {
  enrollmentNo: string; name: string; batchCode: string
  phone: string | null; parentPhone: string | null
  weeklyAttendancePct: number | null; weeklyAttended: number; weeklyTotal: number
  overallAttendancePct: number; lowWeekly: boolean; lowOverall: boolean
  failingExams: FailingExam[]; failingSubjects: FailingSubject[]; hasRisk: boolean
}
type MenteeAnalytics = {
  semesterLabel: string; weekLabel: string | null; threshold: number; passPct: number
  summary: { totalMentees: number; lowWeeklyCount: number; lowOverallCount: number; failingCount: number }
  mentees: Mentee[]
}

const pctTone = (p: number | null, threshold: number) =>
  p === null ? 'text-text-muted' : p < threshold ? 'font-bold text-danger' : 'text-text-primary'

export default function FacultyAnalyticsPage() {
  const q = useQuery({ queryKey: ['faculty', 'analytics-mentees'], queryFn: facultyApi.analyticsMentees })
  const d = q.data as MenteeAnalytics | undefined
  const [editContact, setEditContact] = useState<Mentee | null>(null)

  const mentees = d?.mentees ?? []
  const threshold = d?.threshold ?? 75
  const passPct = d?.passPct ?? 36
  const weeklyLow = mentees.filter((m) => m.lowWeekly)
  const overallLow = mentees.filter((m) => m.lowOverall)
  const failingExams = mentees.flatMap((m) => m.failingExams.map((f) => ({ ...f, name: m.name, batchCode: m.batchCode, enrollmentNo: m.enrollmentNo })))
  const failingSubjects = mentees.flatMap((m) => m.failingSubjects.map((f) => ({ ...f, name: m.name, batchCode: m.batchCode, enrollmentNo: m.enrollmentNo })))

  if (q.isLoading) {
    return (
      <PageShell title="Mentee Analytics" subtitle="Risk overview for your assigned mentees">
        <div className="mb-5 grid grid-cols-2 gap-3.5 md:grid-cols-4"><StatCardSkeleton count={4} /></div>
        <Card><CardBody><TableSkeleton rows={6} cols={4} /></CardBody></Card>
      </PageShell>
    )
  }

  if (!d || d.summary.totalMentees === 0) {
    return (
      <PageShell title="Mentee Analytics" subtitle="Risk overview for your assigned mentees">
        <EmptyState icon={<Users size={22} />} title="No mentees assigned"
          description="You don't have any mentees this semester. Once the HOD assigns mentees to you, their attendance and result risks will show up here." />
      </PageShell>
    )
  }

  const okBanner = (text: string) => (
    <div className="flex items-center gap-2 rounded-sm border border-success/25 bg-success-light/30 px-3 py-3 text-sm text-success">
      <CheckCircle2 size={16} /> {text}
    </div>
  )

  return (
    <PageShell title="Mentee Analytics" subtitle={`Risk overview for your ${d.summary.totalMentees} assigned mentees · ${d.semesterLabel}`}>
      <div className="mb-5 grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <StatCard value={d.summary.totalMentees} label="Total Mentees" />
        <StatCard value={d.summary.lowWeeklyCount} label={`Low Weekly Attendance (< ${threshold}%)`} trend={d.summary.lowWeeklyCount ? 'down' : undefined} />
        <StatCard value={d.summary.lowOverallCount} label={`Low Overall Attendance (< ${threshold}%)`} trend={d.summary.lowOverallCount ? 'down' : undefined} />
        <StatCard value={d.summary.failingCount} label={`Failing Results (< ${passPct}%)`} trend={d.summary.failingCount ? 'down' : undefined} />
      </div>

      {/* Weekly attendance alerts */}
      <Card className="mb-4">
        <CardHeader
          title={<span className="flex items-center gap-2"><CalendarX size={16} className="text-danger" /> Low Weekly Attendance</span>}
          subtitle={d.weekLabel ? `Last week (${d.weekLabel}) below ${threshold}%` : `Below ${threshold}% this week`}
        />
        <CardBody className="pt-0">
          {weeklyLow.length === 0 ? okBanner('Every mentee attended at least 75% of last week’s lectures.') : (
            <Table>
              <thead><tr><Th>Student</Th><Th>Batch</Th><Th>This Week</Th><Th>Overall</Th></tr></thead>
              <tbody>
                {weeklyLow.map((m) => (
                  <Tr key={m.enrollmentNo}>
                    <Td><div className="font-medium text-text-primary">{m.name}</div><div className="font-mono text-xs text-text-muted">{m.enrollmentNo}</div></Td>
                    <Td>{m.batchCode}</Td>
                    <Td><span className="font-bold text-danger">{m.weeklyAttended}/{m.weeklyTotal} ({m.weeklyAttendancePct}%)</span></Td>
                    <Td><span className={pctTone(m.overallAttendancePct, threshold)}>{m.overallAttendancePct}%</span></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Overall attendance alerts */}
      <Card className="mb-4">
        <CardHeader
          title={<span className="flex items-center gap-2"><TrendingDown size={16} className="text-danger" /> Overall Attendance Below {threshold}%</span>}
          subtitle="Cumulative attendance across all subjects this semester"
        />
        <CardBody className="pt-0">
          {overallLow.length === 0 ? okBanner(`Every mentee is at or above ${threshold}% overall attendance.`) : (
            <Table>
              <thead><tr><Th>Student</Th><Th>Batch</Th><Th>Overall Attendance</Th><Th>Last Week</Th></tr></thead>
              <tbody>
                {overallLow.map((m) => (
                  <Tr key={m.enrollmentNo}>
                    <Td><div className="font-medium text-text-primary">{m.name}</div><div className="font-mono text-xs text-text-muted">{m.enrollmentNo}</div></Td>
                    <Td>{m.batchCode}</Td>
                    <Td><span className="font-bold text-danger">{m.overallAttendancePct}%</span></Td>
                    <Td><span className={pctTone(m.weeklyAttendancePct, threshold)}>{m.weeklyAttendancePct === null ? '—' : `${m.weeklyAttendancePct}%`}</span></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Failing exam results */}
      <Card className="mb-4">
        <CardHeader
          title={<span className="flex items-center gap-2"><XCircle size={16} className="text-danger" /> Failing Exam Results</span>}
          subtitle={`Below the pass mark of ${passPct}% (e.g. < 9/25, < 18/50, < 36/100)`}
        />
        <CardBody className="pt-0">
          {failingExams.length === 0 ? okBanner('No mentee has failed an individual exam.') : (
            <Table>
              <thead><tr><Th>Student</Th><Th>Batch</Th><Th>Subject</Th><Th>Exam</Th><Th>Marks</Th><Th>%</Th></tr></thead>
              <tbody>
                {failingExams.map((f, i) => (
                  <Tr key={`${f.enrollmentNo}-${f.subjectCode}-${f.phase}-${i}`}>
                    <Td><div className="font-medium text-text-primary">{f.name}</div><div className="font-mono text-xs text-text-muted">{f.enrollmentNo}</div></Td>
                    <Td>{f.batchCode}</Td>
                    <Td>{f.subjectCode}</Td>
                    <Td><Badge tone="neutral">{f.phase}</Badge></Td>
                    <Td className="font-bold text-danger">{f.marksObtained}/{f.maxMarks}</Td>
                    <Td><Badge tone="danger">{f.pct}%</Badge></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Overall subject failures (after all phases) */}
      {failingSubjects.length > 0 && (
        <Card className="mb-4">
          <CardHeader
            title={<span className="flex items-center gap-2"><AlertTriangle size={16} className="text-danger" /> Failing Subjects — Overall</span>}
            subtitle={`Total across T1–T4 below ${passPct}% of 100`}
          />
          <CardBody className="pt-0">
            <Table>
              <thead><tr><Th>Student</Th><Th>Batch</Th><Th>Subject</Th><Th>Total</Th><Th>%</Th></tr></thead>
              <tbody>
                {failingSubjects.map((f, i) => (
                  <Tr key={`${f.enrollmentNo}-${f.subjectCode}-${i}`}>
                    <Td><div className="font-medium text-text-primary">{f.name}</div><div className="font-mono text-xs text-text-muted">{f.enrollmentNo}</div></Td>
                    <Td>{f.batchCode}</Td>
                    <Td>{f.subjectCode}</Td>
                    <Td className="font-bold text-danger">{f.totalObtained}/{f.totalMax}</Td>
                    <Td><Badge tone="danger">{f.pct}%</Badge></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      )}

      {/* All mentees overview */}
      <Card>
        <CardHeader
          title={<span className="flex items-center gap-2"><GraduationCap size={16} /> All Mentees</span>}
          subtitle="Full roster — risky mentees first"
        />
        <CardBody className="pt-0">
          <Table>
            <thead><tr><Th>Student</Th><Th>Batch</Th><Th>Last Week</Th><Th>Overall Att.</Th><Th>Failing Exams</Th><Th>Status</Th><Th>Contact</Th></tr></thead>
            <tbody>
              {mentees.map((m) => (
                <Tr key={m.enrollmentNo}>
                  <Td><div className="font-medium text-text-primary">{m.name}</div><div className="font-mono text-xs text-text-muted">{m.enrollmentNo}</div></Td>
                  <Td>{m.batchCode}</Td>
                  <Td><span className={pctTone(m.weeklyAttendancePct, threshold)}>{m.weeklyAttendancePct === null ? '—' : `${m.weeklyAttendancePct}%`}</span></Td>
                  <Td><span className={pctTone(m.overallAttendancePct, threshold)}>{m.overallAttendancePct}%</span></Td>
                  <Td>{m.failingExams.length > 0 ? <span className="font-bold text-danger">{m.failingExams.length}</span> : <span className="text-text-muted">0</span>}</Td>
                  <Td>{m.hasRisk ? <Badge tone="danger">At Risk</Badge> : <Badge tone="success">On Track</Badge>}</Td>
                  <Td><ContactCell m={m} onEdit={() => setEditContact(m)} /></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </CardBody>
      </Card>
      <ContactModal mentee={editContact} onClose={() => setEditContact(null)} />
    </PageShell>
  )
}

// Student + parent numbers. Call buttons (tel: links) render only on mobile — the whole
// point is one-tap dialling from a phone; the edit pencil is available everywhere for the mentor/HOD.
function ContactCell({ m, onEdit }: { m: Mentee; onEdit: () => void }) {
  const tel = (n: string) => n.replace(/[^\d+]/g, '')
  return (
    <div className="flex flex-col gap-1">
      {/* Mobile: one-tap call buttons */}
      <div className="flex gap-1.5 sm:hidden">
        {m.phone ? <a href={`tel:${tel(m.phone)}`} className="inline-flex items-center gap-1 rounded-sm bg-primary px-2 py-1 text-[11px] font-semibold text-white"><Phone size={12} /> Student</a> : null}
        {m.parentPhone ? <a href={`tel:${tel(m.parentPhone)}`} className="inline-flex items-center gap-1 rounded-sm bg-teal px-2 py-1 text-[11px] font-semibold text-white"><Phone size={12} /> Parent</a> : null}
        {!m.phone && !m.parentPhone && <span className="text-[11px] text-text-muted">No numbers</span>}
      </div>
      {/* Desktop: show the numbers as text (calling from desktop isn't the use case) */}
      <div className="hidden text-[11px] text-text-secondary sm:block">
        <div>S: {m.phone ?? '—'}</div>
        <div>P: {m.parentPhone ?? '—'}</div>
      </div>
      <button onClick={onEdit} className="inline-flex w-fit items-center gap-1 text-[11px] text-text-muted hover:text-primary"><Pencil size={11} /> Edit</button>
    </div>
  )
}

function ContactModal({ mentee, onClose }: { mentee: Mentee | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [phone, setPhone] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  // Reset fields when a new mentee opens.
  const key = mentee?.enrollmentNo ?? ''
  const [loadedKey, setLoadedKey] = useState('')
  if (mentee && key !== loadedKey) { setLoadedKey(key); setPhone(mentee.phone ?? ''); setParentPhone(mentee.parentPhone ?? '') }
  const save = useMutation({
    mutationFn: () => facultyApi.updateMenteeContact(mentee!.enrollmentNo, { phone, parentPhone }),
    onSuccess: () => { toast.success('Contact numbers saved'); qc.invalidateQueries({ queryKey: ['faculty', 'analytics-mentees'] }); onClose() },
    onError: (e) => toast.error(errorMessage(e)),
  })
  return (
    <Modal open={!!mentee} onClose={onClose} title={`Contact — ${mentee?.name ?? ''}`} size="sm"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Save</Button></>}>
      <div className="space-y-3">
        <p className="text-xs text-text-muted">Only you (the mentor) or a HOD can change these.</p>
        <Input label="Student mobile" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 9876543210" />
        <Input label="Parent / guardian mobile" type="tel" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="e.g. 9876500000" />
      </div>
    </Modal>
  )
}
