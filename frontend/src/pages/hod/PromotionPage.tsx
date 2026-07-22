import { useState } from 'react'
import { useTableSort } from '@/hooks/shared/useTableSort'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AlertTriangle, ArrowRight, CalendarRange, Check, GraduationCap, Layers, Rocket, Trophy, Users } from 'lucide-react'
import { hodApi } from '@/api/hod'
import { errorMessage } from '@/api/client'
import { cn } from '@/lib/utils'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Table, Td, Th, Tr } from '@/components/ui/Table'
import { Spinner } from '@/components/ui/Spinner'
import { CardSkeleton, StatCardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

const YEAR_LABEL: Record<string, string> = { FY: 'First Year', SY: 'Second Year', TY: 'Third Year', FINAL: 'Final Year' }

interface PromoContext {
  mode: 'SEMESTER' | 'YEAR' | null
  activeSemester: { id: string; label: string; number: number; yearLevel: string }
  nextSemester: { id: string; label: string; number: number } | null
  nextYear: { id: string; label: string } | null
  nextYearLevel: string
  currentStudentCount: number
  passedCount: number
  failedCount: number
  pendingCount: number
  branchesInScope: string[]
  hods: { id: string; name: string; employeeId: string }[]
  branches: { code: string; name: string }[]
}
interface LeaderRow {
  rank: number; enrollmentId: string; enrollmentNo: string; name: string
  branch: string; batchCode: string; rollNo: string; aggregatePct: number | null; status: 'Pass' | 'Fail' | 'Pending'
}
interface YearPreview {
  totalStudents: number; promotable: number; detained: number; seats: number; overflow: number
  batches: { code: string; assigned: number; capacity: number }[]
}

export default function PromotionPage() {
  const ctx = useQuery({ queryKey: ['hod', 'promo', 'context'], queryFn: () => hodApi.promotion.context() as Promise<PromoContext> })

  return (
    <PageShell title="Promotion" subtitle="Advance students to the next semester or academic year — based on results">
      {ctx.isLoading || !ctx.data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4"><StatCardSkeleton count={4} /></div>
          <CardSkeleton height={260} />
        </div>
      ) : ctx.data.mode === 'SEMESTER' ? (
        <SemesterFlow ctx={ctx.data} />
      ) : ctx.data.mode === 'YEAR' ? (
        <YearFlow ctx={ctx.data} />
      ) : (
        <EmptyState icon={<GraduationCap size={22} />} title="No active semester" description="Set an active semester to run promotions." />
      )}
    </PageShell>
  )
}

function StatRow({ ctx }: { ctx: PromoContext }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-3.5 md:grid-cols-4">
      <StatCard value={ctx.currentStudentCount} label="Current Students" icon={<Users size={18} className="text-primary" />} iconBg="var(--primary-light)" />
      <StatCard value={ctx.passedCount} label="Passed" icon={<Check size={18} className="text-success" />} iconBg="var(--success-light)" />
      <StatCard value={ctx.failedCount} label="Failed" icon={<AlertTriangle size={18} className="text-danger" />} iconBg="var(--danger-light)" />
      <StatCard value={ctx.pendingCount} label="Not Graded" icon={<CalendarRange size={18} className="text-warning" />} iconBg="var(--warning-light)" />
    </div>
  )
}

// ─── Semester promotion (same batch / HOD / branch) ─────────────
function SemesterFlow({ ctx }: { ctx: PromoContext }) {
  const qc = useQueryClient()
  const [detained, setDetained] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState(false)

  const board = useQuery({ queryKey: ['hod', 'promo', 'lb'], queryFn: () => hodApi.promotion.leaderboard() as Promise<{ data: LeaderRow[]; total: number }> })

  const execute = useMutation({
    mutationFn: () => hodApi.promotion.executeSemester({ detainEnrollmentIds: [...detained] }),
    onSuccess: (r: { promoted: number; toSemester: string }) => {
      toast.success(`Promoted ${r.promoted} students to ${r.toSemester} 🎉`)
      qc.invalidateQueries({ queryKey: ['hod', 'promo'] })
      setConfirm(false)
    },
    onError: (e) => { toast.error(errorMessage(e)); setConfirm(false) },
  })

  const nextLabel = ctx.nextSemester?.label ?? `Semester ${ctx.activeSemester.number + 1}`
  const promoteCount = ctx.currentStudentCount - detained.size

  return (
    <>
      <StatRow ctx={ctx} />

      <Card className="mb-4">
        <CardBody className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-sm bg-surface-2 px-4 py-2 text-center">
              <div className="text-sm font-bold text-text-primary">{ctx.activeSemester.label}</div>
              <div className="text-[11px] text-text-muted">{YEAR_LABEL[ctx.activeSemester.yearLevel]}</div>
            </div>
            <ArrowRight className="text-text-muted" />
            <div className="rounded-sm bg-primary-light px-4 py-2 text-center">
              <div className="text-sm font-bold text-primary">{nextLabel}</div>
              <div className="text-[11px] text-text-muted">{YEAR_LABEL[ctx.activeSemester.yearLevel]} · same batch</div>
            </div>
          </div>
          <p className="max-w-md text-xs text-text-muted">
            Semester promotion keeps the same branch, HOD and batch. Attendance, marks and history carry over.
            {!ctx.nextSemester && <> {nextLabel} will be created automatically.</>}
          </p>
          <Button className="ml-auto" leftIcon={<Rocket size={15} />} onClick={() => setConfirm(true)} disabled={promoteCount === 0}>
            Promote {promoteCount} to {nextLabel}
          </Button>
        </CardBody>
      </Card>

      <MeritBoard board={board} detained={detained} onToggleDetain={(id) => setDetained((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })} />

      <ConfirmDialog
        open={confirm}
        title="Promote to next semester?"
        message={`${promoteCount} students will move to ${nextLabel} in the same batch. ${detained.size} detained. History is preserved. This cannot be undone.`}
        loading={execute.isPending}
        confirmLabel="Promote"
        onConfirm={() => execute.mutate()}
        onCancel={() => setConfirm(false)}
      />
    </>
  )
}

// ─── Year promotion (HOD transfer + fresh batches) ──────────────
const STEPS = ['Destination HOD', 'Branch', 'Batch Structure', 'Distribute', 'Confirm']

function YearFlow({ ctx }: { ctx: PromoContext }) {
  const qc = useQueryClient()
  const [step, setStep] = useState(0)
  const [hodId, setHodId] = useState('')
  const [branch, setBranch] = useState('')
  const [batchInitial, setBatchInitial] = useState('C')
  const [batchCount, setBatchCount] = useState(5)
  const [capacity, setCapacity] = useState(60)
  const [confirm, setConfirm] = useState(false)

  const board = useQuery({
    queryKey: ['hod', 'promo', 'lb', branch],
    queryFn: () => hodApi.promotion.leaderboard(branch) as Promise<{ data: LeaderRow[]; total: number }>,
    enabled: step >= 3 && !!branch,
  })
  const preview = useQuery({
    queryKey: ['hod', 'promo', 'year-preview', branch, batchCount, capacity, batchInitial],
    queryFn: () => hodApi.promotion.yearPreview({ branch, batchCount, capacity, batchInitial }) as Promise<YearPreview>,
    enabled: step >= 3 && !!branch,
  })
  const execute = useMutation({
    mutationFn: () => hodApi.promotion.executeYear({ destinationHodId: hodId, branch, batchCount, capacity, batchInitial }),
    onSuccess: (r: { promoted: number; destinationHod: string }) => {
      toast.success(`Promoted ${r.promoted} students to ${r.destinationHod} 🎉`)
      qc.invalidateQueries({ queryKey: ['hod', 'promo'] })
      setConfirm(false)
    },
    onError: (e) => { toast.error(errorMessage(e)); setConfirm(false) },
  })

  const hodName = ctx.hods.find((h) => h.id === hodId)?.name ?? ''
  const batchCodes = Array.from({ length: batchCount }, (_, i) => `${batchInitial.toUpperCase().slice(0, 1)}${i + 1}`)

  if (!ctx.nextYear) {
    return (
      <>
        <StatRow ctx={ctx} />
        <Card><EmptyState icon={<CalendarRange size={22} />} title="Next academic year not set up"
          description={`This is a year-end semester (${ctx.activeSemester.label}). Create the next academic year and its first ${YEAR_LABEL[ctx.nextYearLevel]} semester in the University portal, then run year promotion.`} /></Card>
      </>
    )
  }

  return (
    <>
      <StatRow ctx={ctx} />
      <Card>
        <CardBody>
          {/* stepper */}
          <div className="mb-6 flex items-center">
            {STEPS.map((label, i) => (
              <div key={label} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold', i < step ? 'bg-success text-white' : i === step ? 'bg-primary text-white' : 'bg-bg text-text-muted')}>
                    {i < step ? <Check size={15} /> : i + 1}
                  </div>
                  <span className={cn('mt-1 hidden text-[11px] font-medium sm:block', i === step ? 'text-primary' : 'text-text-muted')}>{label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={cn('mx-2 h-0.5 flex-1', i < step ? 'bg-success' : 'bg-border')} />}
              </div>
            ))}
          </div>

          {step === 0 && (
            <StepShell title={`Transfer to next year's HOD (${YEAR_LABEL[ctx.nextYearLevel]}, ${ctx.nextYear.label})`}
              onBack={null} onNext={hodId ? () => setStep(1) : undefined}>
              <Select value={hodId} onChange={(e) => setHodId(e.target.value)} placeholder="Select destination HOD"
                options={ctx.hods.map((h) => ({ value: h.id, label: `${h.name} (${h.employeeId})` }))} className="max-w-md" />
            </StepShell>
          )}

          {step === 1 && (
            <StepShell title="Select the branch to transfer" onBack={() => setStep(0)} onNext={branch ? () => setStep(2) : undefined}>
              <Select value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="Select branch"
                options={ctx.branches.map((b) => ({ value: b.code, label: `${b.code} — ${b.name}` }))} className="max-w-md" />
              {ctx.branchesInScope.length > 0 && <p className="mt-2 text-xs text-text-muted">Your current branches: {ctx.branchesInScope.join(', ')}</p>}
            </StepShell>
          )}

          {step === 2 && (
            <StepShell title="New batch structure" onBack={() => setStep(1)} onNext={batchCount > 0 && capacity > 0 ? () => setStep(3) : undefined}>
              <div className="grid max-w-lg grid-cols-3 gap-3">
                <Field label="Initial"><Input value={batchInitial} maxLength={1} onChange={(e) => setBatchInitial(e.target.value.toUpperCase())} /></Field>
                <Field label="No. of batches"><Input type="number" min={1} value={batchCount} onChange={(e) => setBatchCount(Math.max(1, Number(e.target.value)))} /></Field>
                <Field label="Capacity each"><Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Math.max(1, Number(e.target.value)))} /></Field>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {batchCodes.map((c) => <Badge key={c} tone="primary">{c} · {capacity}</Badge>)}
              </div>
            </StepShell>
          )}

          {step === 3 && (
            <StepShell title="Merit leaderboard → auto-distributed into batches" onBack={() => setStep(2)}
              onNext={preview.data && preview.data.overflow === 0 ? () => setStep(4) : undefined} nextLabel="Review">
              {preview.isLoading || !preview.data ? <Spinner /> : (
                <>
                  <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <MiniStat label="Students" value={preview.data.totalStudents} />
                    <MiniStat label="Promotable" value={preview.data.promotable} tone="success" />
                    <MiniStat label="Detained/Failed" value={preview.data.detained} tone="warning" />
                    <MiniStat label="Overflow" value={preview.data.overflow} tone={preview.data.overflow > 0 ? 'danger' : undefined} />
                  </div>
                  {preview.data.overflow > 0 && (
                    <p className="mb-3 rounded-sm bg-danger-light/40 px-3 py-2 text-xs text-danger">
                      {preview.data.overflow} students have no seat. Increase batch count or capacity in the previous step.
                    </p>
                  )}
                  <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {preview.data.batches.map((b) => (
                      <div key={b.code} className="rounded-sm border border-border p-3">
                        <div className="mb-1 flex items-center justify-between text-sm"><span className="font-semibold">{b.code}</span><span className="text-text-muted">{b.assigned}/{b.capacity}</span></div>
                        <ProgressBar value={(b.assigned / b.capacity) * 100} tone={b.assigned >= b.capacity ? 'warning' : 'primary'} />
                      </div>
                    ))}
                  </div>
                  <MeritBoard board={board} rankView />
                </>
              )}
            </StepShell>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-text-primary">Confirm year promotion</h3>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="rounded-sm bg-surface-2 px-4 py-2 text-center">
                  <div className="font-bold">{ctx.activeSemester.label}</div>
                  <div className="text-[11px] text-text-muted">{YEAR_LABEL[ctx.activeSemester.yearLevel]} · {branch}</div>
                </div>
                <ArrowRight className="text-text-muted" />
                <div className="rounded-sm bg-primary-light px-4 py-2 text-center">
                  <div className="font-bold text-primary">{ctx.nextYear.label}</div>
                  <div className="text-[11px] text-text-muted">{YEAR_LABEL[ctx.nextYearLevel]} · {hodName}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniStat label="Promoting" value={preview.data?.promotable ?? 0} tone="success" />
                <MiniStat label="Detained/Failed" value={preview.data?.detained ?? 0} tone="warning" />
                <MiniStat label="New Batches" value={batchCount} />
                <MiniStat label="Destination HOD" value={hodName.split(' ').slice(-1)[0]} />
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
                <Button variant="danger" leftIcon={<Rocket size={15} />} onClick={() => setConfirm(true)}>Execute Promotion</Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={confirm}
        title="Execute year promotion?"
        message={`Transfer ${preview.data?.promotable ?? 0} ${branch} students to ${hodName} in ${ctx.nextYear.label}, into ${batchCount} new batches. Creates new enrollments and marks current ones inactive. History is preserved. This is irreversible.`}
        destructive confirmLabel="Execute"
        loading={execute.isPending}
        onConfirm={() => execute.mutate()}
        onCancel={() => setConfirm(false)}
      />
    </>
  )
}

// ─── Shared bits ────────────────────────────────────────────────
function MeritBoard({ board, detained, onToggleDetain, rankView }: {
  board: { isLoading: boolean; data?: { data: LeaderRow[]; total: number } }
  detained?: Set<string>
  onToggleDetain?: (id: string) => void
  rankView?: boolean
}) {
  const sort = useTableSort(board.data?.data ?? [])
  const th = { activeKey: sort.sortKey, dir: sort.sortDir, onSort: sort.onSort }
  return (
    <Card className="overflow-hidden">
      <CardHeader title={<span className="flex items-center gap-2"><Trophy size={15} className="text-warning" /> Merit Leaderboard</span>}
        subtitle={board.data ? `${board.data.total} students · ranked by aggregate result %` : undefined} />
      <div className="max-h-[420px] overflow-y-auto">
        {board.isLoading ? <div className="p-4"><Spinner /></div> : (board.data?.data ?? []).length === 0 ? (
          <EmptyState icon={<Layers size={20} />} title="No students" className="border-0" />
        ) : (
          <Table>
            <thead><tr><Th sortKey="rank" {...th}>Rank</Th><Th sortKey="name" {...th}>Student</Th><Th sortKey="branch" {...th}>Branch</Th><Th sortKey="batchCode" {...th}>Batch</Th><Th sortKey="aggregatePct" {...th} className="text-right">Aggregate</Th><Th sortKey="status" {...th}>Status</Th>{onToggleDetain && <Th>Detain</Th>}</tr></thead>
            <tbody>
              {sort.rows.map((r) => (
                <Tr key={r.enrollmentId} className={cn(detained?.has(r.enrollmentId) && 'opacity-50')}>
                  <Td><Badge tone={r.rank <= 3 ? 'warning' : 'neutral'}>#{r.rank}</Badge></Td>
                  <Td><div className="font-medium">{r.name}</div><div className="font-mono text-[11px] text-text-muted">{r.enrollmentNo}</div></Td>
                  <Td>{r.branch}</Td>
                  <Td>{r.batchCode}</Td>
                  <Td className="text-right font-semibold tabular-nums">{r.aggregatePct == null ? '—' : `${r.aggregatePct}%`}</Td>
                  <Td><Badge tone={r.status === 'Fail' ? 'danger' : r.status === 'Pending' ? 'neutral' : 'success'}>{r.status}</Badge></Td>
                  {onToggleDetain && (
                    <Td><input type="checkbox" checked={detained?.has(r.enrollmentId) ?? false} onChange={() => onToggleDetain(r.enrollmentId)} className="h-4 w-4 accent-danger" /></Td>
                  )}
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
      {rankView && <div className="border-t border-border px-4 py-2 text-[11px] text-text-muted">Top-ranked students fill the first batch, then the next — respecting each batch's capacity.</div>}
    </Card>
  )
}

function StepShell({ title, children, onBack, onNext, nextLabel = 'Continue' }: {
  title: string; children: React.ReactNode; onBack: (() => void) | null; onNext?: () => void; nextLabel?: string
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {children}
      <div className="flex justify-between">
        {onBack ? <Button variant="outline" onClick={onBack}>Back</Button> : <span />}
        <Button disabled={!onNext} onClick={onNext}>{nextLabel}</Button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</label>{children}</div>
}
function MiniStat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'success' | 'warning' | 'danger' }) {
  return (
    <div className="rounded-sm border border-border bg-surface-2 p-3 text-center">
      <div className={cn('text-xl font-bold', tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : tone === 'danger' ? 'text-danger' : 'text-text-primary')}>{value}</div>
      <div className="text-xs text-text-muted">{label}</div>
    </div>
  )
}
