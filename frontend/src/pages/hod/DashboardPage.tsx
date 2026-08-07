import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Activity,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { hodApi } from '@/api/hod'
import { useHodScope } from '@/hooks/hod/useHodScope'
import { useHistoryStore } from '@/stores/historyStore'
import { HistoryBanner } from '@/components/hod/HistoryBanner'
import { useUser } from '@/stores/authStore'
import { formatNumber } from '@/lib/utils'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCardSkeleton, ChartSkeleton } from '@/components/ui/Skeleton'
import { AttendancePctCell } from '@/components/shared/AttendancePctCell'
import { TrendAreaChart } from '@/components/charts'
import { formatDistanceToNow } from 'date-fns'

const PHASE_COLORS = ['#2563EB', '#7C3AED', '#0891B2', '#16A34A']

export default function DashboardPage() {
  const user = useUser()
  const history = useHistoryStore()
  const scope = useHodScope(history.semesterId ?? undefined)
  const semesterId = history.semesterId ?? undefined

  const summary = useQuery({ queryKey: ['hod', 'dashboard', 'summary', semesterId], queryFn: () => hodApi.dashboard.summary({ semesterId }) })
  const trend = useQuery({ queryKey: ['hod', 'dashboard', 'trend', semesterId], queryFn: () => hodApi.dashboard.attendanceTrend(6, semesterId) })
  const results = useQuery({ queryKey: ['hod', 'dashboard', 'results', semesterId], queryFn: () => hodApi.dashboard.resultsOverview(semesterId) })
  const atRisk = useQuery({ queryKey: ['hod', 'dashboard', 'at-risk', semesterId], queryFn: () => hodApi.dashboard.atRisk(5, semesterId) })
  const feed = useQuery({ queryKey: ['hod', 'dashboard', 'feed', semesterId], queryFn: () => hodApi.dashboard.activityFeed(1, 5) })

  const firstName = user?.name?.split(' ').slice(0, 2).join(' ') ?? 'HOD'
  const s = summary.data

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5">
      <HistoryBanner />
      {/* Hero */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            {scope.data?.hod.sectionTag
              ? `Department — ${scope.data.hod.sectionTag}`
              : scope.data?.hod.year
                ? `Department — ${scope.data.hod.year}`
                : 'HOD Portal'}
          </div>
          <h1 className="text-[38px] font-medium leading-[1.05] text-text-primary">Good day, {firstName}.</h1>
          <p className="mt-3 max-w-[520px] text-[15px] text-text-secondary">
            Here's how your department is tracking this term.
            {scope.data?.activeSemester ? ` ${scope.data.activeSemester.label} is currently active.` : ''}
          </p>
          {scope.data?.activeSemester && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone="primary" dot>
                {scope.data.activeSemester.label} Active
              </Badge>
              <Badge tone="neutral">{formatNumber(scope.data.totalStudents)} students</Badge>
              <Badge tone="neutral">{formatNumber(scope.data.totalFaculty)} faculty</Badge>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link to="/hod/exam-management" className="inline-flex items-center gap-2 rounded-sm bg-brand px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-[1.06]">
            <ShieldCheck size={16} /> Examination
          </Link>
          <Link to="/hod/results" className="inline-flex items-center gap-2 rounded-sm border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-primary transition hover:bg-surface-2">
            <ClipboardList size={16} /> Results
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 lg:grid-cols-5">
        {summary.isLoading ? (
          <StatCardSkeleton count={5} />
        ) : s ? (
          <>
            <StatCard value={formatNumber(s.totalStudents.value)} label="Total Students" delta={s.totalStudents.deltaLabel} trend={s.totalStudents.trend} icon={<Users size={18} className="text-primary" />} iconBg="var(--primary-light)" />
            <StatCard value={formatNumber(s.totalFaculty.value)} label="Faculty Members" delta={s.totalFaculty.deltaLabel} trend={s.totalFaculty.trend} icon={<UserPlus size={18} className="text-purple" />} iconBg="var(--purple-light)" />
            <StatCard value={formatNumber(s.activeBatches.value)} label="Active Batches" delta={s.activeBatches.deltaLabel} trend={s.activeBatches.trend} icon={<BookOpen size={18} className="text-teal" />} iconBg="var(--teal-light)" />
            <StatCard value={`${Math.round(s.avgAttendance.value)}%`} label="Avg Attendance" delta={s.avgAttendance.deltaLabel} trend={s.avgAttendance.trend} icon={<CalendarCheck size={18} className="text-success" />} iconBg="var(--success-light)" />
            <StatCard value={`${Math.round(s.resultsUploadedPct.value)}%`} label="Results Uploaded" delta={s.resultsUploadedPct.deltaLabel} trend={s.resultsUploadedPct.trend} icon={<Activity size={18} className="text-warning" />} iconBg="var(--warning-light)" />
          </>
        ) : null}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Attendance Trend" subtitle="Last 6 months" />
          <CardBody>
            {trend.isLoading ? (
              <ChartSkeleton height={240} />
            ) : trend.data ? (
              <TrendAreaChart
                labels={trend.data.labels}
                data={trend.data.series?.[0]?.data ?? trend.data.data ?? []}
              />
            ) : null}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Results Overview" subtitle="Avg marks per test" />
          <CardBody className="space-y-3">
            {results.data?.phases.map((p, i) => (
              <div key={p.phase} className="flex items-center gap-3">
                <span className="w-6 text-xs font-bold text-text-secondary">{p.phase}</span>
                <div className="h-5 flex-1 overflow-hidden rounded bg-bg">
                  {p.conducted && p.avgMarks != null ? (
                    <div
                      className="flex h-full items-center rounded pl-2 text-[11px] font-semibold text-white transition-all"
                      style={{ width: `${Math.max(6, (p.avgMarks / p.maxMarks) * 100)}%`, background: PHASE_COLORS[i % 4] }}
                    >
                      {p.avgMarks}/{p.maxMarks}
                    </div>
                  ) : null}
                </div>
                <span className="w-16 text-right text-xs text-text-muted">
                  {p.conducted ? '' : 'Pending'}
                </span>
              </div>
            ))}
            {results.data && results.data.phases.length === 0 && (
              <p className="py-6 text-center text-xs text-text-muted">No results yet.</p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* At-risk + Activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="At-Risk Students"
            subtitle={atRisk.data ? `${atRisk.data.total ?? atRisk.data.data.length} flagged` : undefined}
            action={<Link to="/hod/analytics" className="text-xs font-semibold text-primary hover:underline">View all</Link>}
          />
          <CardBody className="pt-0">
            {atRisk.data && atRisk.data.data.length === 0 ? (
              <EmptyState title="No at-risk students" description="Everyone is above threshold. 🎉" />
            ) : (
              <div className="divide-y divide-border-light">
                {atRisk.data?.data.map((r) => (
                  <div key={r.enrollmentNo} className="flex items-center gap-3 py-2.5">
                    <Avatar name={r.name} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-text-primary">{r.name}</div>
                      <div className="text-xs text-text-muted">{r.enrollmentNo} · {r.batchCode}</div>
                    </div>
                    <AttendancePctCell pct={r.attendancePct} showBar={false} />
                    <Badge tone="danger">{r.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent Activity" />
          <CardBody className="pt-0">
            <ul className="space-y-1">
              {feed.data?.data.map((a) => (
                <li key={a.id} className="flex gap-3 border-b border-border-light py-2.5 last:border-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-surface-2 text-sm">
                    {a.icon ?? '•'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-text-primary">{a.title}</div>
                    <div className="truncate text-xs text-text-muted">{a.description}</div>
                  </div>
                  <span className="whitespace-nowrap text-[11px] text-text-muted">
                    {a.createdAt ? formatDistanceToNow(new Date(a.createdAt), { addSuffix: true }) : ''}
                  </span>
                </li>
              ))}
              {feed.data && feed.data.data.length === 0 && (
                <p className="py-6 text-center text-xs text-text-muted">No recent activity.</p>
              )}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
