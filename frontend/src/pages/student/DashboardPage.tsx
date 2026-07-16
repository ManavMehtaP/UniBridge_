import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BarChart2, BookOpen, CalendarCheck, HelpCircle, Sparkles, Trophy } from 'lucide-react'
import { studentApi } from '@/api/student'
import { useStudentEnrollment } from '@/hooks/student/useStudentEnrollment'
import { useUser } from '@/stores/authStore'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCardSkeleton } from '@/components/ui/Skeleton'
import { AttendancePctCell } from '@/components/shared/AttendancePctCell'

export default function StudentDashboardPage() {
  const user = useUser()
  const enrollment = useStudentEnrollment()
  const today = useQuery({ queryKey: ['student', 'today'], queryFn: studentApi.timetableToday })
  const att = useQuery({ queryKey: ['student', 'att'], queryFn: () => studentApi.attendance(enrollment.data?.semesterId), enabled: !!enrollment.data?.semesterId })
  const upcoming = useQuery({ queryKey: ['student', 'upcoming'], queryFn: () => studentApi.upcomingEvents(5) })
  const announcements = useQuery({ queryKey: ['student', 'announcements-preview'], queryFn: () => studentApi.announcements({ page: 1, limit: 3 }) })

  const totalAtt = att.data?.subjects.reduce((s, sub) => s + sub.percentage, 0) ?? 0
  const avgAtt = att.data?.subjects.length ? Math.round(totalAtt / att.data.subjects.length) : 0

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Hi, {user?.name?.split(' ')[0] ?? 'there'} 👋</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          {enrollment.data ? `${enrollment.data.semesterLabel} · Batch ${enrollment.data.batchCode} · Roll ${enrollment.data.rollNo}` : 'Student Portal'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        {att.isLoading ? (
          <StatCardSkeleton count={4} />
        ) : (
          <>
            <StatCard value={`${avgAtt}%`} label="Avg Attendance" icon={<CalendarCheck size={18} className="text-success" />} iconBg="var(--success-light)" />
            <StatCard value={att.data?.subjects.length ?? 0} label="Subjects" icon={<BookOpen size={18} className="text-primary" />} iconBg="var(--primary-light)" />
            <StatCard value={announcements.data?.total ?? 0} label="Announcements" icon={<HelpCircle size={18} className="text-purple" />} iconBg="var(--purple-light)" />
            <StatCard value={upcoming.data?.data?.length ?? 0} label="Upcoming" icon={<Trophy size={18} className="text-warning" />} iconBg="var(--warning-light)" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Today's Classes"
            subtitle={today.data?.dayLabel}
            action={<Link to="/student/timetable" className="text-xs font-semibold text-primary hover:underline">Full week</Link>}
          />
          <CardBody className="pt-0">
            {(today.data?.slots ?? []).length === 0 ? (
              <EmptyState title="No classes today" description="Take it easy 🌿" className="border-0" />
            ) : (
              <ul className="divide-y divide-border-light">
                {today.data?.slots.map((s: { id: string; slotStart: string; slotEnd: string; subject?: { code: string; name: string }; room?: string }) => (
                  <li key={s.id} className="flex items-center gap-3 py-2.5">
                    <span className="min-w-[92px] text-sm font-semibold text-primary">{s.slotStart}–{s.slotEnd}</span>
                    <div className="flex-1">
                      <div className="text-[13px] font-semibold text-text-primary">{s.subject?.code} · {s.subject?.name}</div>
                      {s.room && <div className="text-xs text-text-muted">Room {s.room}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Quick Links" action={<Sparkles size={16} className="text-text-muted" />} />
          <CardBody className="grid grid-cols-2 gap-2">
            <QuickLink to="/student/results" label="Results" tone="primary" icon={<BarChart2 size={16} />} />
            <QuickLink to="/student/notes" label="Notes" tone="purple" icon={<BookOpen size={16} />} />
            <QuickLink to="/student/quizzes" label="Quizzes" tone="teal" icon={<HelpCircle size={16} />} />
            <QuickLink to="/student/ai" label="AI Assistant" tone="warning" icon={<Sparkles size={16} />} />
            <QuickLink to="/student/study-planner" label="Study Planner" tone="success" icon={<CalendarCheck size={16} />} />
            <QuickLink to="/student/leaderboard" label="Leaderboard" tone="danger" icon={<Trophy size={16} />} />
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Attendance" action={<Link to="/student/attendance" className="text-xs font-semibold text-primary hover:underline">Details</Link>} />
          <CardBody className="pt-0">
            <ul className="space-y-2">
              {att.data?.subjects.slice(0, 5).map((s) => (
                <li key={s.subjectCode} className="flex items-center justify-between rounded-sm bg-surface-2 px-3 py-2">
                  <div>
                    <div className="text-[13px] font-semibold text-text-primary">{s.subjectCode}</div>
                    <div className="text-xs text-text-muted">{s.attended}/{s.totalLectures} lectures</div>
                  </div>
                  <AttendancePctCell pct={s.percentage} />
                </li>
              )) ?? <p className="text-xs text-text-muted">No attendance data.</p>}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent Announcements" action={<Link to="/student/announcements" className="text-xs font-semibold text-primary hover:underline">All</Link>} />
          <CardBody className="pt-0">
            {(announcements.data?.data ?? []).length === 0 ? (
              <EmptyState title="No announcements" className="border-0" />
            ) : (
              <ul className="space-y-2">
                {announcements.data?.data.map((a) => (
                  <li key={a.id} className="rounded-sm border border-border-light p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[13px] font-semibold text-text-primary">{a.title}</span>
                      {!a.isRead && <Badge tone="primary">New</Badge>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{a.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

const toneStyles = {
  primary: 'bg-primary-light text-primary',
  purple: 'bg-purple-light text-purple',
  teal: 'bg-teal-light text-teal',
  warning: 'bg-warning-light text-warning',
  success: 'bg-success-light text-success',
  danger: 'bg-danger-light text-danger',
} as const

function QuickLink({ to, label, tone, icon }: { to: string; label: string; tone: keyof typeof toneStyles; icon: React.ReactNode }) {
  return (
    <Link to={to} className={`flex items-center gap-2 rounded-sm px-3 py-3 text-[13px] font-semibold transition hover:brightness-95 ${toneStyles[tone]}`}>
      {icon}
      {label}
    </Link>
  )
}
