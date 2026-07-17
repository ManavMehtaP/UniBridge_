# Graph Report - UniBridge_  (2026-07-14)

## Corpus Check
- 173 files · ~256,616 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1529 nodes · 1579 edges · 275 communities (133 shown, 142 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7daf84bd`
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
- Community 42
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
- Community 60
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
- Community 76
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
- Community 129
- Community 132
- Community 133
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
- UniPortal — REST API Reference
- 12. Analytics — Faculty View
- 4. Students — View Only
- 8. Announcements
- PAGE 12: Settings
- PAGE 11: Calendar
- PAGE 2: Dashboard
- 5. Results
- 7. Faculty Notes — View & Download
- 10. Results — View Only
- 3. My Schedule — Timetable & Assignments
- 11. Calendar
- 15. Leaderboard
- 3. Academic Journey & Enrollment History
- 6. Attendance
- README.md
- clsx
- react-dom
- react-router-dom
- @supabase/supabase-js
- @tanstack/react-query
- POST /auth/refresh
- CSV Upload Response Pattern (inserted/updated/errors)
- Standard Error Response Shape
- Forgot-Password Always-200 (prevent user enumeration)
- HOD Analytics Endpoints
- HOD Calendar Endpoints
- HOD Dashboard Endpoints
- HOD Faculty Endpoints
- HOD Mentorship Endpoints
- HOD Promotion Endpoints (year promotion)
- UniPortal HOD REST API Reference
- HOD Settings Endpoints
- HOD Students Endpoints
- HOD Subjects Endpoints
- JWT Bearer Access/Refresh Token Auth
- requireRole('HOD') Middleware (isHod check)
- Results Publish (irreversible, student-visible)
- POST /faculty/quizzes/ai-generate (Django AI)
- Faculty Attendance (mark/track)
- facultyScope Middleware (assignedBatchIds/SubjectIds/mentorStudentIds)
- GET /faculty/my-scope
- Faculty Notes (upload + AI summary/flashcards)
- Faculty Quizzes (create + AI generate)
- UniPortal Faculty API Reference
- Faculty Socket.io Chat Events
- Faculty Results (view-only)
- AppShell (one layout, three sidebars)
- Zustand authStore (single source of truth)
- Axios client with JWT refresh interceptor + queue
- Frontend Scoping Enforcement (dropdowns from scope)
- ProtectedRoute (token gate)
- RoleRouter (role-based portal redirect)
- Single React App, Role Detected from JWT
- Frontend Tech Stack (React 19, Vite, Zustand, TanStack Query)
- useFacultyScope hook (/faculty/my-scope)
- useHodScope hook (/hod/my-scope)
- useSocket hook (Socket.io singleton, Faculty+Student only)
- useStudentEnrollment hook (/student/enrollment/current)
- POST /admin/hod-scope (super-admin batch assignment)
- HOD Scoping Architecture
- Query-time batchId IN (req.hodBatchIds) Filtering
- HodBatchScope Table
- hodScope Middleware (injects req.hodBatchIds)
- Multiple HODs, One HOD Per Batch
- GET /hod/my-scope
- Ownership Resolved Through Batch, No hodId FK
- HOD Scope Error Codes (BATCH_NOT_IN_SCOPE etc.)
- Attendance % Redis Cache (5-min TTL)
- Django AI Service (RAG, quiz gen, PYQ, notes)
- Critical Domain Rules
- enrollment_no as Permanent Student Identity
- UniPortal Full SaaS Build Plan
- HOD is a Faculty (isHod flag)
- JWT Auth Strategy (access + refresh tokens)
- Multi-Tenant Isolation by universityId
- 5-Phase Build Plan
- Prisma Data Model (Complete Schema)
- Socket.io Mentor Chat System + Redis Presence
- StudentEnrollment Pivot (rollNo + batch per semester)
- Tenant Middleware (subdomain → req.university)
- Student AI Assistant (RAG, PYQ, smart notes)
- Student Attendance (per-subject, threshold)
- Student Enrollment/Academic Journey History
- Student Leaderboard (own batch, privacy-limited)
- Student Mentor Chat (1:1, one mentor per semester)
- Student Sees Own Data Only (golden rules)
- Student Quizzes (attempt + review)
- UniPortal Student API Reference
- Student Results Visible Only After Publish
- Student Socket.io Chat Events
- studentScope Middleware (req.student, req.currentEnrollment)
- Student Study Planner (AI-suggested plan)
- dotenv
- express
- pg
- prisma
- @prisma/client
- tsx

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
- `Vite index.html Entry Point` --conceptually_related_to--> `UniPortal Multi-Role React Architecture`  [INFERRED]
  frontend/index.html → FRONTEND.md
- `Login Background (Mobile)` --semantically_similar_to--> `Login Background (Desktop)`  [INFERRED] [semantically similar]
  frontend/public/assets/login-bg-mobile.png → frontend/public/assets/login-bg.png
- `createApp()` --indirect_call--> `errorHandler()`  [INFERRED]
  Backend/src/app.ts → Backend/src/middleware/errorHandler.ts
- `createApp()` --indirect_call--> `notFoundHandler()`  [INFERRED]
  Backend/src/app.ts → Backend/src/middleware/errorHandler.ts
- `paginate()` --calls--> `buildPagination()`  [EXTRACTED]
  Backend/src/services/portal.service.ts → Backend/src/utils/http.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Role-Based Scoping Middleware Pattern** — hod_scoping_hod_scope_middleware, faculty_api_faculty_scope_middleware, student_api_student_scope_middleware [INFERRED 0.85]
- **Three-Portal API Contract Set (HOD/Faculty/Student)** — api_hod_rest_reference, faculty_api_reference, student_api_reference, frontend_multi_role_architecture [EXTRACTED 1.00]
- **Mentor Chat Real-Time Flow** — student_api_mentor_chat, faculty_api_mentorship_chat, plan_socketio_chat_system, frontend_use_socket [EXTRACTED 1.00]

## Communities (275 total, 142 thin omitted)

### Community 0 - "Backend Bootstrap & Routing"
Cohesion: 0.07
Nodes (29): WIPE_TABLES, createApp(), adapter, pool, prisma, universityId(), requireAuth(), requireFacultyPortal() (+21 more)

### Community 1 - "Backend Domain Types & HOD Service"
Cohesion: 0.10
Nodes (37): Store, HodService, StudentListParams, paginate(), AcademicYear, AcademicYearStatus, Activity, ArchiveJob (+29 more)

### Community 2 - "Frontend API Client Layer"
Cohesion: 0.06
Nodes (27): authApi, api, queue, facultyApi, Params, hodApi, Params, SubjectComponentCfg (+19 more)

### Community 3 - "Portal Service Core Logic"
Cohesion: 0.06
Nodes (5): DAY_LABELS, getAttendanceRules(), Scope, statusFromAttendancePctAndMarks(), Role

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

### Community 18 - "Architecture Plan & Domain Rules"
Cohesion: 0.04
Nodes (46): AI Assistant (Django RAG), Analytics — Faculty, Analytics — HOD, Announcements, Attendance System, Backend Tasks (Express), Chat System (Socket.io), Critical Domain Rules (Read Before Touching Any Code) (+38 more)

### Community 19 - "Shared UI Components"
Cohesion: 0.16
Nodes (10): Button, ButtonProps, Size, sizes, Variant, variants, ConfirmDialogProps, Modal() (+2 more)

### Community 20 - "HOD Promotion Page"
Cohesion: 0.14
Nodes (5): LeaderRow, PromoContext, STEPS, YEAR_LABEL, YearPreview

### Community 24 - "Common Shared Types"
Cohesion: 0.18
Nodes (10): AcademicYear, Announcement, ApiError, AttendanceSummary, Batch, CalendarEvent, ChatMessage, Phase (+2 more)

### Community 26 - "Community 26"
Cohesion: 0.22
Nodes (5): Card(), StatCardProps, Trend, trendClass, trendGlyph

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
Cohesion: 0.25
Nodes (6): AuthUser, LoginResponse, LoginRole, RefreshResponse, University, UserRole

### Community 39 - "Community 39"
Cohesion: 0.29
Nodes (4): LEGEND, MONTHS, TYPE_LABEL, TYPES

### Community 40 - "Community 40"
Cohesion: 0.29
Nodes (4): Coordinator, examApi, ExamAssignment, STATUS_TONE

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
Cohesion: 0.40
Nodes (5): ensureFacultyAssignedBatch(), ensureFacultyAssignedSubject(), getFacultyAssignments(), getFacultyScopeData(), getFacultyVisibleEnrollments()

### Community 55 - "Community 55"
Cohesion: 0.40
Nodes (3): BadgeProps, Tone, tones

### Community 57 - "Community 57"
Cohesion: 0.32
Nodes (4): Assignment, EditNoteModal(), toIso(), UploadNoteModal()

### Community 64 - "Community 64"
Cohesion: 0.50
Nodes (3): Select, SelectOption, SelectProps

### Community 75 - "Community 75"
Cohesion: 0.28
Nodes (13): env, envSchema, amzDate(), basePath, enc(), encPath(), hmac(), presignGetUrl() (+5 more)

### Community 76 - "Community 76"
Cohesion: 0.67
Nodes (3): hodAllBatchIds(), hodEnrollmentWhere(), scopedCurrentEnrollments()

### Community 99 - "Community 99"
Cohesion: 0.25
Nodes (8): scripts, build, dev, postinstall, prisma:generate, prisma:migrate, prisma:push, start

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
Cohesion: 0.33
Nodes (6): 2. Dashboard, `GET /hod/dashboard/activity-feed`, `GET /hod/dashboard/at-risk`, `GET /hod/dashboard/attendance-trend`, `GET /hod/dashboard/results-overview`, `GET /hod/dashboard/summary`

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

### Community 176 - "UniPortal — REST API Reference"
Cohesion: 0.40
Nodes (4): 13. Common Error Codes, Notes on Conventions Used Throughout, Table of Contents, UniPortal — REST API Reference

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

### Community 185 - "10. Results — View Only"
Cohesion: 0.50
Nodes (4): 10. Results — View Only, `GET /faculty/results`, `GET /faculty/results/leaderboard`, `GET /faculty/results/summary`

### Community 186 - "3. My Schedule — Timetable & Assignments"
Cohesion: 0.50
Nodes (4): 11. Calendar — View & Post, `GET /faculty/calendar/events`, `GET /faculty/calendar/events/upcoming`, `GET /faculty/calendar/phase-timeline`

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

## Knowledge Gaps
- **848 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+843 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **142 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `UniPortal — Student API Reference` connect `UniPortal — Student API Reference` to `13. AI Assistant`, `2. Student Profile & Dashboard`, `12. Mentor Chat`, `9. Quizzes — Attempt & Review`, `10. Announcements`, `14. Study Planner`, `1. Auth & Session`, `8. Self Notes`, `5. Results`, `7. Faculty Notes — View & Download`, `11. Calendar`, `15. Leaderboard`, `3. Academic Journey & Enrollment History`, `6. Attendance`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `Affected Endpoints — Full Corrected List` connect `Affected Endpoints — Full Corrected List` to `PAGE 7: Subjects`, `UniPortal — HOD Scoping Architecture`, `PAGE 9: Analytics`, `PAGE 3: Students`, `PAGE 12: Settings`, `PAGE 11: Calendar`, `PAGE 2: Dashboard`, `PAGE 5: Results`, `PAGE 4: Faculty`, `PAGE 8: Mentorship`, `PAGE 6: Attendance`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Why does `UniPortal — Faculty API Reference` connect `UniPortal — Faculty API Reference` to `5. Attendance — Mark & Track`, `6. Notes — Upload & Manage`, `1. Auth & Session`, `7. Quiz — Create & Manage`, `12. Analytics — Faculty View`, `4. Students — View Only`, `8. Announcements`, `2. Faculty Profile & Dashboard`, `10. Results — View Only`, `3. My Schedule — Timetable & Assignments`, `9. Mentorship — Mentee List & Chat`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _848 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Backend Bootstrap & Routing` be split into smaller, more focused modules?**
  _Cohesion score 0.07467532467532467 - nodes in this community are weakly interconnected._
- **Should `Backend Domain Types & HOD Service` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Frontend API Client Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.057692307692307696 - nodes in this community are weakly interconnected._