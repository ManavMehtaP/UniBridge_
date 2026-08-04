import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Download, Eye, PenTool, Pencil, Plus, Trash2 } from 'lucide-react'
import { studentApi } from '@/api/student'
import { errorMessage } from '@/api/client'
import type { SelfNote } from '@/types/student'
import { PageShell } from '@/components/shared/PageShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { FileDrop } from '@/components/shared/FileDrop'

const COLORS = ['#EFF6FF', '#ECFDF5', '#FEF3C7', '#FEE2E2', '#F3E8FF', '#E0F2FE']

export default function SelfNotesPage() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<SelfNote | 'new' | null>(null)
  const [deleteOf, setDeleteOf] = useState<SelfNote | null>(null)
  const [preview, setPreview] = useState<{ title: string; url: string } | null>(null)

  const list = useQuery({ queryKey: ['student', 'self-notes'], queryFn: studentApi.selfNotes })

  const del = useMutation({
    mutationFn: (id: string) => studentApi.deleteSelfNote(id),
    onSuccess: () => { toast.success('Note deleted'); qc.invalidateQueries({ queryKey: ['student', 'self-notes'] }); setDeleteOf(null) },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const fileAccess = useMutation({ mutationFn: studentApi.selfNoteFileAccess })
  const openFile = (note: SelfNote, mode: 'preview' | 'download') => fileAccess.mutate(note.id, { onSuccess: async ({ downloadUrl, fileName }) => {
    if (mode === 'preview') { setPreview({ title: fileName, url: downloadUrl }); return }
    const response = await fetch(downloadUrl)
    const blobUrl = URL.createObjectURL(await response.blob())
    const anchor = document.createElement('a'); anchor.href = blobUrl; anchor.download = fileName; anchor.click(); URL.revokeObjectURL(blobUrl)
  }, onError: (e) => toast.error(errorMessage(e)) })

  return (
    <PageShell
      title="My Notes"
      subtitle={list.data ? `${list.data.data.length} personal notes` : 'Your private study notes'}
      action={<Button leftIcon={<Plus size={15} />} onClick={() => setEditing('new')}>New Note</Button>}
    >
      {list.isLoading ? (
        <CardSkeleton height={200} />
      ) : list.data && list.data.data.length === 0 ? (
        <EmptyState icon={<PenTool size={22} />} title="No notes yet" description="Jot down anything — reminders, ideas, formulas." action={<Button onClick={() => setEditing('new')}>New Note</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.data?.data.map((n) => (
            <Card key={n.id} className="p-4 transition hover:shadow-md" style={{ background: n.color ?? '#FFFFFF' }}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <button onClick={() => setEditing(n)} className="flex-1 text-left">
                  <div className="text-sm font-semibold text-text-primary">{n.title}</div>
                  {n.subjectCode && <div className="text-xs text-text-muted">{n.subjectCode}</div>}
                </button>
                <div className="flex gap-2"><button onClick={() => setEditing(n)} className="text-text-muted hover:text-primary" title="Edit"><Pencil size={14} /></button><button onClick={() => setDeleteOf(n)} className="text-text-muted hover:text-danger" title="Delete">
                  <Trash2 size={14} />
                </button></div>
              </div>
              <p className="line-clamp-4 text-xs text-text-secondary whitespace-pre-wrap">{n.content}</p>
              {n.hasFile && <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" leftIcon={<Eye size={13} />} loading={fileAccess.isPending} onClick={() => openFile(n, 'preview')}>Preview</Button><Button size="sm" variant="outline" leftIcon={<Download size={13} />} loading={fileAccess.isPending} onClick={() => openFile(n, 'download')}>Download</Button></div>}
              <div className="mt-3 text-[10px] text-text-muted">Updated {new Date(n.updatedAt).toLocaleDateString('en-IN')}</div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <SelfNoteModal note={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => qc.invalidateQueries({ queryKey: ['student', 'self-notes'] })} />
      )}

      <ConfirmDialog
        open={!!deleteOf}
        title="Delete note?"
        message={<>Delete <b>{deleteOf?.title}</b>?</>}
        destructive
        loading={del.isPending}
        onConfirm={() => deleteOf && del.mutate(deleteOf.id)}
        onCancel={() => setDeleteOf(null)}
      />
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.title ?? 'File preview'} size="xl"><iframe title={preview?.title ?? 'File preview'} src={preview?.url} className="h-[70vh] w-full rounded border border-border" /></Modal>
    </PageShell>
  )
}

function SelfNoteModal({ note, onClose, onSaved }: { note: SelfNote | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [content, setContent] = useState(note?.content ?? '')
  const [subjectCode, setSubjectCode] = useState(note?.subjectCode ?? '')
  const [color, setColor] = useState(note?.color ?? COLORS[0])
  const [file, setFile] = useState<File | null>(null)

  const save = useMutation({
    mutationFn: () => {
      const body = new FormData()
      body.append('title', title); body.append('content', content); body.append('subjectCode', subjectCode || ''); body.append('color', color)
      if (file) body.append('file', file)
      return note ? studentApi.updateSelfNote(note.id, body) : studentApi.createSelfNote(body)
    },
    onSuccess: () => { toast.success('Saved'); onSaved(); onClose() },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <Modal
      open onClose={onClose} title={note ? 'Edit Note' : 'New Note'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!title || !content}>Save</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Title *</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <FileDrop accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt" maxSizeMb={25} onFile={setFile} selectedName={file?.name ?? note?.fileName ?? undefined} />
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Content *</label>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[160px]" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Subject (optional)</label>
          <Input value={subjectCode} onChange={(e) => setSubjectCode(e.target.value.toUpperCase())} placeholder="e.g. COA" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase text-text-secondary">Color</label>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} className={`h-8 w-8 rounded-full border-2 transition ${color === c ? 'border-primary' : 'border-border'}`} style={{ background: c }} />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
