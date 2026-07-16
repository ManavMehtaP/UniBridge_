import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CalendarClock, FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { facultyApi } from '@/api/faculty'
import { errorMessage } from '@/api/client'
import { useFacultyScope } from '@/hooks/faculty/useFacultyScope'
import type { FacultyNote } from '@/types/faculty'
import { PageShell } from '@/components/shared/PageShell'
import { FileDrop } from '@/components/shared/FileDrop'
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
import { format, formatDistanceToNow } from 'date-fns'

export default function NotesPage() {
  const qc = useQueryClient()
  const scope = useFacultyScope()
  const [page, setPage] = useState(1)
  const [showUpload, setShowUpload] = useState(false)
  const [editOf, setEditOf] = useState<FacultyNote | null>(null)
  const [deleteOf, setDeleteOf] = useState<FacultyNote | null>(null)

  const list = useQuery({ queryKey: ['faculty', 'notes', page], queryFn: () => facultyApi.notes({ page, limit: 20 }) })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['faculty', 'notes'] })
  const del = useMutation({
    mutationFn: (id: string) => facultyApi.deleteNote(id),
    onSuccess: () => { toast.success('Note deleted'); invalidate(); setDeleteOf(null) },
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
      title="Notes"
      subtitle={list.data ? `${list.data.total} notes uploaded` : 'Upload PDFs and study materials'}
      action={<Button leftIcon={<Plus size={15} />} onClick={() => setShowUpload(true)}>Upload Note</Button>}
    >
      {list.isLoading ? (
        <CardSkeleton height={200} />
      ) : list.data && list.data.data.length === 0 ? (
        <EmptyState icon={<FileText size={22} />} title="No notes yet" description="Upload your first PDF or document." action={<Button onClick={() => setShowUpload(true)}>Upload Note</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.data?.data.map((n) => {
            const scheduled = n.status === 'SCHEDULED'
            return (
              <Card key={n.id} className="p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary-light text-primary">
                    <FileText size={18} />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditOf(n)} className="text-text-muted hover:text-primary" title="Edit / reschedule"><Pencil size={15} /></button>
                    <button onClick={() => setDeleteOf(n)} className="text-text-muted hover:text-danger" title="Delete"><Trash2 size={15} /></button>
                  </div>
                </div>
                <div className="text-sm font-semibold text-text-primary line-clamp-2">{n.title}</div>
                <div className="mt-0.5 text-xs text-text-muted">{n.subject.code} · {n.subject.name}</div>
                {n.description && <p className="mt-2 line-clamp-2 text-xs text-text-secondary">{n.description}</p>}
                {!!n.batchCodes?.length && <p className="mt-2 text-[11px] font-medium text-primary">Visible to: {n.batchCodes.join(', ')}</p>}
                <div className="mt-3 flex items-center justify-between">
                  {scheduled
                    ? <Badge tone="warning"><CalendarClock size={11} className="mr-1 inline" />Scheduled</Badge>
                    : <Badge tone="success">Published</Badge>}
                  <span className="text-[11px] text-text-muted">
                    {scheduled && n.releaseAt ? `Releases ${format(new Date(n.releaseAt), 'dd MMM, HH:mm')}` : formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {list.data && list.data.totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" disabled={page >= list.data.totalPages} onClick={() => setPage((p) => p + 1)}>Load more</Button>
        </div>
      )}

      <UploadNoteModal open={showUpload} onClose={() => setShowUpload(false)} subjectOpts={subjectOpts} assignments={scope.data?.assignments ?? []} onSuccess={invalidate} />
      <EditNoteModal note={editOf} onClose={() => setEditOf(null)} onSuccess={invalidate} />

      <ConfirmDialog
        open={!!deleteOf}
        title="Delete note?"
        message={<>Delete <b>{deleteOf?.title}</b>? This can&rsquo;t be undone.</>}
        destructive
        loading={del.isPending}
        onConfirm={() => deleteOf && del.mutate(deleteOf.id)}
        onCancel={() => setDeleteOf(null)}
      />
    </PageShell>
  )
}

type Assignment = { subject: { id: string }; batch: { id: string; code: string } }

// Local wall-clock → ISO for the backend. Returns undefined for "publish now".
function toIso(local: string) { return local ? new Date(local).toISOString() : undefined }

function UploadNoteModal({ open, onClose, subjectOpts, assignments, onSuccess }: { open: boolean; onClose: () => void; subjectOpts: { value: string; label: string }[]; assignments: Assignment[]; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [batchIds, setBatchIds] = useState<string[]>([])
  const [mode, setMode] = useState<'now' | 'schedule'>('now')
  const [releaseAt, setReleaseAt] = useState('')
  const batches = useMemo(() => assignments.filter((a) => a.subject.id === subjectId).map((a) => a.batch), [assignments, subjectId])

  const upload = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('file', file!)
      fd.append('title', title)
      fd.append('description', description)
      fd.append('subjectId', subjectId)
      fd.append('batchIds', JSON.stringify(batchIds))
      const iso = mode === 'schedule' ? toIso(releaseAt) : undefined
      if (iso) fd.append('releaseAt', iso)
      return facultyApi.createNote(fd)
    },
    onSuccess: (r: any) => { toast.success(r?.status === 'SCHEDULED' ? 'Note scheduled' : 'Note published'); onSuccess(); close() },
    onError: (e) => toast.error(errorMessage(e)),
  })

  function close() { setFile(null); setTitle(''); setDescription(''); setSubjectId(''); setBatchIds([]); setMode('now'); setReleaseAt(''); onClose() }
  const scheduleInvalid = mode === 'schedule' && (!releaseAt || new Date(releaseAt).getTime() <= Date.now())

  return (
    <Modal
      open={open} onClose={close} title="Upload Note"
      footer={
        <>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button onClick={() => upload.mutate()} loading={upload.isPending} disabled={!file || !title || !subjectId || batchIds.length === 0 || scheduleInvalid}>
            {mode === 'schedule' ? 'Schedule' : 'Publish'}
          </Button>
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
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chapter 1 — Introduction" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Description</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
        </div>
        <FileDrop accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.png,.jpg,.jpeg,.gif,.txt,.xls,.xlsx" maxSizeMb={50} onFile={setFile} selectedName={file?.name} />
        <ReleasePicker mode={mode} setMode={setMode} releaseAt={releaseAt} setReleaseAt={setReleaseAt} />
      </div>
    </Modal>
  )
}

function EditNoteModal({ note, onClose, onSuccess }: { note: FacultyNote | null; onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<'keep' | 'now' | 'schedule'>('keep')
  const [releaseAt, setReleaseAt] = useState('')
  const scheduled = note?.status === 'SCHEDULED'

  // Seed on open.
  useEffect(() => { if (note) { setTitle(note.title); setDescription(note.description ?? ''); setFile(null); setMode('keep'); setReleaseAt('') } }, [note])

  const save = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('title', title)
      fd.append('description', description)
      if (file) fd.append('file', file)
      if (scheduled && mode !== 'keep') fd.append('releaseAt', mode === 'schedule' ? (toIso(releaseAt) ?? '') : '')
      return facultyApi.updateNote(note!.id, fd)
    },
    onSuccess: () => { toast.success('Note updated'); onSuccess(); onClose() },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const scheduleInvalid = mode === 'schedule' && (!releaseAt || new Date(releaseAt).getTime() <= Date.now())

  return (
    <Modal
      open={!!note} onClose={onClose} title="Edit Note"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!title || scheduleInvalid}>Save</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Title *</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Description</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Replace file (optional)</label>
          <FileDrop accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.png,.jpg,.jpeg,.gif,.txt,.xls,.xlsx" maxSizeMb={50} onFile={setFile} selectedName={file?.name} />
        </div>
        {scheduled
          ? <ReleasePicker mode={mode === 'keep' ? 'now' : mode} setMode={(m) => setMode(m)} releaseAt={releaseAt} setReleaseAt={setReleaseAt} allowKeep keepActive={mode === 'keep'} onKeep={() => setMode('keep')} />
          : <p className="rounded-sm bg-surface-hover px-3 py-2 text-xs text-text-muted">Published — release time is fixed. Edit title, description, or replace the file.</p>}
      </div>
    </Modal>
  )
}

function ReleasePicker({ mode, setMode, releaseAt, setReleaseAt, allowKeep, keepActive, onKeep }: { mode: 'now' | 'schedule'; setMode: (m: 'now' | 'schedule') => void; releaseAt: string; setReleaseAt: (v: string) => void; allowKeep?: boolean; keepActive?: boolean; onKeep?: () => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold uppercase text-text-secondary">Release</legend>
      <div className="flex flex-wrap gap-3 text-xs">
        {allowKeep && (
          <label className="flex cursor-pointer items-center gap-1.5"><input type="radio" checked={keepActive} onChange={onKeep} className="accent-primary" /> Keep current</label>
        )}
        <label className="flex cursor-pointer items-center gap-1.5"><input type="radio" checked={!keepActive && mode === 'now'} onChange={() => setMode('now')} className="accent-primary" /> Publish now</label>
        <label className="flex cursor-pointer items-center gap-1.5"><input type="radio" checked={!keepActive && mode === 'schedule'} onChange={() => setMode('schedule')} className="accent-primary" /> Schedule</label>
      </div>
      {!keepActive && mode === 'schedule' && (
        <input type="datetime-local" value={releaseAt} min={new Date(Date.now() + 60000).toISOString().slice(0, 16)} onChange={(e) => setReleaseAt(e.target.value)}
          className="mt-2 w-full rounded-sm border border-border bg-surface px-2.5 py-1.5 text-sm" />
      )}
    </fieldset>
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
