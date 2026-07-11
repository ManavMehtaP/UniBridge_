import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CalendarRange, CheckCircle2, Info, Plus } from 'lucide-react'
import { universityApi } from '@/api/university'
import { errorMessage } from '@/api/client'
import { PageShell } from '@/components/shared/PageShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'

const YEAR_TONE = { ACTIVE: 'success', DRAFT: 'warning', ARCHIVED: 'neutral' } as const
const SEM_TONE = { ACTIVE: 'success', UPCOMING: 'warning', COMPLETE: 'neutral' } as const

export default function UniversityYearsPage() {
  const qc = useQueryClient()
  const [showYear, setShowYear] = useState(false)

  const q = useQuery({ queryKey: ['uni', 'years'], queryFn: universityApi.years })
  const refresh = () => qc.invalidateQueries({ queryKey: ['uni'] })

  const activateYear = useMutation({
    mutationFn: (id: string) => universityApi.activateYear(id),
    onSuccess: () => { toast.success('Academic year activated'); refresh() },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const activateSem = useMutation({
    mutationFn: (id: string) => universityApi.activateSemester(id),
    onSuccess: () => { toast.success('Semester activated'); refresh() },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <PageShell
      title="Academic Years"
      subtitle="Each academic year is a 4-year admission batch (e.g. 2024-2028) with 8 semesters"
      action={<Button leftIcon={<Plus size={15} />} onClick={() => setShowYear(true)}>New Batch</Button>}
    >
      <Card className="mb-4 border-primary-light bg-primary-light/30 p-3">
        <div className="flex items-start gap-2 text-xs text-text-secondary">
          <Info size={15} className="mt-0.5 shrink-0 text-primary" />
          <span>
            An academic year is a <b>4-year degree batch</b> (e.g. <b>2024-2028</b>) covering FY→Final across <b>Semesters 1–8</b>.
            Only <b>one semester is active per batch</b> at a time; run one batch per year level (FY, SY, TY, Final) so four are active together.
            Semester progression happens through <b>Student Promotion</b>.
          </span>
        </div>
      </Card>

      {q.isLoading ? (
        <CardSkeleton height={240} />
      ) : (q.data?.data ?? []).length === 0 ? (
        <EmptyState icon={<CalendarRange size={22} />} title="No academic years" description="Create the first academic year." action={<Button onClick={() => setShowYear(true)}>New Year</Button>} />
      ) : (
        <div className="space-y-4">
          {q.data?.data.map((y) => {
            const active = y.semesters.find((s) => s.status === 'ACTIVE')
            return (
            <Card key={y.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-text-primary">{y.label}</h3>
                  <Badge tone={YEAR_TONE[y.status]}>{y.status}</Badge>
                  {active && <Badge tone="primary">{active.yearLevel} · {active.label} active</Badge>}
                </div>
                {y.status !== 'ACTIVE' && (
                  <Button size="sm" variant="outline" leftIcon={<CheckCircle2 size={14} />} onClick={() => activateYear.mutate(y.id)} loading={activateYear.isPending}>
                    Set Active
                  </Button>
                )}
              </div>

              <div className="mt-3">
                <div className="mb-1.5 text-[11px] font-semibold uppercase text-text-muted">Semesters ({y.semesters.length}) · one active at a time</div>
                {y.semesters.length === 0 ? (
                  <div className="text-xs text-text-muted">None yet</div>
                ) : (
                  <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
                    {y.semesters.map((s) => (
                      <div key={s.id} className="flex items-center justify-between rounded-sm bg-surface-2 px-3 py-2">
                        <div className="flex items-center gap-2 text-[13px]">
                          <span className="font-medium text-text-primary">{s.label}</span>
                          <span className="text-xs text-text-muted">{s.yearLevel}</span>
                          <Badge tone={SEM_TONE[s.status as keyof typeof SEM_TONE] ?? 'neutral'}>{s.status}</Badge>
                        </div>
                        {s.status !== 'ACTIVE' && (
                          <button className="text-xs font-medium text-primary hover:underline" onClick={() => activateSem.mutate(s.id)}>
                            Activate
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )})}
        </div>
      )}

      <CreateYearModal open={showYear} onClose={() => setShowYear(false)} onDone={refresh} />
    </PageShell>
  )
}

// Which semester is "current" for the batch, keyed by the year level it's presently in.
const LEVEL_TO_SEM: Record<string, number> = { FY: 1, SY: 3, TY: 5, FINAL: 7 }

function CreateYearModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [label, setLabel] = useState('')
  const [level, setLevel] = useState('FY')
  const validLabel = /^\d{4}-\d{4}$/.test(label) && (() => { const [a, b] = label.split('-').map(Number); return b - a === 4 })()

  const m = useMutation({
    mutationFn: () => universityApi.createYear({ label, activeSemester: LEVEL_TO_SEM[level] }),
    onSuccess: (r: { semestersCreated?: number }) => {
      toast.success(`Batch created · ${r.semestersCreated ?? 8} semesters generated`)
      onDone(); onClose(); setLabel(''); setLevel('FY')
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  // suggest next batch label from current year
  const suggest = () => { const y = new Date().getFullYear(); setLabel(`${y}-${y + 4}`) }

  return (
    <Modal open={open} onClose={onClose} title="New Batch (Academic Year)"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => m.mutate()} loading={m.isPending} disabled={!validLabel}>Create</Button></>}>
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Batch Label *</label>
          <div className="flex gap-2">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="2024-2028" />
            <Button variant="outline" onClick={suggest}>This Year</Button>
          </div>
          {label && !validLabel && <p className="mt-1 text-[11px] text-danger">Must be a 4-year batch, e.g. 2024-2028.</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Currently in</label>
          <div className="flex flex-wrap gap-2">
            {(['FY', 'SY', 'TY', 'FINAL'] as const).map((lvl) => (
              <button key={lvl} type="button" onClick={() => setLevel(lvl)}
                className={`rounded-sm border px-3 py-1.5 text-xs font-medium ${level === lvl ? 'border-primary bg-primary-light text-primary' : 'border-border text-text-secondary hover:border-primary'}`}>
                {lvl} (Sem {LEVEL_TO_SEM[lvl]})
              </button>
            ))}
          </div>
        </div>
        <p className="rounded-sm bg-surface-2 px-3 py-2 text-[11px] text-text-secondary">
          <b>Semesters 1–8</b> are generated automatically (FY, SY, TY, Final — each with T1–T4 phases).
          The batch starts at <b>Semester {LEVEL_TO_SEM[level]}</b> (active); earlier semesters are marked complete. Dates default to July {label.split('-')[0] || 'YYYY'} → May {label.split('-')[1] || 'YYYY'}.
        </p>
      </div>
    </Modal>
  )
}
