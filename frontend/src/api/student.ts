import { api } from './client'
import type * as T from '@/types/student'

type Params = Record<string, string | number | boolean | undefined>

export const studentApi = {
  dashboard: () => api.get<T.StudentDashboard>('/student/dashboard').then((r) => r.data),
  profile: () => api.get('/student/profile').then((r) => r.data),
  updateProfile: (body: Record<string, unknown>) => api.patch('/student/profile', body).then((r) => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch('/student/profile/password', { currentPassword, newPassword }).then((r) => r.data),
  sessions: () => api.get('/student/sessions').then((r) => r.data),
  revokeSession: (id: string) => api.delete(`/student/sessions/${id}`).then((r) => r.data),

  currentEnrollment: () => api.get('/student/enrollment/current').then((r) => r.data),
  enrollmentHistory: () => api.get('/student/enrollment/history').then((r) => r.data),
  subjects: () => api.get('/student/subjects').then((r) => r.data),

  timetableToday: () => api.get('/student/timetable/today').then((r) => r.data),
  timetable: () => api.get('/student/timetable').then((r) => r.data),

  results: (params?: Params) => api.get('/student/results', { params }).then((r) => r.data),
  resultsSummary: () => api.get('/student/results/summary').then((r) => r.data),
  phaseProgress: () => api.get('/student/results/phase-progress').then((r) => r.data),

  attendance: (semesterId?: string) =>
    api.get<{ subjects: T.AttendancePerSubject[] }>('/student/attendance', { params: { semesterId } }).then((r) => r.data),
  attendanceHistory: () => api.get('/student/attendance/history').then((r) => r.data),
  attendanceLog: (subjectId: string) => api.get(`/student/attendance/${subjectId}/log`).then((r) => r.data),

  notes: (params?: Params) => api.get<T.PaginatedNotes>('/student/notes', { params }).then((r) => r.data),
  note: (id: string) => api.get(`/student/notes/${id}`).then((r) => r.data),
  noteFlashcards: (id: string) => api.get(`/student/notes/${id}/flashcards`).then((r) => r.data),
  noteDownloadUrl: (id: string) => `${api.defaults.baseURL}/student/notes/${id}/download`,
  // Returns a short-lived presigned URL (auth header is carried by axios; a plain <a> can't).
  noteDownload: (id: string) => api.get<{ downloadUrl: string }>(`/student/notes/${id}/download`).then((r) => r.data),

  selfNotes: () => api.get<{ data: T.SelfNote[] }>('/student/self-notes').then((r) => r.data),
  createSelfNote: (body: Record<string, unknown>) => api.post('/student/self-notes', body).then((r) => r.data),
  updateSelfNote: (id: string, body: Record<string, unknown>) =>
    api.put(`/student/self-notes/${id}`, body).then((r) => r.data),
  deleteSelfNote: (id: string) => api.delete(`/student/self-notes/${id}`).then((r) => r.data),

  quizzes: (params?: Params) => api.get<T.PaginatedQuizzes>('/student/quizzes', { params }).then((r) => r.data),
  quiz: (id: string) => api.get(`/student/quizzes/${id}`).then((r) => r.data),
  quizHistory: () => api.get('/student/quizzes/history').then((r) => r.data),
  quizResult: (id: string) => api.get(`/student/quizzes/${id}/result`).then((r) => r.data),
  startQuiz: (id: string) => api.post(`/student/quizzes/${id}/start`).then((r) => r.data),
  submitQuiz: (id: string, answers: unknown) =>
    api.post(`/student/quizzes/${id}/submit`, { answers }).then((r) => r.data),

  announcements: (params?: Params) =>
    api.get<T.PaginatedAnnouncements>('/student/announcements', { params }).then((r) => r.data),
  announcementUnreadCount: () => api.get<{ count: number }>('/student/announcements/unread-count').then((r) => r.data),
  markAnnouncementRead: (id: string) => api.patch(`/student/announcements/${id}/read`).then((r) => r.data),
  markAllAnnouncementsRead: () => api.patch('/student/announcements/mark-all-read').then((r) => r.data),

  calendarEvents: (params: Params) => api.get('/student/calendar/events', { params }).then((r) => r.data),
  upcomingEvents: (limit = 6) =>
    api.get('/student/calendar/events/upcoming', { params: { limit } }).then((r) => r.data),
  phaseTimeline: () => api.get('/student/calendar/phase-timeline').then((r) => r.data),

  mentor: () => api.get('/student/mentor').then((r) => r.data),
  mentorMessages: (params?: Params) =>
    api.get<{ data: T.StudentChatMsg[] }>('/student/mentor/messages', { params }).then((r) => r.data),
  sendMentorMessage: (content: string) =>
    api.post('/student/mentor/messages', { content }).then((r) => r.data),
  mentorUnreadCount: () => api.get('/student/mentor/messages/unread-count').then((r) => r.data),
  markMentorRead: () => api.patch('/student/mentor/messages/mark-read').then((r) => r.data),

  aiConversations: () => api.get<{ data: T.AIConversation[] }>('/student/ai/conversations').then((r) => r.data),
  createAiConversation: (title: string) => api.post('/student/ai/conversations', { title }).then((r) => r.data),
  aiConversation: (id: string) => api.get<{ messages: T.AIMessage[] }>(`/student/ai/conversations/${id}`).then((r) => r.data),
  sendAiMessage: (id: string, content: string) =>
    api.post(`/student/ai/conversations/${id}/message`, { content }).then((r) => r.data),
  deleteAiConversation: (id: string) => api.delete(`/student/ai/conversations/${id}`).then((r) => r.data),
  pyqAnalysis: (subjectId: string) => api.get(`/student/ai/pyq-analysis/${subjectId}`).then((r) => r.data),
  smartNoteSummary: (noteId: string) => api.get(`/student/ai/smart-notes/${noteId}/summary`).then((r) => r.data),

  studyPlanner: () => api.get('/student/study-planner').then((r) => r.data),
  saveStudyPlanner: (plan: unknown[]) => api.put('/student/study-planner', { plan }).then((r) => r.data),
  toggleSession: (date: string, sessionIndex: number, isCompleted: boolean) =>
    api.patch('/student/study-planner/session', { date, sessionIndex, isCompleted }).then((r) => r.data),
  aiSuggest: (body: Record<string, unknown>) =>
    api.post('/student/study-planner/ai-suggest', body).then((r) => r.data),

  leaderboard: (params?: Params) => api.get('/student/leaderboard', { params }).then((r) => r.data),
  myRank: (phaseId?: string) => api.get('/student/leaderboard/my-rank', { params: { phaseId } }).then((r) => r.data),
}
