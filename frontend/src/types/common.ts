export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type YearLevel = 'FY' | 'SY' | 'TY' | 'FINAL'

export interface Batch {
  id: string
  code: string
  yearLevel: YearLevel
  studentCount?: number
}

export interface Subject {
  id: string
  code: string
  name: string
  credits?: number
  type?: 'THEORY' | 'PRACTICAL' | 'LAB' | 'TUTORIAL'
}

export interface Phase {
  id: string
  label: string
  number: number
  examDate?: string
  isComplete: boolean
}

export interface Semester {
  id: string
  label: string
  number: number
  yearLevel?: YearLevel
  status?: 'UPCOMING' | 'ACTIVE' | 'COMPLETE'
}

export interface AcademicYear {
  id: string
  label: string
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
}

export interface Announcement {
  id: string
  title: string
  body: string
  senderName: string
  senderRole: 'HOD' | 'FACULTY'
  scope: 'ALL' | 'BATCH' | 'YEAR_LEVEL'
  scopeLabel?: string
  isRead: boolean
  createdAt: string
}

export interface CalendarEvent {
  id: string
  date: string
  title: string
  type: 'REGULAR_TEACHING' | 'HOLIDAY' | 'EXAM' | 'CULTURAL' | 'PHASE' | 'OTHER'
  description?: string
}

export interface ChatMessage {
  id: string
  senderRole: 'FACULTY' | 'STUDENT'
  senderName: string
  content: string
  isRead: boolean
  sentAt: string
}

export interface AttendanceSummary {
  subjectId: string
  subjectCode: string
  subjectName: string
  totalLectures: number
  attended: number
  percentage: number
  status: 'OK' | 'WARNING' | 'AT_RISK'
  isBelowThreshold: boolean
}

/** Standard error envelope returned by the backend error handler. */
export interface ApiError {
  error: {
    code: string
    message: string
    details?: Array<{ field: string; issue: string }>
    requestId?: string
  }
}
