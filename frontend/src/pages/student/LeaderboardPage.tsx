import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trophy } from 'lucide-react'
import { studentApi } from '@/api/student'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { Select } from '@/components/ui/Select'
import { cn } from '@/lib/utils'

const YEAR_LABEL: Record<string, string> = { FY: '1st Year', SY: '2nd Year', TY: '3rd Year', FINAL: 'Final Year' }
const PHASES = ['T1', 'T2', 'T3', 'T4']
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

export default function LeaderboardPage() {
  const [scope, setScope] = useState<'batch' | 'year'>('batch')
  const [phases, setPhases] = useState<string[]>([...PHASES])
  const [subjectId, setSubjectId] = useState('')
  const board = useQuery({ queryKey: ['student', 'leaderboard', scope, phases, subjectId], queryFn: () => studentApi.leaderboard({ scope, phases, subjectId: subjectId || undefined }) })
  const subjectsQ = useQuery({ queryKey: ['student', 'subjects'], queryFn: studentApi.subjects })
  const subjectRows = (Array.isArray(subjectsQ.data) ? subjectsQ.data : (subjectsQ.data as { subjects?: { id: string; code: string; name: string }[] } | undefined)?.subjects ?? []) as { id: string; code: string; name: string }[]
  const d = board.data
  const entries = d?.leaderboard ?? []
  const yearName = d?.yearLevel ? (YEAR_LABEL[d.yearLevel] ?? d.yearLevel) : 'Year'
  const togglePhase = (p: string) => setPhases((cur) => cur.includes(p) ? (cur.length === 1 ? cur : cur.filter((x) => x !== p)) : [...PHASES].filter((x) => cur.includes(x) || x === p))

  const tabs: { key: 'batch' | 'year'; label: string }[] = [
    { key: 'batch', label: d?.batchCode ? `My Section · ${d.batchCode}` : 'My Section' },
    { key: 'year', label: `Whole ${yearName}` },
  ]

  return (
    <PageShell title="Leaderboard" subtitle="Ranked by total marks — filter by exam phase and subject">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-md border border-border bg-surface-2 p-1">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setScope(t.key)}
              className={cn('rounded-sm px-4 py-1.5 text-sm font-medium transition-colors',
                scope === t.key ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary')}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="inline-flex gap-1.5">
          {PHASES.map((p) => (
            <button key={p} onClick={() => togglePhase(p)}
              className={cn('rounded-sm border px-3 py-1.5 text-sm font-semibold transition-colors',
                phases.includes(p) ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text-secondary hover:border-primary hover:text-primary')}>
              {p}
            </button>
          ))}
        </div>
        <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-56"
          options={[{ value: '', label: 'All subjects' }, ...subjectRows.map((s) => ({ value: s.id, label: `${s.code} — ${s.name}` }))]} />
      </div>

      {d && (
        <Card className="mb-4 border-primary bg-primary-light/40 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white"><Trophy size={20} /></div>
            <div className="flex-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-primary">Your Rank {scope === 'batch' ? `in ${d.batchCode}` : `in ${yearName}`}</div>
              <div className="text-2xl font-bold text-text-primary">#{d.myRank} <span className="text-sm font-medium text-text-muted">of {d.totalStudents}</span></div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{fmt(d.myTotal)}<span className="text-sm text-text-muted"> / {fmt(d.myMax)}</span></div>
              <div className="text-xs text-text-muted">total marks</div>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title={scope === 'batch' ? `Top in ${d?.batchCode ?? 'your section'}` : `Top in ${yearName}`}
          subtitle={`${phases.length === PHASES.length ? 'All exams' : phases.join(', ')} · ${subjectId ? (subjectRows.find((s) => s.id === subjectId)?.code ?? 'subject') : 'all subjects'}`} />
        <CardBody className="pt-0">
          {board.isLoading ? <CardSkeleton height={240} /> : entries.length === 0 ? (
            <EmptyState icon={<Trophy size={22} />} title="No results published yet" description="The leaderboard appears once exam marks are published." className="border-0" />
          ) : (
            <ul className="space-y-1">
              {entries.map((e) => (
                <li key={e.enrollmentNo} className={cn('flex items-center gap-3 rounded-sm px-3 py-2.5', e.isMe && 'bg-primary-light')}>
                  <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                    e.rank === 1 && 'bg-warning text-white',
                    e.rank === 2 && 'bg-slate-300 text-slate-800',
                    e.rank === 3 && 'bg-orange-300 text-orange-900',
                    e.rank > 3 && 'bg-surface-2 text-text-secondary',
                  )}>{e.rank}</div>
                  <Avatar name={e.name} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-text-primary">{e.name} {e.isMe && <Badge tone="primary" className="ml-1">You</Badge>}</div>
                    <div className="text-xs text-text-muted">{e.enrollmentNo}{scope === 'year' ? ` · ${e.batchCode}` : ''}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-text-primary">{fmt(e.totalMarks)}</div>
                    <div className="text-[11px] text-text-muted">/ {fmt(e.maxMarks)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </PageShell>
  )
}
