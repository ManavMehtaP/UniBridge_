import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import LoginPage from '@/pages/auth/LoginPage'
import PlaceholderPage from '@/pages/PlaceholderPage'
import RouteError from '@/components/RouteError'
import ProtectedRoute from './ProtectedRoute'
import RoleRouter from './RoleRouter'

// HOD portal pages
import HodDashboard from '@/pages/hod/DashboardPage'
import HodStudents from '@/pages/hod/StudentsPage'
import HodFaculty from '@/pages/hod/FacultyPage'
import HodResults from '@/pages/hod/ResultsPage'
import HodAttendance from '@/pages/hod/AttendancePage'
import HodSubjects from '@/pages/hod/SubjectsPage'
import HodMentorship from '@/pages/hod/MentorshipPage'
import HodAnalytics from '@/pages/hod/AnalyticsPage'
import HodPromotion from '@/pages/hod/PromotionPage'
import HodCalendar from '@/pages/hod/CalendarPage'
import HodSettings from '@/pages/hod/SettingsPage'
import HodTimetable from '@/pages/hod/TimetablePage'
import HodAnnouncements from '@/pages/hod/AnnouncementsPage'
import HodExamPanel from '@/pages/hod/ExamPanelPage'
import NotificationsPage from '@/pages/NotificationsPage'

// Faculty portal pages
import FacDashboard from '@/pages/faculty/DashboardPage'
import FacSchedule from '@/pages/faculty/SchedulePage'
import FacStudents from '@/pages/faculty/StudentsPage'
import FacAttendance from '@/pages/faculty/AttendancePage'
import FacNotes from '@/pages/faculty/NotesPage'
import FacQuizzes from '@/pages/faculty/QuizzesPage'
import FacAnnouncements from '@/pages/faculty/AnnouncementsPage'
import FacMentees from '@/pages/faculty/MenteesPage'
import FacResults from '@/pages/faculty/ResultsPage'
import FacExams from '@/pages/faculty/ExamsPage'
import FacCalendar from '@/pages/faculty/CalendarPage'
import FacAnalytics from '@/pages/faculty/AnalyticsPage'
import FacSettings from '@/pages/faculty/SettingsPage'

// University (Dean) portal pages
import UniDashboard from '@/pages/university/DashboardPage'
import UniYears from '@/pages/university/YearsPage'
import UniBranches from '@/pages/university/BranchesPage'
import UniHods from '@/pages/university/HodsPage'
import UniPromotion from '@/pages/university/PromotionDashboardPage'
import UniFaculty from '@/pages/university/FacultyPage'
import UniStudents from '@/pages/university/StudentsPage'
import UniSubjects from '@/pages/university/SubjectsPage'
import UniSettings from '@/pages/university/SettingsPage'

// Student portal pages
import StuDashboard from '@/pages/student/DashboardPage'
import StuTimetable from '@/pages/student/TimetablePage'
import StuResults from '@/pages/student/ResultsPage'
import StuAttendance from '@/pages/student/AttendancePage'
import StuNotes from '@/pages/student/NotesPage'
import StuSelfNotes from '@/pages/student/SelfNotesPage'
import StuQuizzes from '@/pages/student/QuizzesPage'
import StuAnnouncements from '@/pages/student/AnnouncementsPage'
import StuCalendar from '@/pages/student/CalendarPage'
import StuMentorChat from '@/pages/student/MentorChatPage'
import StuAI from '@/pages/student/AIAssistantPage'
import StuPlanner from '@/pages/student/StudyPlannerPage'
import StuLeaderboard from '@/pages/student/LeaderboardPage'
import StuSettings from '@/pages/student/SettingsPage'

// ponytail: no stubs left — every route is a real page now.
void PlaceholderPage

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        errorElement: <RouteError />,
        children: [
          // ── HOD ─────────────────────────────
          { path: '/hod', element: <HodDashboard /> },
          { path: '/hod/students', element: <HodStudents /> },
          { path: '/hod/faculty', element: <HodFaculty /> },
          { path: '/hod/results', element: <HodResults /> },
          { path: '/hod/attendance', element: <HodAttendance /> },
          { path: '/hod/subjects', element: <HodSubjects /> },
          { path: '/hod/timetable', element: <HodTimetable /> },
          { path: '/hod/announcements', element: <HodAnnouncements /> },
          { path: '/hod/exams', element: <HodExamPanel /> },
          { path: '/hod/notifications', element: <NotificationsPage /> },
          { path: '/faculty/notifications', element: <NotificationsPage /> },
          { path: '/student/notifications', element: <NotificationsPage /> },
          { path: '/hod/mentorship', element: <HodMentorship /> },
          { path: '/hod/analytics', element: <HodAnalytics /> },
          { path: '/hod/promotion', element: <HodPromotion /> },
          { path: '/hod/calendar', element: <HodCalendar /> },
          { path: '/hod/settings/:section?', element: <HodSettings /> },

          // ── Faculty ─────────────────────────
          { path: '/faculty', element: <FacDashboard /> },
          { path: '/faculty/schedule', element: <FacSchedule /> },
          { path: '/faculty/students', element: <FacStudents /> },
          { path: '/faculty/attendance', element: <FacAttendance /> },
          { path: '/faculty/notes', element: <FacNotes /> },
          { path: '/faculty/quizzes', element: <FacQuizzes /> },
          { path: '/faculty/announcements', element: <FacAnnouncements /> },
          { path: '/faculty/mentees', element: <FacMentees /> },
          { path: '/faculty/results', element: <FacResults /> },
          { path: '/faculty/exams', element: <FacExams /> },
          { path: '/faculty/calendar', element: <FacCalendar /> },
          { path: '/faculty/analytics', element: <FacAnalytics /> },
          { path: '/faculty/settings/:section?', element: <FacSettings /> },

          // ── University (Dean) ───────────────
          { path: '/university', element: <UniDashboard /> },
          { path: '/university/years', element: <UniYears /> },
          { path: '/university/branches', element: <UniBranches /> },
          { path: '/university/hods', element: <UniHods /> },
          { path: '/university/promotion', element: <UniPromotion /> },
          { path: '/university/faculty', element: <UniFaculty /> },
          { path: '/university/students', element: <UniStudents /> },
          { path: '/university/subjects', element: <UniSubjects /> },
          { path: '/university/settings', element: <UniSettings /> },

          // ── Student ─────────────────────────
          { path: '/student', element: <StuDashboard /> },
          { path: '/student/timetable', element: <StuTimetable /> },
          { path: '/student/results', element: <StuResults /> },
          { path: '/student/attendance', element: <StuAttendance /> },
          { path: '/student/notes', element: <StuNotes /> },
          { path: '/student/self-notes', element: <StuSelfNotes /> },
          { path: '/student/quizzes', element: <StuQuizzes /> },
          { path: '/student/announcements', element: <StuAnnouncements /> },
          { path: '/student/calendar', element: <StuCalendar /> },
          { path: '/student/mentor', element: <StuMentorChat /> },
          { path: '/student/ai', element: <StuAI /> },
          { path: '/student/study-planner', element: <StuPlanner /> },
          { path: '/student/leaderboard', element: <StuLeaderboard /> },
          { path: '/student/settings/:section?', element: <StuSettings /> },

          // Root redirect + catch-all
          { path: '/', element: <RoleRouter /> },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])
