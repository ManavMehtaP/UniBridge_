import { create } from 'zustand'

// ponytail: which semester the HOD panel is viewing. null = Current (live) semester;
// a semesterId = read-only historical view of the students that HOD managed then.
interface HistoryStore {
  semesterId: string | null
  semesterLabel: string | null
  setSemester: (semesterId: string | null, semesterLabel: string | null) => void
}

export const useHistoryStore = create<HistoryStore>((set) => ({
  semesterId: null,
  semesterLabel: null,
  setSemester: (semesterId, semesterLabel) => set({ semesterId, semesterLabel }),
}))
