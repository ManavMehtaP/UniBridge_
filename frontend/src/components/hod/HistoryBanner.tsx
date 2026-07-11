import { History } from 'lucide-react'
import { useHistoryStore } from '@/stores/historyStore'

// Shown at the top of any HOD page while a past semester is selected. Signals read-only history.
export function HistoryBanner() {
  const { semesterId, semesterLabel } = useHistoryStore()
  if (!semesterId) return null
  return (
    <div className="mb-4 flex items-center gap-2 rounded-sm border border-warning/30 bg-warning-light/30 px-3 py-2 text-xs font-medium text-warning">
      <History size={14} className="shrink-0" />
      Viewing <b>{semesterLabel ?? 'a past semester'}</b> — read-only history. Switch to <b>Current Semester</b> in the sidebar to make changes.
    </div>
  )
}
