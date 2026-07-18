import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { BarChart3, BrainCircuit, Plus, Send, Sparkles, Target, Trash2 } from 'lucide-react'
import { studentApi } from '@/api/student'
import { errorMessage } from '@/api/client'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { Tabs } from '@/components/ui/Tabs'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

type SubjectOption = { id: string; code: string; name: string }

export default function AIAssistantPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('chat')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [chatSubjectId, setChatSubjectId] = useState('')
  const [analysisSubjectId, setAnalysisSubjectId] = useState('')
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const conversations = useQuery({ queryKey: ['student', 'ai-convs'], queryFn: studentApi.aiConversations })
  const conversation = useQuery({
    queryKey: ['student', 'ai-conv', selectedId],
    queryFn: () => studentApi.aiConversation(selectedId!),
    enabled: !!selectedId,
  })
  const subjects = useQuery({
    queryKey: ['student', 'subjects'],
    queryFn: studentApi.subjects,
  })
  const marksPrediction = useQuery({
    queryKey: ['student', 'marks-prediction'],
    queryFn: studentApi.marksPrediction,
    retry: false,
  })
  const pyqAnalysis = useQuery({
    queryKey: ['student', 'pyq-analysis', analysisSubjectId],
    queryFn: () => studentApi.pyqAnalysis(analysisSubjectId),
    enabled: !!analysisSubjectId,
    retry: false,
  })

  const subjectOptions: SubjectOption[] = (subjects.data as { subjects?: SubjectOption[] } | undefined)?.subjects ?? []

  useEffect(() => {
    if (!selectedId && conversations.data?.data?.[0]) {
      setSelectedId(conversations.data.data[0].id)
    }
  }, [conversations.data, selectedId])

  useEffect(() => {
    if (!analysisSubjectId && subjectOptions[0]) {
      setAnalysisSubjectId(subjectOptions[0].id)
    }
  }, [analysisSubjectId, subjectOptions])

  const create = useMutation({
    mutationFn: () => studentApi.createAiConversation({ title: `Chat ${new Date().toLocaleString('en-IN')}`, subjectId: chatSubjectId || null }),
    onSuccess: async (created: { id: string }) => {
      setSelectedId(created.id)
      await qc.invalidateQueries({ queryKey: ['student', 'ai-convs'] })
      await qc.invalidateQueries({ queryKey: ['student', 'ai-conv', created.id] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const send = useMutation({
    mutationFn: () => studentApi.sendAiMessage(selectedId!, text.trim()),
    onSuccess: async () => {
      setText('')
      await qc.invalidateQueries({ queryKey: ['student', 'ai-conv', selectedId] })
      await qc.invalidateQueries({ queryKey: ['student', 'ai-convs'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const del = useMutation({
    mutationFn: (id: string) => studentApi.deleteAiConversation(id),
    onSuccess: async () => {
      setSelectedId(null)
      await qc.invalidateQueries({ queryKey: ['student', 'ai-convs'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation.data?.messages?.length])

  const marksData = marksPrediction.data as {
    predicted_percentage?: number
    prediction_confidence?: string
    predicted_average?: number
    predicted_badge?: string
    model_r2?: number
    model_mae?: number
    predictions?: Array<{ subject_code: string; subject_name: string; predicted_marks: number; predicted_percentage: number; trend: string; confidence_note: string }>
    subject_predictions?: Array<{ subject_code: string; subject_name: string; predicted_marks: number; predicted_percentage: number; trend: string; confidence_note: string }>
  } | undefined
  const subjectPredictions = marksData?.predictions ?? marksData?.subject_predictions ?? []

  return (
    <PageShell
      title="AI Assistant"
      subtitle="Chat with study context, predict T4 marks, and review PYQ-driven weak points."
      action={
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'chat', label: 'Chat' },
            { key: 'marks', label: 'T4 Prediction' },
            { key: 'pyq', label: 'PYQ Analysis' },
          ]}
        />
      }
    >
      {tab === 'chat' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
          <Card className="max-h-[620px] overflow-hidden">
            <div className="flex items-center justify-between border-b border-border p-3">
              <div>
                <div className="text-sm font-semibold text-text-primary">Conversations</div>
                <div className="text-[11px] text-text-muted">General or subject-aware study help</div>
              </div>
              <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => create.mutate()} loading={create.isPending}>New</Button>
            </div>
            <div className="border-b border-border px-3 py-3">
              <Select
                value={chatSubjectId}
                onChange={(e) => setChatSubjectId(e.target.value)}
                options={subjectOptions.map((subject) => ({ value: subject.id, label: `${subject.code} - ${subject.name}` }))}
                placeholder="General chat"
              />
            </div>
            <div className="scrollbar-thin max-h-[500px] overflow-y-auto">
              {conversations.isLoading ? (
                <div className="p-3"><CardSkeleton height={96} /></div>
              ) : conversations.data?.data.length === 0 ? (
                <p className="p-4 text-xs text-text-muted">No conversations yet.</p>
              ) : (
                <ul className="divide-y divide-border-light">
                  {conversations.data?.data.map((item) => (
                    <li
                      key={item.id}
                      className={cn('group flex cursor-pointer items-center gap-2 px-3 py-3 transition hover:bg-surface-2', selectedId === item.id && 'bg-primary-light')}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-surface-2 text-primary">
                        <Sparkles size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-text-primary">{item.title}</div>
                        <div className="text-[10px] text-text-muted">{item.subjectName ?? 'General'} • {item.messageCount ?? 0} msgs</div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); del.mutate(item.id) }}
                        className="text-text-muted opacity-0 transition group-hover:opacity-100 hover:text-danger"
                      >
                        <Trash2 size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card className="flex h-[620px] flex-col">
            {!selectedId ? (
              <EmptyState
                icon={<BrainCircuit size={24} />}
                title="Start a study chat"
                description="Leave the subject as General chat or pick one subject for note, PYQ, and marks context."
                action={<Button leftIcon={<Plus size={14} />} onClick={() => create.mutate()} loading={create.isPending}>Create Chat</Button>}
                className="flex-1 border-0"
              />
            ) : (
              <>
                <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
                  {conversation.isLoading ? (
                    <CardSkeleton height={200} />
                  ) : conversation.data?.messages?.length === 0 ? (
                    <p className="mt-16 text-center text-xs text-text-muted">Ask about weak topics, revision strategy, PYQs, or faculty notes.</p>
                  ) : (
                    <div className="space-y-3">
                      {conversation.data?.messages?.map((message) => (
                        <div key={message.id} className={cn('flex', message.role === 'USER' ? 'justify-end' : 'justify-start')}>
                          <div className={cn('max-w-[82%] rounded-sm px-3 py-2 text-[13px] leading-6', message.role === 'USER' ? 'bg-primary text-white' : 'bg-surface-2 text-text-primary')}>
                            {message.content}
                          </div>
                        </div>
                      ))}
                      <div ref={bottomRef} />
                    </div>
                  )}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (text.trim()) send.mutate()
                  }}
                  className="flex items-center gap-2 border-t border-border p-3"
                >
                  <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about a concept, your weak areas, or how to study next..." />
                  <Button type="submit" disabled={!text.trim()} loading={send.isPending} leftIcon={<Send size={14} />}>Send</Button>
                </form>
              </>
            )}
          </Card>
        </div>
      )}

      {tab === 'marks' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
          <Card>
            <CardHeader title="T4 Prediction" subtitle="Predicted using your published T1, T2, and T3 marks." />
            <CardBody className="space-y-3">
              {marksPrediction.isLoading ? (
                <CardSkeleton height={220} />
              ) : marksPrediction.isError ? (
                <EmptyState icon={<BarChart3 size={22} />} title="Prediction unavailable" description={errorMessage(marksPrediction.error)} className="border-0" />
              ) : (
                <>
                  <div className="rounded-card bg-surface-2 p-4">
                    <div className="text-[11px] uppercase tracking-wide text-text-muted">Predicted Overall</div>
                    <div className="mt-1 text-3xl font-bold text-text-primary">{String(marksData?.predicted_percentage ?? '--')}%</div>
                    <div className="mt-1 text-xs text-text-muted">{String(marksData?.prediction_confidence ?? 'Confidence unavailable')}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard label="Predicted Avg" value={String(marksData?.predicted_average ?? '--')} />
                    <MetricCard label="Badge" value={String(marksData?.predicted_badge ?? '--')} />
                    <MetricCard label="Model R²" value={String(marksData?.model_r2 ?? '--')} />
                    <MetricCard label="Model MAE" value={String(marksData?.model_mae ?? '--')} />
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Subject Predictions" subtitle="Projected T4 output for the latest semester subjects." />
            <CardBody>
              {marksPrediction.isLoading ? (
                <CardSkeleton height={260} />
              ) : subjectPredictions.length ? (
                <div className="space-y-3">
                  {subjectPredictions.map((prediction) => (
                    <div key={prediction.subject_code} className="rounded-card border border-border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-text-primary">{prediction.subject_code}</div>
                          <div className="text-xs text-text-muted">{prediction.subject_name}</div>
                        </div>
                        <Badge tone={prediction.trend === 'Improving' ? 'success' : prediction.trend === 'Declining' ? 'warning' : 'neutral'}>
                          {prediction.trend}
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <MetricCard label="Predicted T4" value={`${prediction.predicted_marks}/50`} compact />
                        <MetricCard label="Projected %" value={`${prediction.predicted_percentage}%`} compact />
                      </div>
                      <p className="mt-3 text-xs leading-5 text-text-secondary">{prediction.confidence_note}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={<Target size={22} />} title="No T4 prediction yet" description="Published T1, T2, and T3 marks are required for each subject before the model can project T4 output." className="border-0" />
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'pyq' && (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="PYQ Analysis"
              subtitle="Review high-frequency topics and compare them with your current weak points."
              action={
                <div className="w-[320px] max-w-full">
                  <Select
                    value={analysisSubjectId}
                    onChange={(e) => setAnalysisSubjectId(e.target.value)}
                    options={subjectOptions.map((subject) => ({ value: subject.id, label: `${subject.code} - ${subject.name}` }))}
                    placeholder="Select subject"
                  />
                </div>
              }
            />
            <CardBody>
              {!analysisSubjectId ? (
                <EmptyState icon={<Target size={22} />} title="Select a subject" description="Choose a subject to load its PYQ analysis." className="border-0" />
              ) : pyqAnalysis.isLoading ? (
                <CardSkeleton height={280} />
              ) : pyqAnalysis.isError ? (
                <EmptyState icon={<Target size={22} />} title="PYQ analysis unavailable" description={errorMessage(pyqAnalysis.error)} className="border-0" />
              ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
                  <div className="space-y-4">
                    <div className="rounded-card bg-surface-2 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-text-primary">{String((pyqAnalysis.data as { subjectCode?: string }).subjectCode ?? '')}</div>
                          <div className="text-xs text-text-muted">{String((pyqAnalysis.data as { subjectName?: string }).subjectName ?? '')}</div>
                        </div>
                        <Badge tone={(pyqAnalysis.data as { status?: string }).status === 'ready' ? 'success' : 'warning'}>
                          {String((pyqAnalysis.data as { status?: string }).status ?? 'unknown')}
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <MetricCard label="PYQs Analyzed" value={String((pyqAnalysis.data as { totalPYQsAnalyzed?: number }).totalPYQsAnalyzed ?? 0)} compact />
                        <MetricCard label="Your Avg %" value={String((pyqAnalysis.data as { averagePct?: number | null }).averagePct ?? '--')} compact />
                      </div>
                    </div>

                    <SectionCard title="Important Topics">
                      <div className="flex flex-wrap gap-2">
                        {((pyqAnalysis.data as { importantTopics?: Array<{ topic: string; priority: string; frequency?: number }> }).importantTopics ?? []).map((topic) => (
                          <Badge key={topic.topic} tone={topic.priority === 'HIGH' ? 'danger' : topic.priority === 'MEDIUM' ? 'warning' : 'neutral'}>
                            {topic.topic}
                            {topic.frequency ? ` • ${topic.frequency}` : ''}
                          </Badge>
                        ))}
                      </div>
                    </SectionCard>

                    <SectionCard title="Per-file Insights">
                      <div className="space-y-3">
                        {((pyqAnalysis.data as { files?: Array<{ pyqId: string; year: string; difficulty?: string; topics?: string[]; questionTypes?: string[] }> }).files ?? []).map((file) => (
                          <div key={file.pyqId} className="rounded-sm border border-border p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-semibold text-text-primary">{file.year}</div>
                              {file.difficulty && <Badge tone="neutral">{file.difficulty}</Badge>}
                            </div>
                            <div className="mt-2 text-xs text-text-secondary">
                              Topics: {(file.topics ?? []).join(', ') || 'Pending'}
                            </div>
                            <div className="mt-1 text-xs text-text-muted">
                              Question types: {(file.questionTypes ?? []).join(', ') || 'Pending'}
                            </div>
                          </div>
                        ))}
                        {!((pyqAnalysis.data as { files?: unknown[] }).files?.length) && <p className="text-xs text-text-muted">Detailed PYQ insights will appear after uploaded PYQs are processed.</p>}
                      </div>
                    </SectionCard>
                  </div>

                  <SectionCard title="Weak Points">
                    <div className="space-y-2">
                      {((pyqAnalysis.data as { weakPoints?: string[] }).weakPoints ?? []).map((item) => (
                        <div key={item} className="rounded-sm bg-warning-light/30 px-3 py-2 text-xs leading-5 text-text-primary">{item}</div>
                      ))}
                      {!((pyqAnalysis.data as { weakPoints?: string[] }).weakPoints?.length) && (
                        <p className="text-xs text-text-muted">Weak-point messaging will appear once marks and PYQ trends are both available.</p>
                      )}
                    </div>
                  </SectionCard>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </PageShell>
  )
}

function MetricCard({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={cn('rounded-sm border border-border bg-surface-2 p-3', compact && 'p-2.5')}>
      <div className="text-[11px] uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold text-text-primary">{value}</div>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-border p-4">
      <div className="mb-3 text-sm font-semibold text-text-primary">{title}</div>
      {children}
    </div>
  )
}
