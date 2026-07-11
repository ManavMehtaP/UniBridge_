import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Activity, AlertTriangle, Award, Download, TrendingUp, Users } from 'lucide-react'
import { hodApi } from '@/api/hod'
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
import { StatCardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/ui/Skeleton'
import { DonutChart, MultiLineChart, RadarCompareChart, SimpleBarChart } from '@/components/charts'

export default function AnalyticsPage() {
  const scope = useHodScope()
  const history = useHistoryStore()
  const semesterId = history.semesterId ?? scope.data?.activeSemester.id
  const [batchId, setBatchId] = useState('')
  const [phaseId, setPhaseId] = useState('')
  const [tab, setTab] = useState('attendance')

  const kpi = useQuery({ queryKey: ['hod', 'an', 'kpi', batchId], queryFn: () => hodApi.analytics.kpi(batchId || undefined) })
  const ctx = useQuery({ queryKey: ['hod', 'results', 'ctx', semesterId], queryFn: () => hodApi.results.uploadContext(semesterId) as Promise<{ phases: { id: string; label: string }[] }>, enabled: !!semesterId })

  useEffect(() => {
    if (!phaseId && ctx.data?.phases?.length) setPhaseId(ctx.data.phases[ctx.data.phases.length - 1].id)
  }, [ctx.data, phaseId])

  const trend = useQuery({ queryKey: ['hod', 'an', 'trend'], queryFn: () => hodApi.analytics.attendanceTrend(6) as Promise<{ labels: string[]; series: { batchCode: string; data: number[] }[] }>, enabled: tab === 'attendance' })
  const bySub = useQuery({ queryKey: ['hod', 'an', 'bysub', batchId], queryFn: () => hodApi.analytics.attendanceBySubject(batchId || undefined) as Promise<{ subjects: { code: string; avgPct: number }[] }>, enabled: tab === 'attendance' })
  const dist = useQuery({ queryKey: ['hod', 'an', 'dist', batchId], queryFn: () => hodApi.analytics.attendanceDistribution(batchId || undefined) as Promise<{ buckets: { range: string; count: number }[] }>, enabled: tab === 'attendance' })

  const grade = useQuery({ queryKey: ['hod', 'an', 'grade', phaseId, batchId], queryFn: () => hodApi.analytics.gradeDistribution(phaseId, batchId || undefined) as Promise<{ buckets: { grade: string; count: number }[] }>, enabled: tab === 'marks' && !!phaseId })
  const marksBySub = useQuery({ queryKey: ['hod', 'an', 'marksbysub', phaseId, batchId], queryFn: () => hodApi.analytics.marksBySubject(phaseId, batchId || undefined) as Promise<{ subjects: { code: string; avgMarksPct: number }[] }>, enabled: tab === 'marks' && !!phaseId })
  const radar = useQuery({ queryKey: ['hod', 'an', 'radar', phaseId], queryFn: () => hodApi.analytics.performanceRadar(phaseId) as Promise<{ subjects: string[]; topAvg: number[]; bottomAvg: number[] }>, enabled: tab === 'marks' && !!phaseId })

  const atRisk = useQuery({ queryKey: ['hod', 'an', 'atrisk', batchId], queryFn: () => hodApi.analytics.atRisk({ batchId: batchId || undefined, limit: 20 }) as Promise<{ data: { enrollmentNo: string; name: string; batchCode: string; mentorCode?: string; avgAttendancePct: number; latestPhaseMarksPct: number; riskFactor: string }[] }>, enabled: tab === 'atrisk' })
  const leaderboard = useQuery({ queryKey: ['hod', 'an', 'lb', phaseId, batchId], queryFn: () => hodApi.analytics.leaderboard(phaseId, batchId || undefined, 10) as Promise<{ data: { rank: number; enrollmentNo: string; name: string; batchCode: string; avgPct: number }[] }>, enabled: tab === 'leaderboard' && !!phaseId })

  const notify = useMutation({
    mutationFn: (enrollmentNo: string) => hodApi.analytics.notifyMentor(enrollmentNo),
    onSuccess: (r: { mentorCode?: string }) => toast.success(`Mentor ${r.mentorCode ?? ''} notified`),
    onError: (e) => toast.error(errorMessage(e)),
  })

  const k = kpi.data
  const batchOptions = scope.data?.batches.map((b) => ({ value: b.id, label: `Batch ${b.code}` })) ?? []
  const phaseOptions = ctx.data?.phases.map((p) => ({ value: p.id, label: p.label })) ?? []

  return (
    <PageShell
      title="Analytics"
      subtitle="Deep-dive into attendance and performance"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Select className="w-40" value={batchId} onChange={(e) => setBatchId(e.target.value)} placeholder="All Batches" options={batchOptions} />
          <Button variant="outline" leftIcon={<Download size={15} />} onClick={() => hodApi.analytics.export({ batchId: batchId || undefined })}>Export PDF</Button>
        </div>
      }
    >
      <HistoryBanner />
      <div className="mb-5 grid grid-cols-2 gap-3.5 md:grid-cols-3 lg:grid-cols-5">
        {kpi.isLoading || !k ? <StatCardSkeleton count={5} /> : (
          <>
            <StatCard value={`${Math.round(k.avgAttendance.value)}%`} label="Avg Attendance" delta={k.avgAttendance.deltaLabel} trend="up" icon={<Activity size={18} className="text-primary" />} iconBg="var(--primary-light)" />
            <StatCard value={`${Math.round(k.avgMarksLatestPhase.value)}%`} label={`Avg Marks (${k.avgMarksLatestPhase.phaseLabel})`} delta={k.avgMarksLatestPhase.deltaLabel} trend="up" icon={<TrendingUp size={18} className="text-teal" />} iconBg="var(--teal-light)" />
            <StatCard value={k.atRiskCount.value} label="At Risk" delta={k.atRiskCount.deltaLabel} trend="down" icon={<AlertTriangle size={18} className="text-danger" />} iconBg="var(--danger-light)" />
            <StatCard value={`${Math.round(k.passRateLatestPhase.value)}%`} label={`Pass Rate (${k.passRateLatestPhase.phaseLabel})`} delta={k.passRateLatestPhase.deltaLabel} trend="up" icon={<Users size={18} className="text-success" />} iconBg="var(--success-light)" />
            <StatCard value={`${Math.round(k.topScorer.avgPct)}%`} label={`Top: ${k.topScorer.name}`} icon={<Award size={18} className="text-purple" />} iconBg="var(--purple-light)" />
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
          <div className="mb-4"><Select className="w-40" value={phaseId} onChange={(e) => setPhaseId(e.target.value)} placeholder="Phase" options={phaseOptions} /></div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Grade Distribution" />
              <CardBody>{grade.data ? <DonutChart data={grade.data.buckets.map((b) => ({ label: b.grade, value: b.count }))} /> : <ChartSkeleton />}</CardBody>
            </Card>
            <Card>
              <CardHeader title="Avg Marks by Subject" />
              <CardBody>{marksBySub.data ? <SimpleBarChart data={marksBySub.data.subjects.map((x) => ({ label: x.code, value: x.avgMarksPct }))} color="#7C3AED" /> : <ChartSkeleton />}</CardBody>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader title="Performance Radar" subtitle="Top 10 vs Bottom 10 by subject" />
              <CardBody>{radar.data ? <RadarCompareChart subjects={radar.data.subjects} topAvg={radar.data.topAvg} bottomAvg={radar.data.bottomAvg} /> : <ChartSkeleton height={300} />}</CardBody>
            </Card>
          </div>
        </>
      )}

      {tab === 'atrisk' && (
        <Card className="overflow-hidden">
          {atRisk.isLoading ? <div className="p-4"><TableSkeleton rows={8} cols={6} /></div> : (
            <Table>
              <thead><tr><Th>Student</Th><Th>Batch</Th><Th>Mentor</Th><Th>Attendance</Th><Th>Marks</Th><Th>Risk</Th><Th className="text-right">Action</Th></tr></thead>
              <tbody>
                {atRisk.data?.data.map((r) => (
                  <Tr key={r.enrollmentNo}>
                    <Td><div className="font-medium">{r.name}</div><div className="font-mono text-[11px] text-text-muted">{r.enrollmentNo}</div></Td>
                    <Td>{r.batchCode}</Td>
                    <Td>{r.mentorCode ? <Badge tone="teal">{r.mentorCode}</Badge> : '—'}</Td>
                    <Td className="font-semibold text-danger">{Math.round(r.avgAttendancePct)}%</Td>
                    <Td className="font-semibold text-danger">{Math.round(r.latestPhaseMarksPct)}%</Td>
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
          <div className="mb-4"><Select className="w-40" value={phaseId} onChange={(e) => setPhaseId(e.target.value)} placeholder="Phase" options={phaseOptions} /></div>
          <Card className="overflow-hidden">
            {leaderboard.isLoading ? <div className="p-4"><TableSkeleton rows={8} cols={4} /></div> : (
              <Table>
                <thead><tr><Th>Rank</Th><Th>Student</Th><Th>Batch</Th><Th className="text-right">Avg %</Th></tr></thead>
                <tbody>
                  {leaderboard.data?.data.map((r) => (
                    <Tr key={r.enrollmentNo}>
                      <Td><Badge tone={r.rank <= 3 ? 'warning' : 'neutral'}>#{r.rank}</Badge></Td>
                      <Td><div className="font-medium">{r.name}</div><div className="font-mono text-[11px] text-text-muted">{r.enrollmentNo}</div></Td>
                      <Td>{r.batchCode}</Td>
                      <Td className="text-right font-semibold text-success">{r.avgPct.toFixed(1)}%</Td>
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
