import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Download, FileText, Sparkles } from 'lucide-react'
import { studentApi } from '@/api/student'
import { errorMessage } from '@/api/client'
import { PageShell } from '@/components/shared/PageShell'
import { FilterBar } from '@/components/shared/FilterBar'
import { SearchInput } from '@/components/shared/SearchInput'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { format } from 'date-fns'

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

function fmtSize(kb?: number) {
  if (!kb) return null
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`
}

export default function StudentNotesPage() {
  const [search, setSearch] = useState('')
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const list = useQuery({ queryKey: ['student', 'notes', search], queryFn: () => studentApi.notes({ search: search || undefined, limit: 100 }) })
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

  return (
    <PageShell title="Notes" subtitle={list.data ? `${list.data.total} notes shared by your faculty` : 'Study materials with AI summaries'}>
      <FilterBar>
        <div className="w-64 max-w-full">
          <SearchInput value={search} onChange={setSearch} placeholder="Search notes" />
        </div>
      </FilterBar>

      {list.isLoading ? (
        <CardSkeleton height={200} />
      ) : list.data && list.data.data.length === 0 ? (
        <EmptyState icon={<FileText size={22} />} title="No notes yet" description="Notes will appear here as your faculty upload them." />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.data?.data.map((note) => (
            <Card key={note.id} className="flex flex-col p-4">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-sm bg-primary-light text-primary">
                <FileText size={18} />
              </div>
              <div className="text-sm font-semibold text-text-primary line-clamp-2">{note.title}</div>
              <div className="mt-0.5 text-xs text-text-muted">{note.subject.code} · {note.facultyName}</div>
              {note.description && <p className="mt-2 line-clamp-2 text-xs text-text-secondary">{note.description}</p>}
              <div className="mt-2 space-y-0.5 text-[11px] text-text-muted">
                <div>Released {format(new Date(note.releaseAt ?? note.createdAt), 'dd MMM yyyy, HH:mm')}</div>
                {fmtSize(note.fileSize) && <div>Size {fmtSize(note.fileSize)}</div>}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border-light pt-2">
                <Badge tone="neutral">{(note.fileType ?? 'file').split('/').pop()}</Badge>
                <Badge tone={note.hasAiSummary ? 'success' : 'warning'}>{note.hasAiSummary ? 'AI Ready' : 'Processing'}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  leftIcon={<Sparkles size={13} />}
                  onClick={() => setActiveNoteId(note.id)}
                >
                  AI Summary
                </Button>
                <Button
                  leftIcon={<Download size={13} />}
                  onClick={async () => {
                    try {
                      const { downloadUrl } = await studentApi.noteDownload(note.id)
                      if (downloadUrl) window.open(downloadUrl, '_blank', 'noreferrer')
                    } catch {
                      toast.error('Could not open file')
                    }
                  }}
                >
                  Download
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

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
