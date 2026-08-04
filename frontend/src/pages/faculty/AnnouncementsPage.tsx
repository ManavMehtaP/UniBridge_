import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Megaphone, Plus, Trash2 } from 'lucide-react'
import { facultyApi } from '@/api/faculty'
import { errorMessage } from '@/api/client'
import { useFacultyScope } from '@/hooks/faculty/useFacultyScope'
import type { FacultyAnnouncement } from '@/types/faculty'
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

export default function AnnouncementsPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [deleteOf, setDeleteOf] = useState<FacultyAnnouncement | null>(null)

  const list = useQuery({ queryKey: ['faculty', 'announcements'], queryFn: () => facultyApi.announcements({ page: 1, limit: 30 }) })

  const del = useMutation({
    mutationFn: (id: string) => facultyApi.deleteAnnouncement(id),
    onSuccess: () => { toast.success('Announcement deleted'); qc.invalidateQueries({ queryKey: ['faculty', 'announcements'] }); setDeleteOf(null) },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <PageShell
      title="Announcements"
      subtitle={list.data ? `${list.data.total} posted` : 'Post announcements to your batches'}
      action={<Button leftIcon={<Plus size={15} />} onClick={() => setShowCreate(true)}>New Announcement</Button>}
    >
      {list.isLoading ? (
        <CardSkeleton height={200} />
      ) : list.data && list.data.data.length === 0 ? (
        <EmptyState icon={<Megaphone size={22} />} title="No announcements" description="Post one to reach your students." action={<Button onClick={() => setShowCreate(true)}>New Announcement</Button>} />
      ) : (
        <div className="space-y-3">
          {list.data?.data.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-text-primary">{a.title}</h3>
                    <Badge tone={a.scope === 'ALL' ? 'primary' : a.scope === 'BATCH' ? 'teal' : 'purple'}>{a.scopeLabel ?? a.scope}</Badge>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-text-secondary">{a.body}</p>
                  <div className="mt-2 text-[11px] text-text-muted">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</div>
                </div>
                <button onClick={() => setDeleteOf(a)} className="text-text-muted hover:text-danger" title="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateAnnouncementModal open={showCreate} onClose={() => setShowCreate(false)} onSuccess={() => qc.invalidateQueries({ queryKey: ['faculty', 'announcements'] })} />

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

function CreateAnnouncementModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const scope = useFacultyScope()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [scopeType, setScopeType] = useState<'BATCH' | 'YEAR_LEVEL'>('BATCH')
  const [scopeValue, setScopeValue] = useState('')

  const batchOpts = Array.from(new Map(scope.data?.assignments.map((a) => [a.batch.id, a.batch.code]) ?? []).entries())
    .map(([id, code]) => ({ value: id, label: `Batch ${code}` }))
  const yearLevelOpts = Array.from(new Set(scope.data?.assignments.map((a) => a.batch.yearLevel) ?? []))
    .map((yearLevel) => ({ value: yearLevel, label: yearLevel }))

  const create = useMutation({
    mutationFn: () => facultyApi.createAnnouncement({
      title, body, scope: scopeType,
      scopeValue,
    }),
    onSuccess: () => { toast.success('Posted'); onSuccess(); close() },
    onError: (e) => toast.error(errorMessage(e)),
  })

  function close() { setTitle(''); setBody(''); setScopeType('BATCH'); setScopeValue(''); onClose() }

  return (
    <Modal
      open={open} onClose={close} title="New Announcement"
      footer={
        <>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!title || !body || !scopeValue}>Post</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Title *</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Class rescheduled" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Message *</label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Details…" className="min-h-[120px]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Audience</label>
            <Select value={scopeType} onChange={(e) => { setScopeType(e.target.value as 'BATCH' | 'YEAR_LEVEL'); setScopeValue('') }}>
              <option value="BATCH">Specific batch</option>
              <option value="YEAR_LEVEL">Year level</option>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">{scopeType === 'BATCH' ? 'Batch *' : 'Year level *'}</label>
            <Select value={scopeValue} onChange={(e) => setScopeValue(e.target.value)} placeholder="Select" options={scopeType === 'BATCH' ? batchOpts : yearLevelOpts} />
          </div>
        </div>
      </div>
    </Modal>
  )
}
