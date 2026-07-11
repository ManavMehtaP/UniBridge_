import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AlertTriangle, Download, Lock, LockOpen } from 'lucide-react'
import { hodApi } from '@/api/hod'
import { errorMessage } from '@/api/client'
import { useHodScope } from '@/hooks/hod/useHodScope'
import { useHistoryStore } from '@/stores/historyStore'
import { HistoryBanner } from '@/components/hod/HistoryBanner'
import { attendanceTone } from '@/lib/utils'
import { PageShell } from '@/components/shared/PageShell'
import { AttendancePctCell } from '@/components/shared/AttendancePctCell'
import { Avatar } from '@/components/ui/Avatar'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import { Table, Td, Th, Tr } from '@/components/ui/Table'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCardSkeleton, TableSkeleton, ChartSkeleton } from '@/components/ui/Skeleton'
import { SimpleBarChart, MultiLineChart, DonutChart } from '@/components/charts'

const cellBg = { success: 'bg-success-light text-success', warning: 'bg-warning-light text-warning', danger: 'bg-danger-light text-danger' }

export default function AttendancePage() {
  const qc = useQueryClient()
  const scope = useHodScope()
  const history = useHistoryStore()
  const semesterId = history.semesterId ?? scope.data?.activeSemester.id
  const [batchId, setBatchId] = useState('')
  const [tab, setTab] = useState('overview')
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!batchId && scope.data?.batches[0]) setBatchId(scope.data.batches[0].id)
  }, [scope.data, batchId])

  const ready = !!batchId && !!semesterId

  const summary = useQuery({
    queryKey: ['hod', 'att', 'summary', semesterId],
    queryFn: () => hodApi.attendance.summary(semesterId),
    enabled: !!semesterId,
  })
  const table = useQuery({
    queryKey: ['hod', 'att', 'table', batchId, semesterId, page],
    queryFn: () => hodApi.attendance.table({ batchId, semesterId, page, limit: 20 }),
    enabled: ready && tab === 'table',
  })
  const heatmap = useQuery({
    queryKey: ['hod', 'att', 'heatmap', batchId, semesterId],
    queryFn: () => hodApi.attendance.heatmap(batchId, semesterId!) as Promise<{ subjects: string[]; students: { enrollmentNo: string; name: string; perSubjectPct: number[]; avgPct: number }[] }>,
    enabled: ready && tab === 'heatmap',
  })
  const bySubject = useQuery({
    queryKey: ['hod', 'att', 'bysub', batchId, semesterId],
    queryFn: () => hodApi.attendance.bySubject(batchId, semesterId!) as Promise<{ subjects: { code: string; avgPct: number }[] }>,
    enabled: ready && (tab === 'bysubject' || tab === 'overview'),
  })
  // ── Analytical overview (reuses the analytics endpoints) ──
  const trend = useQuery({
    queryKey: ['hod', 'att', 'trend'],
    queryFn: () => hodApi.analytics.attendanceTrend(6) as Promise<{ labels: string[]; series: { batchCode: string; data: number[] }[] }>,
    enabled: tab === 'overview',
  })
  const dist = useQuery({
    queryKey: ['hod', 'att', 'dist', batchId],
    queryFn: () => hodApi.analytics.attendanceDistribution(batchId || undefined) as Promise<{ buckets: { range: string; count: number }[] }>,
    enabled: tab === 'overview' && ready,
  })
  const atRisk = useQuery({
    queryKey: ['hod', 'att', 'atrisk', batchId],
    queryFn: () => hodApi.analytics.atRisk({ batchId: batchId || undefined, limit: 8 }) as Promise<{ data: { enrollmentNo: string; name: string; batchCode: string; avgAttendancePct: number; riskFactor: string }[] }>,
    enabled: tab === 'overview' && ready,
  })

  const lockAll = useMutation({
    mutationFn: () => hodApi.attendance.lockAll(batchId, semesterId!),
    onSuccess: (r: { lockedCount?: number }) => { toast.success(`Locked ${r.lockedCount ?? 0} records`); qc.invalidateQueries({ queryKey: ['hod', 'att'] }) },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const unlockOne = useMutation({
    mutationFn: (enrollmentId: string) => hodApi.attendance.unlock(enrollmentId, ''),
    onSuccess: () => { toast.success('Record unlocked'); qc.invalidateQueries({ queryKey: ['hod', 'att', 'table'] }) },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const tableCols = useMemo(() => {
    const first = table.data?.data[0]
    return first ? Object.keys(first.perSubject) : []
  }, [table.data])

  const s = summary.data

  return (
    <PageShell
      title="Attendance"
      subtitle="Monitor and lock attendance records"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Select className="w-40" value={batchId} onChange={(e) => { setBatchId(e.target.value); setPage(1) }}
            options={scope.data?.batches.map((b) => ({ value: b.id, label: `Batch ${b.code}` })) ?? []} />
          <Button variant="outline" leftIcon={<Download size={15} />} disabled={!ready} onClick={() => hodApi.attendance.export(batchId, semesterId!)}>Export</Button>
          <Button variant="outline" leftIcon={<Lock size={15} />} disabled={!ready} loading={lockAll.isPending} onClick={() => lockAll.mutate()}>Lock All</Button>
        </div>
      }
    >
      <HistoryBanner />
      <div className="mb-5 grid grid-cols-2 gap-3.5 md:grid-cols-4">
        {summary.isLoading ? (
          <StatCardSkeleton count={4} />
        ) : s ? (
          <>
            <StatCard value={`${Math.round(s.overallAvgPct)}%`} label="Overall Avg" delta={s.deltaLabel} trend="up" />
            <StatCard value={s.belowThresholdCount} label="Below Threshold" icon={<AlertTriangle size={18} className="text-danger" />} iconBg="var(--danger-light)" />
            <StatCard value={s.totalLectures.toLocaleString('en-IN')} label="Total Lectures" />
            <StatCard value={`${s.lockedRecordsPct}%`} label="Records Locked" icon={<Lock size={18} className="text-teal" />} iconBg="var(--teal-light)" />
          </>
        ) : null}
      </div>

      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[
        { key: 'overview', label: 'Overview' },
        { key: 'table', label: 'Table' },
        { key: 'heatmap', label: 'Heatmap' },
        { key: 'bysubject', label: 'By Subject' },
      ]} />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Attendance Trend" subtitle="Average % per batch · last 6 months" />
            <CardBody>
              {trend.data ? <MultiLineChart labels={trend.data.labels} series={trend.data.series.map((s) => ({ name: s.batchCode, data: s.data }))} /> : <ChartSkeleton height={240} />}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Distribution" subtitle="Students by attendance band" />
            <CardBody>
              {dist.data ? <DonutChart data={dist.data.buckets.map((b) => ({ label: b.range, value: b.count }))} /> : <ChartSkeleton />}
            </CardBody>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader title="Subject-wise Attendance" subtitle="Average % per subject" />
            <CardBody>
              {bySubject.data ? <SimpleBarChart data={bySubject.data.subjects.map((x) => ({ label: x.code, value: x.avgPct }))} color="#0891B2" /> : <ChartSkeleton />}
            </CardBody>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader title={<span className="flex items-center gap-2"><AlertTriangle size={15} className="text-danger" /> At-Risk Students</span>}
              subtitle={atRisk.data ? `${atRisk.data.data.length} below threshold` : undefined} />
            <CardBody className="pt-0">
              {atRisk.isLoading ? <TableSkeleton rows={5} cols={2} /> : (atRisk.data?.data ?? []).length === 0 ? (
                <EmptyState title="All above threshold" description="No at-risk students. 🎉" className="border-0" />
              ) : (
                <div className="divide-y divide-border-light">
                  {atRisk.data?.data.map((r) => (
                    <div key={r.enrollmentNo} className="flex items-center gap-2.5 py-2">
                      <Avatar name={r.name} size={30} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold">{r.name}</div>
                        <div className="text-[11px] text-text-muted">{r.enrollmentNo} · {r.batchCode}</div>
                      </div>
                      <span className="text-sm font-bold text-danger">{Math.round(r.avgAttendancePct)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'table' && (
        <Card className="overflow-hidden">
          {table.isLoading ? (
            <div className="p-4"><TableSkeleton rows={8} cols={7} /></div>
          ) : (
            <>
              <Table>
                <thead>
                  <tr>
                    <Th>Student</Th>
                    {tableCols.map((c) => <Th key={c}>{c}</Th>)}
                    <Th>Avg</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Lock</Th>
                  </tr>
                </thead>
                <tbody>
                  {table.data?.data.map((r) => (
                    <Tr key={r.enrollmentNo}>
                      <Td>
                        <div className="font-medium">{r.name}</div>
                        <div className="font-mono text-[11px] text-text-muted">{r.enrollmentNo}</div>
                      </Td>
                      {tableCols.map((c) => {
                        const pct = r.perSubject[c]
                        return <Td key={c} className={`font-semibold ${attendanceTone(pct) === 'danger' ? 'text-danger' : attendanceTone(pct) === 'warning' ? 'text-warning' : 'text-success'}`}>{Math.round(pct)}%</Td>
                      })}
                      <Td><AttendancePctCell pct={r.avgPct} showBar={false} /></Td>
                      <Td><Badge tone={r.status === 'AT_RISK' ? 'danger' : 'success'}>{r.status.replace('_', ' ')}</Badge></Td>
                      <Td className="text-right">
                        {r.isLocked ? (
                          <button title="Unlock" onClick={() => unlockOne.mutate((r as { enrollmentId?: string }).enrollmentId ?? r.enrollmentNo)} className="ml-auto flex h-8 w-8 items-center justify-center rounded-sm text-teal hover:bg-teal-light">
                            <Lock size={15} />
                          </button>
                        ) : (
                          <span className="ml-auto flex h-8 w-8 items-center justify-center text-text-muted"><LockOpen size={15} /></span>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
              {table.data && (
                <div className="border-t border-border px-3">
                  <Pagination page={table.data.page} totalPages={table.data.totalPages} total={table.data.total} limit={table.data.limit} onPage={setPage} />
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {tab === 'heatmap' && (
        <Card className="overflow-hidden">
          {heatmap.isLoading ? (
            <div className="p-4"><TableSkeleton rows={8} cols={6} /></div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Student</Th>
                  {heatmap.data?.subjects.map((c) => <Th key={c} className="text-center">{c}</Th>)}
                  <Th className="text-center">Avg</Th>
                </tr>
              </thead>
              <tbody>
                {heatmap.data?.students.map((st) => (
                  <Tr key={st.enrollmentNo}>
                    <Td>
                      <div className="font-medium">{st.name}</div>
                      <div className="font-mono text-[11px] text-text-muted">{st.enrollmentNo}</div>
                    </Td>
                    {st.perSubjectPct.map((pct, i) => (
                      <Td key={i} className="p-1 text-center">
                        <span className={`inline-block w-full rounded px-2 py-1.5 text-xs font-semibold ${cellBg[attendanceTone(pct)]}`}>{Math.round(pct)}</span>
                      </Td>
                    ))}
                    <Td className="text-center font-semibold">{Math.round(st.avgPct)}%</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {tab === 'bysubject' && (
        <Card>
          <CardHeader title="Subject-wise Attendance" subtitle="Average % per subject" />
          <CardBody>
            {bySubject.data ? (
              <SimpleBarChart data={bySubject.data.subjects.map((x) => ({ label: x.code, value: x.avgPct }))} color="#0891B2" />
            ) : (
              <TableSkeleton rows={1} cols={5} />
            )}
          </CardBody>
        </Card>
      )}
    </PageShell>
  )
}
