import { useEffect, useState } from 'react'
import { useTableSort } from '@/hooks/shared/useTableSort'
import { ExportMenu } from '@/components/shared/ExportMenu'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Activity, AlertTriangle, Award, ClipboardCheck, TrendingUp, Users } from 'lucide-react'
import { hodApi } from '@/api/hod'
import type { AnalyticsKpi } from '@/types/hod'
import { errorMessage } from '@/api/client'
import { useHodScope } from '@/hooks/hod/useHodScope'
import { useHistoryStore } from '@/stores/historyStore'
import { HistoryBanner } from '@/components/hod/HistoryBanner'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import { Table, Td, Th, Tr } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/ui/Skeleton'
import { DonutChart, MultiLineChart, RadarCompareChart, SimpleBarChart } from '@/components/charts'

// Marks-first analytics: everything is shown in absolute marks (out of each test's
// 25 or 50), never a % of 100. Only tests with uploaded results are shown, so the
// page follows the calendar — if only T-1 is done, the marks views stop at T-1.

export default function AnalyticsPage() {
  const history = useHistoryStore()
  const scope = useHodScope(history.semesterId ?? undefined)
  const semesterId = history.semesterId ?? scope.data?.activeSemester.id
  const [batchId, setBatchId] = useState('')
  const [phaseId, setPhaseId] = useState('')
  const [tab, setTab] = useState('attendance')

  const kpi = useQuery({ queryKey: ['hod', 'an', 'kpi', batchId], queryFn: () => hodApi.analytics.kpi(batchId || undefined) as Promise<AnalyticsKpi> })
  const ctx = useQuery({ queryKey: ['hod', 'results', 'ctx', semesterId], queryFn: () => hodApi.results.uploadContext(semesterId) as Promise<{ phases: { id: string; label: string }[] }>, enabled: !!semesterId })

  useEffect(() => {
    if (!phaseId && ctx.data?.phases?.length) setPhaseId(ctx.data.phases[ctx.data.phases.length - 1].id)
  }, [ctx.data, phaseId])

  const trend = useQuery({ queryKey: ['hod', 'an', 'trend'], queryFn: () => hodApi.analytics.attendanceTrend(6) as Promise<{ labels: string[]; series: { batchCode: string; data: number[] }[] }>, enabled: tab === 'attendance' })
  const bySub = useQuery({ queryKey: ['hod', 'an', 'bysub', batchId], queryFn: () => hodApi.analytics.attendanceBySubject(batchId || undefined) as Promise<{ subjects: { code: string; avgPct: number }[] }>, enabled: tab === 'attendance' })
  const dist = useQuery({ queryKey: ['hod', 'an', 'dist', batchId], queryFn: () => hodApi.analytics.attendanceDistribution(batchId || undefined) as Promise<{ buckets: { range: string; count: number }[] }>, enabled: tab === 'attendance' })

  const marksDist = useQuery({ queryKey: ['hod', 'an', 'marksdist', phaseId, batchId], queryFn: () => hodApi.analytics.gradeDistribution(phaseId, batchId || undefined) as Promise<{ maxMarks: number; buckets: { grade: string; count: number }[] }>, enabled: tab === 'marks' && !!phaseId })
  const marksBySub = useQuery({ queryKey: ['hod', 'an', 'marksbysub', phaseId, batchId], queryFn: () => hodApi.analytics.marksBySubject(phaseId, batchId || undefined) as Promise<{ maxMarks: number; riskMark: number; subjects: { code: string; avgMarks: number }[] }>, enabled: tab === 'marks' && !!phaseId })
  const radar = useQuery({ queryKey: ['hod', 'an', 'radar', phaseId], queryFn: () => hodApi.analytics.performanceRadar(phaseId) as Promise<{ maxMarks: number; subjects: string[]; topAvg: number[]; bottomAvg: number[] }>, enabled: tab === 'marks' && !!phaseId })

  const atRisk = useQuery({ queryKey: ['hod', 'an', 'atrisk', batchId], queryFn: () => hodApi.analytics.atRisk({ batchId: batchId || undefined, limit: 20 }) as Promise<{ data: AtRiskRow[] }>, enabled: tab === 'atrisk' })
  const leaderboard = useQuery({ queryKey: ['hod', 'an', 'lb', phaseId, batchId], queryFn: () => hodApi.analytics.leaderboard(phaseId, batchId || undefined, 10) as Promise<{ maxMarks: number; data: { rank: number; enrollmentNo: string; name: string; batchCode: string; avgMarks: number }[] }>, enabled: tab === 'leaderboard' && !!phaseId })

  const notify = useMutation({
    mutationFn: (enrollmentNo: string) => hodApi.analytics.notifyMentor(enrollmentNo),
    onSuccess: (r: { mentorCode?: string }) => toast.success(`Mentor ${r.mentorCode ?? ''} notified`),
    onError: (e) => toast.error(errorMessage(e)),
  })

  const k = kpi.data
  const batchOptions = scope.data?.batches.map((b) => ({ value: b.id, label: `Batch ${b.code}` })) ?? []
  const phaseOptions = ctx.data?.phases.map((p) => ({ value: p.id, label: p.label })) ?? []

  const riskSort = useTableSort(atRisk.data?.data ?? [])
  const riskSortTh = { activeKey: riskSort.sortKey, dir: riskSort.sortDir, onSort: riskSort.onSort }
  const lbSort = useTableSort(leaderboard.data?.data ?? [])
  const lbSortTh = { activeKey: lbSort.sortKey, dir: lbSort.sortDir, onSort: lbSort.onSort }
  const lbMax = leaderboard.data?.maxMarks ?? 25

  return (
    <PageShell
      title="Analytics"
      subtitle="Attendance and performance — marks shown out of each test's total (25 or 50)"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Select className="w-40" value={batchId} onChange={(e) => setBatchId(e.target.value)} placeholder="All Batches" options={batchOptions} />
          <ExportMenu onExport={(f) => hodApi.analytics.export({ batchId: batchId || undefined }, f)} />
        </div>
      }
    >
      <HistoryBanner />
      <div className="mb-5 grid grid-cols-2 gap-3.5 md:grid-cols-3 lg:grid-cols-5">
        {kpi.isLoading || !k ? <StatCardSkeleton count={5} /> : (
          <>
            <StatCard value={`${Math.round(k.avgAttendance.value)}%`} label="Avg Attendance" delta={k.avgAttendance.deltaLabel} trend="up" icon={<Activity size={18} className="text-primary" />} iconBg="var(--primary-light)" />
            <StatCard value={`${k.testsConducted.done}/${k.testsConducted.total}`} label="Tests Conducted" delta="From uploaded results" icon={<ClipboardCheck size={18} className="text-teal" />} iconBg="var(--teal-light)" />
            <StatCard value={k.latestTest.rows === 0 ? '—' : `${k.latestTest.avgMarks}/${k.latestTest.maxMarks}`} label={`Avg Marks (${k.latestTest.phaseLabel})`} delta={`${k.latestTest.rows} entries`} trend="up" icon={<TrendingUp size={18} className="text-primary" />} iconBg="var(--primary-light)" />
            <StatCard value={k.atRiskCount.value} label="At Risk" delta={k.atRiskCount.deltaLabel} trend="down" icon={<AlertTriangle size={18} className="text-danger" />} iconBg="var(--danger-light)" />
            <StatCard value={k.topScorer.name === '-' ? '—' : `${k.topScorer.marks}/${k.topScorer.maxMarks}`} label={`Top: ${k.topScorer.name}`} icon={<Award size={18} className="text-purple" />} iconBg="var(--purple-light)" />
          </>
        )}
      </div>

      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[
        { key: 'attendance', label: 'Attendance' },
        { key: 'marks', label: 'Marks' },
        { key: 'atrisk', label: 'At-Risk' },
        { key: 'leaderboard', label: 'Leaderboard' },
      ]} />

      {tab === 'attendance' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader title="Attendance Trend" subtitle="Per batch, last 6 months" />
            <CardBody>{trend.data ? <MultiLineChart labels={trend.data.labels} series={trend.data.series.map((s) => ({ name: s.batchCode, data: s.data }))} /> : <ChartSkeleton height={260} />}</CardBody>
          </Card>
          <Card>
            <CardHeader title="By Subject" />
            <CardBody>{bySub.data ? <SimpleBarChart data={bySub.data.subjects.map((x) => ({ label: x.code, value: x.avgPct }))} color="#0891B2" /> : <ChartSkeleton />}</CardBody>
          </Card>
          <Card>
            <CardHeader title="Attendance Distribution" />
            <CardBody>{dist.data ? <SimpleBarChart data={dist.data.buckets.map((b) => ({ label: b.range, value: b.count }))} color="#2563EB" domainMax={Math.max(...(dist.data?.buckets.map((b) => b.count) ?? [10]))} /> : <ChartSkeleton />}</CardBody>
          </Card>
        </div>
      )}

      {tab === 'marks' && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Select className="w-40" value={phaseId} onChange={(e) => setPhaseId(e.target.value)} placeholder="Test" options={phaseOptions} />
            {marksBySub.data && <Badge tone="neutral">Out of {marksBySub.data.maxMarks} · risk below {marksBySub.data.riskMark}</Badge>}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Marks Distribution" subtitle="Students per marks band" />
              <CardBody>{marksDist.data ? <DonutChart data={marksDist.data.buckets.map((b) => ({ label: b.grade, value: b.count }))} /> : <ChartSkeleton />}</CardBody>
            </Card>
            <Card>
              <CardHeader title="Avg Marks by Subject" subtitle={marksBySub.data ? `Out of ${marksBySub.data.maxMarks}` : undefined} />
              <CardBody>{marksBySub.data ? <SimpleBarChart data={marksBySub.data.subjects.map((x) => ({ label: x.code, value: x.avgMarks }))} color="#7C3AED" domainMax={marksBySub.data.maxMarks} /> : <ChartSkeleton />}</CardBody>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader title="Performance Radar" subtitle={radar.data ? `Top 10 vs Bottom 10 — avg marks out of ${radar.data.maxMarks}` : 'Top 10 vs Bottom 10 by subject'} />
              <CardBody>{radar.data ? <RadarCompareChart subjects={radar.data.subjects} topAvg={radar.data.topAvg} bottomAvg={radar.data.bottomAvg} /> : <ChartSkeleton height={300} />}</CardBody>
            </Card>
          </div>
        </>
      )}

      {tab === 'atrisk' && (
        <Card className="overflow-hidden">
          {atRisk.isLoading ? <div className="p-4"><TableSkeleton rows={8} cols={6} /></div> : atRisk.data && atRisk.data.data.length === 0 ? (
            <EmptyState icon={<AlertTriangle size={22} />} title="No at-risk students" description="Every student in this view is above the attendance and marks thresholds." className="border-0" />
          ) : (
            <Table>
              <thead><tr><Th sortKey="name" {...riskSortTh}>Student</Th><Th sortKey="batchCode" {...riskSortTh}>Batch</Th><Th sortKey="mentorCode" {...riskSortTh}>Mentor</Th><Th sortKey="avgAttendancePct" {...riskSortTh}>Attendance</Th><Th sortKey="latestTestMarks" {...riskSortTh}>Marks</Th><Th sortKey="riskFactor" {...riskSortTh}>Risk</Th><Th className="text-right">Action</Th></tr></thead>
              <tbody>
                {riskSort.rows.map((r) => (
                  <Tr key={r.enrollmentNo}>
                    <Td><div className="font-medium">{r.name}</div><div className="font-mono text-[11px] text-text-muted">{r.enrollmentNo}</div></Td>
                    <Td>{r.batchCode}</Td>
                    <Td>{r.mentorCode ? <Badge tone="teal">{r.mentorCode}</Badge> : '—'}</Td>
                    <Td className={r.avgAttendancePct < 75 ? 'font-semibold text-danger' : ''}>{Math.round(r.avgAttendancePct)}%</Td>
                    <Td className="font-semibold">
                      {r.latestTestMarks == null ? <span className="text-text-muted">—</span> : <span className={r.riskFactor !== 'ATTENDANCE' ? 'text-danger' : ''}>{r.latestTestMarks}/{r.latestTestMax}</span>}
                      <span className="ml-1 text-[10px] font-normal text-text-muted">{r.latestTestLabel}</span>
                    </Td>
                    <Td><Badge tone="danger">{r.riskFactor}</Badge></Td>
                    <Td className="text-right"><Button size="sm" variant="outline" loading={notify.isPending && notify.variables === r.enrollmentNo} onClick={() => notify.mutate(r.enrollmentNo)}>Notify Mentor</Button></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {tab === 'leaderboard' && (
        <>
          <div className="mb-4"><Select className="w-40" value={phaseId} onChange={(e) => setPhaseId(e.target.value)} placeholder="Test" options={phaseOptions} /></div>
          <Card className="overflow-hidden">
            {leaderboard.isLoading ? <div className="p-4"><TableSkeleton rows={8} cols={4} /></div> : leaderboard.data && leaderboard.data.data.length === 0 ? (
              <EmptyState icon={<Award size={22} />} title="No ranked students yet" description="Once marks are uploaded for this test, the leaderboard fills in." className="border-0" />
            ) : (
              <Table>
                <thead><tr><Th sortKey="rank" {...lbSortTh}>Rank</Th><Th sortKey="name" {...lbSortTh}>Student</Th><Th sortKey="batchCode" {...lbSortTh}>Batch</Th><Th sortKey="avgMarks" {...lbSortTh} className="text-right">Avg Marks</Th></tr></thead>
                <tbody>
                  {lbSort.rows.map((r) => (
                    <Tr key={r.enrollmentNo}>
                      <Td><Badge tone={r.rank <= 3 ? 'warning' : 'neutral'}>#{r.rank}</Badge></Td>
                      <Td><div className="font-medium">{r.name}</div><div className="font-mono text-[11px] text-text-muted">{r.enrollmentNo}</div></Td>
                      <Td>{r.batchCode}</Td>
                      <Td className="text-right font-semibold text-success">{r.avgMarks}/{lbMax}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </>
      )}
    </PageShell>
  )
}

interface AtRiskRow {
  enrollmentNo: string
  name: string
  batchCode: string
  mentorCode?: string | null
  avgAttendancePct: number
  latestTestMarks: number | null
  latestTestMax: number
  latestTestLabel: string
  riskFactor: string
}
