import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AlertTriangle, Check, Copy, X } from 'lucide-react'
import { facultyApi } from '@/api/faculty'
import { errorMessage } from '@/api/client'
import { PageShell } from '@/components/shared/PageShell'
import { FilterBar } from '@/components/shared/FilterBar'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

// Keyed by slotId so paired lectures (TOC,TOC) don't share state.
type Marks = Record<string, Record<string, boolean>> // slotId -> enrollmentId -> present
type ProxyMap = Record<string, string> // slotId -> replacement subjectId

export default function FacultyAttendancePage() {
  const batches = useQuery({ queryKey: ['faculty', 'hod-batches'], queryFn: facultyApi.hodBatches })
  const [batchId, setBatchId] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [marks, setMarks] = useState<Marks>({})
  const [proxy, setProxy] = useState<ProxyMap>({})

  const day = useQuery({
    queryKey: ['faculty', 'att-day', batchId, date],
    queryFn: () => facultyApi.attendanceDay(batchId, date),
    enabled: !!batchId && !!date,
  })

  // Seed local marks from server on batch/date change (server keys by slotId).
  useEffect(() => {
    if (!day.data) return
    const seeded: Marks = {}
    day.data.lectures.forEach((lec) => { seeded[lec.slotId] = {} })
    Object.entries(day.data.marks).forEach(([k, v]) => {
      const [enrollmentId, slotId] = k.split(':')
      if (!seeded[slotId]) seeded[slotId] = {}
      seeded[slotId][enrollmentId] = v
    })
    setMarks(seeded)
    setProxy({})
  }, [day.data])

  const effectiveSubject = (slotId: string, defaultSubjectId: string) => proxy[slotId] ?? defaultSubjectId

  function toggle(slotId: string, enrollmentId: string) {
    setMarks((m) => ({ ...m, [slotId]: { ...(m[slotId] ?? {}), [enrollmentId]: !(m[slotId]?.[enrollmentId] ?? false) } }))
  }
  function markAllInLecture(slotId: string, value: boolean) {
    const entry: Record<string, boolean> = {}
    day.data?.students.forEach((s) => (entry[s.enrollmentId] = value))
    setMarks((m) => ({ ...m, [slotId]: entry }))
  }
  function copyFromLecture(sourceSlotId: string) {
    const source = marks[sourceSlotId] ?? {}
    if (Object.keys(source).length === 0) return toast.error('Mark this lecture first, then copy.')
    const next: Marks = { ...marks }
    day.data?.lectures.forEach((lec) => {
      if (lec.slotId === sourceSlotId) return
      next[lec.slotId] = { ...source }
    })
    setMarks(next)
    toast.success('Copied to all other lectures')
  }

  const stats = useMemo(() => {
    if (!day.data) return null
    let total = 0, present = 0
    day.data.lectures.forEach((lec) => {
      const cells = marks[lec.slotId] ?? {}
      day.data!.students.forEach((s) => {
        if (cells[s.enrollmentId] != null) total++
        if (cells[s.enrollmentId]) present++
      })
    })
    return { total, present, absent: total - present }
  }, [marks, day.data])

  const save = useMutation({
    mutationFn: () => facultyApi.attendanceDaySave({
      batchId, date,
      lectures: (day.data?.lectures ?? []).map((lec) => ({
        slotId: lec.slotId,
        subjectId: effectiveSubject(lec.slotId, lec.subjectId),
        marks: marks[lec.slotId] ?? {},
      })),
    }),
    onSuccess: (res: { inserted?: number; updated?: number }) => {
      toast.success(`Saved (${res.inserted ?? 0} new, ${res.updated ?? 0} updated)`)
      day.refetch()
      summary.refetch()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const summary = useQuery({ queryKey: ['faculty', 'att-summary'], queryFn: facultyApi.attendanceSummary })

  const batchOpts = batches.data?.data.map((b) => ({ value: b.id, label: `Batch ${b.code}` })) ?? []

  return (
    <PageShell title="Attendance" subtitle="Mark daily attendance by batch — lectures auto-fetched from the timetable">
      {summary.data && (
        <div className="mb-5 grid gap-4 lg:grid-cols-3">
          {/* Overall */}
          <Card>
            <CardHeader title="Overall" />
            <CardBody className="pt-0">
              <div className="text-3xl font-bold text-text-primary">{summary.data.overall.avgAttendancePct}%</div>
              <div className="mt-1 text-xs text-text-muted">{summary.data.overall.totalLectures} lectures conducted · {summary.data.semesterLabel}</div>
              {summary.data.weekly.length > 0 && (
                <div className="mt-3">
                  <div className="mb-1.5 text-[11px] font-semibold uppercase text-text-secondary">Weekly trend</div>
                  <div className="flex items-end gap-1" style={{ height: 44 }}>
                    {summary.data.weekly.map((w) => (
                      <div key={w.weekStart} className="flex-1" title={`${w.weekStart}: ${w.pct}% (${w.lectures} lec)`}>
                        <div className={cn('rounded-sm', w.pct >= 75 ? 'bg-success' : w.pct >= 60 ? 'bg-warning' : 'bg-danger')} style={{ height: Math.max(4, (w.pct / 100) * 40) }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
          {/* Subject-wise */}
          <Card className="lg:col-span-2">
            <CardHeader title="By subject & batch" />
            <CardBody className="pt-0">
              {summary.data.bySubjectAndBatch.length === 0 ? (
                <p className="text-xs text-text-muted">No lectures marked yet.</p>
              ) : (
                <div className="scrollbar-thin max-h-44 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-[11px] uppercase text-text-muted">
                      <th className="pb-1.5 font-semibold">Subject</th><th className="font-semibold">Batch</th><th className="font-semibold">Lectures</th><th className="font-semibold">Avg %</th><th className="font-semibold">Below 75%</th>
                    </tr></thead>
                    <tbody>
                      {summary.data.bySubjectAndBatch.map((r, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="py-1.5 font-medium">{r.subjectCode}</td>
                          <td>{r.batchCode}</td>
                          <td className="tabular-nums">{r.totalLecturesMarked}</td>
                          <td><Badge tone={r.avgAttendancePct >= 75 ? 'success' : r.avgAttendancePct >= 60 ? 'warning' : 'danger'}>{r.avgAttendancePct}%</Badge></td>
                          <td className="tabular-nums">{r.belowThresholdCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      <FilterBar>
        <Select className="w-52" value={batchId} onChange={(e) => setBatchId(e.target.value)} placeholder="Select batch" options={batchOpts} />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 rounded-sm border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
        {day.data && !day.data.isEditable && (
          <Badge tone="danger" dot>Read-only (over 7 days old)</Badge>
        )}
        {day.data?.daysDelta === 0 && <Badge tone="primary" dot>Today</Badge>}
      </FilterBar>

      {!batchId ? (
        <EmptyState title="Pick a batch" description="Choose a batch and date to load lectures." />
      ) : day.isLoading ? (
        <CardSkeleton height={400} />
      ) : day.data && day.data.lectures.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle size={22} />}
          title="No lectures scheduled"
          description="The HOD hasn't added lectures for this batch on this day. Add slots in HOD → Timetable."
        />
      ) : day.data ? (
        <Card>
          <CardHeader
            title={new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
            subtitle={stats ? `${day.data.lectures.length} lectures · ${day.data.students.length} students · ${stats.present}/${stats.total} present marked` : undefined}
            action={<Button onClick={() => save.mutate()} loading={save.isPending} disabled={!day.data.isEditable}>Save Attendance</Button>}
          />
          <CardBody className="pt-0">
            <div className="scrollbar-thin overflow-x-auto rounded-sm border border-border">
              <table className="min-w-full text-[13px]">
                <thead>
                  <tr className="bg-surface-2">
                    <th className="sticky left-0 z-10 border-r border-border bg-surface-2 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">Roll No.</th>
                    <th className="sticky left-[80px] z-10 border-r border-border bg-surface-2 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">Student</th>
                    {day.data.lectures.map((lec) => {
                      const swapped = proxy[lec.slotId] && proxy[lec.slotId] !== lec.subjectId
                      const effSub = day.data!.subjects.find((s) => s.id === effectiveSubject(lec.slotId, lec.subjectId))
                      return (
                        <th key={lec.slotId} className="min-w-[120px] border-r border-border-light px-2 py-2 text-center">
                          <div className="mb-1 text-[11px] font-semibold text-primary">{lec.slotStart}–{lec.slotEnd}</div>
                          <Select
                            className="mb-1 h-7 text-xs"
                            value={effectiveSubject(lec.slotId, lec.subjectId)}
                            onChange={(e) => setProxy((p) => ({ ...p, [lec.slotId]: e.target.value }))}
                            options={day.data!.subjects.map((s) => ({ value: s.id, label: s.code }))}
                          />
                          <div className="truncate text-[10px] text-text-muted">{effSub?.name ?? lec.subjectName}</div>
                          {swapped && <Badge tone="warning">Proxy</Badge>}
                          <div className="mt-1.5 flex justify-center gap-0.5">
                            <button onClick={() => markAllInLecture(lec.slotId, true)} title="All present" className="rounded-xs border border-border bg-surface px-1.5 text-[10px] font-semibold text-success hover:bg-success-light">All ✓</button>
                            <button onClick={() => markAllInLecture(lec.slotId, false)} title="All absent" className="rounded-xs border border-border bg-surface px-1.5 text-[10px] font-semibold text-danger hover:bg-danger-light">All ✗</button>
                            <button onClick={() => copyFromLecture(lec.slotId)} title="Copy to others" className="flex items-center rounded-xs border border-border bg-surface px-1.5 text-[10px] font-semibold text-primary hover:bg-primary-light"><Copy size={10} /></button>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {day.data.students.map((stu) => (
                    <tr key={stu.enrollmentId} className="border-t border-border-light hover:bg-surface-2">
                      <td className="sticky left-0 z-10 border-r border-border bg-surface px-3 py-1.5 font-mono text-xs text-text-secondary">{stu.rollNo}</td>
                      <td className="sticky left-[80px] z-10 border-r border-border bg-surface px-3 py-1.5 font-medium">{stu.name}</td>
                      {day.data!.lectures.map((lec) => {
                        const state = marks[lec.slotId]?.[stu.enrollmentId]
                        return (
                          <td key={lec.slotId} className="border-r border-border-light px-2 py-1.5 text-center">
                            <button
                              disabled={!day.data!.isEditable}
                              onClick={() => toggle(lec.slotId, stu.enrollmentId)}
                              className={cn(
                                'flex h-7 w-7 mx-auto items-center justify-center rounded-sm border transition',
                                state === true && 'bg-success border-success text-white',
                                state === false && 'bg-danger border-danger text-white',
                                state == null && 'border-border text-text-muted hover:bg-surface-2',
                                !day.data!.isEditable && 'cursor-not-allowed opacity-60',
                              )}
                              title={state === true ? 'Present — click to toggle' : state === false ? 'Absent — click to toggle' : 'Not marked'}
                            >
                              {state === true ? <Check size={14} /> : state === false ? <X size={14} /> : '—'}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </PageShell>
  )
}
