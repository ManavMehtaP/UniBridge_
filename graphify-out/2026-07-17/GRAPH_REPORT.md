# Graph Report - UniBridge_  (2026-07-17)

## Corpus Check
- 169 files · ~227,211 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 999 nodes · 1162 edges · 129 communities (79 shown, 50 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `713edf76`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- UniBridge Free-Tier Deployment Plan
- Confirmed Bugs
- UniBridge Frontend & Backend Changes for Faster Response
- Observability: verify every performance change
- Backend changes
- Frontend changes
- Secure deployment plan
- devDependencies
- compilerOptions
- dependencies
- storage.ts
- AppShell.tsx
- compilerOptions
- seed.ts
- compilerOptions
- TimetablePage.tsx
- faculty.ts
- student.ts
- Button.tsx
- PromotionPage.tsx
- SettingsPage.tsx
- common.ts
- StatCard.tsx
- ExamsPage.tsx
- HodOnboardingModal.tsx
- seed-sy3-timetable-attendance.ts
- getStudentEnrollment
- index.tsx
- FacultyPage.tsx
- ResultsPage.tsx
- SubjectsPage.tsx
- authStore.ts
- NotesPage.tsx
- StudentsPage.tsx
- auth.ts
- download.ts
- schedule.tsx
- SettingsPage.tsx
- CalendarPage.tsx
- ExamPanelPage.tsx
- SettingsPage.tsx
- facultyActiveSemester
- MenteesPage.tsx
- FacultyPage.tsx
- PromotionDashboardPage.tsx
- SubjectsPage.tsx
- YearsPage.tsx
- index.tsx
- getFacultyScopeData
- CsvUploadModal.tsx
- StudentProfileModal.tsx
- Badge.tsx
- QuizzesPage.tsx
- AnnouncementsPage.tsx
- App.tsx
- CalendarGrid.tsx
- ProgressBar.tsx
- Select.tsx
- AttendancePage.tsx
- CalendarPage.tsx
- DashboardPage.tsx
- SubjectFormModal.tsx
- CalendarPage.tsx
- DashboardPage.tsx
- SelfNotesPage.tsx
- StudyPlannerPage.tsx
- TimetablePage.tsx
- BranchesPage.tsx
- hodAllBatchIds
- AttendancePctCell.tsx
- ExportMenu.tsx
- NotificationBell.tsx
- PageShell.tsx
- Avatar.tsx
- EmptyState.tsx
- IconButton.tsx
- Input.tsx
- Tabs.tsx
- Textarea.tsx
- LoginPage.tsx
- SchedulePage.tsx
- StudentsPage.tsx
- AttendancePage.tsx
- DashboardPage.tsx
- NotificationsPage.tsx
- LeaderboardPage.tsx
- NotesPage.tsx
- historyStore.ts
- uiStore.ts
- vite-env.d.ts
- tsconfig.json
- getAttendanceRules
- buildPagination
- env.ts
- vercel.json

## God Nodes (most connected - your core abstractions)
1. `Store` - 24 edges
2. `compilerOptions` - 21 edges
3. `compilerOptions` - 16 edges
4. `prisma` - 12 edges
5. `compilerOptions` - 12 edges
6. `seedCohort()` - 9 edges
7. `scripts` - 8 edges
8. `uploadObject()` - 8 edges
9. `presignGetUrl()` - 8 edges
10. `ApiError` - 8 edges

## Surprising Connections (you probably didn't know these)
- `createApp()` --indirect_call--> `errorHandler()`  [INFERRED]
  Backend/src/app.ts → Backend/src/middleware/errorHandler.ts
- `createApp()` --indirect_call--> `notFoundHandler()`  [INFERRED]
  Backend/src/app.ts → Backend/src/middleware/errorHandler.ts
- `paginate()` --calls--> `buildPagination()`  [EXTRACTED]
  Backend/src/services/portal.service.ts → Backend/src/utils/http.ts
- `FacultyResultsResponse` --inherits--> `PaginatedResponse`  [EXTRACTED]
  frontend/src/types/faculty.ts → frontend/src/types/common.ts
- `MenteeListResponse` --inherits--> `PaginatedResponse`  [EXTRACTED]
  frontend/src/types/faculty.ts → frontend/src/types/common.ts

## Import Cycles
- None detected.

## Communities (129 total, 50 thin omitted)

### Community 0 - "UniBridge Free-Tier Deployment Plan"
Cohesion: 0.07
Nodes (37): WIPE_TABLES, chunkedCreate(), gradeFor(), main(), rand(), adapter, pool, prisma (+29 more)

### Community 1 - "Confirmed Bugs"
Cohesion: 0.11
Nodes (35): Store, HodService, StudentListParams, AcademicYear, AcademicYearStatus, Activity, ArchiveJob, AttendanceRecord (+27 more)

### Community 2 - "UniBridge Frontend & Backend Changes for Faster Response"
Cohesion: 0.06
Nodes (27): authApi, api, queue, facultyApi, Params, hodApi, Params, SubjectComponentCfg (+19 more)

### Community 3 - "Observability: verify every performance change"
Cohesion: 0.06
Nodes (3): DAY_LABELS, Scope, Role

### Community 4 - "Backend changes"
Cohesion: 0.06
Nodes (33): dependencies, compression, cors, dotenv, express, helmet, morgan, multer (+25 more)

### Community 5 - "Frontend changes"
Cohesion: 0.07
Nodes (28): autoprefixer, devDependencies, autoprefixer, postcss, tailwindcss, @types/node, @types/react, @types/react-dom (+20 more)

### Community 6 - "Secure deployment plan"
Cohesion: 0.08
Nodes (28): YearLevel, AcademicYearWithSemesters, ActivityItem, AnalyticsKpi, AssignmentRow, AtRiskRow, AttendanceStatSummary, AttendanceTableRow (+20 more)

### Community 7 - "devDependencies"
Cohesion: 0.07
Nodes (27): devDependencies, @types/compression, @types/cors, @types/express, @types/morgan, @types/node, @types/pg, typescript (+19 more)

### Community 8 - "compilerOptions"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, baseUrl, composite, isolatedModules, jsx, lib, module (+19 more)

### Community 9 - "dependencies"
Cohesion: 0.07
Nodes (27): axios, clsx, date-fns, dependencies, axios, clsx, date-fns, lucide-react (+19 more)

### Community 10 - "storage.ts"
Cohesion: 0.18
Nodes (18): createApp(), env, envSchema, amzDate(), basePath, enc(), encPath(), hmac() (+10 more)

### Community 11 - "AppShell.tsx"
Cohesion: 0.17
Nodes (11): facultyNavItems, hodNavItems, studentNavItems, NavItem, NavSection, universityNavItems, SemesterHistorySelector(), roleLabel (+3 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, composite, isolatedModules, lib, module, moduleDetection, moduleResolution (+12 more)

### Community 13 - "seed.ts"
Cohesion: 0.16
Nodes (19): Cohort, COHORTS, ensureAcademicYear(), ensureAllSemesters(), ensureBatch(), ensureBranch(), ensureFacultyPool(), ensureHod() (+11 more)

### Community 14 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, resolveJsonModule, rootDir (+10 more)

### Community 15 - "TimetablePage.tsx"
Cohesion: 0.13
Nodes (10): BASE, DAYS, HodTimetablePage(), isLab(), isOther(), LAB, OTHER, Palette (+2 more)

### Community 16 - "faculty.ts"
Cohesion: 0.14
Nodes (15): PaginatedResponse, AttendanceSessionRow, ChatMsg, FacultyAnnouncement, FacultyDashboardStats, FacultyNote, FacultyQuiz, FacultyResultRow (+7 more)

### Community 17 - "student.ts"
Cohesion: 0.12
Nodes (15): AIConversation, AIMessage, AttendancePerSubject, LeaderboardEntry, PaginatedAnnouncements, PaginatedNotes, PaginatedQuizzes, SelfNote (+7 more)

### Community 18 - "Button.tsx"
Cohesion: 0.16
Nodes (10): Button, ButtonProps, Size, sizes, Variant, variants, ConfirmDialogProps, Modal() (+2 more)

### Community 19 - "PromotionPage.tsx"
Cohesion: 0.14
Nodes (5): LeaderRow, PromoContext, STEPS, YEAR_LABEL, YearPreview

### Community 21 - "common.ts"
Cohesion: 0.18
Nodes (10): AcademicYear, Announcement, ApiError, AttendanceSummary, Batch, CalendarEvent, ChatMessage, Phase (+2 more)

### Community 22 - "StatCard.tsx"
Cohesion: 0.22
Nodes (5): Card(), StatCardProps, Trend, TrendIcon, trendPill

### Community 23 - "ExamsPage.tsx"
Cohesion: 0.20
Nodes (6): AssignmentStudents, examApi, ExamAssignment, ExamContext, STATUS_TONE, YEAR_LABEL

### Community 25 - "seed-sy3-timetable-attendance.ts"
Cohesion: 0.36
Nodes (8): chunked(), clamp(), GRID, LECTURES, main(), rand(), studentBase(), T

### Community 26 - "getStudentEnrollment"
Cohesion: 0.22
Nodes (9): batchById(), currentEnrollmentForStudent(), ensureStudentSubject(), getMentorAssignment(), getStudentEnrollment(), getStudentMentorAssignment(), getStudentSubjectIds(), getStudentUser() (+1 more)

### Community 27 - "index.tsx"
Cohesion: 0.22
Nodes (3): axis, COLORS, tooltipStyle

### Community 28 - "FacultyPage.tsx"
Cohesion: 0.28
Nodes (4): AddFacultyModal(), YEAR_OPTIONS, FacultyDetailModal(), YEAR_LABEL

### Community 29 - "ResultsPage.tsx"
Cohesion: 0.25
Nodes (5): EditMarksModal(), gradeFor(), Preview, PreviewRow, UploadContext

### Community 30 - "SubjectsPage.tsx"
Cohesion: 0.25
Nodes (5): Comp, FacultyGroup, groupByFaculty(), SubjectsPage(), THEORY_RULES

### Community 31 - "authStore.ts"
Cohesion: 0.36
Nodes (8): AuthStore, homePathOf(), portalOf(), useAuthStore, useIsFaculty(), useIsHod(), useIsStudent(), useUser()

### Community 32 - "NotesPage.tsx"
Cohesion: 0.32
Nodes (4): Assignment, EditNoteModal(), toIso(), UploadNoteModal()

### Community 33 - "StudentsPage.tsx"
Cohesion: 0.29
Nodes (4): AddStudentModal(), BRANCHES, STATUSES, statusTone

### Community 34 - "auth.ts"
Cohesion: 0.25
Nodes (6): AuthUser, LoginResponse, LoginRole, RefreshResponse, University, UserRole

### Community 35 - "download.ts"
Cohesion: 0.48
Nodes (6): blobError(), downloadExport(), downloadFile(), ExportFormat, Params, saveBlob()

### Community 36 - "schedule.tsx"
Cohesion: 0.29
Nodes (3): FALLBACK, KNOWN, Visual

### Community 38 - "CalendarPage.tsx"
Cohesion: 0.29
Nodes (4): LEGEND, MONTHS, TYPE_LABEL, TYPES

### Community 39 - "ExamPanelPage.tsx"
Cohesion: 0.29
Nodes (4): Coordinator, examApi, ExamAssignment, STATUS_TONE

### Community 41 - "facultyActiveSemester"
Cohesion: 0.40
Nodes (6): facultyActiveSemester(), getActiveSemester(), getSemester(), hodActiveSemester(), requireExamCoordinator(), scopeSemester()

### Community 46 - "PromotionDashboardPage.tsx"
Cohesion: 0.33
Nodes (4): statusLabel, statusTone, YEAR_LABEL, YEARS

### Community 48 - "YearsPage.tsx"
Cohesion: 0.33
Nodes (3): LEVEL_TO_SEM, SEM_TONE, YEAR_TONE

### Community 49 - "index.tsx"
Cohesion: 0.47
Nodes (3): router, ProtectedRoute(), RoleRouter()

### Community 50 - "getFacultyScopeData"
Cohesion: 0.40
Nodes (5): ensureFacultyAssignedBatch(), ensureFacultyAssignedSubject(), getFacultyAssignments(), getFacultyScopeData(), getFacultyVisibleEnrollments()

### Community 53 - "Badge.tsx"
Cohesion: 0.40
Nodes (3): BadgeProps, Tone, tones

### Community 60 - "Select.tsx"
Cohesion: 0.50
Nodes (3): Select, SelectOption, SelectProps

### Community 71 - "hodAllBatchIds"
Cohesion: 0.67
Nodes (3): hodAllBatchIds(), hodEnrollmentWhere(), scopedCurrentEnrollments()

## Knowledge Gaps
- **380 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+375 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **50 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `prisma` connect `UniBridge Free-Tier Deployment Plan` to `seed-sy3-timetable-attendance.ts`, `Observability: verify every performance change`, `seed.ts`, `Confirmed Bugs`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Backend changes` to `devDependencies`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `Frontend changes`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _380 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UniBridge Free-Tier Deployment Plan` be split into smaller, more focused modules?**
  _Cohesion score 0.06663141195134849 - nodes in this community are weakly interconnected._
- **Should `Confirmed Bugs` be split into smaller, more focused modules?**
  _Cohesion score 0.10631229235880399 - nodes in this community are weakly interconnected._
- **Should `UniBridge Frontend & Backend Changes for Faster Response` be split into smaller, more focused modules?**
  _Cohesion score 0.059379217273954114 - nodes in this community are weakly interconnected._