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

interface Entry { rank: number; enrollmentNo: string; name: string; batchCode: string; avgPct: number; isMe?: boolean }
type Subject = { id: string; code: string; name: string }
type Scope = 'year' | 'class'

export default function LeaderboardPage() {
  const [scope, setScope] = useState<Scope>('year')
  const [subjectId, setSubjectId] = useState('')
  const params = { limit: 20, scope, subjectId: subjectId || undefined }
  const list = useQuery({ queryKey: ['student', 'leaderboard', scope, subjectId], queryFn: () => studentApi.leaderboard(params) })
  const myRank = useQuery({ queryKey: ['student', 'my-rank', scope, subjectId], queryFn: () => studentApi.myRank({ scope, subjectId: subjectId || undefined }) })
  const subjects = useQuery({ queryKey: ['student', 'subjects'], queryFn: studentApi.subjects })

  const entries = ((list.data as { data?: Entry[]; leaderboard?: Entry[] })?.data ?? (list.data as { leaderboard?: Entry[] } | undefined)?.leaderboard ?? [])
  const me = myRank.data as { myRank?: number; rank?: number; myAvgPct?: number; avgPct?: number; batchCode?: string; totalStudents?: number } | undefined
  const subjectRows = Array.isArray(subjects.data)
    ? subjects.data as Subject[]
    : (subjects.data as { subjects?: Subject[] } | undefined)?.subjects ?? []
  const scopeLabel = scope === 'year' ? 'Year-wise' : 'Class-wise'

  return (
    <PageShell title="Leaderboard" subtitle={`${scopeLabel} ranking for ${subjectId ? 'the selected subject' : 'your average across all subjects'}`}>
      <Card className="mb-4">
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Ranking scope</div>
            <div className="flex flex-wrap gap-4 text-sm text-text-primary">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="leaderboard-scope" checked={scope === 'year'} onChange={() => setScope('year')} className="accent-primary" />
                Year-wise
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="leaderboard-scope" checked={scope === 'class'} onChange={() => setScope('class')} className="accent-primary" />
                Class-wise
              </label>
            </div>
          </div>
          <div className="w-full sm:w-72">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Subject</div>
            <Select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} options={[{ value: '', label: 'Average of all subjects' }, ...subjectRows.map((subject) => ({ value: subject.id, label: `${subject.code} - ${subject.name}` }))]} />
          </div>
        </CardBody>
      </Card>

      {me && (
        <Card className="mb-4 border-primary bg-primary-light/40 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white"><Trophy size={20} /></div>
            <div className="flex-1"><div className="text-xs font-semibold uppercase tracking-wide text-primary">Your {scopeLabel} Rank</div><div className="text-2xl font-bold text-text-primary">#{me.myRank ?? me.rank ?? '--'}</div></div>
            <div className="text-right"><div className="text-2xl font-bold text-primary">{Math.round(me.myAvgPct ?? me.avgPct ?? 0)}%</div><div className="text-xs text-text-muted">of {me.totalStudents ?? 0} students</div></div>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title={`${scopeLabel} Top Students`} subtitle={scope === 'year' ? 'Students in your current year and semester, ranked on the same subject set.' : 'Students in your class, ranked on the same subject set.'} />
        <CardBody className="pt-0">
          {list.isLoading ? <CardSkeleton height={200} /> : entries.length === 0 ? <EmptyState icon={<Trophy size={22} />} title="No leaderboard data yet" description="Published marks are needed before rankings can be calculated." className="border-0" /> : (
            <ul className="space-y-1">{entries.map((entry) => (
              <li key={entry.enrollmentNo} className={cn('flex items-center gap-3 rounded-sm px-3 py-2.5', entry.isMe && 'bg-primary-light')}>
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold', entry.rank === 1 && 'bg-warning text-white', entry.rank === 2 && 'bg-slate-300 text-slate-800', entry.rank === 3 && 'bg-orange-300 text-orange-900', entry.rank > 3 && 'bg-surface-2 text-text-secondary')}>{entry.rank}</div>
                <Avatar name={entry.name} size={34} />
                <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-semibold text-text-primary">{entry.name} {entry.isMe && <Badge tone="primary" className="ml-1">You</Badge>}</div><div className="text-xs text-text-muted">{entry.enrollmentNo} · {entry.batchCode}</div></div>
                <Badge tone={entry.rank <= 3 ? 'success' : 'neutral'}>{Math.round(entry.avgPct)}%</Badge>
              </li>
            ))}</ul>
          )}
        </CardBody>
      </Card>
    </PageShell>
  )
}
