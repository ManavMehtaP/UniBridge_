import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Check, Download } from 'lucide-react'
import { hodApi } from '@/api/hod'
import { errorMessage } from '@/api/client'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { FileDrop } from '@/components/shared/FileDrop'

type Step = 'batches' | 'students' | 'faculty' | 'timetable' | 'done'
const STEPS: { key: Step; label: string }[] = [
  { key: 'batches', label: 'Batches' },
  { key: 'students', label: 'Students' },
  { key: 'faculty', label: 'Faculty' },
  { key: 'timetable', label: 'Timetable' },
]

// ponytail: fires on first HOD login into a year-start sem (1/3/5/7) with no batches yet.
// Wizard: batches → students → faculty roster → timetable (auto-assigns faculty to batches).
export function HodOnboardingModal({ activeSemesterId, onFinish }: { activeSemesterNumber: number; activeSemesterId: string; onFinish: () => void }) {
  const qc = useQueryClient()
  const [step, setStep] = useState<Step>('batches')
  // ponytail: DON'T refetch scope mid-wizard — the parent latches wizardOpen, but avoiding
  // extra refetches keeps the UI stable while the user advances through steps.
  const finish = () => { qc.invalidateQueries({ queryKey: ['hod'] }); onFinish() }

  return (
    <Modal open onClose={() => { /* blocks until finished */ }} title="Set up your semester" size="lg">
      <Stepper current={step} />
      {step === 'batches' && <BatchesStep onDone={() => setStep('students')} />}
      {step === 'students' && <StudentsStep semesterId={activeSemesterId} onNext={() => setStep('faculty')} />}
      {step === 'faculty' && <FacultyStep onNext={() => setStep('timetable')} />}
      {step === 'timetable' && <TimetableStep semesterId={activeSemesterId} onDone={() => setStep('done')} />}
      {step === 'done' && <DoneStep onFinish={finish} />}
    </Modal>
  )
}

function Stepper({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.key === current)
  return (
    <div className="mb-5 flex items-center gap-1">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex flex-1 items-center gap-1">
          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${i < idx || current === 'done' ? 'bg-success text-white' : i === idx ? 'bg-primary text-white' : 'bg-surface-2 text-text-muted'}`}>
            {i < idx || current === 'done' ? <Check size={13} /> : i + 1}
          </div>
          <span className={`text-xs ${i === idx ? 'font-semibold text-text-primary' : 'text-text-muted'}`}>{s.label}</span>
          {i < STEPS.length - 1 && <div className="mx-1 h-px flex-1 bg-border" />}
        </div>
      ))}
    </div>
  )
}

// ── Step 1: create batches ──
function BatchesStep({ onDone }: { onDone: () => void }) {
  const [initial, setInitial] = useState('A')
  const [count, setCount] = useState(3)
  const [branches, setBranches] = useState<string[]>([])
  const branchesQ = useQuery({ queryKey: ['hod', 'onboarding', 'branches'], queryFn: hodApi.onboarding.branches })

  const create = useMutation({
    mutationFn: () => hodApi.onboarding.complete({ initial, branches, batchCount: count }),
    onSuccess: (r) => { toast.success(`Created ${r.batches.length} batches`); onDone() },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const toggle = (c: string) => setBranches((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c])
  const preview = Array.from({ length: count }, (_, i) => `${initial.toUpperCase()}${i + 1}`)

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">Choose your batch initial and the branches you'll manage this year.</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Batch Initial *</label>
          <Input value={initial} onChange={(e) => setInitial(e.target.value.slice(0, 1).toUpperCase())} maxLength={1} className="text-center font-bold uppercase" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">No. of Batches *</label>
          <Input type="number" min={1} max={20} value={count} onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value))))} />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Branches *</label>
        <div className="flex flex-wrap gap-2">
          {(branchesQ.data?.data ?? []).map((b) => (
            <button key={b.id} type="button" onClick={() => toggle(b.code)}
              className={`rounded-sm border px-3 py-1.5 text-xs font-medium ${branches.includes(b.code) ? 'border-primary bg-primary-light text-primary' : 'border-border text-text-secondary hover:border-primary'}`}>
              {b.code}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-sm border border-border bg-surface-2 p-3">
        <div className="mb-1.5 text-[11px] font-semibold uppercase text-text-secondary">Will create</div>
        <div className="flex flex-wrap gap-1.5">{preview.map((c) => <Badge key={c} tone="primary">{c}</Badge>)}</div>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!/^[A-Za-z]$/.test(initial) || branches.length === 0 || count < 1}>
          Create {count} Batches
        </Button>
      </div>
    </div>
  )
}

// ── Step 2: upload students ──
function StudentsStep({ semesterId, onNext }: { semesterId: string; onNext: () => void }) {
  const [result, setResult] = useState<{ created: number; updated: number; batchesCreated?: number; errors: unknown[] } | null>(null)
  const upload = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData(); fd.append('file', file); fd.append('semesterId', semesterId)
      return hodApi.students.uploadCsv(fd) as Promise<{ created: number; updated: number; batchesCreated?: number; errors: unknown[] }>
    },
    onSuccess: (r) => { setResult(r); toast.success(`${r.created} students added`) },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">Upload your student roster. Each row's <b>batch</b> column places the student.</p>
        <Button size="sm" variant="ghost" leftIcon={<Download size={14} />} onClick={hodApi.students.downloadTemplate}>Template</Button>
      </div>
      <FileDrop onFile={(f) => upload.mutate(f)} disabled={upload.isPending} subtitle="Columns: enrollment_no, name, branch, batch, roll_no" />
      {upload.isPending && <div className="flex items-center gap-2 text-xs text-text-muted"><Spinner size={14} /> Uploading…</div>}
      {result && (
        <div className="rounded-sm border border-border bg-surface-2 p-3 text-xs">
          <b className="text-success">{result.created}</b> created · <b>{result.updated}</b> updated
          {result.batchesCreated ? <> · <b>{result.batchesCreated}</b> new batches</> : null}
          {result.errors.length > 0 && <span className="text-danger"> · {result.errors.length} errors</span>}
        </div>
      )}
      <div className="flex justify-between">
        <span className="text-xs text-text-muted">You can add more later from the Students page.</span>
        <Button onClick={onNext} disabled={!result}>Next: Faculty</Button>
      </div>
    </div>
  )
}

// ── Step 3: pick faculty from the SAME-YEAR roster (saved as pool) ──
function FacultyStep({ onNext }: { onNext: () => void }) {
  const rosterQ = useQuery({ queryKey: ['hod', 'onboarding', 'faculty'], queryFn: hodApi.onboarding.faculty })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [reclaim, setReclaim] = useState(false)
  const roster = rosterQ.data?.data ?? []
  const year = rosterQ.data?.year

  const preselected = useMemo(() => roster.filter((f) => f.inPool).map((f) => f.id).join(','), [roster])
  useEffect(() => {
    if (preselected) setSelected(new Set(preselected.split(',')))
  }, [preselected])

  const toggle = (id: string) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  const save = useMutation({
    mutationFn: () => hodApi.facultyPool.save({ facultyIds: [...selected], reclaim }),
    onSuccess: (r) => { toast.success(`Faculty pool saved (${r.pooled} in pool)`); onNext() },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Pick your faculty pool. Only <b>{year ?? 'same-year'}</b> faculty are shown. They'll be reserved for you and receive HOD's Faculty-Only announcements.
      </p>
      {rosterQ.isLoading ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : roster.length === 0 ? (
        <p className="rounded-sm bg-surface-2 p-3 text-xs text-text-muted">No {year ?? ''} faculty yet. Ask the Dean to add faculty at this year level.</p>
      ) : (
        <div className="max-h-64 space-y-1.5 overflow-y-auto">
          {roster.map((f) => (
            <label key={f.id} className={`flex items-center gap-2.5 rounded-sm border px-3 py-2 ${f.takenByHod && !reclaim ? 'cursor-not-allowed border-border bg-surface-2 opacity-60' : 'cursor-pointer border-border hover:border-primary'}`}>
              <input
                type="checkbox"
                checked={selected.has(f.id)}
                disabled={f.takenByHod && !reclaim}
                onChange={() => toggle(f.id)}
                className="h-4 w-4 accent-primary"
              />
              <span className="flex-1 text-sm font-medium text-text-primary">{f.name}</span>
              <span className="font-mono text-xs text-text-muted">{f.employeeId}</span>
              {f.mentorCode ? <Badge tone="teal">{f.mentorCode}</Badge> : <span className="text-xs text-text-muted">no code</span>}
              {f.takenByHod && <Badge tone="warning">In another HOD's pool</Badge>}
            </label>
          ))}
        </div>
      )}
      <label className="flex items-center gap-2 text-xs text-text-secondary">
        <input type="checkbox" checked={reclaim} onChange={(e) => setReclaim(e.target.checked)} className="h-3.5 w-3.5 accent-primary" />
        Allow reclaiming faculty already in another HOD's pool
      </label>
      <div className="flex justify-between">
        <span className="text-xs text-text-muted">{selected.size} selected</span>
        <Button onClick={() => save.mutate()} loading={save.isPending} disabled={selected.size === 0}>Save & Next: Timetable</Button>
      </div>
    </div>
  )
}

// ── Step 4: upload timetable (auto-assigns faculty→batch) ──
function TimetableStep({ semesterId, onDone }: { semesterId: string; onDone: () => void }) {
  const [result, setResult] = useState<{ created: number; skipped?: number; errors: unknown[] } | null>(null)
  const upload = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData(); fd.append('file', file); fd.append('semesterId', semesterId); fd.append('replaceExisting', 'true')
      return hodApi.timetable.uploadCsv(fd) as Promise<{ created: number; skipped?: number; errors: unknown[] }>
    },
    onSuccess: (r) => { setResult(r); toast.success(`${r.created} slots · faculty auto-assigned`) },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">Upload the timetable. Faculty are <b>auto-assigned</b> to each batch from the <b>mentor_code</b> column.</p>
        <Button size="sm" variant="ghost" leftIcon={<Download size={14} />} onClick={hodApi.timetable.downloadTemplate}>Template</Button>
      </div>
      <FileDrop onFile={(f) => upload.mutate(f)} disabled={upload.isPending} subtitle="Columns: batch, day, start, end, subject, room, mentor_code" />
      {upload.isPending && <div className="flex items-center gap-2 text-xs text-text-muted"><Spinner size={14} /> Uploading…</div>}
      {result && (
        <div className="rounded-sm border border-border bg-surface-2 p-3 text-xs">
          <b className="text-success">{result.created}</b> slots created
          {result.errors.length > 0 && <span className="text-danger"> · {result.errors.length} errors</span>}
        </div>
      )}
      <div className="flex justify-end">
        <Button onClick={onDone} disabled={!result}>Finish</Button>
      </div>
    </div>
  )
}

function DoneStep({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="space-y-4 py-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success"><Check size={26} /></div>
      <div>
        <h3 className="text-base font-bold text-text-primary">Semester ready</h3>
        <p className="mt-1 text-sm text-text-secondary">Batches, students, faculty and timetable are set up.</p>
      </div>
      <Button onClick={onFinish}>Go to Dashboard</Button>
    </div>
  )
}
