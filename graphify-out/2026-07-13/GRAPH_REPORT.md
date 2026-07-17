# Graph Report - .  (2026-07-13)

## Corpus Check
- 175 files · ~254,829 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1024 nodes · 1158 edges · 136 communities (83 shown, 53 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

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
- Community 128
- Community 129
- Community 132
- Community 133

## God Nodes (most connected - your core abstractions)
1. `Store` - 24 edges
2. `compilerOptions` - 21 edges
3. `UniPortal HOD REST API Reference` - 19 edges
4. `compilerOptions` - 16 edges
5. `compilerOptions` - 12 edges
6. `UniPortal Full SaaS Build Plan` - 11 edges
7. `UniPortal Student API Reference` - 11 edges
8. `prisma` - 10 edges
9. `seedCohort()` - 9 edges
10. `UniPortal Multi-Role React Architecture` - 9 edges

## Surprising Connections (you probably didn't know these)
- `facultyScope Middleware (assignedBatchIds/SubjectIds/mentorStudentIds)` --semantically_similar_to--> `hodScope Middleware (injects req.hodBatchIds)`  [INFERRED] [semantically similar]
  Faculty_API.md → HOD_SCOPING.md
- `Student Results Visible Only After Publish` --semantically_similar_to--> `Results Publish (irreversible, student-visible)`  [INFERRED] [semantically similar]
  Student_API.md → API.md
- `studentScope Middleware (req.student, req.currentEnrollment)` --semantically_similar_to--> `facultyScope Middleware (assignedBatchIds/SubjectIds/mentorStudentIds)`  [INFERRED] [semantically similar]
  Student_API.md → Faculty_API.md
- `seed.ts — LJU tenant HOD seed script` --conceptually_related_to--> `HOD Scoping Architecture`  [INFERRED]
  Backend/scripts/README.md → HOD_SCOPING.md
- `Vite index.html Entry Point` --conceptually_related_to--> `UniPortal Multi-Role React Architecture`  [INFERRED]
  frontend/index.html → FRONTEND.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Role-Based Scoping Middleware Pattern** — hod_scoping_hod_scope_middleware, faculty_api_faculty_scope_middleware, student_api_student_scope_middleware [INFERRED 0.85]
- **Three-Portal API Contract Set (HOD/Faculty/Student)** — api_hod_rest_reference, faculty_api_reference, student_api_reference, frontend_multi_role_architecture [EXTRACTED 1.00]
- **Mentor Chat Real-Time Flow** — student_api_mentor_chat, faculty_api_mentorship_chat, plan_socketio_chat_system, frontend_use_socket [EXTRACTED 1.00]

## Communities (136 total, 53 thin omitted)

### Community 0 - "Backend Bootstrap & Routing"
Cohesion: 0.07
Nodes (31): WIPE_TABLES, createApp(), env, envSchema, adapter, pool, prisma, universityId() (+23 more)

### Community 1 - "Backend Domain Types & HOD Service"
Cohesion: 0.11
Nodes (35): Store, HodService, StudentListParams, AcademicYear, AcademicYearStatus, Activity, ArchiveJob, AttendanceRecord (+27 more)

### Community 2 - "Frontend API Client Layer"
Cohesion: 0.06
Nodes (27): authApi, api, queue, facultyApi, Params, hodApi, Params, SubjectComponentCfg (+19 more)

### Community 3 - "Portal Service Core Logic"
Cohesion: 0.06
Nodes (3): DAY_LABELS, Scope, Role

### Community 4 - "Frontend Build Tooling"
Cohesion: 0.07
Nodes (28): autoprefixer, devDependencies, autoprefixer, postcss, tailwindcss, @types/node, @types/react, @types/react-dom (+20 more)

### Community 5 - "Backend Dependencies"
Cohesion: 0.07
Nodes (29): dependencies, compression, cors, dotenv, express, helmet, morgan, multer (+21 more)

### Community 6 - "HOD Frontend Types"
Cohesion: 0.08
Nodes (28): YearLevel, AcademicYearWithSemesters, ActivityItem, AnalyticsKpi, AssignmentRow, AtRiskRow, AttendanceStatSummary, AttendanceTableRow (+20 more)

### Community 7 - "Backend Dev Tooling"
Cohesion: 0.07
Nodes (27): devDependencies, @types/compression, @types/cors, @types/express, @types/morgan, @types/node, @types/pg, typescript (+19 more)

### Community 8 - "Frontend TS App Config"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, baseUrl, composite, isolatedModules, jsx, lib, module (+19 more)

### Community 9 - "Frontend Runtime Dependencies"
Cohesion: 0.08
Nodes (25): axios, clsx, date-fns, dependencies, axios, clsx, date-fns, lucide-react (+17 more)

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
Cohesion: 0.13
Nodes (15): Common Error Codes (HOD), CSV Upload Response Pattern (inserted/updated/errors), Standard Error Response Shape, HOD Analytics Endpoints, HOD Calendar Endpoints, HOD Dashboard Endpoints, HOD Faculty Endpoints, HOD Mentorship Endpoints (+7 more)

### Community 18 - "Architecture Plan & Domain Rules"
Cohesion: 0.15
Nodes (15): HOD Promotion Endpoints (year promotion), useSocket hook (Socket.io singleton, Faculty+Student only), Multiple HODs, One HOD Per Batch, Attendance % Redis Cache (5-min TTL), Critical Domain Rules, enrollment_no as Permanent Student Identity, UniPortal Full SaaS Build Plan, HOD is a Faculty (isHod flag) (+7 more)

### Community 19 - "Shared UI Components"
Cohesion: 0.16
Nodes (10): Button, ButtonProps, Size, sizes, Variant, variants, ConfirmDialogProps, Modal() (+2 more)

### Community 20 - "HOD Promotion Page"
Cohesion: 0.14
Nodes (5): LeaderRow, PromoContext, STEPS, YEAR_LABEL, YearPreview

### Community 21 - "Faculty & AI Service API Docs"
Cohesion: 0.17
Nodes (12): HOD Attendance Endpoints, POST /faculty/quizzes/ai-generate (Django AI), Faculty Attendance (mark/track), GET /faculty/my-scope, Faculty Notes (upload + AI summary/flashcards), Faculty Quizzes (create + AI generate), UniPortal Faculty API Reference, Faculty Results (view-only) (+4 more)

### Community 22 - "Student API Contract Docs"
Cohesion: 0.18
Nodes (12): HOD Results Endpoints (4-step upload wizard), Results Publish (irreversible, student-visible), facultyScope Middleware (assignedBatchIds/SubjectIds/mentorStudentIds), useStudentEnrollment hook (/student/enrollment/current), Student Enrollment/Academic Journey History, Student Leaderboard (own batch, privacy-limited), Student Sees Own Data Only (golden rules), Student Quizzes (attempt + review) (+4 more)

### Community 24 - "Common Shared Types"
Cohesion: 0.18
Nodes (10): AcademicYear, Announcement, ApiError, AttendanceSummary, Batch, CalendarEvent, ChatMessage, Phase (+2 more)

### Community 25 - "Community 25"
Cohesion: 0.24
Nodes (10): seed.ts — LJU tenant HOD seed script, Frontend Scoping Enforcement (dropdowns from scope), POST /admin/hod-scope (super-admin batch assignment), HOD Scoping Architecture, Query-time batchId IN (req.hodBatchIds) Filtering, HodBatchScope Table, hodScope Middleware (injects req.hodBatchIds), Ownership Resolved Through Batch, No hodId FK (+2 more)

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

### Community 35 - "Community 35"
Cohesion: 0.25
Nodes (8): AppShell (one layout, three sidebars), Zustand authStore (single source of truth), Vite index.html Entry Point, UniPortal Multi-Role React Architecture, ProtectedRoute (token gate), RoleRouter (role-based portal redirect), Single React App, Role Detected from JWT, Frontend Tech Stack (React 19, Vite, Zustand, TanStack Query)

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

### Community 42 - "Community 42"
Cohesion: 0.33
Nodes (6): POST /auth/login, POST /auth/refresh, Forgot-Password Always-200 (prevent user enumeration), JWT Bearer Access/Refresh Token Auth, Axios client with JWT refresh interceptor + queue, JWT Auth Strategy (access + refresh tokens)

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

### Community 60 - "Community 60"
Cohesion: 0.67
Nodes (4): Faculty Mentorship & Chat, Faculty Socket.io Chat Events, Student Mentor Chat (1:1, one mentor per semester), Student Socket.io Chat Events

### Community 64 - "Community 64"
Cohesion: 0.50
Nodes (3): Select, SelectOption, SelectProps

### Community 76 - "Community 76"
Cohesion: 0.67
Nodes (3): hodAllBatchIds(), hodEnrollmentWhere(), scopedCurrentEnrollments()

## Knowledge Gaps
- **395 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+390 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **53 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `prisma` connect `Backend Bootstrap & Routing` to `Backend Domain Types & HOD Service`, `Portal Service Core Logic`, `Database Seed Script`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `ApiError` connect `Backend Bootstrap & Routing` to `Backend Domain Types & HOD Service`, `Portal Service Core Logic`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `UniPortal HOD REST API Reference` connect `HOD API Contract Docs` to `Community 35`, `Community 42`, `Architecture Plan & Domain Rules`, `Faculty & AI Service API Docs`, `Student API Contract Docs`, `Community 25`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _395 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Backend Bootstrap & Routing` be split into smaller, more focused modules?**
  _Cohesion score 0.0701344243132671 - nodes in this community are weakly interconnected._
- **Should `Backend Domain Types & HOD Service` be split into smaller, more focused modules?**
  _Cohesion score 0.11033681765389082 - nodes in this community are weakly interconnected._
- **Should `Frontend API Client Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.057692307692307696 - nodes in this community are weakly interconnected._