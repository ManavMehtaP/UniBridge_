import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { UserCheck, UserMinus, X } from 'lucide-react'
import { universityApi } from '@/api/university'
import { errorMessage } from '@/api/client'
import { PageShell } from '@/components/shared/PageShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'

export default function UniversityHodsPage() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['uni', 'hods'], queryFn: universityApi.hods })
  const [promotePick, setPromotePick] = useState('')
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
                      <span className="text-xs text-text-muted">No batches yet — they'll be auto-created when the HOD uploads their student CSV.</span>
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
                  <Button size="sm" variant="outline" leftIcon={<UserMinus size={14} />} onClick={() => demote.mutate(h.id)} loading={demote.isPending}>
                    Demote
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  )
}
