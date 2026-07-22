# Graph Report - UniBridge_  (2026-07-22)

## Corpus Check
- 200 files · ~242,609 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1292 nodes · 2418 edges · 158 communities (93 shown, 65 thin omitted)
- Extraction: 72% EXTRACTED · 28% INFERRED · 0% AMBIGUOUS · INFERRED: 671 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f53250af`
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
- Table.tsx
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
- AIAssistantPage.tsx
- vercel.json
- hod.ts
- StudentsPage.tsx
- faculty.ts
- useTableSort.ts
- http.ts
- studyPlanner.service.ts
- app.ts
- package.json
- scripts
- studentAiBridge.service.ts
- package.json
- settings.py
- StudentAiConfig
- prisma
- @prisma/adapter-pg
- @prisma/client
- @types/pdfkit
- zod
- clsx
- react-dom
- react-router-dom
- @tanstack/react-query

## God Nodes (most connected - your core abstractions)
1. `StudentContextMixin` - 49 edges
2. `StudyPlan` - 43 edges
3. `StudentAIChatSession` - 42 edges
4. `NoteInsight` - 41 edges
5. `StudyPlanTask` - 41 edges
6. `PYQInsight` - 40 edges
7. `ChatDetailView` - 35 edges
8. `ChatListCreateView` - 33 edges
9. `StudyPlanListCreateView` - 33 edges
10. `StudyPlanTaskView` - 33 edges

## Surprising Connections (you probably didn't know these)
- `get_marks_model_metadata()` --calls--> `model_metadata()`  [INFERRED]
  AI Assistant/Django AI assistant/student_ai/services/marks.py → AI Assistant/Django AI assistant/predictor.py
- `predict_final_score()` --calls--> `build_features()`  [INFERRED]
  AI Assistant/Django AI assistant/predictor.py → AI Assistant/Django AI assistant/model.py
- `train_marks_model()` --calls--> `train_model()`  [INFERRED]
  AI Assistant/Django AI assistant/student_ai/services/marks.py → AI Assistant/Django AI assistant/model.py
- `predict_final_score()` --calls--> `get_model()`  [INFERRED]
  AI Assistant/Django AI assistant/predictor.py → AI Assistant/Django AI assistant/model.py
- `load_model()` --calls--> `get_model()`  [INFERRED]
  AI Assistant/Django AI assistant/student_ai/services/marks.py → AI Assistant/Django AI assistant/model.py

## Import Cycles
- None detected.

## Communities (158 total, 65 thin omitted)

### Community 0 - "UniBridge Free-Tier Deployment Plan"
Cohesion: 0.05
Nodes (47): WIPE_TABLES, chunkedCreate(), gradeFor(), main(), rand(), chunked(), clamp(), GRID (+39 more)

### Community 1 - "Confirmed Bugs"
Cohesion: 0.12
Nodes (33): Store, HodService, AcademicYear, AcademicYearStatus, Activity, ArchiveJob, AttendanceRecord, AttendanceRules (+25 more)

### Community 2 - "UniBridge Frontend & Backend Changes for Faster Response"
Cohesion: 0.06
Nodes (27): authApi, api, queue, facultyApi, Params, hodApi, Params, SubjectComponentCfg (+19 more)

### Community 3 - "Observability: verify every performance change"
Cohesion: 0.04
Nodes (15): DAY_LABELS, DAY_NAMES, DayStatus, formatStudyPlan(), getAttendanceRules(), hodAllBatchIds(), hodEnrollmentWhere(), NON_WORKING_TYPES (+7 more)

### Community 4 - "Backend changes"
Cohesion: 0.11
Nodes (19): dependencies, compression, cors, helmet, morgan, multer, pdfkit, pg (+11 more)

### Community 5 - "Frontend changes"
Cohesion: 0.11
Nodes (19): autoprefixer, devDependencies, autoprefixer, postcss, tailwindcss, @types/node, @types/react, @types/react-dom (+11 more)

### Community 6 - "Secure deployment plan"
Cohesion: 0.08
Nodes (28): YearLevel, AcademicYearWithSemesters, ActivityItem, AnalyticsKpi, AssignmentRow, AtRiskRow, AttendanceStatSummary, AttendanceTableRow (+20 more)

### Community 7 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, @types/compression, @types/cors, @types/express, @types/morgan, @types/node, @types/pg, typescript (+7 more)

### Community 8 - "compilerOptions"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, baseUrl, composite, isolatedModules, jsx, lib, module (+19 more)

### Community 9 - "dependencies"
Cohesion: 0.12
Nodes (17): date-fns, dependencies, date-fns, lucide-react, react, react-hot-toast, recharts, @supabase/supabase-js (+9 more)

### Community 10 - "storage.ts"
Cohesion: 0.38
Nodes (11): amzDate(), basePath, enc(), encPath(), hmac(), presignGetUrl(), sha256hex(), signingKey() (+3 more)

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
Cohesion: 0.11
Nodes (19): PaginatedResponse, AttendanceSessionRow, ChatMsg, DayStatus, FacultyAnnouncement, FacultyDashboardStats, FacultyNote, FacultyNoteDrive (+11 more)

### Community 17 - "student.ts"
Cohesion: 0.11
Nodes (17): AIConversation, AIMessage, AttendancePerSubject, LeaderboardEntry, PaginatedAnnouncements, PaginatedNotes, PaginatedQuizzes, SelfNote (+9 more)

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

### Community 26 - "getStudentEnrollment"
Cohesion: 0.22
Nodes (9): batchById(), currentEnrollmentForStudent(), ensureStudentSubject(), getMentorAssignment(), getStudentEnrollment(), getStudentMentorAssignment(), getStudentSubjectIds(), getStudentUser() (+1 more)

### Community 27 - "index.tsx"
Cohesion: 0.20
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
Cohesion: 0.24
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
Cohesion: 0.25
Nodes (5): LEGEND, MONTHS, NON_WORKING_TYPES, TYPE_LABEL, TYPES

### Community 39 - "ExamPanelPage.tsx"
Cohesion: 0.29
Nodes (4): Coordinator, examApi, ExamAssignment, STATUS_TONE

### Community 41 - "facultyActiveSemester"
Cohesion: 0.22
Nodes (11): ensureFacultyAssignedBatch(), ensureFacultyAssignedSubject(), facultyActiveSemester(), getActiveSemester(), getFacultyAssignments(), getFacultyScopeData(), getFacultyVisibleEnrollments(), getSemester() (+3 more)

### Community 46 - "PromotionDashboardPage.tsx"
Cohesion: 0.33
Nodes (4): statusLabel, statusTone, YEAR_LABEL, YEARS

### Community 48 - "YearsPage.tsx"
Cohesion: 0.33
Nodes (3): LEVEL_TO_SEM, SEM_TONE, YEAR_TONE

### Community 49 - "index.tsx"
Cohesion: 0.04
Nodes (52): FacAnalytics, FacAnnouncements, FacAttendance, FacCalendar, FacDashboard, FacExams, FacMentees, FacNotes (+44 more)

### Community 50 - "getFacultyScopeData"
Cohesion: 0.28
Nodes (61): AIConversation, BackgroundJob, CalendarEvent, Flashcard, Meta, Note, NoteInsight, Phase (+53 more)

### Community 53 - "Badge.tsx"
Cohesion: 0.40
Nodes (3): BadgeProps, Tone, tones

### Community 60 - "Select.tsx"
Cohesion: 0.50
Nodes (3): Select, SelectOption, SelectProps

### Community 68 - "StudyPlannerPage.tsx"
Cohesion: 0.40
Nodes (3): PlannerData, PlannerTask, SubjectOption

### Community 71 - "hodAllBatchIds"
Cohesion: 0.06
Nodes (31): AIServiceError, Any, SharedAIService, build_chat_sources(), get_student_context(), Student, _extract_from_path(), extract_text() (+23 more)

### Community 96 - "getAttendanceRules"
Cohesion: 0.13
Nodes (23): build_features(), _generate_synthetic_data(), get_model(), Any, Train and persist the best ML regressor for marks prediction., retrain_from_db(), train_model(), model_metadata() (+15 more)

### Community 132 - "useTableSort.ts"
Cohesion: 0.67
Nodes (3): getVal(), SortDir, useTableSort()

### Community 135 - "studyPlanner.service.ts"
Cohesion: 0.29
Nodes (13): activePhaseForToday(), addDays(), buildTasks(), generateStudyPlanForStudent(), getLatestStudyPlan(), nearestExamDate(), PhaseWindow, priorityFromPct() (+5 more)

### Community 136 - "app.ts"
Cohesion: 0.33
Nodes (7): createApp(), env, envSchema, errorHandler(), notFoundHandler(), apiRouter, app

### Community 137 - "package.json"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, preview, type (+1 more)

### Community 138 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, postinstall, prisma:generate, prisma:migrate, prisma:push, start

### Community 139 - "studentAiBridge.service.ts"
Cohesion: 0.39
Nodes (6): baseUrl(), DjangoResponse, requestInternal(), requestStudent(), serviceHeaders(), studentAiBridge

### Community 140 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

## Knowledge Gaps
- **450 isolated node(s):** `Meta`, `name`, `version`, `private`, `type` (+445 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **65 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `prisma` connect `UniBridge Free-Tier Deployment Plan` to `Observability: verify every performance change`, `seed.ts`, `studyPlanner.service.ts`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `hod.ts`, `package.json`, `clsx`, `react-dom`, `react-router-dom`, `@tanstack/react-query`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Backend changes` to `http.ts`, `package.json`, `settings.py`, `prisma`, `@prisma/adapter-pg`, `@prisma/client`, `@types/pdfkit`, `zod`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Are the 27 inferred relationships involving `StudentContextMixin` (e.g. with `AIConversation` and `BackgroundJob`) actually correct?**
  _`StudentContextMixin` has 27 INFERRED edges - model-reasoned connections that need verification._
- **Are the 36 inferred relationships involving `StudyPlan` (e.g. with `ChatCreateSerializer` and `ChatMessageSerializer`) actually correct?**
  _`StudyPlan` has 36 INFERRED edges - model-reasoned connections that need verification._
- **Are the 35 inferred relationships involving `StudentAIChatSession` (e.g. with `ChatCreateSerializer` and `ChatMessageSerializer`) actually correct?**
  _`StudentAIChatSession` has 35 INFERRED edges - model-reasoned connections that need verification._
- **Are the 35 inferred relationships involving `NoteInsight` (e.g. with `ChatCreateSerializer` and `ChatMessageSerializer`) actually correct?**
  _`NoteInsight` has 35 INFERRED edges - model-reasoned connections that need verification._