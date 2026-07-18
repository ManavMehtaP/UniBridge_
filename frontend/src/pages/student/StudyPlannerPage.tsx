import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Sparkles, Target, Trash2 } from 'lucide-react'
import { studentApi } from '@/api/student'
import { errorMessage } from '@/api/client'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

type PlannerTask = {
  id: string
  date: string
  description: string
  estimatedDurationMinutes: number
  priority: string
  priorityLabel: string
  isCompleted: boolean
  isCustom?: boolean
  subject?: { id: string; code: string; name: string } | null
}

type PlannerData = {
  plan?: {
    id: string
    startDate?: string
    endDate?: string
    status?: string
    weakTopics?: string[]
    progress?: { completedTasks: number; totalTasks: number; percent: number }
    semester?: { label?: string }
    tasks?: PlannerTask[]
  } | null
}

type SubjectOption = { id: string; code: string; name: string }

const TODAY = '2026-07-18'

export default function StudyPlannerPage() {
  const qc = useQueryClient()
  const [draft, setDraft] = useState({
    date: TODAY,
    subjectId: '',
    description: '',
    estimatedDurationMinutes: '30',
    priority: 'medium',
  })

  const planner = useQuery({
    queryKey: ['student', 'planner'],
    queryFn: studentApi.studyPlanner,
  })
  const subjects = useQuery({
    queryKey: ['student', 'subjects'],
    queryFn: studentApi.subjects,
  })

  const generate = useMutation({
    mutationFn: () => studentApi.aiSuggest({ fromDate: TODAY }),
    onSuccess: async () => {
      toast.success('Planner regenerated from marks, PYQ signals, and current syllabus')
      await qc.invalidateQueries({ queryKey: ['student', 'planner'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const toggle = useMutation({
    mutationFn: ({ taskId, isCompleted }: { taskId: string; isCompleted: boolean }) =>
      studentApi.toggleSession(taskId, isCompleted),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['student', 'planner'] })
      await qc.invalidateQueries({ queryKey: ['student', 'ai-conv'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const addTask = useMutation({
    mutationFn: () =>
      studentApi.addStudyPlannerTask({
        date: draft.date,
        subjectId: draft.subjectId || null,
        description: draft.description.trim(),
        estimatedDurationMinutes: Number(draft.estimatedDurationMinutes),
        priority: draft.priority,
      }),
    onSuccess: async () => {
      toast.success('Work item added to your planner')
      setDraft((current) => ({ ...current, description: '', estimatedDurationMinutes: '30' }))
      await qc.invalidateQueries({ queryKey: ['student', 'planner'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const removeTask = useMutation({
    mutationFn: (taskId: string) => studentApi.deleteStudyPlannerTask(taskId),
    onSuccess: async () => {
      toast.success('Custom work removed')
      await qc.invalidateQueries({ queryKey: ['student', 'planner'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const subjectOptions: SubjectOption[] = (subjects.data as { subjects?: SubjectOption[] } | undefined)?.subjects ?? []
  const plan = (planner.data as PlannerData | undefined)?.plan
  const weakTopics = plan?.weakTopics ?? []

  const grouped = useMemo(() => {
    const tasks = (plan?.tasks ?? []) as PlannerTask[]
    const map = new Map<string, PlannerTask[]>()
    tasks.forEach((task) => {
      const items = map.get(task.date) ?? []
      items.push(task)
      map.set(task.date, items)
    })
    return [...map.entries()].map(([date, tasksForDay]) => ({ date, tasks: tasksForDay }))
  }, [plan?.tasks])

  const canAddTask = draft.description.trim().length > 0 && Number(draft.estimatedDurationMinutes) >= 5

  return (
    <PageShell
      title="Study Planner"
      subtitle="Generated from your weak subjects, current phase syllabus, PYQ signals, and exam window."
      action={
        <div className="flex gap-2">
          <Button variant="outline" leftIcon={<Sparkles size={15} />} onClick={() => generate.mutate()} loading={generate.isPending}>
            Generate AI Plan
          </Button>
        </div>
      }
    >
      {planner.isLoading ? (
        <CardSkeleton height={240} />
      ) : !grouped.length ? (
        <EmptyState
          icon={<Target size={22} />}
          title="No generated plan yet"
          description="Generate a study plan to create a checkbox schedule from Saturday, July 18, 2026 to your exam period."
          action={<Button leftIcon={<Sparkles size={15} />} onClick={() => generate.mutate()} loading={generate.isPending}>Generate Now</Button>}
        />
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title={plan?.semester?.label ?? 'Current semester plan'}
              subtitle={plan?.startDate && plan?.endDate ? `Plan window: ${new Date(plan.startDate).toLocaleDateString('en-IN')} to ${new Date(plan.endDate).toLocaleDateString('en-IN')}` : 'Plan window unavailable'}
              action={<Badge tone={plan?.status === 'completed' ? 'success' : 'warning'}>{plan?.status ?? 'unknown'}</Badge>}
            />
            <CardBody className="space-y-4 pt-0">
              <div className="rounded-card bg-surface-2 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Progress</div>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div>
                    <div className="text-2xl font-semibold text-text-primary">{plan?.progress?.percent ?? 0}%</div>
                    <div className="text-xs text-text-muted">
                      {plan?.progress?.completedTasks ?? 0}/{plan?.progress?.totalTasks ?? 0} tasks completed
                    </div>
                  </div>
                  <div className="h-2 w-40 overflow-hidden rounded-full bg-border-light">
                    <div className="h-full rounded-full bg-success" style={{ width: `${plan?.progress?.percent ?? 0}%` }} />
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Weak topics being tracked</div>
                <div className="flex flex-wrap gap-2">
                  {weakTopics.map((topic) => <Badge key={topic} tone="warning">{topic}</Badge>)}
                </div>
              </div>

              <div className="rounded-card border border-border p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <Plus size={16} />
                  Add Work
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <Input type="date" value={draft.date} onChange={(e) => setDraft((current) => ({ ...current, date: e.target.value }))} />
                  <Select
                    value={draft.subjectId}
                    onChange={(e) => setDraft((current) => ({ ...current, subjectId: e.target.value }))}
                    options={subjectOptions.map((subject) => ({ value: subject.id, label: `${subject.code} - ${subject.name}` }))}
                    placeholder="General work"
                  />
                  <Input
                    value={draft.description}
                    onChange={(e) => setDraft((current) => ({ ...current, description: e.target.value }))}
                    placeholder="Add extra revision, assignment, or practice work"
                    className="xl:col-span-2"
                  />
                  <div className="flex gap-3">
                    <Input
                      type="number"
                      min={5}
                      max={180}
                      value={draft.estimatedDurationMinutes}
                      onChange={(e) => setDraft((current) => ({ ...current, estimatedDurationMinutes: e.target.value }))}
                      placeholder="Minutes"
                    />
                    <Select
                      value={draft.priority}
                      onChange={(e) => setDraft((current) => ({ ...current, priority: e.target.value }))}
                      options={[
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' },
                      ]}
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button leftIcon={<Plus size={15} />} onClick={() => addTask.mutate()} loading={addTask.isPending} disabled={!canAddTask}>
                    Add Work
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          {grouped.map((day) => {
            const done = day.tasks.filter((task) => task.isCompleted).length
            return (
              <Card key={day.date}>
                <CardHeader
                  title={new Date(day.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                  subtitle={`${done}/${day.tasks.length} tasks completed`}
                />
                <CardBody className="space-y-2 pt-0">
                  {day.tasks.map((task) => (
                    <label key={task.id} className={`flex items-start gap-3 rounded-sm border border-border p-3 ${task.isCompleted ? 'bg-success-light/35' : 'bg-surface'}`}>
                      <input
                        type="checkbox"
                        checked={task.isCompleted}
                        onChange={(e) => toggle.mutate({ taskId: task.id, isCompleted: e.target.checked })}
                        className="mt-1 h-4 w-4 shrink-0 accent-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {task.subject && <Badge tone="primary">{task.subject.code}</Badge>}
                          <Badge tone={task.priority === 'high' ? 'danger' : task.priority === 'low' ? 'neutral' : 'warning'}>{task.priorityLabel}</Badge>
                          {task.isCustom && <Badge tone="neutral">Custom</Badge>}
                          <span className="text-[11px] text-text-muted">{task.estimatedDurationMinutes} mins</span>
                        </div>
                        <div className="mt-2 text-sm leading-6 text-text-primary">{task.description}</div>
                        {task.subject?.name && <div className="mt-1 text-xs text-text-muted">{task.subject.name}</div>}
                      </div>
                      {task.isCustom && (
                        <button
                          type="button"
                          onClick={() => removeTask.mutate(task.id)}
                          className="mt-1 shrink-0 text-text-muted transition hover:text-danger"
                          aria-label="Delete custom task"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </label>
                  ))}
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}
