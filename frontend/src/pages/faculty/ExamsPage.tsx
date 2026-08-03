import { useEffect, useState } from 'react'
import { useTableSort } from '@/hooks/shared/useTableSort'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, ClipboardCheck } from 'lucide-react'
import { examApi } from '@/api/exam'
import { errorMessage } from '@/api/client'
import { PageShell } from '@/components/shared/PageShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Table, Th, Td, Tr } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'

const STATUS_TONE = { Pending: 'neutral', 'In Progress': 'warning', Complete: 'success', Published: 'purple' } as const

// The checker's paper-checking duties: open an allocation → enter marks for the
// exact enrollment numbers in its blocks. Saves are live to the HOD immediately.
export default function FacultyExamsPage() {
  const [openId, setOpenId] = useState<string | null>(null)
  const mine = useQuery({ queryKey: ['faculty', 'paper-checking'], queryFn: examApi.myPaperChecking, refetchInterval: 60_000 })
  // All hooks must run before any early return (Rules of Hooks).
  const sort = useTableSort(mine.data ?? [])
  const th = { activeKey: sort.sortKey, dir: sort.sortDir, onSort: sort.onSort }

  if (openId) return <MarksEntry allocationId={openId} onBack={() => setOpenId(null)} />

  return (
    <PageShell title="Paper Checking" subtitle="Enter marks for the blocks assigned to you — T1–T3 out of 25, T4 out of 50">
      <Card className="overflow-hidden">
        <div className="border-b border-border p-4">
          <h3 className="text-sm font-semibold text-text-primary">My Paper Sets</h3>
          <p className="text-xs text-text-muted">Assigned by your HOD/coordinator · marks stay draft until the HOD pushes results live</p>
        </div>
        {mine.isLoading ? (
          <div className="p-4"><CardSkeleton height={140} /></div>
        ) : (mine.data ?? []).length === 0 ? (
          <EmptyState icon={<ClipboardCheck size={22} />} title="No papers assigned" description="You have no paper-checking duties from a published exam yet." />
        ) : (
          <Table>
            <thead><tr><Th sortKey="exam" {...th}>Exam</Th><Th sortKey="subjectCode" {...th}>Subject</Th><Th sortKey="range" {...th}>Blocks</Th><Th sortKey="markedCount" {...th}>Progress</Th><Th sortKey="status" {...th}>Status</Th><Th /></tr></thead>
            <tbody>
              {sort.rows.map((a) => (
                <Tr key={a.id} className="cursor-pointer" onClick={() => setOpenId(a.id)}>
                  <Td>{a.exam}</Td>
                  <Td className="font-medium">{a.subjectCode}</Td>
                  <Td className="whitespace-nowrap text-xs">{a.range}</Td>
                  <Td className="min-w-[130px]">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={a.totalStudents === 0 ? 0 : (a.markedCount / a.totalStudents) * 100} tone={a.markedCount === a.totalStudents ? 'success' : 'warning'} className="w-20" />
                      <span className="text-xs text-text-muted">{a.markedCount}/{a.totalStudents}</span>
                    </div>
                  </Td>
                  <Td><Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge></Td>
                  <Td><Button size="sm" variant="outline">{a.status === 'Published' ? 'View' : 'Enter Marks'}</Button></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </PageShell>
  )
}

function MarksEntry({ allocationId, onBack }: { allocationId: string; onBack: () => void }) {
  const qc = useQueryClient()
  const detail = useQuery({ queryKey: ['faculty', 'paper-checking', allocationId], queryFn: () => examApi.paperCheckingStudents(allocationId) })
  const [marks, setMarks] = useState<Record<string, string>>({})

  useEffect(() => {
    if (detail.data) setMarks(Object.fromEntries(detail.data.students.map((s) => [s.enrollmentId, s.enteredMarks == null ? '' : String(s.enteredMarks)])))
  }, [detail.data])

  const save = useMutation({
    mutationFn: () => examApi.savePaperCheckingMarks(allocationId, Object.entries(marks).map(([enrollmentId, v]) => ({ enrollmentId, marks: v === '' ? null : Number(v) }))),
    onSuccess: (r) => { toast.success(`Saved marks for ${r.saved} students`); qc.invalidateQueries({ queryKey: ['faculty', 'paper-checking'] }) },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const a = detail.data?.allocation
  const entryMax = a?.entryMax ?? 25
  const invalid = Object.values(marks).some((v) => v !== '' && (!Number.isFinite(Number(v)) || Number(v) < 0 || Number(v) > entryMax))

  return (
    <PageShell
      title={a ? `${a.subjectCode} — ${a.range}` : 'Enter Marks'}
      subtitle={a ? `${a.examName} · out of ${entryMax}${entryMax === 50 ? ' (stored ÷2, max 25)' : ''}` : ''}
      action={
        <div className="flex gap-2">
          <Button variant="outline" leftIcon={<ArrowLeft size={15} />} onClick={onBack}>Back</Button>
          {!a?.isPublished && <Button onClick={() => save.mutate()} loading={save.isPending} disabled={invalid || detail.isLoading}>Save Marks</Button>}
        </div>
      }
    >
      {a?.isPublished && <div className="mb-4"><Badge tone="purple">Published — read only</Badge></div>}
      {detail.isLoading ? <CardSkeleton height={300} /> : (
        <Card className="overflow-hidden">
          <Table>
            <thead><tr><Th>Block</Th><Th>Roll No</Th><Th>Enrollment No</Th><Th>Student</Th><Th>Marks / {entryMax}</Th><Th>Grade</Th></tr></thead>
            <tbody>
              {detail.data?.students.map((s) => (
                <Tr key={s.enrollmentId}>
                  <Td className="tabular-nums">B{s.blockNumber}</Td>
                  <Td className="whitespace-nowrap">{s.rollNo}</Td>
                  <Td className="whitespace-nowrap text-xs">{s.enrollmentNo}</Td>
                  <Td className="font-medium">{s.name}</Td>
                  <Td>
                    <Input type="number" min={0} max={entryMax} step={0.5} value={marks[s.enrollmentId] ?? ''} disabled={a?.isPublished}
                      onChange={(e) => setMarks((m) => ({ ...m, [s.enrollmentId]: e.target.value }))} className="h-8 w-24" />
                  </Td>
                  <Td>{s.grade ?? '—'}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </PageShell>
  )
}
