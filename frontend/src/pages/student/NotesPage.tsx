import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Download, FileText, Sparkles } from 'lucide-react'
import { studentApi } from '@/api/student'
import { errorMessage } from '@/api/client'
import { PageShell } from '@/components/shared/PageShell'
import { FilterBar } from '@/components/shared/FilterBar'
import { SearchInput } from '@/components/shared/SearchInput'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { NoteDrive } from '@/components/shared/NoteDrive'

type SummaryPayload = {
  noteId: string
  noteTitle: string
  subjectCode: string
  status: string
  summary?: string | null
  detailedNotes?: string
  bulletNotes?: string[]
  importantDefinitions?: string[]
  keyFormulae?: string[]
  importantQuestions?: string[]
  flashcards?: Array<{ question: string; answer: string }>
}

export default function StudentNotesPage() {
  const [search, setSearch] = useState('')
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [previewOf, setPreviewOf] = useState<{ id: string; title: string; mimeType?: string; objectUrl?: string | null } | null>(null)
  const subjects = useQuery({ queryKey: ['student', 'subjects'], queryFn: studentApi.subjects })
  const [subjectId, setSubjectId] = useState('')
  const [parentId, setParentId] = useState<string | null>(null)
  const drive = useQuery({ queryKey: ['student', 'note-drive', subjectId, parentId, search], queryFn: () => studentApi.noteDrive({ subjectId, parentId: parentId ?? undefined, search: search || undefined }), enabled: !!subjectId })
  const preview = useQuery({
    queryKey: ['student', 'note-file', previewOf?.id],
    queryFn: async () => {
      const blob = await studentApi.noteFile(previewOf!.id, 'inline')
      return URL.createObjectURL(blob)
    },
    enabled: !!previewOf?.id,
  })
  const summary = useQuery({
    queryKey: ['student', 'note-summary', activeNoteId],
    queryFn: () => studentApi.smartNoteSummary(activeNoteId!),
    enabled: !!activeNoteId,
    retry: false,
    refetchInterval: (query) => {
      const status = (query.state.data as SummaryPayload | undefined)?.status
      return status === 'processing' ? 5000 : false
    },
  })
  const subjectOptions = (subjects.data?.subjects ?? []) as Array<{ id: string; code: string; name: string }>
  useEffect(() => { if (!subjectId && subjectOptions[0]) setSubjectId(subjectOptions[0].id) }, [subjectId, subjectOptions])
  useEffect(() => {
    if (!previewOf || !preview.data) return
    if (previewOf.objectUrl === preview.data) return
    setPreviewOf((current) => current ? { ...current, objectUrl: preview.data } : current)
  }, [preview.data, previewOf])
  useEffect(() => () => {
    if (previewOf?.objectUrl) URL.revokeObjectURL(previewOf.objectUrl)
  }, [previewOf?.objectUrl])

  async function openPreview(file: { id: string; title: string; mimeType?: string }) {
    if (previewOf?.objectUrl) URL.revokeObjectURL(previewOf.objectUrl)
    setPreviewOf({ id: file.id, title: file.title, mimeType: file.mimeType, objectUrl: null })
  }

  async function downloadPreviewFile() {
    if (!previewOf) return
    try {
      const blob = await studentApi.noteFile(previewOf.id, 'download')
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = previewOf.title
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Could not download file')
    }
  }

  function closePreview() {
    if (previewOf?.objectUrl) URL.revokeObjectURL(previewOf.objectUrl)
    setPreviewOf(null)
  }

  const canInlinePreview = !!previewOf?.mimeType && (
    previewOf.mimeType.startsWith('image/')
    || previewOf.mimeType.startsWith('text/')
    || previewOf.mimeType === 'application/pdf'
  )

  return (
    <PageShell title="Notes" subtitle="Study materials organised like a shared drive">
      <FilterBar>
        <div className="w-64 max-w-full">
          <SearchInput value={search} onChange={setSearch} placeholder="Search notes" />
        </div>
      </FilterBar>

      <div className="mb-4 max-w-md"><Select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setParentId(null) }} placeholder="Select subject">{subjectOptions.map((subject) => <option key={subject.id} value={subject.id}>{subject.code} — {subject.name}</option>)}</Select></div>
      {drive.isLoading || subjects.isLoading ? (
        <CardSkeleton height={200} />
      ) : drive.data ? (
        <NoteDrive breadcrumbs={drive.data.breadcrumbs} folders={drive.data.folders} files={drive.data.files} downloadLabel="Preview" onOpenFolder={(id) => setParentId(id)} onBreadcrumb={setParentId} onDownload={openPreview} onSummary={(file) => setActiveNoteId(file.id)} />
      ) : (
        <EmptyState icon={<FileText size={22} />} title="Select a subject" description="Choose a subject to browse its folders." />
      )}

      <Modal
        open={!!previewOf}
        onClose={closePreview}
        size="xl"
        title={previewOf?.title ?? 'File preview'}
        footer={<><Button variant="outline" onClick={closePreview}>Cancel</Button><Button leftIcon={<Download size={15} />} onClick={downloadPreviewFile}>Download</Button></>}
      >
        <div className="space-y-4">
          {preview.isLoading ? (
            <CardSkeleton height={420} />
          ) : !previewOf?.objectUrl ? (
            <EmptyState icon={<FileText size={22} />} title="Preview unavailable" description="The file could not be loaded right now." className="border-0" />
          ) : canInlinePreview ? (
            previewOf.mimeType?.startsWith('image/')
              ? <img src={previewOf.objectUrl} alt={previewOf.title} className="max-h-[70vh] w-full rounded-card object-contain" />
              : <iframe src={previewOf.objectUrl} title={previewOf.title} className="h-[70vh] w-full rounded-card border border-border" />
          ) : (
            <EmptyState icon={<FileText size={22} />} title="Preview not supported" description="Use the Download button above to save and open this file." className="border-0" />
          )}
        </div>
      </Modal>

      <Modal
        open={!!activeNoteId}
        onClose={() => setActiveNoteId(null)}
        size="lg"
        title={(summary.data as SummaryPayload | undefined)?.noteTitle ?? 'AI Summary'}
        subtitle={(summary.data as SummaryPayload | undefined)?.subjectCode ?? 'Processed faculty note insight'}
        footer={<Button variant="outline" onClick={() => setActiveNoteId(null)}>Close</Button>}
      >
        {summary.isLoading ? (
          <CardSkeleton height={240} />
        ) : summary.isError ? (
          <EmptyState icon={<Sparkles size={22} />} title="Summary unavailable" description={errorMessage(summary.error)} className="border-0" />
        ) : (summary.data as SummaryPayload | undefined)?.status === 'processing' ? (
          <EmptyState icon={<Sparkles size={22} />} title="Summary is processing" description="The faculty note is being processed now. This window refreshes automatically every 5 seconds." className="border-0" />
        ) : (
          <div className="space-y-4">
            <Section title="Short Summary">
              <p className="text-sm leading-6 text-text-primary">{(summary.data as SummaryPayload | undefined)?.summary ?? 'Summary not available yet.'}</p>
            </Section>

            {Boolean((summary.data as SummaryPayload | undefined)?.bulletNotes?.length) && (
              <Section title="Bullet Notes">
                <ul className="space-y-2">
                  {((summary.data as SummaryPayload).bulletNotes ?? []).map((item) => (
                    <li key={item} className="rounded-sm bg-surface-2 px-3 py-2 text-sm text-text-primary">{item}</li>
                  ))}
                </ul>
              </Section>
            )}

            {Boolean((summary.data as SummaryPayload | undefined)?.importantQuestions?.length) && (
              <Section title="Important Questions">
                <div className="flex flex-wrap gap-2">
                  {((summary.data as SummaryPayload).importantQuestions ?? []).map((item) => <Badge key={item} tone="warning">{item}</Badge>)}
                </div>
              </Section>
            )}

            {Boolean((summary.data as SummaryPayload | undefined)?.flashcards?.length) && (
              <Section title="Flashcards">
                <div className="space-y-3">
                  {((summary.data as SummaryPayload).flashcards ?? []).map((card, index) => (
                    <div key={`${card.question}-${index}`} className="rounded-card border border-border p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Q</div>
                      <div className="mt-1 text-sm text-text-primary">{card.question}</div>
                      <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-text-muted">A</div>
                      <div className="mt-1 text-sm text-text-secondary">{card.answer}</div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}
      </Modal>
    </PageShell>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-text-primary">{title}</div>
      {children}
    </div>
  )
}
