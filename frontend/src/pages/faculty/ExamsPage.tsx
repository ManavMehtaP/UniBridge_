import { useEffect, useRef, useState } from 'react'
import { useTableSort } from '@/hooks/shared/useTableSort'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, ClipboardCheck } from 'lucide-react'
import { examApi } from '@/api/exam'
import { errorMessage } from '@/api/client'
import { cn } from '@/lib/utils'
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

type Cell = { off: string; on: string; absent: boolean }

function MarksEntry({ allocationId, onBack }: { allocationId: string; onBack: () => void }) {
  const qc = useQueryClient()
  const detail = useQuery({ queryKey: ['faculty', 'paper-checking', allocationId], queryFn: () => examApi.paperCheckingStudents(allocationId) })
  const [vals, setVals] = useState<Record<string, Cell>>({})
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const dirty = useRef<Set<string>>(new Set())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seeded = useRef(false)
  const valsRef = useRef<Record<string, Cell>>({}) // latest values for the debounced flush (avoids stale closure)

  const a = detail.data?.allocation
  const editable = a?.editableComponent ?? 'FULL'
  const isSplit = !!a?.isSplit
  const readOnly = !!a?.isPublished
  const totalMax = a?.totalMax ?? 25
  const passMark = a?.passMark ?? 9

  // Seed ONCE — autosave refetches invalidate the list, not this grid, so live typing is never clobbered.
  useEffect(() => {
    if (!detail.data || seeded.current) return
    seeded.current = true
    const seed = Object.fromEntries(detail.data.students.map((s) => [s.enrollmentId, {
      off: s.offlineMarks != null ? String(s.offlineMarks) : (!detail.data!.allocation.isSplit && s.enteredMarks != null ? String(s.enteredMarks) : ''),
      on: s.onlineMarks != null ? String(s.onlineMarks) : '',
      absent: s.isAbsent,
    } as Cell]))
    valsRef.current = seed
    setVals(seed)
  }, [detail.data])

  const save = useMutation({
    mutationFn: (rows: { enrollmentId: string; marks: number | null; absent?: boolean }[]) => examApi.savePaperCheckingMarks(allocationId, rows),
    onSuccess: (_r, rows) => { rows.forEach((x) => dirty.current.delete(x.enrollmentId)); setSavedAt(new Date().toLocaleTimeString()); qc.invalidateQueries({ queryKey: ['faculty', 'paper-checking'], exact: true }) },
    onError: (e) => toast.error(errorMessage(e)),
  })

  function flush() {
    if (readOnly) return
    const ids = [...dirty.current]
    const rows = ids.map((id) => {
      const v = valsRef.current[id] // read the LATEST values, not the render-time closure
      const field = editable === 'ONLINE' ? v.on : v.off // FULL & OFFLINE both write the 'off' slot
      return { enrollmentId: id, absent: v.absent, marks: v.absent ? null : (field === '' ? null : Number(field)) }
    }).filter((r) => r.absent || r.marks != null)
    if (rows.length) save.mutate(rows)
  }
  function scheduleSave() { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(flush, 1500) } // autosave ~1.5s after last keystroke
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  function setField(id: string, patch: Partial<Cell>) {
    setVals((m) => {
      const next = { ...m, [id]: { ...(m[id] ?? { off: '', on: '', absent: false }), ...patch } }
      valsRef.current = next
      return next
    })
    dirty.current.add(id); scheduleSave()
  }
  function rowTotal(v: Cell): number | null {
    if (v.absent) return null
    if (!isSplit) return v.off === '' ? null : Number(v.off)
    if (v.off === '' || v.on === '') return null // incomplete → no verdict yet
    return Number(v.off) + Number(v.on)
  }

  return (
    <PageShell
      title={a ? `${a.subjectCode} — ${a.range}` : 'Enter Marks'}
      subtitle={a ? `${a.examName} · ${isSplit ? `offline ${a.offlineMax} + online ${a.onlineMax} = ${totalMax} (you enter the ${editable} paper)` : `out of ${totalMax}`} · pass ${passMark}` : ''}
      action={
        <div className="flex items-center gap-2">
          {!readOnly && (save.isPending ? <span className="text-xs text-text-muted">Saving…</span> : savedAt ? <span className="text-xs text-success">Autosaved {savedAt}</span> : <span className="text-xs text-text-muted">Autosaves as you type</span>)}
          <Button variant="outline" leftIcon={<ArrowLeft size={15} />} onClick={() => { flush(); onBack() }}>Back</Button>
        </div>
      }
    >
      {readOnly && <div className="mb-4"><Badge tone="purple">Published — read only</Badge></div>}
      {!readOnly && <p className="mb-3 text-xs text-text-muted">Marks autosave as you type. A <span className="font-semibold text-danger">red total</span> means the student is below the pass mark ({passMark}/{totalMax}).{isSplit && editable !== 'FULL' ? ` The ${editable === 'OFFLINE' ? 'online' : 'offline'} column is filled by the other checker.` : ''}</p>}
      {detail.isLoading ? <CardSkeleton height={300} /> : (
        <Card className="overflow-hidden">
          <Table>
            <thead><tr>
              <Th>Block</Th><Th>Roll</Th><Th>Enrollment</Th><Th>Student</Th>
              {isSplit ? <><Th>Offline /{a!.offlineMax}</Th><Th>Online /{a!.onlineMax}</Th></> : <Th>Marks /{totalMax}</Th>}
              <Th>Total /{totalMax}</Th><Th>Absent</Th><Th>Grade</Th>
            </tr></thead>
            <tbody>
              {detail.data?.students.map((s) => {
                const v = vals[s.enrollmentId] ?? { off: '', on: '', absent: false }
                const total = rowTotal(v)
                const failed = total != null && total < passMark
                return (
                <Tr key={s.enrollmentId}>
                  <Td className="whitespace-nowrap text-xs font-medium">{s.blockLabel}</Td>
                  <Td className="whitespace-nowrap">{s.rollNo}</Td>
                  <Td className="whitespace-nowrap text-xs">{s.enrollmentNo}</Td>
                  <Td className="font-medium">{s.name}</Td>
                  {isSplit ? (
                    <>
                      <Td><Input type="number" min={0} max={a!.offlineMax} step={0.5} disabled={readOnly || v.absent || editable !== 'OFFLINE'} value={v.absent ? '' : v.off} placeholder={v.absent ? 'AB' : editable !== 'OFFLINE' ? '—' : ''} onChange={(e) => setField(s.enrollmentId, { off: e.target.value })} className="h-8 w-20" /></Td>
                      <Td><Input type="number" min={0} max={a!.onlineMax} step={0.5} disabled={readOnly || v.absent || editable !== 'ONLINE'} value={v.absent ? '' : v.on} placeholder={v.absent ? 'AB' : editable !== 'ONLINE' ? '—' : ''} onChange={(e) => setField(s.enrollmentId, { on: e.target.value })} className="h-8 w-20" /></Td>
                    </>
                  ) : (
                    <Td><Input type="number" min={0} max={totalMax} step={0.5} disabled={readOnly || v.absent} value={v.absent ? '' : v.off} placeholder={v.absent ? 'Absent' : ''} onChange={(e) => setField(s.enrollmentId, { off: e.target.value })} className="h-8 w-24" /></Td>
                  )}
                  <Td>
                    <span className={cn('inline-flex min-w-[54px] justify-center rounded px-2 py-1 text-sm font-semibold tabular-nums',
                      v.absent ? 'bg-danger-light text-danger' : failed ? 'bg-danger text-white' : total != null ? 'bg-success-light text-success' : 'text-text-muted')}>
                      {v.absent ? 'AB' : total == null ? '—' : total}
                    </span>
                  </Td>
                  <Td><Button size="sm" variant={v.absent ? 'danger' : 'outline'} disabled={readOnly} onClick={() => setField(s.enrollmentId, { absent: !v.absent })}>{v.absent ? 'Absent ✓' : 'Absent'}</Button></Td>
                  <Td>{v.absent ? <Badge tone="danger">AB</Badge> : (s.grade && s.grade !== 'AB' ? s.grade : '—')}</Td>
                </Tr>
              )})}
            </tbody>
          </Table>
        </Card>
      )}
    </PageShell>
  )
}
