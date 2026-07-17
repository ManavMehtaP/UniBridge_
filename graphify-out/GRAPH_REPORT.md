# Graph Report - UniBridge_  (2026-07-17)

## Corpus Check
- 179 files · ~264,900 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1554 nodes · 1714 edges · 198 communities (137 shown, 61 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bae25258`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Backend Bootstrap & Routing
- Backend Domain Types & HOD Service
- Frontend API Client Layer
- Portal Service Core Logic
- Frontend Build Tooling
- Backend Dependencies
- HOD Frontend Types
- Backend Dev Tooling
- Frontend TS App Config
- Frontend Runtime Dependencies
- Frontend Layout & Navigation
- Frontend TS Node Config
- Database Seed Script
- Backend TS Config
- HOD Timetable Page
- Faculty Frontend Types
- Student Frontend Types
- HOD API Contract Docs
- Architecture Plan & Domain Rules
- Shared UI Components
- HOD Promotion Page
- Faculty & AI Service API Docs
- Student API Contract Docs
- HOD Settings Page
- Common Shared Types
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- seed-sy3-marks.ts
- Community 43
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 57
- Community 58
- Community 59
- Card.tsx
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- StudentsPage.tsx
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 85
- Community 86
- Community 87
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 107
- Community 121
- Community 128
- YearLevel
- hodAllBatchIds
- compression
- UniPortal — Scalable Multi-Role React Architecture
- 12. Settings Page
- UniPortal — HOD Scoping Architecture
- 9. Analytics Page
- 7. Quiz — Create & Manage
- 4. Faculty Page
- 3. Students Page
- 5. Results Page
- 6. Attendance Page
- 10. Promotion Page
- 8. Mentorship Page
- package.json
- PAGE 3: Students
- PAGE 5: Results
- 11. Calendar Page
- UniPortal — Faculty API Reference
- 2. Faculty Profile & Dashboard
- 5. Attendance — Mark & Track
- 6. Notes — Upload & Manage
- 9. Mentorship — Mentee List & Chat
- PAGE 4: Faculty
- PAGE 8: Mentorship
- 7. Subjects Page
- PAGE 6: Attendance
- UniPortal — Student API Reference
- 13. AI Assistant
- 2. Student Profile & Dashboard
- PAGE 7: Subjects
- 12. Mentor Chat
- 9. Quizzes — Attempt & Review
- 1. Auth & Session
- 2. Dashboard
- 1. Auth & Session
- storage.ts
- Affected Endpoints — Full Corrected List
- PAGE 9: Analytics
- 10. Announcements
- 14. Study Planner
- 1. Auth & Session
- 8. Self Notes
- 11. Calendar — View & Post
- 12. Analytics — Faculty View
- 4. Students — View Only
- 8. Announcements
- PAGE 12: Settings
- PAGE 11: Calendar
- PAGE 2: Dashboard
- 5. Results
- 7. Faculty Notes — View & Download
- 11. Calendar
- 15. Leaderboard
- 3. Academic Journey & Enrollment History
- 6. Attendance
- react-router-dom
- @supabase/supabase-js
- dotenv
- pg
- prisma
- @prisma/client
- tsx
- @tanstack/react-query
- compression

## God Nodes (most connected - your core abstractions)
1. `Store` - 24 edges
2. `UniPortal — Scalable Multi-Role React Architecture` - 24 edges
3. `12. Settings Page` - 22 edges
4. `compilerOptions` - 21 edges
5. `UniPortal — Student API Reference` - 19 edges
6. `compilerOptions` - 16 edges
7. `UniPortal — REST API Reference` - 16 edges
8. `UniPortal — Faculty API Reference` - 16 edges
9. `9. Analytics Page` - 14 edges
10. `7. Quiz — Create & Manage` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Login Background (Mobile)` --semantically_similar_to--> `Login Background (Desktop)`  [INFERRED] [semantically similar]
  frontend/public/assets/login-bg-mobile.png → frontend/public/assets/login-bg.png
- `createApp()` --indirect_call--> `errorHandler()`  [INFERRED]
  Backend/src/app.ts → Backend/src/middleware/errorHandler.ts
- `createApp()` --indirect_call--> `notFoundHandler()`  [INFERRED]
  Backend/src/app.ts → Backend/src/middleware/errorHandler.ts
- `paginate()` --calls--> `buildPagination()`  [EXTRACTED]
  Backend/src/services/portal.service.ts → Backend/src/utils/http.ts
- `FacultyResultsResponse` --inherits--> `PaginatedResponse`  [EXTRACTED]
  frontend/src/types/faculty.ts → frontend/src/types/common.ts

## Import Cycles
- None detected.

## Communities (198 total, 61 thin omitted)

### Community 0 - "Backend Bootstrap & Routing"
Cohesion: 0.06
Nodes (36): WIPE_TABLES, chunkedCreate(), gradeFor(), main(), rand(), chunked(), clamp(), GRID (+28 more)

### Community 1 - "Backend Domain Types & HOD Service"
Cohesion: 0.11
Nodes (35): Store, HodService, StudentListParams, AcademicYear, AcademicYearStatus, Activity, ArchiveJob, AttendanceRecord (+27 more)

### Community 2 - "Frontend API Client Layer"
Cohesion: 0.06
Nodes (27): authApi, api, queue, facultyApi, Params, hodApi, Params, SubjectComponentCfg (+19 more)

### Community 3 - "Portal Service Core Logic"
Cohesion: 0.05
Nodes (8): DAY_LABELS, getAttendanceRules(), hodAllBatchIds(), hodEnrollmentWhere(), Scope, scopedCurrentEnrollments(), statusFromAttendancePctAndMarks(), Role

### Community 4 - "Frontend Build Tooling"
Cohesion: 0.11
Nodes (19): autoprefixer, devDependencies, autoprefixer, postcss, tailwindcss, @types/node, @types/react, @types/react-dom (+11 more)

### Community 5 - "Backend Dependencies"
Cohesion: 0.12
Nodes (17): dependencies, compression, cors, helmet, morgan, multer, @prisma/adapter-pg, @types/multer (+9 more)

### Community 6 - "HOD Frontend Types"
Cohesion: 0.08
Nodes (28): YearLevel, AcademicYearWithSemesters, ActivityItem, AnalyticsKpi, AssignmentRow, AtRiskRow, AttendanceStatSummary, AttendanceTableRow (+20 more)

### Community 7 - "Backend Dev Tooling"
Cohesion: 0.13
Nodes (15): devDependencies, @types/compression, @types/cors, @types/express, @types/morgan, @types/node, @types/pg, typescript (+7 more)

### Community 8 - "Frontend TS App Config"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, baseUrl, composite, isolatedModules, jsx, lib, module (+19 more)

### Community 9 - "Frontend Runtime Dependencies"
Cohesion: 0.12
Nodes (17): axios, date-fns, dependencies, axios, date-fns, lucide-react, react, react-hot-toast (+9 more)

### Community 10 - "Frontend Layout & Navigation"
Cohesion: 0.17
Nodes (11): facultyNavItems, hodNavItems, studentNavItems, NavItem, NavSection, universityNavItems, SemesterHistorySelector(), roleLabel (+3 more)

### Community 11 - "Frontend TS Node Config"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, composite, isolatedModules, lib, module, moduleDetection, moduleResolution (+12 more)

### Community 12 - "Database Seed Script"
Cohesion: 0.16
Nodes (19): Cohort, COHORTS, ensureAcademicYear(), ensureAllSemesters(), ensureBatch(), ensureBranch(), ensureFacultyPool(), ensureHod() (+11 more)

### Community 13 - "Backend TS Config"
Cohesion: 0.11
Nodes (18): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, resolveJsonModule, rootDir (+10 more)

### Community 14 - "HOD Timetable Page"
Cohesion: 0.13
Nodes (10): BASE, DAYS, HodTimetablePage(), isLab(), isOther(), LAB, OTHER, Palette (+2 more)

### Community 15 - "Faculty Frontend Types"
Cohesion: 0.14
Nodes (15): PaginatedResponse, AttendanceSessionRow, ChatMsg, FacultyAnnouncement, FacultyDashboardStats, FacultyNote, FacultyQuiz, FacultyResultRow (+7 more)

### Community 16 - "Student Frontend Types"
Cohesion: 0.12
Nodes (15): AIConversation, AIMessage, AttendancePerSubject, LeaderboardEntry, PaginatedAnnouncements, PaginatedNotes, PaginatedQuizzes, SelfNote (+7 more)

### Community 17 - "HOD API Contract Docs"
Cohesion: 0.40
Nodes (5): ensureFacultyAssignedBatch(), ensureFacultyAssignedSubject(), getFacultyAssignments(), getFacultyScopeData(), getFacultyVisibleEnrollments()

### Community 18 - "Architecture Plan & Domain Rules"
Cohesion: 0.04
Nodes (46): AI Assistant (Django RAG), Analytics — Faculty, Analytics — HOD, Announcements, Attendance System, Backend Tasks (Express), Chat System (Socket.io), Critical Domain Rules (Read Before Touching Any Code) (+38 more)

### Community 19 - "Shared UI Components"
Cohesion: 0.16
Nodes (10): Button, ButtonProps, Size, sizes, Variant, variants, ConfirmDialogProps, Modal() (+2 more)

### Community 20 - "HOD Promotion Page"
Cohesion: 0.14
Nodes (5): LeaderRow, PromoContext, STEPS, YEAR_LABEL, YearPreview

### Community 21 - "Faculty & AI Service API Docs"
Cohesion: 0.09
Nodes (25): cacheRequests, Counter, databaseQueryDuration, escaped(), eventLoopDelay, featureForRoute(), featureUse, Gauge (+17 more)

### Community 24 - "Common Shared Types"
Cohesion: 0.20
Nodes (9): Confirmed Bugs, P0 — Forged Access Tokens Grant Access, P0 — HOD and Faculty Login Tabs Do Not Enforce Their Roles, P1 — Any Logged-In User Can Open Any Portal Route, P1 — Faculty Password Change Always Fails, P1 — Sessions Do Not Expire or Respect Deactivation, P2 — Forgot Password Is Not Implemented, P2 — Remember Me Does Nothing (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.22
Nodes (5): Card(), StatCardProps, Trend, TrendIcon, trendPill

### Community 27 - "Community 27"
Cohesion: 0.20
Nodes (6): AssignmentStudents, examApi, ExamAssignment, ExamContext, STATUS_TONE, YEAR_LABEL

### Community 29 - "Community 29"
Cohesion: 0.22
Nodes (9): batchById(), currentEnrollmentForStudent(), ensureStudentSubject(), getMentorAssignment(), getStudentEnrollment(), getStudentMentorAssignment(), getStudentSubjectIds(), getStudentUser() (+1 more)

### Community 30 - "Community 30"
Cohesion: 0.22
Nodes (3): axis, COLORS, tooltipStyle

### Community 31 - "Community 31"
Cohesion: 0.28
Nodes (4): AddFacultyModal(), YEAR_OPTIONS, FacultyDetailModal(), YEAR_LABEL

### Community 32 - "Community 32"
Cohesion: 0.25
Nodes (5): EditMarksModal(), gradeFor(), Preview, PreviewRow, UploadContext

### Community 33 - "Community 33"
Cohesion: 0.25
Nodes (5): Comp, FacultyGroup, groupByFaculty(), SubjectsPage(), THEORY_RULES

### Community 34 - "Community 34"
Cohesion: 0.36
Nodes (8): AuthStore, homePathOf(), portalOf(), useAuthStore, useIsFaculty(), useIsHod(), useIsStudent(), useUser()

### Community 36 - "Community 36"
Cohesion: 0.29
Nodes (4): AddStudentModal(), BRANCHES, STATUSES, statusTone

### Community 37 - "Community 37"
Cohesion: 0.18
Nodes (10): AcademicYear, Announcement, ApiError, AttendanceSummary, Batch, CalendarEvent, ChatMessage, Phase (+2 more)

### Community 39 - "Community 39"
Cohesion: 0.29
Nodes (4): LEGEND, MONTHS, TYPE_LABEL, TYPES

### Community 40 - "Community 40"
Cohesion: 0.29
Nodes (4): Coordinator, examApi, ExamAssignment, STATUS_TONE

### Community 42 - "seed-sy3-marks.ts"
Cohesion: 0.07
Nodes (28): 1. Eliminate N+1 queries first, 1. Make route loading smaller, 2. Improve React Query policy, 2. Read only what the page needs, 3. Make writes bulk and idempotent, 3. Reduce unnecessary browser requests, 4. Redis cache: small and explicit, 4. Result-day frontend flow (+20 more)

### Community 43 - "Community 43"
Cohesion: 0.40
Nodes (6): facultyActiveSemester(), getActiveSemester(), getSemester(), hodActiveSemester(), requireExamCoordinator(), scopeSemester()

### Community 48 - "Community 48"
Cohesion: 0.33
Nodes (4): statusLabel, statusTone, YEAR_LABEL, YEARS

### Community 50 - "Community 50"
Cohesion: 0.33
Nodes (3): LEVEL_TO_SEM, SEM_TONE, YEAR_TONE

### Community 51 - "Community 51"
Cohesion: 0.47
Nodes (3): router, ProtectedRoute(), RoleRouter()

### Community 52 - "Community 52"
Cohesion: 0.25
Nodes (8): scripts, build, dev, postinstall, prisma:generate, prisma:migrate, prisma:push, start

### Community 55 - "Community 55"
Cohesion: 0.40
Nodes (3): BadgeProps, Tone, tones

### Community 57 - "Community 57"
Cohesion: 0.32
Nodes (4): Assignment, EditNoteModal(), toIso(), UploadNoteModal()

### Community 60 - "Card.tsx"
Cohesion: 0.13
Nodes (14): Before launch, Chosen zero-cost architecture, Cost: INR 0, with important exclusions, Database and Redis safety, Free services to use, Free-tier limits and upgrade triggers, GitHub Actions pipeline, Performance plan for 400 active users (+6 more)

### Community 64 - "Community 64"
Cohesion: 0.50
Nodes (3): Select, SelectOption, SelectProps

### Community 75 - "Community 75"
Cohesion: 0.38
Nodes (11): amzDate(), basePath, enc(), encPath(), hmac(), presignGetUrl(), sha256hex(), signingKey() (+3 more)

### Community 76 - "StudentsPage.tsx"
Cohesion: 0.50
Nodes (4): 10. Results — View Only, `GET /faculty/results`, `GET /faculty/results/leaderboard`, `GET /faculty/results/summary`

### Community 99 - "Community 99"
Cohesion: 0.25
Nodes (6): AuthUser, LoginResponse, LoginRole, RefreshResponse, University, UserRole

### Community 132 - "hodAllBatchIds"
Cohesion: 0.33
Nodes (7): createApp(), env, envSchema, errorHandler(), notFoundHandler(), apiRouter, app

### Community 136 - "UniPortal — Scalable Multi-Role React Architecture"
Cohesion: 0.06
Nodes (32): API HOOKS — PATTERN TO FOLLOW FOR ALL THREE ROLES, APP SHELL — ONE LAYOUT, THREE SIDEBARS, AUTH STORE — SINGLE SOURCE OF TRUTH, AXIOS CLIENT — SHARED BY ALL ROLES, BUILD ORDER — SCALABLE SPRINT PLAN, COMMON TYPES, COMPLETE FILE STRUCTURE, Components ALL THREE ROLES use (+24 more)

### Community 137 - "12. Settings Page"
Cohesion: 0.09
Nodes (22): 12. Settings Page, `DELETE /hod/settings/danger/attendance-records`, `DELETE /hod/settings/security/sessions/:sessionId`, `GET /hod/settings/academic-years`, `GET /hod/settings/attendance-rules`, `GET /hod/settings/danger/archive-status/:jobId`, `GET /hod/settings/notifications`, `GET /hod/settings/profile` (+14 more)

### Community 138 - "UniPortal — HOD Scoping Architecture"
Cohesion: 0.12
Nodes (15): Data Model Changes, `GET /hod/my-scope`, HOD's Own Scope Info Endpoint, `hodScope` Middleware, Modified: `Faculty` CSV upload, Modified: `Student` CSV upload, New Error Codes Added, New Table: `HodBatchScope` (+7 more)

### Community 139 - "9. Analytics Page"
Cohesion: 0.14
Nodes (14): 9. Analytics Page, `GET /hod/analytics/at-risk`, `GET /hod/analytics/attendance/by-subject`, `GET /hod/analytics/attendance/distribution`, `GET /hod/analytics/attendance/trend`, `GET /hod/analytics/export`, `GET /hod/analytics/kpi`, `GET /hod/analytics/leaderboard` (+6 more)

### Community 140 - "7. Quiz — Create & Manage"
Cohesion: 0.15
Nodes (13): 7. Quiz — Create & Manage, `DELETE /faculty/quizzes/:quizId`, `GET /faculty/quizzes`, `GET /faculty/quizzes/ai-status/:jobId`, `GET /faculty/quizzes/:quizId`, `GET /faculty/quizzes/:quizId/attempts`, `GET /faculty/quizzes/:quizId/attempts/:attemptId`, `PATCH /faculty/quizzes/:quizId/publish` (+5 more)

### Community 141 - "4. Faculty Page"
Cohesion: 0.17
Nodes (12): 4. Faculty Page, `DELETE /hod/faculty/assignments/:assignmentId`, `DELETE /hod/faculty/:employeeId`, `GET /hod/faculty`, `GET /hod/faculty/:employeeId`, `GET /hod/faculty/export`, `PATCH /hod/faculty/:employeeId/mentor-code`, `PATCH /hod/faculty/:employeeId/status` (+4 more)

### Community 142 - "3. Students Page"
Cohesion: 0.18
Nodes (11): 3. Students Page, `DELETE /hod/students/:enrollmentNo`, `GET /hod/students`, `GET /hod/students/csv/template`, `GET /hod/students/:enrollmentNo`, `GET /hod/students/:enrollmentNo/history`, `GET /hod/students/export`, `PATCH /hod/students/:enrollmentNo/status` (+3 more)

### Community 143 - "5. Results Page"
Cohesion: 0.18
Nodes (11): 5. Results Page, `DELETE /hod/results/:resultId`, `GET /hod/results/phase-status`, `GET /hod/results/preview`, `GET /hod/results/students`, `GET /hod/results/upload-context`, `GET /hod/results/upload-history`, `PATCH /hod/results/:resultId` (+3 more)

### Community 144 - "6. Attendance Page"
Cohesion: 0.18
Nodes (11): 6. Attendance Page, `GET /hod/attendance/by-subject`, `GET /hod/attendance/export`, `GET /hod/attendance/heatmap`, `GET /hod/attendance/summary`, `GET /hod/attendance/table`, `GET /student/attendance`, `PATCH /hod/attendance/lock` (+3 more)

### Community 145 - "10. Promotion Page"
Cohesion: 0.20
Nodes (10): 10. Promotion Page, `GET /hod/promotion/history`, `GET /hod/promotion/preview`, `GET /hod/promotion/preview-summary`, `GET /hod/promotion/roll-numbers/suggest`, `GET /hod/promotion/years`, `POST /hod/promotion/execute`, `POST /hod/promotion/mapping/csv` (+2 more)

### Community 146 - "8. Mentorship Page"
Cohesion: 0.20
Nodes (10): 8. Mentorship Page, `DELETE /hod/mentorship/assignments/:assignmentId`, `GET /hod/mentorship/assignments`, `GET /hod/mentorship/mentors`, `GET /hod/mentorship/summary`, `GET /hod/mentorship/unassigned`, `PATCH /hod/mentorship/reassign`, `POST /hod/mentorship/assign` (+2 more)

### Community 147 - "package.json"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, preview, type (+1 more)

### Community 148 - "PAGE 3: Students"
Cohesion: 0.20
Nodes (10): `DELETE /hod/students/:enrollmentNo`, `GET /hod/students`, `GET /hod/students/:enrollmentNo`, `GET /hod/students/:enrollmentNo/history`, `GET /hod/students/export`, PAGE 3: Students, `PATCH /hod/students/:enrollmentNo/status`, `POST /hod/students` (+2 more)

### Community 149 - "PAGE 5: Results"
Cohesion: 0.20
Nodes (10): `GET /hod/results/phase-status`, `GET /hod/results/preview`, `GET /hod/results/students`, `GET /hod/results/upload-context`, `GET /hod/results/upload-history`, PAGE 5: Results, `PATCH /hod/results/:resultId`, `POST /hod/results/manual` (+2 more)

### Community 150 - "11. Calendar Page"
Cohesion: 0.22
Nodes (9): 11. Calendar Page, `DELETE /hod/calendar/events/:eventId`, `GET /hod/calendar/events`, `GET /hod/calendar/events/:eventId`, `GET /hod/calendar/events/upcoming`, `GET /hod/calendar/export`, `GET /hod/calendar/phase-timeline`, `POST /hod/calendar/events` (+1 more)

### Community 151 - "UniPortal — Faculty API Reference"
Cohesion: 0.22
Nodes (8): 13. Faculty Error Codes, 3. My Schedule — Timetable & Assignments, Context & Scoping Rules, `GET /faculty/my-scope`, `GET /faculty/timetable`, `GET /faculty/timetable/today`, Table of Contents, UniPortal — Faculty API Reference

### Community 152 - "2. Faculty Profile & Dashboard"
Cohesion: 0.22
Nodes (9): 2. Faculty Profile & Dashboard, `DELETE /faculty/sessions/:sessionId`, `GET /faculty/activity-feed`, `GET /faculty/dashboard/summary`, `GET /faculty/profile`, `GET /faculty/sessions`, `PATCH /faculty/profile/password`, `POST /faculty/profile/photo` (+1 more)

### Community 153 - "5. Attendance — Mark & Track"
Cohesion: 0.22
Nodes (9): 5. Attendance — Mark & Track, `DELETE /faculty/attendance`, `GET /faculty/attendance/lecture-log`, `GET /faculty/attendance/pending`, `GET /faculty/attendance/session`, `GET /faculty/attendance/students-below-threshold`, `GET /faculty/attendance/summary`, `PATCH /faculty/attendance` (+1 more)

### Community 154 - "6. Notes — Upload & Manage"
Cohesion: 0.22
Nodes (9): 6. Notes — Upload & Manage, `DELETE /faculty/notes/:noteId`, `DELETE /faculty/notes/:noteId/flashcards/:flashcardId`, `GET /faculty/notes`, `GET /faculty/notes/:noteId`, `GET /faculty/notes/:noteId/ai-status`, `POST /faculty/notes`, `POST /faculty/notes/:noteId/flashcards` (+1 more)

### Community 155 - "9. Mentorship — Mentee List & Chat"
Cohesion: 0.22
Nodes (9): 9. Mentorship — Mentee List & Chat, `GET /faculty/chat/:mentorAssignmentId/messages`, `GET /faculty/mentees`, `GET /faculty/mentees/at-risk`, `GET /faculty/mentees/:enrollmentNo/profile`, `GET /faculty/mentees/unread-counts`, `PATCH /faculty/chat/:mentorAssignmentId/mark-read`, `POST /faculty/chat/:mentorAssignmentId/messages` (+1 more)

### Community 156 - "PAGE 4: Faculty"
Cohesion: 0.22
Nodes (9): `DELETE /hod/faculty/assignments/:assignmentId`, `GET /hod/faculty`, `GET /hod/faculty/:employeeId`, PAGE 4: Faculty, `PATCH /hod/faculty/:employeeId/mentor-code`, `POST /hod/faculty`, `POST /hod/faculty/assignments`, `POST /hod/faculty/csv` (+1 more)

### Community 157 - "PAGE 8: Mentorship"
Cohesion: 0.22
Nodes (9): `GET /hod/mentorship/assignments`, `GET /hod/mentorship/mentors`, `GET /hod/mentorship/summary`, `GET /hod/mentorship/unassigned`, PAGE 8: Mentorship, `PATCH /hod/mentorship/reassign`, `POST /hod/mentorship/assign`, `POST /hod/mentorship/assign/csv` (+1 more)

### Community 158 - "7. Subjects Page"
Cohesion: 0.25
Nodes (8): 7. Subjects Page, `DELETE /hod/subjects/:subjectId`, `GET /hod/subjects`, `GET /hod/subjects/:subjectId`, `POST /hod/subjects`, `POST /hod/subjects/copy`, `POST /hod/subjects/:subjectId/pyq`, `PUT /hod/subjects/:subjectId`

### Community 159 - "PAGE 6: Attendance"
Cohesion: 0.25
Nodes (8): `GET /hod/attendance/by-subject`, `GET /hod/attendance/export`, `GET /hod/attendance/heatmap`, `GET /hod/attendance/summary`, `GET /hod/attendance/table`, PAGE 6: Attendance, `PATCH /hod/attendance/lock`, `PATCH /hod/attendance/lock-all`

### Community 160 - "UniPortal — Student API Reference"
Cohesion: 0.25
Nodes (7): 16. Student Error Codes, 4. Timetable, Context & Scoping Rules, `GET /student/timetable`, `GET /student/timetable/today`, Table of Contents, UniPortal — Student API Reference

### Community 161 - "13. AI Assistant"
Cohesion: 0.25
Nodes (8): 13. AI Assistant, `DELETE /student/ai/conversations/:conversationId`, `GET /student/ai/conversations`, `GET /student/ai/conversations/:conversationId`, `GET /student/ai/pyq-analysis/:subjectId`, `GET /student/ai/smart-notes/:noteId/summary`, `POST /student/ai/conversations`, `POST /student/ai/conversations/:conversationId/message`

### Community 162 - "2. Student Profile & Dashboard"
Cohesion: 0.25
Nodes (8): 2. Student Profile & Dashboard, `DELETE /student/sessions/:sessionId`, `GET /student/dashboard`, `GET /student/profile`, `GET /student/sessions`, `PATCH /student/profile`, `PATCH /student/profile/password`, `POST /student/profile/photo`

### Community 163 - "PAGE 7: Subjects"
Cohesion: 0.29
Nodes (7): `DELETE /hod/subjects/:subjectId`, `GET /hod/subjects`, PAGE 7: Subjects, `POST /hod/subjects`, `POST /hod/subjects/copy`, `POST /hod/subjects/:subjectId/pyq`, `PUT /hod/subjects/:subjectId`

### Community 164 - "12. Mentor Chat"
Cohesion: 0.29
Nodes (7): 12. Mentor Chat, `GET /student/mentor`, `GET /student/mentor/messages`, `GET /student/mentor/messages/unread-count`, `PATCH /student/mentor/messages/mark-read`, `POST /student/mentor/messages`, Socket.io Events (Student Client)

### Community 165 - "9. Quizzes — Attempt & Review"
Cohesion: 0.29
Nodes (7): 9. Quizzes — Attempt & Review, `GET /student/quizzes`, `GET /student/quizzes/history`, `GET /student/quizzes/:quizId`, `GET /student/quizzes/:quizId/result`, `POST /student/quizzes/:quizId/start`, `POST /student/quizzes/:quizId/submit`

### Community 166 - "1. Auth & Session"
Cohesion: 0.33
Nodes (6): 1. Auth & Session, `GET /auth/me`, `POST /auth/forgot-password`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`

### Community 167 - "2. Dashboard"
Cohesion: 0.18
Nodes (10): 13. Common Error Codes, 2. Dashboard, `GET /hod/dashboard/activity-feed`, `GET /hod/dashboard/at-risk`, `GET /hod/dashboard/attendance-trend`, `GET /hod/dashboard/results-overview`, `GET /hod/dashboard/summary`, Notes on Conventions Used Throughout (+2 more)

### Community 168 - "1. Auth & Session"
Cohesion: 0.33
Nodes (6): 1. Auth & Session, `GET /auth/me`, `POST /auth/forgot-password`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`

### Community 169 - "storage.ts"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 170 - "Affected Endpoints — Full Corrected List"
Cohesion: 0.33
Nodes (6): Affected Endpoints — Full Corrected List, `GET /hod/promotion/preview`, `GET /hod/promotion/years`, PAGE 10: Promotion, `POST /hod/promotion/execute`, `POST /hod/promotion/mapping/csv`

### Community 171 - "PAGE 9: Analytics"
Cohesion: 0.33
Nodes (6): `GET /hod/analytics/at-risk`, `GET /hod/analytics/attendance/trend`, `GET /hod/analytics/kpi`, `GET /hod/analytics/leaderboard`, `GET /hod/analytics/year-comparison`, PAGE 9: Analytics

### Community 172 - "10. Announcements"
Cohesion: 0.33
Nodes (6): 10. Announcements, `GET /student/announcements`, `GET /student/announcements/:announcementId`, `GET /student/announcements/unread-count`, `PATCH /student/announcements/:announcementId/read`, `PATCH /student/announcements/mark-all-read`

### Community 173 - "14. Study Planner"
Cohesion: 0.33
Nodes (6): 14. Study Planner, `GET /student/study-planner`, `GET /student/study-planner/ai-status/:jobId`, `PATCH /student/study-planner/session`, `POST /student/study-planner/ai-suggest`, `PUT /student/study-planner`

### Community 174 - "1. Auth & Session"
Cohesion: 0.33
Nodes (6): 1. Auth & Session, `GET /auth/me`, `POST /auth/forgot-password`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`

### Community 175 - "8. Self Notes"
Cohesion: 0.33
Nodes (6): 8. Self Notes, `DELETE /student/self-notes/:selfNoteId`, `GET /student/self-notes`, `GET /student/self-notes/:selfNoteId`, `POST /student/self-notes`, `PUT /student/self-notes/:selfNoteId`

### Community 176 - "11. Calendar — View & Post"
Cohesion: 0.50
Nodes (4): 11. Calendar — View & Post, `GET /faculty/calendar/events`, `GET /faculty/calendar/events/upcoming`, `GET /faculty/calendar/phase-timeline`

### Community 177 - "12. Analytics — Faculty View"
Cohesion: 0.40
Nodes (5): 12. Analytics — Faculty View, `GET /faculty/analytics/attendance`, `GET /faculty/analytics/marks`, `GET /faculty/analytics/mentees`, `GET /faculty/analytics/quiz-performance`

### Community 178 - "4. Students — View Only"
Cohesion: 0.40
Nodes (5): 4. Students — View Only, `GET /faculty/students`, `GET /faculty/students/:enrollmentNo`, `GET /faculty/students/:enrollmentNo/attendance`, `GET /faculty/students/:enrollmentNo/results`

### Community 179 - "8. Announcements"
Cohesion: 0.40
Nodes (5): 8. Announcements, `DELETE /faculty/announcements/:announcementId`, `GET /faculty/announcements`, `POST /faculty/announcements`, `PUT /faculty/announcements/:announcementId`

### Community 180 - "PAGE 12: Settings"
Cohesion: 0.40
Nodes (5): Attendance Rules tab, PAGE 12: Settings, Profile, Security, Notifications tabs, Semesters & Years tab, University tab

### Community 181 - "PAGE 11: Calendar"
Cohesion: 0.40
Nodes (5): `DELETE /hod/calendar/events/:eventId`, `GET /hod/calendar/events`, PAGE 11: Calendar, `POST /hod/calendar/events`, `PUT /hod/calendar/events/:eventId`

### Community 182 - "PAGE 2: Dashboard"
Cohesion: 0.40
Nodes (5): `GET /hod/dashboard/activity-feed`, `GET /hod/dashboard/at-risk`, `GET /hod/dashboard/attendance-trend`, `GET /hod/dashboard/summary`, PAGE 2: Dashboard

### Community 183 - "5. Results"
Cohesion: 0.40
Nodes (5): 5. Results, `GET /student/results`, `GET /student/results/phase-progress`, `GET /student/results/semester/:semesterId`, `GET /student/results/summary`

### Community 184 - "7. Faculty Notes — View & Download"
Cohesion: 0.40
Nodes (5): 7. Faculty Notes — View & Download, `GET /student/notes`, `GET /student/notes/:noteId`, `GET /student/notes/:noteId/download`, `GET /student/notes/:noteId/flashcards`

### Community 187 - "11. Calendar"
Cohesion: 0.50
Nodes (4): 11. Calendar, `GET /student/calendar/events`, `GET /student/calendar/events/upcoming`, `GET /student/calendar/phase-timeline`

### Community 188 - "15. Leaderboard"
Cohesion: 0.50
Nodes (4): 15. Leaderboard, `GET /student/leaderboard`, `GET /student/leaderboard/my-rank`, `GET /student/leaderboard/subject/:subjectId`

### Community 189 - "3. Academic Journey & Enrollment History"
Cohesion: 0.50
Nodes (4): 3. Academic Journey & Enrollment History, `GET /student/enrollment/current`, `GET /student/enrollment/history`, `GET /student/subjects`

### Community 190 - "6. Attendance"
Cohesion: 0.50
Nodes (4): 6. Attendance, `GET /student/attendance`, `GET /student/attendance/history`, `GET /student/attendance/:subjectId/log`

### Community 273 - "tsx"
Cohesion: 0.29
Nodes (3): FALLBACK, KNOWN, Visual

## Knowledge Gaps
- **839 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+834 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **61 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `UniPortal — REST API Reference` connect `2. Dashboard` to `1. Auth & Session`, `12. Settings Page`, `9. Analytics Page`, `4. Faculty Page`, `3. Students Page`, `5. Results Page`, `6. Attendance Page`, `10. Promotion Page`, `8. Mentorship Page`, `11. Calendar Page`, `7. Subjects Page`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `Affected Endpoints — Full Corrected List` connect `Affected Endpoints — Full Corrected List` to `PAGE 7: Subjects`, `UniPortal — HOD Scoping Architecture`, `PAGE 9: Analytics`, `PAGE 3: Students`, `PAGE 12: Settings`, `PAGE 11: Calendar`, `PAGE 2: Dashboard`, `PAGE 5: Results`, `PAGE 4: Faculty`, `PAGE 8: Mentorship`, `PAGE 6: Attendance`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Why does `prisma` connect `Backend Bootstrap & Routing` to `Backend Domain Types & HOD Service`, `Portal Service Core Logic`, `Database Seed Script`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _839 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Backend Bootstrap & Routing` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Should `Backend Domain Types & HOD Service` be split into smaller, more focused modules?**
  _Cohesion score 0.11033681765389082 - nodes in this community are weakly interconnected._
- **Should `Frontend API Client Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.057692307692307696 - nodes in this community are weakly interconnected._