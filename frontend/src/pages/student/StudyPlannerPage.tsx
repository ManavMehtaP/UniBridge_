import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Sparkles, Target } from 'lucide-react'
import { studentApi } from '@/api/student'
import { errorMessage } from '@/api/client'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'

type PlannerTask = {
  id: string
  date: string
  description: string
  estimatedDurationMinutes: number
  priority: string
  priorityLabel: string
  isCompleted: boolean
  subject?: { code: string; name: string } | null
}

export default function StudyPlannerPage() {
  const qc = useQueryClient()
  const planner = useQuery({
    queryKey: ['student', 'planner'],
    queryFn: studentApi.studyPlanner,
  })

  const generate = useMutation({
    mutationFn: () => studentApi.aiSuggest({ fromDate: '2026-07-17' }),
    onSuccess: async () => {
      toast.success('Planner generated from your weak subjects and PYQ trends')
      await qc.invalidateQueries({ queryKey: ['student', 'planner'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const toggle = useMutation({
    mutationFn: ({ date, index, isCompleted }: { date: string; index: number; isCompleted: boolean }) =>
      studentApi.toggleSession(date, index, isCompleted),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['student', 'planner'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const grouped = useMemo(() => {
    const tasks = ((planner.data as { plan?: { tasks?: PlannerTask[] } } | undefined)?.plan?.tasks ?? []) as PlannerTask[]
    const map = new Map<string, PlannerTask[]>()
    tasks.forEach((task) => {
      const items = map.get(task.date) ?? []
      items.push(task)
      map.set(task.date, items)
    })
    return [...map.entries()].map(([date, tasksForDay]) => ({ date, tasks: tasksForDay }))
  }, [planner.data])

  const weakTopics = ((planner.data as { plan?: { weakTopics?: string[] } } | undefined)?.plan?.weakTopics ?? []) as string[]
  const planMeta = (planner.data as { plan?: { startDate?: string; endDate?: string; status?: string; semester?: { label?: string } } } | undefined)?.plan

  return (
    <PageShell
      title="Study Planner"
      subtitle="Generated from your current weak subjects, PYQ signals, and upcoming exam window."
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
          description="Generate a study plan to create a checkbox schedule from Friday, July 17, 2026 to your exam period."
          action={<Button leftIcon={<Sparkles size={15} />} onClick={() => generate.mutate()} loading={generate.isPending}>Generate Now</Button>}
        />
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title={planMeta?.semester?.label ?? 'Current semester plan'}
              subtitle={planMeta?.startDate && planMeta?.endDate ? `Plan window: ${new Date(planMeta.startDate).toLocaleDateString('en-IN')} to ${new Date(planMeta.endDate).toLocaleDateString('en-IN')}` : 'Plan window unavailable'}
              action={<Badge tone={planMeta?.status === 'completed' ? 'success' : 'warning'}>{planMeta?.status ?? 'unknown'}</Badge>}
            />
            <CardBody className="space-y-3 pt-0">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Weak topics being tracked</div>
                <div className="flex flex-wrap gap-2">
                  {weakTopics.map((topic) => <Badge key={topic} tone="warning">{topic}</Badge>)}
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
                <CardBody className="pt-0 space-y-2">
                  {day.tasks.map((task, index) => (
                    <label key={task.id} className={`flex items-start gap-3 rounded-sm border border-border p-3 ${task.isCompleted ? 'bg-success-light/35' : 'bg-surface'}`}>
                      <input
                        type="checkbox"
                        checked={task.isCompleted}
                        onChange={(e) => toggle.mutate({ date: day.date, index, isCompleted: e.target.checked })}
                        className="mt-1 h-4 w-4 accent-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {task.subject && <Badge tone="primary">{task.subject.code}</Badge>}
                          <Badge tone={task.priority === 'high' ? 'danger' : task.priority === 'low' ? 'neutral' : 'warning'}>{task.priorityLabel}</Badge>
                          <span className="text-[11px] text-text-muted">{task.estimatedDurationMinutes} mins</span>
                        </div>
                        <div className="mt-2 text-sm leading-6 text-text-primary">{task.description}</div>
                        {task.subject?.name && <div className="mt-1 text-xs text-text-muted">{task.subject.name}</div>}
                      </div>
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
