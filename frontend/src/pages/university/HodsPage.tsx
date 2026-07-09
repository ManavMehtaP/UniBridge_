import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layers, UserCheck, UserMinus, X } from 'lucide-react'
import { universityApi } from '@/api/university'
import { errorMessage } from '@/api/client'
import { PageShell } from '@/components/shared/PageShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'

const YEAR_OPTIONS = [
  { value: 'FY', label: '1st Year (FY)' },
  { value: 'SY', label: '2nd Year (SY)' },
  { value: 'TY', label: '3rd Year (TY)' },
  { value: 'FINAL', label: 'Final Year' },
]

export default function UniversityHodsPage() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['uni', 'hods'], queryFn: universityApi.hods })
  const years = useQuery({ queryKey: ['uni', 'years'], queryFn: universityApi.years })
  const [promotePick, setPromotePick] = useState('')
  const [createFor, setCreateFor] = useState<{ id: string; name: string } | null>(null)
  const refresh = () => qc.invalidateQueries({ queryKey: ['uni', 'hods'] })

  const promote = useMutation({
    mutationFn: () => universityApi.setHod(promotePick, true),
    onSuccess: () => { toast.success('Promoted to HOD'); setPromotePick(''); refresh() },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const demote = useMutation({
    mutationFn: (id: string) => universityApi.setHod(id, false),
    onSuccess: () => { toast.success('HOD role removed'); refresh() },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const unassign = useMutation({
    mutationFn: (batchId: string) => universityApi.removeScope(batchId),
    onSuccess: () => { toast.success('Batch unassigned'); refresh() },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const d = q.data
  const activeYearId = years.data?.data.find((y) => y.status === 'ACTIVE')?.id

  return (
    <PageShell title="HODs" subtitle={d?.activeSemester ? `Batch ownership for ${d.activeSemester.label}` : 'No active semester'}>
      <Card className="mb-5 p-4">
        <h3 className="mb-3 text-sm font-semibold text-text-primary">Promote Faculty to HOD</h3>
        <div className="flex gap-2">
          <Select value={promotePick} onChange={(e) => setPromotePick(e.target.value)} placeholder="Select faculty" className="max-w-xs"
            options={(d?.facultyOptions ?? []).map((f) => ({ value: f.id, label: `${f.name} (${f.employeeId} · ${f.year})` }))} />
          <Button onClick={() => promote.mutate()} disabled={!promotePick} loading={promote.isPending} leftIcon={<UserCheck size={15} />}>Promote</Button>
        </div>
      </Card>

      {q.isLoading ? (
        <CardSkeleton height={200} />
      ) : (d?.hods ?? []).length === 0 ? (
        <EmptyState icon={<UserCheck size={22} />} title="No HODs yet" description="Promote a faculty member above." />
      ) : (
        <div className="space-y-4">
          {d?.hods.map((h) => (
            <Card key={h.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-text-primary">{h.name}</h3>
                    <Badge tone="purple">HOD</Badge>
                    {!h.isActive && <Badge tone="danger">Inactive</Badge>}
                  </div>
                  <div className="mt-0.5 text-xs text-text-muted">{h.employeeId} · {h.year} · {h.email}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {h.scopes.length === 0 ? (
                      <span className="text-xs text-text-muted">No batches assigned yet · use "Create Batches"</span>
                    ) : (
                      h.scopes.map((s) => (
                        <span key={s.batchId} className="flex items-center gap-1.5 rounded-sm bg-surface-2 px-2.5 py-1 text-xs font-medium text-text-primary">
                          Batch {s.batchCode}
                          <button onClick={() => unassign.mutate(s.batchId)} className="text-text-muted hover:text-danger" title="Unassign batch"><X size={12} /></button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" leftIcon={<Layers size={14} />} onClick={() => setCreateFor({ id: h.id, name: h.name })} disabled={!activeYearId}>
                    Create Batches
                  </Button>
                  <Button size="sm" variant="outline" leftIcon={<UserMinus size={14} />} onClick={() => demote.mutate(h.id)} loading={demote.isPending}>
                    Demote
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {createFor && activeYearId && (
        <BulkCreateBatchesModal
          hod={createFor}
          academicYearId={activeYearId}
          onClose={() => setCreateFor(null)}
          onDone={refresh}
        />
      )}
    </PageShell>
  )
}

function BulkCreateBatchesModal({ hod, academicYearId, onClose, onDone }: {
  hod: { id: string; name: string }
  academicYearId: string
  onClose: () => void
  onDone: () => void
}) {
  const [initial, setInitial] = useState('C')
  const [count, setCount] = useState(3)
  const [yearLevel, setYearLevel] = useState('FY')

  const m = useMutation({
    mutationFn: () => universityApi.bulkCreateBatches({ academicYearId, hodId: hod.id, initial: initial.toUpperCase(), count, yearLevel }),
    onSuccess: (r) => { toast.success(`Created ${r.count} batches (${r.initial}1…${r.initial}${r.count})`); onDone(); onClose() },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const preview = Array.from({ length: count }, (_, i) => `${initial.toUpperCase()}${i + 1}`)

  return (
    <Modal open onClose={onClose} title={`Create Batches — ${hod.name}`}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => m.mutate()} loading={m.isPending} disabled={!/^[A-Za-z]$/.test(initial) || count < 1}>Create {count} Batches</Button></>}>
      <div className="space-y-3">
        <p className="text-xs text-text-muted">
          Batches are created only during the <b>first semester</b> of the year level. After that, batch continuity is preserved through student promotion.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Initial *</label>
            <Input value={initial} onChange={(e) => setInitial(e.target.value.slice(0, 1).toUpperCase())} maxLength={1} className="text-center font-bold uppercase" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">No. of Batches *</label>
            <Input type="number" min={1} max={20} value={count} onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value))))} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Year Level *</label>
            <Select value={yearLevel} onChange={(e) => setYearLevel(e.target.value)} options={YEAR_OPTIONS} />
          </div>
        </div>
        <div className="rounded-sm border border-border bg-surface-2 p-3">
          <div className="mb-1.5 text-[11px] font-semibold uppercase text-text-secondary">Will create</div>
          <div className="flex flex-wrap gap-1.5">
            {preview.map((c) => <Badge key={c} tone="primary">{c}</Badge>)}
          </div>
        </div>
      </div>
    </Modal>
  )
}
