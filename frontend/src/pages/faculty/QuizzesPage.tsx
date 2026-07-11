import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { HelpCircle, Plus, Send, Trash2 } from 'lucide-react'
import { facultyApi } from '@/api/faculty'
import { errorMessage } from '@/api/client'
import { useFacultyScope } from '@/hooks/faculty/useFacultyScope'
import type { FacultyQuiz } from '@/types/faculty'
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

export default function QuizzesPage() {
  const qc = useQueryClient()
  const scope = useFacultyScope()
  const [showCreate, setShowCreate] = useState(false)
  const [deleteOf, setDeleteOf] = useState<FacultyQuiz | null>(null)

  const list = useQuery({ queryKey: ['faculty', 'quizzes'], queryFn: () => facultyApi.quizzes({ page: 1, limit: 30 }) })

  const togglePublish = useMutation({
    mutationFn: (q: FacultyQuiz) => q.isPublished ? facultyApi.unpublishQuiz(q.id) : facultyApi.publishQuiz(q.id),
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['faculty', 'quizzes'] }) },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const del = useMutation({
    mutationFn: (id: string) => facultyApi.deleteQuiz(id),
    onSuccess: () => { toast.success('Quiz deleted'); qc.invalidateQueries({ queryKey: ['faculty', 'quizzes'] }); setDeleteOf(null) },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const subjectOpts = useMemo(() => {
    const seen = new Set<string>()
    return scope.data?.assignments
      .filter((a) => !seen.has(a.subject.id) && seen.add(a.subject.id))
      .map((a) => ({ value: a.subject.id, label: `${a.subject.code} — ${a.subject.name}` })) ?? []
  }, [scope.data])

  return (
    <PageShell
      title="Quizzes"
      subtitle={list.data ? `${list.data.total} quizzes` : 'Create and manage quizzes'}
      action={<Button leftIcon={<Plus size={15} />} onClick={() => setShowCreate(true)}>Create Quiz</Button>}
    >
      {list.isLoading ? (
        <CardSkeleton height={200} />
      ) : list.data && list.data.data.length === 0 ? (
        <EmptyState icon={<HelpCircle size={22} />} title="No quizzes yet" description="Create your first quiz." action={<Button onClick={() => setShowCreate(true)}>Create Quiz</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {list.data?.data.map((q) => (
            <Card key={q.id} className="p-4">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-text-primary">{q.title}</div>
                  <div className="mt-0.5 text-xs text-text-muted">{q.subject.code} · {q.subject.name}</div>
                </div>
                <Badge tone={q.isPublished ? 'success' : 'neutral'}>{q.isPublished ? 'Published' : 'Draft'}</Badge>
              </div>
              {q.description && <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{q.description}</p>}
              {!!q.batchCodes?.length && <p className="mt-2 text-[11px] font-medium text-primary">Visible to: {q.batchCodes.join(', ')}</p>}
              <div className="mt-3 flex items-center justify-between border-t border-border-light pt-3 text-xs text-text-secondary">
                <div className="flex gap-3">
                  <span><b>{q.questionCount ?? 0}</b> Q</span>
                  {q.timeLimitMins && <span>{q.timeLimitMins} min</span>}
                  {q.attemptCount != null && <span><b>{q.attemptCount}</b> attempts</span>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => togglePublish.mutate(q)} title={q.isPublished ? 'Unpublish' : 'Publish'} className="flex h-7 w-7 items-center justify-center rounded-sm text-text-secondary hover:bg-primary-light hover:text-primary">
                    <Send size={14} />
                  </button>
                  <button onClick={() => setDeleteOf(q)} title="Delete" className="flex h-7 w-7 items-center justify-center rounded-sm text-text-secondary hover:bg-danger-light hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateQuizModal open={showCreate} onClose={() => setShowCreate(false)} subjectOpts={subjectOpts} assignments={scope.data?.assignments ?? []} semesterId={scope.data?.activeSemester.id ?? ''} onSuccess={() => qc.invalidateQueries({ queryKey: ['faculty', 'quizzes'] })} />

      <ConfirmDialog
        open={!!deleteOf}
        title="Delete quiz?"
        message={<>Delete <b>{deleteOf?.title}</b>? Attempts will be preserved but the quiz becomes inaccessible.</>}
        destructive
        loading={del.isPending}
        onConfirm={() => deleteOf && del.mutate(deleteOf.id)}
        onCancel={() => setDeleteOf(null)}
      />
    </PageShell>
  )
}

type Assignment = { subject: { id: string }; batch: { id: string; code: string } }

function CreateQuizModal({ open, onClose, subjectOpts, assignments, semesterId, onSuccess }: { open: boolean; onClose: () => void; subjectOpts: { value: string; label: string }[]; assignments: Assignment[]; semesterId: string; onSuccess: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [timeLimitMins, setTimeLimitMins] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [batchIds, setBatchIds] = useState<string[]>([])
  const batches = useMemo(() => assignments.filter((assignment) => assignment.subject.id === subjectId).map((assignment) => assignment.batch), [assignments, subjectId])

  const create = useMutation({
    mutationFn: () => facultyApi.createQuiz({
      title, description, subjectId, semesterId, batchIds,
      timeLimitMins: timeLimitMins ? Number(timeLimitMins) : null,
      dueDate: dueDate || null,
    }),
    onSuccess: () => { toast.success('Quiz created'); onSuccess(); close() },
    onError: (e) => toast.error(errorMessage(e)),
  })

  function close() { setTitle(''); setDescription(''); setSubjectId(''); setTimeLimitMins(''); setDueDate(''); setBatchIds([]); onClose() }

  return (
    <Modal
      open={open} onClose={close} title="Create Quiz"
      footer={
        <>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!title || !subjectId || !semesterId || batchIds.length === 0}>Create</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Subject *</label>
          <Select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setBatchIds([]) }} placeholder="Select subject" options={subjectOpts} />
        </div>
        <BatchAudiencePicker batches={batches} selected={batchIds} onChange={setBatchIds} />
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Title *</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chapter 1 Quiz" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Description</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief instructions" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Time Limit (min)</label>
            <Input type="number" value={timeLimitMins} onChange={(e) => setTimeLimitMins(e.target.value)} placeholder="30" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
          </div>
        </div>
      </div>
    </Modal>
  )
}

function BatchAudiencePicker({ batches, selected, onChange }: { batches: { id: string; code: string }[]; selected: string[]; onChange: (ids: string[]) => void }) {
  if (!batches.length) return <p className="rounded-sm bg-warning-light/40 px-3 py-2 text-xs text-warning">Select a subject to choose its assigned batch.</p>
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold uppercase text-text-secondary">Visible to assigned batch *</legend>
      <div className="flex flex-wrap gap-2">
        {batches.map((batch) => {
          const checked = selected.includes(batch.id)
          return <label key={batch.id} className="flex cursor-pointer items-center gap-2 rounded-sm border border-border px-2.5 py-1.5 text-xs font-medium text-text-primary">
            <input type="checkbox" checked={checked} onChange={() => onChange(checked ? selected.filter((id) => id !== batch.id) : [...selected, batch.id])} className="accent-primary" />
            {batch.code}
          </label>
        })}
      </div>
    </fieldset>
  )
}
