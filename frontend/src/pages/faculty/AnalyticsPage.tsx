import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CalendarX, CheckCircle2, GraduationCap, TrendingDown, Users, XCircle } from 'lucide-react'
import { facultyApi } from '@/api/faculty'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCardSkeleton, TableSkeleton } from '@/components/ui/Skeleton'
import { Table, Td, Th, Tr } from '@/components/ui/Table'

type FailingExam = { subjectCode: string; phase: string; marksObtained: number; maxMarks: number; pct: number }
type FailingSubject = { subjectCode: string; totalObtained: number; totalMax: number; pct: number }
type Mentee = {
  enrollmentNo: string; name: string; batchCode: string
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
            <thead><tr><Th>Student</Th><Th>Batch</Th><Th>Last Week</Th><Th>Overall Att.</Th><Th>Failing Exams</Th><Th>Status</Th></tr></thead>
            <tbody>
              {mentees.map((m) => (
                <Tr key={m.enrollmentNo}>
                  <Td><div className="font-medium text-text-primary">{m.name}</div><div className="font-mono text-xs text-text-muted">{m.enrollmentNo}</div></Td>
                  <Td>{m.batchCode}</Td>
                  <Td><span className={pctTone(m.weeklyAttendancePct, threshold)}>{m.weeklyAttendancePct === null ? '—' : `${m.weeklyAttendancePct}%`}</span></Td>
                  <Td><span className={pctTone(m.overallAttendancePct, threshold)}>{m.overallAttendancePct}%</span></Td>
                  <Td>{m.failingExams.length > 0 ? <span className="font-bold text-danger">{m.failingExams.length}</span> : <span className="text-text-muted">0</span>}</Td>
                  <Td>{m.hasRisk ? <Badge tone="danger">At Risk</Badge> : <Badge tone="success">On Track</Badge>}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </PageShell>
  )
}
