import { create } from 'zustand'

export const useFacultyHistoryStore = create<{ semesterId: string | null; semesterLabel: string | null; setSemester: (id: string | null, label: string | null) => void }>((set) => ({
  semesterId: null,
  semesterLabel: null,
  setSemester: (semesterId, semesterLabel) => set({ semesterId, semesterLabel }),
}))
