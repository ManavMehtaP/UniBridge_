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
      subtitle="Create an academic year — the 8 semesters are generated automatically"
      action={<Button leftIcon={<Plus size={15} />} onClick={() => setShowYear(true)}>New Year</Button>}
    >
      <Card className="mb-4 border-primary-light bg-primary-light/30 p-3">
        <div className="flex items-start gap-2 text-xs text-text-secondary">
          <Info size={15} className="mt-0.5 shrink-0 text-primary" />
          <span>
            Creating a new academic year automatically generates <b>Semesters 1–8</b> (FY→Final) with four phases (T1–T4) each.
            Semester progression happens through <b>Student Promotion</b>. Batches are created by HODs during the first semester of their year level — not here.
          </span>
        </div>
      </Card>

      {q.isLoading ? (
        <CardSkeleton height={240} />
      ) : (q.data?.data ?? []).length === 0 ? (
        <EmptyState icon={<CalendarRange size={22} />} title="No academic years" description="Create the first academic year." action={<Button onClick={() => setShowYear(true)}>New Year</Button>} />
      ) : (
        <div className="space-y-4">
          {q.data?.data.map((y) => (
            <Card key={y.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-text-primary">{y.label}</h3>
                  <Badge tone={YEAR_TONE[y.status]}>{y.status}</Badge>
                </div>
                {y.status !== 'ACTIVE' && (
                  <Button size="sm" variant="outline" leftIcon={<CheckCircle2 size={14} />} onClick={() => activateYear.mutate(y.id)} loading={activateYear.isPending}>
                    Set Active
                  </Button>
                )}
              </div>

              <div className="mt-3">
                <div className="mb-1.5 text-[11px] font-semibold uppercase text-text-muted">Semesters ({y.semesters.length})</div>
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
                        {s.status === 'UPCOMING' && (
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
          ))}
        </div>
      )}

      <CreateYearModal open={showYear} onClose={() => setShowYear(false)} onDone={refresh} />
    </PageShell>
  )
}

function CreateYearModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [label, setLabel] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const m = useMutation({
    mutationFn: () => universityApi.createYear({ label, startDate: start, endDate: end }),
    onSuccess: (r: { semestersCreated?: number }) => {
      toast.success(`Year created · ${r.semestersCreated ?? 8} semesters generated`)
      onDone(); onClose(); setLabel(''); setStart(''); setEnd('')
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  return (
    <Modal open={open} onClose={onClose} title="New Academic Year"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => m.mutate()} loading={m.isPending} disabled={!label || !start || !end}>Create</Button></>}>
      <div className="space-y-3">
        <div><label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Label *</label><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="2027-28" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Start *</label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div><label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">End *</label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
        </div>
        <p className="rounded-sm bg-surface-2 px-3 py-2 text-[11px] text-text-secondary">
          <b>Semesters 1–8</b> will be created automatically (FY, SY, TY, Final — each with T1–T4 phases).
        </p>
      </div>
    </Modal>
  )
}
