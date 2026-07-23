# Graph Report - UniBridge_  (2026-07-22)

## Corpus Check
- 211 files · ~247,201 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1379 nodes · 2432 edges · 188 communities (111 shown, 77 thin omitted)
- Extraction: 73% EXTRACTED · 27% INFERRED · 0% AMBIGUOUS · INFERRED: 645 edges (avg confidence: 0.52)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d1805481`
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
- useTableSort.ts
- http.ts
- http.ts
- studyPlanner.service.ts
- app.ts
- package.json
- scripts
- studentAiBridge.service.ts
- package.json
- settings.py
- StudentAiConfig
- seed-sy3-timetable-attendance.ts
- prisma
- @prisma/adapter-pg
- @prisma/client
- @types/pdfkit
- zod
- clsx
- react-dom
- react-router-dom
- seed-sy3-marks.ts
- @tanstack/react-query
- getFacultyScopeData
- AppShell.tsx
- StudentsPage.tsx
- hodAllBatchIds
- faculty.ts
- student.ts
- FacultyPage.tsx
- formatStudyPlan
- getAttendanceRules
- overallAttendancePctBulk
- @supabase/supabase-js
- auth.ts
- InternalServicePermission
- documents.py
- jobs.py
- generate_study_plan
- SimpleCorsMiddleware
- build_semantic_chunks
- __init__.py
- Student
- Path
- Path
- Student
- Subject

## God Nodes (most connected - your core abstractions)
1. `StudentContextMixin` - 47 edges
2. `StudyPlan` - 43 edges
3. `StudentAIChatSession` - 42 edges
4. `NoteInsight` - 41 edges
5. `StudyPlanTask` - 41 edges
6. `PYQInsight` - 40 edges
7. `ChatDetailView` - 33 edges
8. `PYQFile` - 32 edges
9. `Note` - 31 edges
10. `NoteInsightSerializer` - 31 edges

## Surprising Connections (you probably didn't know these)
- `StudentAiApiTests` --uses--> `Student`  [INFERRED]
  AI Assistant/Django AI assistant/student_ai/tests.py → AI Assistant/Django AI assistant/student_ai/models.py
- `StudentAiApiTests` --uses--> `Semester`  [INFERRED]
  AI Assistant/Django AI assistant/student_ai/tests.py → AI Assistant/Django AI assistant/student_ai/models.py
- `EmbeddingService` --uses--> `Subject`  [INFERRED]
  AI Assistant/Django AI assistant/student_ai/services/embedding_service.py → AI Assistant/Django AI assistant/student_ai/models.py
- `StudentAiApiTests` --uses--> `Subject`  [INFERRED]
  AI Assistant/Django AI assistant/student_ai/tests.py → AI Assistant/Django AI assistant/student_ai/models.py
- `StudentAiApiTests` --uses--> `StudentEnrollment`  [INFERRED]
  AI Assistant/Django AI assistant/student_ai/tests.py → AI Assistant/Django AI assistant/student_ai/models.py

## Import Cycles
- None detected.

## Communities (188 total, 77 thin omitted)

### Community 0 - "UniBridge Free-Tier Deployment Plan"
Cohesion: 0.16
Nodes (8): WIPE_TABLES, adapter, pool, prisma, universityId(), requireAuth(), ApiError, asyncHandler()

### Community 1 - "Confirmed Bugs"
Cohesion: 0.10
Nodes (37): Store, HodService, StudentListParams, AcademicYear, AcademicYearStatus, Activity, ArchiveJob, AttendanceRecord (+29 more)

### Community 2 - "UniBridge Frontend & Backend Changes for Faster Response"
Cohesion: 0.07
Nodes (22): api, queue, hodApi, Params, SubjectComponentCfg, SubjectConfig, SubjectConfigInput, Notification (+14 more)

### Community 3 - "Observability: verify every performance change"
Cohesion: 0.04
Nodes (12): DAY_LABELS, DAY_NAMES, DayStatus, formatStudyPlan(), getAttendanceRules(), NON_WORKING_TYPES, overallAttendancePctBulk(), overallAttendancePctBulkArr() (+4 more)

### Community 4 - "Backend changes"
Cohesion: 0.11
Nodes (19): dependencies, compression, cors, helmet, morgan, multer, pdfkit, pg (+11 more)

### Community 5 - "Frontend changes"
Cohesion: 0.11
Nodes (19): autoprefixer, devDependencies, autoprefixer, postcss, tailwindcss, @types/node, @types/react, @types/react-dom (+11 more)

### Community 6 - "Secure deployment plan"
Cohesion: 0.07
Nodes (27): AcademicYearWithSemesters, ActivityItem, AnalyticsKpi, AssignmentRow, AtRiskRow, AttendanceStatSummary, AttendanceTableRow, AttendanceTrend (+19 more)

### Community 7 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, @types/compression, @types/cors, @types/express, @types/morgan, @types/node, @types/pg, typescript (+7 more)

### Community 8 - "compilerOptions"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, baseUrl, composite, isolatedModules, jsx, lib, module (+19 more)

### Community 9 - "dependencies"
Cohesion: 0.12
Nodes (17): axios, date-fns, dependencies, axios, date-fns, lucide-react, react, react-hot-toast (+9 more)

### Community 10 - "storage.ts"
Cohesion: 0.38
Nodes (11): amzDate(), basePath, enc(), encPath(), hmac(), presignGetUrl(), sha256hex(), signingKey() (+3 more)

### Community 11 - "AppShell.tsx"
Cohesion: 0.22
Nodes (6): facultyNavItems, hodNavItems, studentNavItems, NavItem, NavSection, universityNavItems

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
Nodes (18): AttendanceSessionRow, ChatMsg, DayStatus, FacultyAnnouncement, FacultyDashboardStats, FacultyNote, FacultyNoteDrive, FacultyNoteDriveFile (+10 more)

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
Cohesion: 0.10
Nodes (18): AuthUser, LoginResponse, LoginRole, RefreshResponse, University, UserRole, AcademicYear, Announcement (+10 more)

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

### Community 34 - "auth.ts"
Cohesion: 0.18
Nodes (11): hodRouter, upload, cell(), csvCell(), ExportFormat, ExportTable, parseFormat(), sendExport() (+3 more)

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
Cohesion: 0.47
Nodes (6): facultyActiveSemester(), getActiveSemester(), getSemester(), hodActiveSemester(), requireExamCoordinator(), scopeSemester()

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
Cohesion: 0.45
Nodes (51): AIConversation, BackgroundJob, Note, NoteInsight, PYQFile, PYQInsight, Student, StudentAIChatSession (+43 more)

### Community 53 - "Badge.tsx"
Cohesion: 0.40
Nodes (3): BadgeProps, Tone, tones

### Community 60 - "Select.tsx"
Cohesion: 0.50
Nodes (3): Select, SelectOption, SelectProps

### Community 68 - "StudyPlannerPage.tsx"
Cohesion: 0.33
Nodes (4): PlannerData, PlannerTask, SubjectOption, TODAY

### Community 71 - "hodAllBatchIds"
Cohesion: 0.12
Nodes (4): generate_note_insight(), analyze_pyq(), predict_topic_trends(), Response

### Community 96 - "getAttendanceRules"
Cohesion: 0.12
Nodes (25): build_features(), _generate_synthetic_data(), get_model(), Any, Train and persist the best ML regressor for marks prediction., retrain_from_db(), train_model(), model_metadata() (+17 more)

### Community 97 - "buildPagination"
Cohesion: 0.19
Nodes (13): AIDocument, AIDocumentChunk, AIDocumentMetadata, CalendarEvent, Flashcard, Meta, Phase, PrismaMirrorModel (+5 more)

### Community 114 - "AIAssistantPage.tsx"
Cohesion: 0.29
Nodes (3): renderInlineMarkdown(), StructuredAssistantContent(), SubjectOption

### Community 129 - "hod.ts"
Cohesion: 0.13
Nodes (10): requireSuperAdmin(), hodScope(), adminRouter, upload, authRouter, facultyRouter, upload, apiRouter (+2 more)

### Community 132 - "useTableSort.ts"
Cohesion: 0.67
Nodes (3): getVal(), SortDir, useTableSort()

### Community 134 - "http.ts"
Cohesion: 0.15
Nodes (11): AIServiceError, Any, SharedAIService, GeminiDocumentService, _image_url(), _mime_from_suffix(), _parse_json(), Any (+3 more)

### Community 135 - "studyPlanner.service.ts"
Cohesion: 0.28
Nodes (14): academicInputsForStudent(), AcademicSubject, activePhaseForToday(), addDays(), buildTasks(), generateStudyPlanForStudent(), getLatestStudyPlan(), jsonStrings() (+6 more)

### Community 136 - "app.ts"
Cohesion: 0.33
Nodes (7): createApp(), env, envSchema, errorHandler(), notFoundHandler(), app, portalService

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

### Community 144 - "seed-sy3-timetable-attendance.ts"
Cohesion: 0.36
Nodes (8): chunked(), clamp(), GRID, LECTURES, main(), rand(), studentBase(), T

### Community 153 - "seed-sy3-marks.ts"
Cohesion: 0.70
Nodes (4): chunkedCreate(), gradeFor(), main(), rand()

### Community 161 - "getFacultyScopeData"
Cohesion: 0.40
Nodes (5): ensureFacultyAssignedBatch(), ensureFacultyAssignedSubject(), getFacultyAssignments(), getFacultyScopeData(), getFacultyVisibleEnrollments()

### Community 164 - "hodAllBatchIds"
Cohesion: 0.67
Nodes (3): hodAllBatchIds(), hodEnrollmentWhere(), scopedCurrentEnrollments()

### Community 166 - "student.ts"
Cohesion: 0.17
Nodes (12): djangoAiApi, djangoAiDelete(), djangoAiErrorMessage(), djangoAiGet(), djangoAiPost(), DjangoResponse, unwrapDjangoResponse(), DjangoChat (+4 more)

### Community 168 - "formatStudyPlan"
Cohesion: 0.26
Nodes (13): Semester, normalize_list(), analyze_pyq_statistics(), _extract_questions(), _matching_semester(), process_pyq_document(), _store_legacy_insight(), _store_pyq_chunks() (+5 more)

### Community 169 - "getAttendanceRules"
Cohesion: 0.25
Nodes (13): extract_document_text(), _extract_note_structure(), _extract_scanned_pdf_text(), _keywords(), _local_pdf_path(), process_note_document(), Path, Use Gemini vision only when a PDF has no usable embedded text layer. (+5 more)

### Community 176 - "InternalServicePermission"
Cohesion: 0.40
Nodes (3): InternalServicePermission, IsStudentScope, BasePermission

### Community 177 - "documents.py"
Cohesion: 0.73
Nodes (5): _extract_from_path(), extract_text(), file_hash(), _is_remote(), Path

### Community 178 - "jobs.py"
Cohesion: 0.70
Nodes (4): create_job(), _json_safe(), Any, submit_job()

### Community 179 - "generate_study_plan"
Cohesion: 0.50
Nodes (4): generate_study_plan(), _planner_context(), Student, date

## Knowledge Gaps
- **470 isolated node(s):** `Meta`, `Scope`, `DAY_NAMES`, `DayStatus`, `DAY_LABELS` (+465 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **77 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Note` connect `getFacultyScopeData` to `buildPagination`, `overallAttendancePctBulk`, `getAttendanceRules`, `hodAllBatchIds`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Why does `prisma` connect `UniBridge Free-Tier Deployment Plan` to `seed-sy3-timetable-attendance.ts`, `seed-sy3-marks.ts`, `Confirmed Bugs`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Backend changes` to `http.ts`, `package.json`, `settings.py`, `prisma`, `@prisma/adapter-pg`, `@prisma/client`, `@types/pdfkit`, `zod`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Are the 25 inferred relationships involving `StudentContextMixin` (e.g. with `AIConversation` and `BackgroundJob`) actually correct?**
  _`StudentContextMixin` has 25 INFERRED edges - model-reasoned connections that need verification._
- **Are the 36 inferred relationships involving `StudyPlan` (e.g. with `ChatCreateSerializer` and `ChatMessageSerializer`) actually correct?**
  _`StudyPlan` has 36 INFERRED edges - model-reasoned connections that need verification._
- **Are the 35 inferred relationships involving `StudentAIChatSession` (e.g. with `ChatCreateSerializer` and `ChatMessageSerializer`) actually correct?**
  _`StudentAIChatSession` has 35 INFERRED edges - model-reasoned connections that need verification._
- **Are the 35 inferred relationships involving `NoteInsight` (e.g. with `ChatCreateSerializer` and `ChatMessageSerializer`) actually correct?**
  _`NoteInsight` has 35 INFERRED edges - model-reasoned connections that need verification._