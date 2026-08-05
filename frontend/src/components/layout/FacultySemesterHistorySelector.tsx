import { useQuery } from '@tanstack/react-query'
import { History } from 'lucide-react'
import { facultyApi } from '@/api/faculty'
import { useFacultyHistoryStore } from '@/stores/facultyHistoryStore'
import { Select } from '@/components/ui/Select'

export function FacultySemesterHistorySelector() {
  const query = useQuery({ queryKey: ['faculty', 'history-semesters'], queryFn: facultyApi.historySemesters })
  const { semesterId, setSemester } = useFacultyHistoryStore()
  const semesters = query.data?.data ?? []
  if (semesters.length <= 1) return null
  return <div className="border-b border-border px-3 py-2">
    <label className="mb-1 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted"><History size={11} /> Teaching history</label>
    <Select value={semesterId ?? '__current__'} onChange={(event) => {
      if (event.target.value === '__current__') return setSemester(null, null)
      const semester = semesters.find((item) => item.semesterId === event.target.value)
      setSemester(event.target.value, semester ? `${semester.label} · ${semester.academicYear}` : null)
    }}>
      <option value="__current__">Current semester</option>
      {semesters.map((semester) => <option key={semester.semesterId} value={semester.semesterId} disabled={semester.isCurrent}>{semester.label} · {semester.academicYear}{semester.isCurrent ? ' — current' : ''}</option>)}
    </Select>
  </div>
}
