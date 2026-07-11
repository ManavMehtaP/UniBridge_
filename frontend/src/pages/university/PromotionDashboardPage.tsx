import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock, GitBranch, MinusCircle } from 'lucide-react'
import { universityApi } from '@/api/university'
import { PageShell } from '@/components/shared/PageShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Table, Td, Th, Tr } from '@/components/ui/Table'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

const YEARS = ['FY', 'SY', 'TY', 'FINAL'] as const
const YEAR_LABEL: Record<string, string> = { FY: 'First Year', SY: 'Second Year', TY: 'Third Year', FINAL: 'Final Year' }

const statusTone = { COMPLETE: 'success', IN_PROGRESS: 'warning', PENDING: 'danger', NO_DATA: 'neutral' } as const
const statusLabel = { COMPLETE: 'Complete', IN_PROGRESS: 'In Progress', PENDING: 'Pending', NO_DATA: 'No students' } as const

export default function PromotionDashboardPage() {
  const q = useQuery({ queryKey: ['uni', 'promotion-dashboard'], queryFn: universityApi.promotionDashboard })

  return (
    <PageShell title="Promotion Dashboard" subtitle="Per-department promotion status — the next admission cycle can only start once every HOD of a year level has promoted">
      {q.isLoading ? (
        <CardSkeleton height={280} />
      ) : (q.data?.hods ?? []).length === 0 ? (
        <EmptyState icon={<GitBranch size={22} />} title="No HODs yet" />
      ) : (
        <div className="space-y-5">
          {YEARS.map((yl) => {
            const group = q.data!.byYear[yl]
            if (!group || group.hods.length === 0) return null
            return (
              <Card key={yl} className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-text-primary">{YEAR_LABEL[yl]} ({yl})</h3>
                    <span className="text-xs text-text-muted">{group.hods.length} HODs</span>
                  </div>
                  {group.allComplete ? (
                    <Badge tone="success" dot>All promoted — next cycle unlocked</Badge>
                  ) : group.pendingHods > 0 ? (
                    <Badge tone="danger" dot>{group.pendingHods} HOD(s) pending — next cycle locked</Badge>
                  ) : (
                    <Badge tone="neutral">No promotion due</Badge>
                  )}
                </div>
                <Table>
                  <thead><tr>
                    <Th>HOD</Th><Th>Semester</Th><Th>Students</Th><Th>Promoted</Th><Th>Pending</Th><Th>Progress</Th><Th>Status</Th>
                  </tr></thead>
                  <tbody>
                    {group.hods.map((h) => (
                      <Tr key={h.hodId}>
                        <Td className="font-medium">{h.name} <span className="font-mono text-xs text-text-muted">· {h.employeeId}</span></Td>
                        <Td>{h.activeSemester?.label ?? '—'}</Td>
                        <Td className="tabular-nums">{h.totalStudents}</Td>
                        <Td className="tabular-nums text-success">{h.promoted}</Td>
                        <Td className="tabular-nums text-danger">{h.pending}</Td>
                        <Td>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2">
                              <div className={`h-full ${h.progressPct === 100 ? 'bg-success' : 'bg-primary'}`} style={{ width: `${h.progressPct}%` }} />
                            </div>
                            <span className="text-xs tabular-nums text-text-muted">{h.progressPct}%</span>
                          </div>
                        </Td>
                        <Td>
                          <span className="inline-flex items-center gap-1.5">
                            {h.status === 'COMPLETE' && <CheckCircle2 size={14} className="text-success" />}
                            {h.status === 'PENDING' && <Clock size={14} className="text-danger" />}
                            {h.status === 'NO_DATA' && <MinusCircle size={14} className="text-text-muted" />}
                            <Badge tone={statusTone[h.status]}>{statusLabel[h.status]}</Badge>
                          </span>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}
