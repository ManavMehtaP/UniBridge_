import {
  BarChart2,
  BookOpen,
  Calendar,
  CalendarCheck,
  Clock,
  HelpCircle,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Settings,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react'
import type { NavSection } from './types'

export const studentNavItems: NavSection[] = [
  {
    section: 'Academic',
    items: [
      { id: 'dashboard', label: 'Dashboard', path: '/student', icon: LayoutDashboard, end: true },
      { id: 'timetable', label: 'Timetable', path: '/student/timetable', icon: Clock },
      { id: 'results', label: 'Results', path: '/student/results', icon: BarChart2 },
      { id: 'attendance', label: 'Attendance', path: '/student/attendance', icon: CalendarCheck },
    ],
  },
  {
    section: 'Study Tools',
    items: [
      { id: 'notes', label: 'Notes', path: '/student/notes', icon: BookOpen },
      { id: 'quizzes', label: 'Quizzes', path: '/student/quizzes', icon: HelpCircle },
      { id: 'ai', label: 'AI Assistant', path: '/student/ai', icon: Sparkles },
      { id: 'insights', label: 'Exam Insights', path: '/student/exam-insights', icon: BarChart2 },
      { id: 'planner', label: 'Study Planner', path: '/student/study-planner', icon: Target },
    ],
  },
  {
    section: 'Connect',
    items: [
      { id: 'announcements', label: 'Announcements', path: '/student/announcements', icon: Megaphone },
      { id: 'mentor', label: 'Mentor Chat', path: '/student/mentor', icon: MessageCircle },
      { id: 'calendar', label: 'Calendar', path: '/student/calendar', icon: Calendar },
      { id: 'leaderboard', label: 'Leaderboard', path: '/student/leaderboard', icon: Trophy },
      { id: 'settings', label: 'Settings', path: '/student/settings', icon: Settings },
    ],
  },
]
