import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Megaphone, Plus, Trash2 } from 'lucide-react'
import { api } from '@/api/client'
import { errorMessage } from '@/api/client'
import { useHodScope } from '@/hooks/hod/useHodScope'
import { PageShell } from '@/components/shared/PageShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { formatDistanceToNow } from 'date-fns'

interface HodAnnouncement {
  id: string
  title: string
  body: string
  scope: 'ALL' | 'BATCH' | 'YEAR_LEVEL' | 'FACULTY_ONLY'
  scopeLabel: string
  senderName: string
  senderRole: 'HOD' | 'FACULTY'
  createdAt: string
}

const hodAnnApi = {
  list: () => api.get<{ data: HodAnnouncement[]; total: number }>('/hod/announcements', { params: { limit: 50 } }).then((r) => r.data),
  create: (body: Record<string, unknown>) => api.post('/hod/announcements', body).then((r) => r.data),
  remove: (id: string) => api.delete(`/hod/announcements/${id}`).then((r) => r.data),
}

export default function HodAnnouncementsPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [deleteOf, setDeleteOf] = useState<HodAnnouncement | null>(null)

  const list = useQuery({ queryKey: ['hod', 'announcements'], queryFn: hodAnnApi.list })
  const del = useMutation({
    mutationFn: (id: string) => hodAnnApi.remove(id),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['hod', 'announcements'] }); setDeleteOf(null) },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <PageShell
      title="Announcements"
      subtitle={list.data ? `${list.data.total} posted` : 'Broadcast to students'}
      action={<Button leftIcon={<Plus size={15} />} onClick={() => setShowCreate(true)}>New Announcement</Button>}
    >
      {list.isLoading ? (
        <CardSkeleton height={200} />
      ) : (list.data?.data ?? []).length === 0 ? (
        <EmptyState icon={<Megaphone size={22} />} title="No announcements yet" description="Post your first announcement." action={<Button onClick={() => setShowCreate(true)}>New Announcement</Button>} />
      ) : (
        <div className="space-y-3">
          {list.data?.data.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-text-primary">{a.title}</h3>
                    <Badge tone={a.scope === 'ALL' ? 'primary' : a.scope === 'BATCH' ? 'teal' : a.scope === 'FACULTY_ONLY' ? 'warning' : 'purple'}>{a.scope === 'FACULTY_ONLY' ? 'Faculty Only' : a.scopeLabel}</Badge>
                    <Badge tone={a.senderRole === 'HOD' ? 'purple' : 'neutral'}>{a.senderRole}</Badge>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-text-secondary">{a.body}</p>
                  <div className="mt-2 text-[11px] text-text-muted">
                    {a.senderName} · {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                  </div>
                </div>
                <button onClick={() => setDeleteOf(a)} className="text-text-muted hover:text-danger" title="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateModal open={showCreate} onClose={() => setShowCreate(false)} onSuccess={() => qc.invalidateQueries({ queryKey: ['hod', 'announcements'] })} />

      <ConfirmDialog
        open={!!deleteOf}
        title="Delete announcement?"
        message={<>Delete <b>{deleteOf?.title}</b>?</>}
        destructive
        loading={del.isPending}
        onConfirm={() => deleteOf && del.mutate(deleteOf.id)}
        onCancel={() => setDeleteOf(null)}
      />
    </PageShell>
  )
}

function CreateModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const scope = useHodScope()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [scopeType, setScopeType] = useState<'ALL' | 'BATCH' | 'YEAR_LEVEL' | 'FACULTY_ONLY'>('ALL')
  const [scopeValue, setScopeValue] = useState('')

  const create = useMutation({
    mutationFn: () => hodAnnApi.create({ title, body, scope: scopeType, scopeValue: (scopeType === 'ALL' || scopeType === 'FACULTY_ONLY') ? undefined : scopeValue }),
    onSuccess: () => { toast.success('Posted — students are being notified'); onSuccess(); close() },
    onError: (e) => toast.error(errorMessage(e)),
  })

  function close() { setTitle(''); setBody(''); setScopeType('ALL'); setScopeValue(''); onClose() }

  const batchOpts = scope.data?.batches.map((b) => ({ value: b.id, label: `Batch ${b.code}` })) ?? []
  const yearOpts = [
    { value: 'FY', label: 'First Year' },
    { value: 'SY', label: 'Second Year' },
    { value: 'TY', label: 'Third Year' },
    { value: 'FINAL', label: 'Final Year' },
  ]

  return (
    <Modal
      open={open} onClose={close} title="New Announcement"
      footer={
        <>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!title || !body || (scopeType !== 'ALL' && scopeType !== 'FACULTY_ONLY' && !scopeValue)}>Post</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Title *</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Semester registration open" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Message *</label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[120px]" placeholder="Details…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Audience</label>
            <Select value={scopeType} onChange={(e) => { setScopeType(e.target.value as 'ALL' | 'BATCH' | 'YEAR_LEVEL' | 'FACULTY_ONLY'); setScopeValue('') }}>
              <option value="ALL">All students</option>
              <option value="YEAR_LEVEL">Year level</option>
              <option value="BATCH">Specific batch</option>
              <option value="FACULTY_ONLY">Faculty only (my pool)</option>
            </Select>
          </div>
          {scopeType === 'BATCH' && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Batch *</label>
              <Select value={scopeValue} onChange={(e) => setScopeValue(e.target.value)} placeholder="Select" options={batchOpts} />
            </div>
          )}
          {scopeType === 'YEAR_LEVEL' && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Year *</label>
              <Select value={scopeValue} onChange={(e) => setScopeValue(e.target.value)} placeholder="Select" options={yearOpts} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
