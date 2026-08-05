import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Info, MapPin } from 'lucide-react'
import { studentApi } from '@/api/student'
import { fmtTime } from '@/lib/schedule'
import { cn } from '@/lib/utils'
import { PageShell } from '@/components/shared/PageShell'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'

type Slot = {
  id: string; dayOfWeek?: number; slotStart: string; slotEnd: string
  subject?: { code?: string; name?: string }; subjectCode?: string; subjectName?: string
  faculty?: { name?: string }; facultyName?: string; room?: string
}

const DAYS = [{ dow: 1, name: 'Mon' }, { dow: 2, name: 'Tue' }, { dow: 3, name: 'Wed' }, { dow: 4, name: 'Thu' }, { dow: 5, name: 'Fri' }, { dow: 6, name: 'Sat' }]

// Full Tailwind scales (not overridden in config) — one accent colour per subject.
type Palette = { border: string; bg: string; code: string }
const BASE: Palette[] = [
  { border: 'border-l-blue-500', bg: 'bg-blue-50', code: 'text-blue-700' },
  { border: 'border-l-green-500', bg: 'bg-green-50', code: 'text-green-700' },
  { border: 'border-l-violet-500', bg: 'bg-violet-50', code: 'text-violet-700' },
  { border: 'border-l-amber-500', bg: 'bg-amber-50', code: 'text-amber-700' },
  { border: 'border-l-cyan-500', bg: 'bg-cyan-50', code: 'text-cyan-700' },
  { border: 'border-l-rose-500', bg: 'bg-rose-50', code: 'text-rose-700' },
]

const code = (s: Slot) => s.subject?.code ?? s.subjectCode ?? '—'
const name = (s: Slot) => s.subject?.name ?? s.subjectName ?? ''
const facultyName = (s: Slot) => s.faculty?.name ?? s.facultyName ?? ''

export default function TimetablePage() {
  const timetable = useQuery({ queryKey: ['student', 'timetable'], queryFn: studentApi.timetable })
  const slots = (timetable.data as { slots?: Slot[] })?.slots ?? []
  const semesterLabel = (timetable.data as { semesterLabel?: string })?.semesterLabel

  // Distinct time rows (sorted), a stable colour per subject, and a cell lookup.
  const { timeRows, colorBySubject, slotAt } = useMemo(() => {
    const rowKeys = [...new Set(slots.map((s) => `${s.slotStart}|${s.slotEnd}`))]
      .sort((a, b) => a.localeCompare(b))
      .map((key) => { const [start, end] = key.split('|'); return { key, start, end } })

    const colors = new Map<string, Palette>()
    let i = 0
    for (const s of slots) { const c = code(s); if (!colors.has(c)) colors.set(c, BASE[i++ % BASE.length]) }

    const cell = (dow: number, key: string) => slots.find((s) => s.dayOfWeek === dow && `${s.slotStart}|${s.slotEnd}` === key)
    return { timeRows: rowKeys, colorBySubject: colors, slotAt: cell }
  }, [slots])

  const cols = `88px repeat(6, minmax(140px, 1fr))`

  return (
    <PageShell title="Timetable" subtitle={semesterLabel ? `Weekly class schedule · ${semesterLabel}` : 'Your weekly class schedule'}>
      {timetable.isLoading ? (
        <CardSkeleton height={420} />
      ) : slots.length === 0 ? (
        <Card><EmptyState title="No timetable yet" description="Your department's timetable will appear here once the HOD uploads it." className="border-0" /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="scrollbar-thin overflow-x-auto">
            <div className="min-w-[920px]">
              {/* header row */}
              <div className="grid" style={{ gridTemplateColumns: cols }}>
                <div className="border-b border-r border-border bg-surface-2 px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Time</div>
                {DAYS.map((d) => (
                  <div key={d.dow} className="border-b border-border bg-surface-2 px-3 py-3 text-center text-sm font-bold text-text-primary">{d.name}</div>
                ))}
              </div>
              {/* time rows */}
              {timeRows.map((t) => (
                <div key={t.key} className="grid" style={{ gridTemplateColumns: cols }}>
                  <div className="flex flex-col justify-center border-b border-r border-border bg-surface-2 px-3 py-4 text-center">
                    <div className="text-[11px] font-semibold text-text-primary">{fmtTime(t.start)}</div>
                    <div className="text-[10px] text-text-muted">{fmtTime(t.end)}</div>
                  </div>
                  {DAYS.map((d) => {
                    const s = slotAt(d.dow, t.key)
                    if (!s) return <div key={d.dow} className="border-b border-l border-border-light" />
                    const c = colorBySubject.get(code(s)) ?? BASE[0]
                    return (
                      <div key={d.dow} className={cn('m-1 rounded-sm border border-border-light border-l-4 p-2', c.border, c.bg)}>
                        <div className={cn('text-[13px] font-bold', c.code)}>{code(s)}</div>
                        <div className="truncate text-[11px] font-medium text-text-secondary">{name(s)}</div>
                        {facultyName(s) && <div className="truncate text-[11px] text-text-muted">{facultyName(s)}</div>}
                        {s.room && <div className="mt-1 flex items-center gap-1 text-[10px] text-text-muted"><MapPin size={10} /> {s.room}</div>}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-xs text-text-muted">
        <span className="flex items-center gap-1.5"><Info size={13} /> Set by your department. Timetable is subject to change.</span>
        <span>Recurring weekly schedule</span>
      </div>
    </PageShell>
  )
}
