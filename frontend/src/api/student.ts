import { api } from './client'
import { djangoAiDelete, djangoAiGet, djangoAiPatch, djangoAiPost } from './djangoAiClient'
import type * as T from '@/types/student'

type Params = Record<string, string | number | boolean | undefined>

type DjangoChat = {
  chat_id: string
  title: string
  subject_id?: string | null
  updated_at?: string
  created_at?: string
  message_count?: number
  messages?: Array<{ role: string; content: string }>
}

function normalizeChat(item: DjangoChat): T.AIConversation {
  return {
    id: item.chat_id,
    title: item.title,
    subjectName: item.subject_id ? null : 'General',
    createdAt: item.created_at ?? item.updated_at ?? new Date().toISOString(),
    updatedAt: item.updated_at ?? item.created_at,
    messageCount: item.message_count ?? item.messages?.length ?? 0,
    lastMessage: item.messages?.at(-1)?.content ?? null,
  }
}

function normalizeMessages(chatId: string, messages: Array<{ role: string; content: string }> = []): T.AIMessage[] {
  return messages.map((message, index) => ({
    id: `${chatId}-${index}`,
    role: String(message.role).toUpperCase() === 'USER' ? 'USER' : 'ASSISTANT',
    content: message.content,
    createdAt: new Date().toISOString(),
  }))
}

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
  noteDrive: (params: Params) => api.get<T.StudentNoteDrive>('/student/notes/folders', { params }).then((r) => r.data),
  note: (id: string) => api.get(`/student/notes/${id}`).then((r) => r.data),
  noteFlashcards: (id: string) => api.get(`/student/notes/${id}/flashcards`).then((r) => r.data),
  noteDownloadUrl: (id: string) => `${api.defaults.baseURL}/student/notes/${id}/download`,
  // Returns a short-lived presigned URL (auth header is carried by axios; a plain <a> can't).
  noteDownload: (id: string) => api.get<{ downloadUrl: string }>(`/student/notes/${id}/download`).then((r) => r.data),
  noteFile: (id: string, mode: 'inline' | 'download' = 'inline') =>
    api.get(`/student/notes/${id}/file`, { params: { mode }, responseType: 'blob' }).then((r) => r.data as Blob),

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
  submitQuiz: (id: string, answers: unknown, presentation?: unknown, autoSubmit = false) =>
    api.post(`/student/quizzes/${id}/submit`, { answers, presentation, autoSubmit }).then((r) => r.data),
  quizChapters: (subjectId: string) => api.get(`/student/quizzes/subjects/${subjectId}/chapters`).then((r) => r.data as { chapters: string[]; processing?: boolean; noteCount?: number; message?: string }),
  generateAiQuiz: (body: { subjectId: string; chapters: string[]; questionCount?: number }) =>
    // Extracting a never-processed note and running two Gemini passes runs well
    // past the client's 30s default, and a free-tier AI service may be cold too.
    api.post('/student/quizzes/ai-generate', body, { timeout: 120_000 }).then((r) => r.data),
  deleteAiQuiz: (id: string) => api.delete(`/student/quizzes/${id}/ai-practice`).then((r) => r.data),
  renameAiQuiz: (id: string, title: string) => api.patch(`/student/quizzes/${id}/ai-practice`, { title }).then((r) => r.data),

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

  aiConversations: async () => {
    const data = await djangoAiGet<DjangoChat[]>('/chats')
    return { data: data.map(normalizeChat) }
  },
  createAiConversation: async (body: { title?: string; subjectId?: string | null }) => {
    const created = await djangoAiPost<DjangoChat>('/chats', { title: body.title, subject_id: body.subjectId ?? null })
    return { id: created.chat_id, title: created.title, subjectId: created.subject_id ?? null, messages: [], createdAt: created.created_at }
  },
  aiConversation: async (id: string) => {
    const chat = await djangoAiGet<DjangoChat>(`/chats/${id}`)
    return {
      id: chat.chat_id,
      title: chat.title,
      subjectId: chat.subject_id ?? null,
      messages: normalizeMessages(chat.chat_id, chat.messages),
    }
  },
  sendAiMessage: (id: string, content: string) =>
    djangoAiPost(`/chats/${id}/messages`, { message: content }),
  deleteAiConversation: (id: string) => djangoAiDelete(`/chats/${id}`),
  renameAiConversation: (id: string, title: string) => djangoAiPatch(`/chats/${id}`, { title }),
  pyqAnalysis: (subjectId: string) => api.get(`/student/ai/pyq-analysis/${subjectId}`).then((r) => r.data),
  pyqSummary: (pyqId: string) => api.get(`/student/ai/pyq/${pyqId}/summary`).then((r) => r.data),
  smartNoteSummary: (noteId: string) => api.get(`/student/ai/smart-notes/${noteId}/summary`).then((r) => r.data),
  marksPrediction: () => djangoAiGet('/students/me/marks/prediction'),

  studyPlanner: () => api.get('/student/study-planner').then((r) => r.data),
  saveStudyPlanner: (plan: unknown[]) => api.put('/student/study-planner', { plan }).then((r) => r.data),
  addStudyPlannerTask: (body: { date: string; subjectId?: string | null; description: string; estimatedDurationMinutes: number; priority: string }) =>
    api.post('/student/study-planner/tasks', body).then((r) => r.data),
  toggleSession: (taskId: string, isCompleted: boolean) =>
    api.patch(`/student/study-planner/tasks/${taskId}`, { isCompleted }).then((r) => r.data),
  deleteStudyPlannerTask: (taskId: string) =>
    api.delete(`/student/study-planner/tasks/${taskId}`).then((r) => r.data),
  aiSuggest: (body: Record<string, unknown>) =>
    api.post('/student/study-planner/ai-suggest', body).then((r) => r.data),

  leaderboard: (params: { scope: 'year' | 'batch'; phases?: string[]; subjectId?: string }) =>
    api.get<LeaderboardResponse>('/student/leaderboard', { params: { scope: params.scope, phases: params.phases?.length ? params.phases.join(',') : undefined, subjectId: params.subjectId || undefined } }).then((r) => r.data),
}

export interface LeaderboardEntry { rank: number; name: string; enrollmentNo: string; batchCode: string; totalMarks: number; maxMarks: number; isMe: boolean }
export interface LeaderboardResponse {
  scope: 'year' | 'batch'; yearLevel: string | null; batchCode: string
  phases: string[]; subjectId: string | null
  myRank: number; myTotal: number; myMax: number; totalStudents: number
  leaderboard: LeaderboardEntry[]
}
