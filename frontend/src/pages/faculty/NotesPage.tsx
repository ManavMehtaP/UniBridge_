import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { FileQuestion, FileText, Plus } from 'lucide-react'
import { facultyApi } from '@/api/faculty'
import { errorMessage } from '@/api/client'
import { useFacultyScope } from '@/hooks/faculty/useFacultyScope'
import type { FacultyNote } from '@/types/faculty'
import { PageShell } from '@/components/shared/PageShell'
import { FileDrop } from '@/components/shared/FileDrop'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { NoteDrive } from '@/components/shared/NoteDrive'

export default function NotesPage() {
  const qc = useQueryClient()
  const scope = useFacultyScope()
  const [showUpload, setShowUpload] = useState(false)
  const [editOf, setEditOf] = useState<FacultyNote | null>(null)
  const [deleteOf, setDeleteOf] = useState<FacultyNote | null>(null)
  const [driveSubjectId, setDriveSubjectId] = useState('')
  const [parentId, setParentId] = useState<string | null>(null)
  const [showFolder, setShowFolder] = useState(false)
  const [showPyq, setShowPyq] = useState(false)
  const [renameFolder, setRenameFolder] = useState<{ id: string; name: string } | null>(null)

  const list = useQuery({ queryKey: ['faculty', 'notes'], queryFn: () => facultyApi.notes({ limit: 20 }) })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['faculty', 'notes'] })
  const drive = useQuery({ queryKey: ['faculty', 'note-drive', driveSubjectId, parentId], queryFn: () => facultyApi.noteDrive({ subjectId: driveSubjectId, parentId: parentId ?? undefined }), enabled: !!driveSubjectId })
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
  useEffect(() => { if (!driveSubjectId && subjectOpts[0]) setDriveSubjectId(subjectOpts[0].value) }, [driveSubjectId, subjectOpts])
  useEffect(() => { setParentId(null) }, [driveSubjectId])

  return (
    <PageShell
      title="Notes"
      subtitle={list.data ? `${list.data.total} notes uploaded` : 'Upload PDFs and study materials'}
      action={<div className="flex gap-2"><Button variant="outline" leftIcon={<Plus size={15} />} onClick={() => setShowFolder(true)} disabled={!driveSubjectId}>New folder</Button><Button variant="outline" leftIcon={<FileQuestion size={15} />} onClick={() => setShowPyq(true)}>Add PYQ</Button><Button leftIcon={<Plus size={15} />} onClick={() => setShowUpload(true)}>Upload Note</Button></div>}
    >
      <div className="mb-4 max-w-md"><Select value={driveSubjectId} onChange={(e) => setDriveSubjectId(e.target.value)} placeholder="Select subject" options={subjectOpts} /></div>
      {drive.isLoading ? (
        <CardSkeleton height={200} />
      ) : drive.data ? (
        <NoteDrive breadcrumbs={drive.data.breadcrumbs} folders={drive.data.folders} files={drive.data.files} faculty onOpenFolder={(id) => setParentId(id)} onBreadcrumb={setParentId} onCreateFolder={() => setShowFolder(true)} onUpload={() => setShowUpload(true)} onRenameFolder={setRenameFolder} onDeleteFolder={(folder) => { facultyApi.deleteNoteFolder(folder.id).then(() => { toast.success('Folder deleted'); qc.invalidateQueries({ queryKey: ['faculty', 'note-drive'] }) }).catch((e) => toast.error(errorMessage(e))) }} onEditFile={(file) => { const note = { ...file, subject: drive.data.subject ?? { code: '', name: '' }, fileUrl: '', fileSize: file.fileSizeKb ?? undefined, fileType: file.mimeType, aiSummaryStatus: file.hasAiSummary ? 'complete' : 'pending', createdAt: file.createdAt } as FacultyNote; setEditOf(note) }} onDeleteFile={(file) => { const note = { ...file, subject: drive.data.subject ?? { code: '', name: '' }, fileUrl: '', fileSize: file.fileSizeKb ?? undefined, fileType: file.mimeType, aiSummaryStatus: file.hasAiSummary ? 'complete' : 'pending', createdAt: file.createdAt } as FacultyNote; setDeleteOf(note) }} />
      ) : (
        <EmptyState icon={<FileText size={22} />} title="Select a subject" description="Choose a subject to browse its folders." />
      )}

      <UploadNoteModal open={showUpload} onClose={() => setShowUpload(false)} subjectOpts={subjectOpts} assignments={scope.data?.assignments ?? []} defaultSubjectId={driveSubjectId} folderId={parentId} onSuccess={() => { invalidate(); qc.invalidateQueries({ queryKey: ['faculty', 'note-drive'] }) }} />
      <UploadPyqModal open={showPyq} onClose={() => setShowPyq(false)} subjectOpts={subjectOpts} defaultSubjectId={driveSubjectId} />
      <FolderModal open={showFolder} subjectId={driveSubjectId} parentId={parentId} onClose={() => setShowFolder(false)} onSuccess={() => { setShowFolder(false); qc.invalidateQueries({ queryKey: ['faculty', 'note-drive'] }) }} />
      <RenameFolderModal folder={renameFolder} onClose={() => setRenameFolder(null)} onSuccess={() => { setRenameFolder(null); qc.invalidateQueries({ queryKey: ['faculty', 'note-drive'] }) }} />
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

function UploadNoteModal({ open, onClose, subjectOpts, assignments, defaultSubjectId, folderId, onSuccess }: { open: boolean; onClose: () => void; subjectOpts: { value: string; label: string }[]; assignments: Assignment[]; defaultSubjectId: string; folderId: string | null; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [batchIds, setBatchIds] = useState<string[]>([])
  const [mode, setMode] = useState<'now' | 'schedule'>('now')
  const [releaseAt, setReleaseAt] = useState('')
  const batches = useMemo(() => assignments.filter((a) => a.subject.id === subjectId).map((a) => a.batch), [assignments, subjectId])
  useEffect(() => { if (open && defaultSubjectId) { setSubjectId(defaultSubjectId); setBatchIds([]) } }, [open, defaultSubjectId])

  const upload = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('file', file!)
      fd.append('title', title)
      fd.append('description', description)
      fd.append('subjectId', subjectId)
      if (folderId && subjectId) fd.append('folderId', folderId)
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

// PYQ paper upload — subject + exam year + file. Backend hands it to the AI service for topic analysis.
function UploadPyqModal({ open, onClose, subjectOpts, defaultSubjectId }: { open: boolean; onClose: () => void; subjectOpts: { value: string; label: string }[]; defaultSubjectId: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [subjectId, setSubjectId] = useState('')
  const [year, setYear] = useState('')
  useEffect(() => { if (open && defaultSubjectId) setSubjectId(defaultSubjectId) }, [open, defaultSubjectId])

  const upload = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('file', file!)
      fd.append('subjectId', subjectId)
      fd.append('year', year.trim())
      return facultyApi.uploadPyq(fd)
    },
    onSuccess: (r: any) => { toast.success(r?.processingStatus === 'queued' ? 'PYQ uploaded — AI analysis queued' : 'PYQ uploaded'); close() },
    onError: (e) => toast.error(errorMessage(e)),
  })

  function close() { setFile(null); setSubjectId(''); setYear(''); onClose() }

  return (
    <Modal
      open={open} onClose={close} title="Add PYQ Paper"
      footer={
        <>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button onClick={() => upload.mutate()} loading={upload.isPending} disabled={!file || !subjectId || !year.trim()}>Upload</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Subject *</label>
          <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} placeholder="Select subject" options={subjectOpts} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Exam Year *</label>
          <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2023 or 2023-24" />
        </div>
        <FileDrop accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt" maxSizeMb={50} onFile={setFile} selectedName={file?.name} />
        <p className="rounded-sm bg-primary-light/50 px-3 py-2 text-xs text-text-muted">The paper is sent to the AI assistant to extract recurring topics for students.</p>
      </div>
    </Modal>
  )
}

function FolderModal({ open, subjectId, parentId, onClose, onSuccess }: { open: boolean; subjectId: string; parentId: string | null; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('')
  const mutation = useMutation({ mutationFn: () => facultyApi.createNoteFolder({ subjectId, parentId, name }), onSuccess: () => { toast.success('Folder created'); setName(''); onSuccess() }, onError: (e) => toast.error(errorMessage(e)) })
  return <Modal open={open} onClose={onClose} title="Create folder" footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={mutation.isPending} disabled={!name.trim()} onClick={() => mutation.mutate()}>Create</Button></>}><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Assignments" /></Modal>
}

function RenameFolderModal({ folder, onClose, onSuccess }: { folder: { id: string; name: string } | null; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('')
  useEffect(() => { setName(folder?.name ?? '') }, [folder])
  const mutation = useMutation({ mutationFn: () => facultyApi.renameNoteFolder(folder!.id, name), onSuccess: () => { toast.success('Folder renamed'); onSuccess() }, onError: (e) => toast.error(errorMessage(e)) })
  return <Modal open={!!folder} onClose={onClose} title="Rename folder" footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={mutation.isPending} disabled={!name.trim()} onClick={() => mutation.mutate()}>Save</Button></>}><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} /></Modal>
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
