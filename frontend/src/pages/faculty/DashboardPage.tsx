import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BookOpen, CalendarCheck, ClipboardList, Heart, Users } from 'lucide-react'
import { facultyApi } from '@/api/faculty'
import { useUser } from '@/stores/authStore'
import { formatNumber } from '@/lib/utils'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCardSkeleton } from '@/components/ui/Skeleton'

export default function FacultyDashboardPage() {
  const user = useUser()
  const summary = useQuery({ queryKey: ['faculty', 'dashboard'], queryFn: facultyApi.dashboardSummary })
  const today = useQuery({ queryKey: ['faculty', 'today'], queryFn: facultyApi.timetableToday })
  const upcoming = useQuery({ queryKey: ['faculty', 'upcoming'], queryFn: () => facultyApi.upcomingEvents(5) })

  const s = summary.data?.stats

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Welcome, {user?.name?.split(' ').slice(0, 2).join(' ')} 👋</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          {summary.data ? `${summary.data.faculty.year} · ${summary.data.activeSemester.label}` : 'Faculty Portal'}
        </p>
        {summary.data?.faculty.mentorCode && (
          <Badge tone="teal" className="mt-2">Mentor Code: {summary.data.faculty.mentorCode}</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        {summary.isLoading ? <StatCardSkeleton count={4} /> : s ? (
          <>
            <StatCard value={formatNumber(s.totalStudents)} label="Total Students" icon={<Users size={18} className="text-primary" />} iconBg="var(--primary-light)" />
            <StatCard value={s.assignedSubjects} label="Assigned Subjects" icon={<BookOpen size={18} className="text-purple" />} iconBg="var(--purple-light)" />
            <StatCard value={`${Math.round(s.avgAttendance?.value ?? 0)}%`} label="Avg Attendance" delta={s.avgAttendance?.deltaLabel} trend={(s.avgAttendance?.trend as 'up' | 'down' | 'neutral') ?? 'neutral'} icon={<CalendarCheck size={18} className="text-success" />} iconBg="var(--success-light)" />
            <StatCard value={s.totalMentees} label="Mentees" icon={<Heart size={18} className="text-danger" />} iconBg="var(--danger-light)" />
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Today's Schedule"
            subtitle={today.data ? `${today.data.dayLabel}, ${today.data.date}` : 'Loading…'}
            action={<Link to="/faculty/schedule" className="text-xs font-semibold text-primary hover:underline">Full week</Link>}
          />
          <CardBody className="pt-0">
            {today.data && today.data.slots.length === 0 ? (
              <EmptyState title="No classes today" description="Enjoy your day off." className="border-0" />
            ) : (
              <ul className="divide-y divide-border-light">
                {today.data?.slots.map((slot) => (
                  <li key={slot.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-[92px] text-sm font-semibold text-primary">{slot.slotStart}–{slot.slotEnd}</div>
                    <div className="flex-1">
                      <div className="text-[13px] font-semibold text-text-primary">
                        {slot.subject?.code ?? '—'} <span className="text-text-muted">· {slot.subject?.name}</span>
                      </div>
                      <div className="text-xs text-text-muted">Batch {slot.batch?.code} · Room {slot.room ?? '—'}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Quick Actions"
            action={<ClipboardList size={16} className="text-text-muted" />}
          />
          <CardBody className="grid grid-cols-2 gap-2">
            <QuickAction to="/faculty/attendance" label="Mark Attendance" tone="primary" />
            <QuickAction to="/faculty/notes" label="Upload Notes" tone="purple" />
            <QuickAction to="/faculty/quizzes" label="Create Quiz" tone="teal" />
            <QuickAction to="/faculty/announcements" label="Post Announcement" tone="warning" />
            <QuickAction to="/faculty/mentees" label="View Mentees" tone="danger" />
            <QuickAction to="/faculty/analytics" label="Analytics" tone="success" />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Upcoming Events" />
        <CardBody className="pt-0">
          {upcoming.data?.data?.length === 0 ? (
            <EmptyState title="No upcoming events" className="border-0" />
          ) : (
            <ul className="divide-y divide-border-light">
              {upcoming.data?.data?.map((e: { id: string; date: string; title: string; type: string }) => (
                <li key={e.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="text-[13px] font-semibold text-text-primary">{e.title}</div>
                    <div className="text-xs text-text-muted">{new Date(e.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                  </div>
                  <Badge tone={e.type === 'HOLIDAY' ? 'success' : e.type === 'EXAM' ? 'danger' : 'primary'}>{e.type}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

const toneColors = {
  primary: 'bg-primary-light text-primary',
  purple: 'bg-purple-light text-purple',
  teal: 'bg-teal-light text-teal',
  warning: 'bg-warning-light text-warning',
  danger: 'bg-danger-light text-danger',
  success: 'bg-success-light text-success',
} as const

function QuickAction({ to, label, tone }: { to: string; label: string; tone: keyof typeof toneColors }) {
  return (
    <Link to={to} className={`rounded-sm px-3 py-3 text-center text-[13px] font-semibold transition hover:brightness-95 ${toneColors[tone]}`}>
      {label}
    </Link>
  )
}
