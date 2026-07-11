import type { YearLevel } from './common'

// ── Scope ──────────────────────────────────────────────
export interface HodScope {
  hod: { id: string; name: string; year?: string | null; employeeId?: string | null; sectionTag?: string | null }
  activeSemester: { id: string; label: string; number: number }
  batches: { id: string; code: string; yearLevel: YearLevel; studentCount: number }[]
  totalStudents: number
  totalFaculty: number
  needsOnboarding?: boolean
}

// ── Dashboard ──────────────────────────────────────────
export interface StatMetric {
  value: number
  deltaLabel: string
  trend: 'up' | 'down' | 'neutral'
}
export interface DashboardSummary {
  totalStudents: StatMetric
  totalFaculty: StatMetric
  activeBatches: StatMetric
  avgAttendance: StatMetric
  resultsUploadedPct: StatMetric
}
export interface AttendanceTrend {
  labels: string[]
  // Backend returns a `series` array; older docs showed a flat `data`. Support both.
  series?: { label: string; data: number[] }[]
  data?: number[]
}
export interface ResultsOverview {
  phases: { phase: string; avgMarksPct: number | null; status: string }[]
}
export interface AtRiskRow {
  enrollmentNo: string
  name: string
  batchCode: string
  attendancePct: number
  avgMarksPct: number
  status: string
}
export interface ActivityItem {
  id: string
  type: string
  icon?: string
  title: string
  description: string
  actorName?: string
  createdAt: string
}

// ── Students ───────────────────────────────────────────
// Backend returns flat shape: { enrollmentNo, name, branch, batchCode, rollNo, yearLevel, attendancePct, avgMarksPct, status }
export interface StudentRow {
  id?: string
  enrollmentNo: string
  name: string
  branch: string
  batchCode?: string | null
  rollNo?: string | null
  yearLevel?: string
  attendancePct?: number | null
  avgMarksPct?: number | null
  status: 'ACTIVE' | 'AT_RISK' | 'INACTIVE'
  graduationStatus?: 'ACTIVE' | 'PASS_OUT' | 'DETAINED'
}
export interface StudentDetail {
  enrollmentNo: string
  name: string
  email: string
  phone?: string
  branch: string
  admissionYear?: number
  status: string
  currentEnrollment?: {
    batchCode: string
    semesterLabel: string
    yearLevel: YearLevel
    rollNo: string
    attendancePct: number
  } | null
}
export interface StudentJourney {
  enrollmentNo: string
  journey: {
    semesterNumber: number
    yearLevel: YearLevel
    batchCode: string
    rollNo: string
    academicYear: string
  }[]
}
export interface CsvResult {
  inserted?: number
  created?: number
  updated?: number
  assigned?: number
  mapped?: number
  totalRows?: number
  errors?: { row: number; enrollmentNo?: string; reason: string }[]
}

// ── Faculty ────────────────────────────────────────────
// Backend returns: { id, employeeId, name, email, year, isHod, mentorCode, isActive, assignedBatches, assignedSubjects, menteeCount }
export interface FacultyRow {
  id: string
  employeeId: string
  name: string
  email?: string
  year: string
  yearLevel?: string | null
  yearLevels?: string[]
  isHod: boolean
  mentorCode?: string | null
  isActive?: boolean
  assignedSubjects?: number
  assignedBatches?: number
  subjectCount?: number
  menteeCount?: number
  status?: 'ACTIVE' | 'INACTIVE'
}
export interface FacultyDetail {
  employeeId: string
  name: string
  email: string
  phone?: string
  year: string
  isHod: boolean
  mentorCode?: string | null
  menteeCount?: number
  subjects: { code: string; name: string; batches: string[] }[]
  status: string
}

// ── Subjects ───────────────────────────────────────────
export interface SubjectRow {
  id: string
  code: string
  name: string
  credits: number
  type: string
  assignedFaculty?: { id: string; name: string } | null
  faculty?: { id: string; name: string }[]
  assignments?: { id: string; facultyId: string; facultyName: string; batchId: string; batchCode: string }[]
  batches: string[]
  pyqUploaded?: boolean
}
export interface SubjectsResponse {
  data: SubjectRow[]
  summary: {
    totalSubjects: number
    totalCredits: number
    assignedCount: number
    unassignedCount: number
  }
}

// ── Attendance ─────────────────────────────────────────
export interface AttendanceStatSummary {
  overallAvgPct: number
  deltaLabel: string
  belowThresholdCount: number
  totalLectures: number
  lockedRecordsPct: number
}
export interface AttendanceTableRow {
  enrollmentNo: string
  name: string
  perSubject: Record<string, number>
  avgPct: number
  status: string
  isLocked: boolean
}

// ── Mentorship ─────────────────────────────────────────
export interface MentorshipSummary {
  activeMentors: number
  studentsAssigned: number
  unassignedStudents: number
  avgMenteesPerMentor: number
}
export interface MentorCard {
  facultyId: string
  name: string
  year: string
  mentorCode?: string | null
  menteeCount: number
  mentees: { enrollmentNo: string; name: string }[]
}
export interface AssignmentRow {
  enrollmentNo: string
  studentName: string
  batchCode: string
  mentorName: string
  mentorCode?: string | null
  assignmentId?: string
}

// ── Analytics ──────────────────────────────────────────
export interface AnalyticsKpi {
  avgAttendance: { value: number; deltaLabel: string }
  avgMarksLatestPhase: { value: number; phaseLabel: string; deltaLabel: string }
  atRiskCount: { value: number; deltaLabel: string }
  passRateLatestPhase: { value: number; phaseLabel: string; deltaLabel: string }
  topScorer: { name: string; avgPct: number }
}

// ── Calendar ───────────────────────────────────────────
export interface HodCalendarEvent {
  id: string
  date: string
  startDate?: string
  endDate?: string
  title: string
  type: 'HOLIDAY' | 'READING_HOLIDAY' | 'EXAM' | 'CULTURAL' | 'PHASE' | 'OTHER'
  description?: string
}
export interface PhaseTimelineItem {
  label: string
  startDate: string
  endDate: string
  examDate?: string
  isComplete: boolean
}

// ── Settings ───────────────────────────────────────────
export interface HodProfile {
  employeeId: string
  name: string
  email: string
  phone?: string
  year: string
  profilePhotoUrl?: string | null
}
export interface AcademicYearWithSemesters {
  id: string
  label: string
  status: string
  semesters: { id: string; number: number; label: string; status: string }[]
}
export interface NotificationPref {
  key: string
  label: string
  enabled: boolean
}

export interface HodTimetableSlot {
  id: string
  dayOfWeek: number
  slotStart: string
  slotEnd: string
  room?: string | null
  batchId: string
  batchCode: string
  subjectId: string
  subjectCode: string
  subjectName: string
  facultyId?: string | null
  facultyName?: string | null
}
