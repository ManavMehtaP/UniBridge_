import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Sparkles, Target } from 'lucide-react'
import { studentApi } from '@/api/student'
import { errorMessage } from '@/api/client'
import { PageShell } from '@/components/shared/PageShell'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'

type Subject = { id: string; code: string; name: string }
type Topic = { topic: string; frequency: number; priority: 'HIGH' | 'MEDIUM' | 'LOW' }
type PyqFile = { pyqId: string; year: string; status: string; summary: string | null; topics: string[]; questionTypes: string[] }
type PyqData = { subjectCode: string; subjectName: string; status: string; totalPYQsAnalyzed: number; averagePct: number | null; importantTopics: Topic[]; weakPoints: string[]; files: PyqFile[] }
type MarksData = { predicted_percentage?: number; prediction_confidence?: string; predictions?: Array<{ subject_code: string; subject_name: string; predicted_marks: number; predicted_percentage: number; trend: string; confidence_note: string }> }

export default function StudyInsightsPage() {
  const [subjectId, setSubjectId] = useState('')
  const [summaryOf, setSummaryOf] = useState<PyqFile | null>(null)
  const subjects = useQuery({ queryKey: ['student', 'subjects'], queryFn: studentApi.subjects })
  const pyq = useQuery({ queryKey: ['student', 'pyq-analysis', subjectId], queryFn: () => studentApi.pyqAnalysis(subjectId), enabled: !!subjectId, retry: false })
  const marks = useQuery({ queryKey: ['student', 'marks-prediction'], queryFn: studentApi.marksPrediction, retry: false })
  const summary = useQuery({ queryKey: ['student', 'pyq-summary', summaryOf?.pyqId], queryFn: () => studentApi.pyqSummary(summaryOf!.pyqId), enabled: !!summaryOf, retry: false })
  const subjectOptions = ((subjects.data as { subjects?: Subject[] } | undefined)?.subjects ?? [])
  const pyqData = pyq.data as PyqData | undefined
  const marksData = marks.data as MarksData | undefined

  useEffect(() => { if (!subjectId && subjectOptions[0]) setSubjectId(subjectOptions[0].id) }, [subjectId, subjectOptions])

  return <PageShell title="Exam Insights" subtitle="PYQ topic occurrence analysis and T4 prediction based on your published marks.">
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,.65fr)]">
      <Card>
        <CardHeader title="PYQ Analysis" subtitle="Only topics occurring in more than one extracted question are ranked as important." action={<div className="w-72 max-w-full"><Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} options={subjectOptions.map((subject) => ({ value: subject.id, label: `${subject.code} - ${subject.name}` }))} placeholder="Select subject" /></div>} />
        <CardBody className="space-y-4">
          {!subjectId ? <EmptyState icon={<Target size={22} />} title="Select a subject" description="Choose a subject to load PYQ analysis." className="border-0" /> : pyq.isLoading ? <CardSkeleton height={280} /> : pyq.isError ? <EmptyState icon={<Target size={22} />} title="PYQ analysis unavailable" description={errorMessage(pyq.error)} className="border-0" /> : <>
            <div className="rounded-card bg-surface-2 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-text-primary">{pyqData?.subjectCode}</p><p className="text-xs text-text-muted">{pyqData?.subjectName}</p></div><Badge tone={pyqData?.status === 'ready' ? 'success' : 'warning'}>{pyqData?.status ?? 'unknown'}</Badge></div><div className="mt-3 grid grid-cols-2 gap-3"><Metric label="PYQs uploaded" value={String(pyqData?.totalPYQsAnalyzed ?? 0)} /><Metric label="Your average" value={pyqData?.averagePct == null ? '--' : `${pyqData.averagePct}%`} /></div></div>
            <section><h3 className="mb-2 text-sm font-semibold text-text-primary">Important topics</h3>{pyqData?.importantTopics?.length ? <div className="flex flex-wrap gap-2">{pyqData.importantTopics.map((topic) => <Badge key={topic.topic} tone={topic.priority === 'HIGH' ? 'danger' : topic.priority === 'MEDIUM' ? 'warning' : 'neutral'}>{topic.topic} - {topic.frequency} occurrences</Badge>)}</div> : <p className="text-sm text-text-muted">Important topics appear after the same topic occurs in more than one extracted question.</p>}</section>
            <section><h3 className="mb-2 text-sm font-semibold text-text-primary">Uploaded papers</h3><div className="space-y-2">{pyqData?.files?.map((file) => <div key={file.pyqId} className="rounded-card border border-border p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-text-primary">PYQ {file.year}</p><p className="text-xs text-text-muted">{file.topics.join(', ') || 'Processing extracted topics'}</p></div><Button size="sm" variant="outline" leftIcon={<Sparkles size={14} />} onClick={() => setSummaryOf(file)}>AI summary</Button></div></div>)}</div>{!pyqData?.files?.length && <p className="text-sm text-text-muted">No PYQ has been uploaded for this subject.</p>}</section>
          </>}
        </CardBody>
      </Card>
      <Card><CardHeader title="T4 Prediction" subtitle="Projected from published T1, T2, and T3 marks." /><CardBody className="space-y-3">{marks.isLoading ? <CardSkeleton height={280} /> : marks.isError ? <EmptyState icon={<BarChart3 size={22} />} title="Prediction unavailable" description={errorMessage(marks.error)} className="border-0" /> : <><div className="rounded-card bg-primary-light/40 p-4"><p className="text-xs font-semibold uppercase text-text-muted">Predicted overall</p><p className="mt-1 text-3xl font-bold text-text-primary">{marksData?.predicted_percentage ?? '--'}%</p><p className="mt-1 text-xs text-text-muted">{marksData?.prediction_confidence ?? 'Confidence unavailable'}</p></div>{(marksData?.predictions ?? []).map((item) => <div key={item.subject_code} className="rounded-card border border-border p-3"><div className="flex justify-between gap-2"><div><p className="font-semibold text-text-primary">{item.subject_code}</p><p className="text-xs text-text-muted">{item.subject_name}</p></div><Badge tone={item.trend === 'Improving' ? 'success' : item.trend === 'Declining' ? 'warning' : 'neutral'}>{item.trend}</Badge></div><p className="mt-2 text-sm font-semibold text-primary">{item.predicted_marks}/50 ({item.predicted_percentage}%)</p><p className="mt-1 text-xs text-text-secondary">{item.confidence_note}</p></div>)}</>}</CardBody></Card>
    </div>
    <Modal open={!!summaryOf} onClose={() => setSummaryOf(null)} title={`PYQ ${summaryOf?.year ?? ''} AI Summary`} subtitle="Generated from the stored, processed PYQ chunks." size="lg"><div className="min-h-24 text-sm leading-7 text-text-secondary">{summary.isLoading ? 'Loading AI summary...' : summary.isError ? errorMessage(summary.error) : summary.data?.status === 'failed' ? summary.data.errorMessage || 'This PYQ could not be processed.' : summary.data?.summary || 'This PYQ is still processing. Try again shortly.'}</div></Modal>
  </PageShell>
}

function Metric({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-text-muted">{label}</p><p className="mt-1 text-lg font-semibold text-text-primary">{value}</p></div> }
