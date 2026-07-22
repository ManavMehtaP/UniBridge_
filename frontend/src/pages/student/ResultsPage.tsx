import { useQuery } from '@tanstack/react-query'
import { useTableSort } from '@/hooks/shared/useTableSort'
import { studentApi } from '@/api/student'
import type { StudentResult } from '@/types/student'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { Table, Td, Th, Tr } from '@/components/ui/Table'
import { StatCardSkeleton, TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { SimpleBarChart } from '@/components/charts'

export default function StudentResultsPage() {
  const list = useQuery({ queryKey: ['student', 'results'], queryFn: () => studentApi.results() })
  const summary = useQuery({ queryKey: ['student', 'results-summary'], queryFn: studentApi.resultsSummary })

  // Backend returns nested { semesters: [{ phases: [{ subjects: [...] }] }] }; flatten to rows.
  const rows: StudentResult[] = []
  const nested = list.data as { semesters?: { phases: { phaseLabel: string; subjects: { subjectCode: string; subjectName?: string; marksObtained: number; maxMarks: number; grade?: string | null; isPublished: boolean }[] }[] }[] } | undefined
  nested?.semesters?.forEach((sem) => sem.phases.forEach((ph) => ph.subjects.forEach((sub) => rows.push({
    phase: ph.phaseLabel, subjectCode: sub.subjectCode, subjectName: sub.subjectName,
    marksObtained: sub.marksObtained, maxMarks: sub.maxMarks, grade: sub.grade,
    isPublished: sub.isPublished,
  }))))
  const stats = summary.data as { avgMarksPct?: number; passCount?: number; failCount?: number; cgpa?: number } | undefined

  const byPhase = new Map<string, StudentResult[]>()
  rows.forEach((r) => {
    if (!byPhase.has(r.phase)) byPhase.set(r.phase, [])
    byPhase.get(r.phase)!.push(r)
  })
  const phaseChart = Array.from(byPhase.entries()).map(([phase, results]) => ({
    label: phase,
    value: Math.round(results.reduce((s, r) => s + (r.marksObtained / r.maxMarks) * 100, 0) / results.length),
  }))

  const sort = useTableSort(rows)
  const th = { activeKey: sort.sortKey, dir: sort.sortDir, onSort: sort.onSort }

  return (
    <PageShell title="Results" subtitle="Your published exam results">
      <div className="mb-5 grid grid-cols-2 gap-3.5 md:grid-cols-4">
        {list.isLoading || summary.isLoading ? <StatCardSkeleton count={4} /> : (
          <>
            <StatCard value={`${Math.round(stats?.avgMarksPct ?? 0)}%`} label="Avg Marks" />
            <StatCard value={rows.length} label="Total Papers" />
            <StatCard value={stats?.passCount ?? 0} label="Passed" trend="up" />
            <StatCard value={stats?.failCount ?? 0} label="Failed" trend={stats?.failCount ? 'down' : 'neutral'} />
          </>
        )}
      </div>

      {phaseChart.length > 0 && (
        <Card className="mb-4">
          <CardHeader title="Phase Performance" subtitle="Average marks by phase" />
          <CardBody>
            <SimpleBarChart data={phaseChart} />
          </CardBody>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardHeader title="All Results" />
        {list.isLoading ? (
          <div className="p-4"><TableSkeleton rows={5} cols={5} /></div>
        ) : rows.length === 0 ? (
          <EmptyState title="No results published yet" description="Your marks will show up here once faculty publish them." className="border-0" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th sortKey="phase" {...th}>Phase</Th>
                <Th sortKey="subjectName" {...th}>Subject</Th>
                <Th sortKey="marksObtained" {...th}>Marks</Th>
                <Th sortKey="grade" {...th}>Grade</Th>
                <Th>Result</Th>
              </tr>
            </thead>
            <tbody>
              {sort.rows.map((r, i) => {
                const pct = (r.marksObtained / r.maxMarks) * 100
                const passed = pct >= 40
                return (
                  <Tr key={i}>
                    <Td><Badge tone="primary">{r.phase}</Badge></Td>
                    <Td>
                      <div className="font-semibold">{r.subjectCode}</div>
                      {r.subjectName && <div className="text-xs text-text-muted">{r.subjectName}</div>}
                    </Td>
                    <Td className="tabular-nums">
                      <span className="font-semibold">{r.marksObtained}</span>
                      <span className="text-text-muted">/{r.maxMarks}</span>
                      <span className="ml-2 text-xs text-text-muted">({Math.round(pct)}%)</span>
                    </Td>
                    <Td><Badge tone={r.grade === 'F' ? 'danger' : 'success'}>{r.grade ?? '—'}</Badge></Td>
                    <Td><Badge tone={passed ? 'success' : 'danger'}>{passed ? 'PASS' : 'FAIL'}</Badge></Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </PageShell>
  )
}
