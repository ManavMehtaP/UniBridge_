# Graph Report - UniBridge_  (2026-08-05)

## Corpus Check
- 366 files · ~450,476 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2665 nodes · 4890 edges · 257 communities (177 shown, 80 thin omitted)
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 743 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f2070f59`
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
- AnalyticsPage.tsx
- AIAssistantPage.tsx
- QuizzesPage.tsx
- ResultsPage.tsx
- vercel.json
- hod.ts
- useTableSort.ts
- http.ts
- http.ts
- studyPlanner.service.ts
- app.ts
- package.json
- Any
- studentAiBridge.service.ts
- Path
- bestEffortStudentAi
- StudentAiConfig
- seed-sy3-timetable-attendance.ts
- App.tsx
- @prisma/adapter-pg
- @prisma/client
- @types/pdfkit
- zod
- getDb
- devDependencies
- react-router-dom
- seed-sy3-marks.ts
- @tanstack/react-query
- getFacultyScopeData
- AppShell.tsx
- StudentsPage.tsx
- hodAllBatchIds
- compilerOptions
- student.ts
- FacultyPage.tsx
- process_note_document
- auth.ts
- SemesterHistorySelector.tsx
- Topbar.tsx
- FacultyDetailModal.tsx
- InternalServicePermission
- documents.py
- proxy-empty-completion.test.ts
- package.json
- SimpleCorsMiddleware
- __init__.py
- Student
- Path
- Path
- Student
- Subject
- auth.ts
- formatStudyPlan
- getStudentEnrollment
- NON_WORKING_TYPES
- overallAttendancePctBulk
- _emp015.ts
- Dashboard.tsx
- devDependencies
- App.tsx
- LoginScreen.tsx
- @prisma/adapter-pg
- @types/pdfkit
- @dnd-kit/utilities
- @fontsource-variable/geist
- lucide-react
- react-dom
- react-markdown
- recharts
- shadcn
- tailwind-merge
- tailwindcss
- @tailwindcss/vite
- express
- helmet
- pdfkit
- pg
- @prisma/adapter-pg
- @prisma/client
- tsx
- zod
- content.ts
- react
- react-dom
- recharts
- tailwind-merge
- test-all-models.ts
- studentAiBridge.service.ts
- ChatMessage
- facultyActiveSemester
- test-all-models.ts
- responses.test.ts
- bestEffortStudentAi
- seed-week-attendance.ts
- CalendarGrid.tsx
- buildPagination
- compression
- express
- SchedulePage.tsx
- formatStudyPlan
- getAttendanceRules
- overallAttendancePctBulk
- hod.ts
- clsx
- base.ts
- faculty.ts
- AttendanceCoordinatorPage.tsx
- SchedulePage.tsx
- facultyHistoryStore.ts
- AIDocument
- Path

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 64 edges
2. `initDb()` - 56 edges
3. `cn()` - 54 edges
4. `StudentContextMixin` - 49 edges
5. `StudentAIChatSession` - 44 edges
6. `StudyPlan` - 44 edges
7. `NoteInsight` - 43 edges
8. `StudyPlanTask` - 43 edges
9. `PYQInsight` - 42 edges
10. `ChatDetailView` - 35 edges

## Surprising Connections (you probably didn't know these)
- `main()` --indirect_call--> `s()`  [INFERRED]
  Backend/scripts/seed-sy3-timetable-attendance.ts → Backend/src/routes/exam.routes.ts
- `CalendarGrid()` --indirect_call--> `dateStr()`  [INFERRED]
  frontend/src/components/shared/CalendarGrid.tsx → Backend/src/services/exam.service.ts
- `asyncHandler()` --indirect_call--> `req()`  [INFERRED]
  Backend/src/utils/http.ts → AI Assistant/freellmapi/server/src/__tests__/integration/full-flow.test.ts
- `generate_note_insight()` --calls--> `process_note_document()`  [INFERRED]
  AI Assistant/Django AI assistant/student_ai/services/notes.py → AI Assistant/Django AI assistant/student_ai/services/ingestion_service.py
- `process_document()` --calls--> `process_note_document()`  [INFERRED]
  AI Assistant/Django AI assistant/student_ai/tasks/process_document.py → AI Assistant/Django AI assistant/student_ai/services/ingestion_service.py

## Import Cycles
- None detected.

## Communities (257 total, 80 thin omitted)

### Community 0 - "UniBridge Free-Tier Deployment Plan"
Cohesion: 0.33
Nodes (10): _duration_minutes(), _event_days(), _fallback_tasks(), generate_study_plan(), _next_exam_date(), _planner_context(), CalendarEvent, date (+2 more)

### Community 1 - "Confirmed Bugs"
Cohesion: 0.10
Nodes (37): Store, HodService, StudentListParams, AcademicYear, AcademicYearStatus, Activity, ArchiveJob, AttendanceRecord (+29 more)

### Community 2 - "UniBridge Frontend & Backend Changes for Faster Response"
Cohesion: 0.20
Nodes (5): authApi, api, queue, Notification, notificationsApi

### Community 3 - "Observability: verify every performance change"
Cohesion: 0.03
Nodes (14): DAY_LABELS, DAY_NAMES, DayStatus, formatStudyPlan(), getAttendanceRules(), NON_WORKING_TYPES, overallAttendancePctBulk(), overallAttendancePctBulkArr() (+6 more)

### Community 4 - "Backend changes"
Cohesion: 0.12
Nodes (17): dependencies, compression, cors, dotenv, morgan, multer, prisma, @types/multer (+9 more)

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
Cohesion: 0.06
Nodes (31): expo, expo-font, expo-status-bar, dependencies, expo, expo-font, expo-status-bar, react (+23 more)

### Community 10 - "storage.ts"
Cohesion: 0.21
Nodes (6): req(), universityId(), requireAuth(), authRouter, ApiError, asyncHandler()

### Community 11 - "AppShell.tsx"
Cohesion: 0.11
Nodes (13): FacultySemesterHistorySelector(), MobileTabBar(), PRIMARY_TABS, SHORT_LABEL, facultyNavItems, hodNavItems, studentNavItems, NavItem (+5 more)

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
Cohesion: 0.08
Nodes (25): PaginatedResponse, AttendanceSessionRow, ChatMsg, DayStatus, FacultyAnnouncement, FacultyDashboardStats, FacultyNote, FacultyNoteDrive (+17 more)

### Community 17 - "student.ts"
Cohesion: 0.11
Nodes (17): AIConversation, AIMessage, AttendancePerSubject, LeaderboardEntry, PaginatedAnnouncements, PaginatedNotes, PaginatedQuizzes, SelfNote (+9 more)

### Community 18 - "Button.tsx"
Cohesion: 0.16
Nodes (10): Button, ButtonProps, Size, sizes, Variant, variants, ConfirmDialogProps, Modal() (+2 more)

### Community 19 - "PromotionPage.tsx"
Cohesion: 0.14
Nodes (7): firstFreeInitial(), LeaderRow, PromoContext, STEPS, YEAR_LABEL, YearFlow(), YearPreview

### Community 21 - "common.ts"
Cohesion: 0.18
Nodes (10): AcademicYear, Announcement, ApiError, AttendanceSummary, Batch, CalendarEvent, ChatMessage, Phase (+2 more)

### Community 22 - "StatCard.tsx"
Cohesion: 0.22
Nodes (5): Card(), StatCardProps, Trend, TrendIcon, trendPill

### Community 24 - "HodOnboardingModal.tsx"
Cohesion: 0.22
Nodes (3): Step, Stepper(), STEPS

### Community 25 - "seed-sy3-timetable-attendance.ts"
Cohesion: 0.40
Nodes (3): DriveFile, DriveFolder, DriveFolderAction

### Community 26 - "getStudentEnrollment"
Cohesion: 0.06
Nodes (53): ContentBlock, contentHasImage(), ContentTextBlock, contentToString(), flattenMessageContent(), messageHasImage(), normalizeOutboundContent(), BaseProvider (+45 more)

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
Cohesion: 0.20
Nodes (4): Assignment, EditNoteModal(), toIso(), UploadNoteModal()

### Community 33 - "StudentsPage.tsx"
Cohesion: 0.13
Nodes (24): build_features(), _generate_synthetic_data(), get_model(), Any, Train and persist the best ML regressor for marks prediction., retrain_from_db(), train_model(), model_metadata() (+16 more)

### Community 34 - "auth.ts"
Cohesion: 0.31
Nodes (8): cell(), csvCell(), ExportFormat, ExportTable, sendExport(), toCsv(), toPdf(), RFC-4180

### Community 35 - "download.ts"
Cohesion: 0.48
Nodes (6): blobError(), downloadExport(), downloadFile(), ExportFormat, Params, saveBlob()

### Community 36 - "schedule.tsx"
Cohesion: 0.29
Nodes (3): FALLBACK, KNOWN, Visual

### Community 38 - "CalendarPage.tsx"
Cohesion: 0.25
Nodes (5): LEGEND_TYPES, MONTHS, NON_WORKING_TYPES, TYPE_LABEL, TYPES

### Community 39 - "ExamPanelPage.tsx"
Cohesion: 0.22
Nodes (9): __dirname, main(), resolveProvider(), healthRouter, checkAllKeys(), checkKeyHealth(), failureCount, startHealthChecker() (+1 more)

### Community 41 - "facultyActiveSemester"
Cohesion: 0.09
Nodes (23): REDACTIONS, sanitizeProviderErrorMessage(), assistantMessageSchema, chatCompletionSchema, contentBlockSchema, contentSchema, EmbeddingsBody, getSessionKey() (+15 more)

### Community 46 - "PromotionDashboardPage.tsx"
Cohesion: 0.33
Nodes (4): statusLabel, statusTone, YEAR_LABEL, YEARS

### Community 48 - "YearsPage.tsx"
Cohesion: 0.33
Nodes (3): LEVEL_TO_SEM, SEM_TONE, YEAR_TONE

### Community 49 - "index.tsx"
Cohesion: 0.03
Nodes (57): FacAnalytics, FacAnnouncements, FacAttendance, FacAttendanceReport, FacCalendar, FacDashboard, FacExamDuties, FacExams (+49 more)

### Community 50 - "getFacultyScopeData"
Cohesion: 0.18
Nodes (14): CALENDAR_TEMPLATE_CSV, COL, EventTypeStr, normalizeType(), normalizeVisibility(), parseCalendarFile(), parseDate(), ParsedEvent (+6 more)

### Community 53 - "Badge.tsx"
Cohesion: 0.40
Nodes (3): BadgeProps, Tone, tones

### Community 55 - "QuizzesPage.tsx"
Cohesion: 0.22
Nodes (7): Assignment, blankQuestion(), Draft, formatDate(), LETTERS, QuestionsModal(), QuizzesPage()

### Community 58 - "CalendarGrid.tsx"
Cohesion: 0.14
Nodes (10): assertManager(), assertPaperCheckAccess(), busyReason(), isExamCoordinator(), overlaps(), toMin(), YEAR_ORDER, YearContext (+2 more)

### Community 60 - "Select.tsx"
Cohesion: 0.40
Nodes (4): Item, Select, SelectOption, SelectProps

### Community 62 - "CalendarPage.tsx"
Cohesion: 0.67
Nodes (3): FacultyCalendarPage(), RawEvent, toEvents()

### Community 65 - "CalendarPage.tsx"
Cohesion: 0.67
Nodes (3): RawEvent, StudentCalendarPage(), toEvents()

### Community 68 - "StudyPlannerPage.tsx"
Cohesion: 0.33
Nodes (4): PlannerData, PlannerTask, SubjectOption, TODAY

### Community 69 - "TimetablePage.tsx"
Cohesion: 0.04
Nodes (44): dependencies, better-sqlite3, cors, dotenv, drizzle-orm, express, @freellmapi/shared, helmet (+36 more)

### Community 71 - "hodAllBatchIds"
Cohesion: 0.13
Nodes (81): AIConversation, AIDocument, AIDocumentMetadata, BackgroundJob, CalendarEvent, Flashcard, Meta, Note (+73 more)

### Community 85 - "SchedulePage.tsx"
Cohesion: 0.08
Nodes (34): backfillFallback(), createTables(), DB_PATH, __dirname, ensureApiKeysBaseUrlColumn(), ensureRequestKeyIdColumn(), ensureRequestTtfbColumn(), ensureUnifiedKey() (+26 more)

### Community 87 - "AttendancePage.tsx"
Cohesion: 0.11
Nodes (20): extractApiToken(), buildResponseObject(), contentPartSchema, functionCallItemSchema, functionCallOutputItemSchema, inputItemSchema, messageItemSchema, newId() (+12 more)

### Community 90 - "LeaderboardPage.tsx"
Cohesion: 0.50
Nodes (4): fmt(), LeaderboardPage(), PHASES, YEAR_LABEL

### Community 96 - "getAttendanceRules"
Cohesion: 0.13
Nodes (21): CalendarGridResult, CalEvent, CalEventType, CalTest, classify(), MONTHS, parseAcademicCalendarExcel(), parseMonthHeader() (+13 more)

### Community 97 - "buildPagination"
Cohesion: 0.13
Nodes (34): canMakeRequest(), canUseProvider(), canUseTokens(), clearPersistedCooldown(), COOLDOWN_DURATIONS, cooldownHits, cooldowns, countPersistedProviderRequests() (+26 more)

### Community 109 - "AnalyticsPage.tsx"
Cohesion: 0.33
Nodes (6): FacultyAnalyticsPage(), FailingExam, FailingSubject, Mentee, MenteeAnalytics, pctTone()

### Community 114 - "AIAssistantPage.tsx"
Cohesion: 0.29
Nodes (3): renderInlineMarkdown(), StructuredAssistantContent(), SubjectOption

### Community 118 - "QuizzesPage.tsx"
Cohesion: 0.27
Nodes (10): clearPending(), formatDate(), PendingAttempt, presentationOf(), Question, QuizAttempt, QuizResult, readPending() (+2 more)

### Community 119 - "ResultsPage.tsx"
Cohesion: 0.15
Nodes (21): createApp(), getUnifiedApiKey(), createUser(), isGatedApiPath(), mintDashboardToken(), authHeaders(), request(), del() (+13 more)

### Community 129 - "hod.ts"
Cohesion: 0.25
Nodes (7): ArchiveBatch, ArchiveResult, ArchiveSemester, ArchiveSnapshot, ArchiveStudent, ArchiveTree, ArchiveYear

### Community 132 - "useTableSort.ts"
Cohesion: 0.50
Nodes (4): getVal(), SortDir, useTableSort(), UseTableSortOptions

### Community 133 - "http.ts"
Cohesion: 0.09
Nodes (33): decrypt(), encrypt(), getEncryptionKey(), initEncryptionKey(), isDevFallbackAllowed(), maskKey(), missingKeyError(), parseHexKey() (+25 more)

### Community 134 - "http.ts"
Cohesion: 0.09
Nodes (21): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, expo (+13 more)

### Community 135 - "studyPlanner.service.ts"
Cohesion: 0.28
Nodes (13): academicInputsForStudent(), AcademicSubject, activePhaseForToday(), addDays(), buildTasks(), generateStudyPlanForStudent(), jsonStrings(), nearestExamDate() (+5 more)

### Community 136 - "app.ts"
Cohesion: 0.12
Nodes (25): components, Markdown, MarkdownInner(), MarkdownProps, Card(), CardAction(), CardContent(), CardDescription() (+17 more)

### Community 137 - "package.json"
Cohesion: 0.11
Nodes (17): AvailabilityRow, ConflictReport, examApi, ExamBlock, ExamDashboard, ExamDetail, ExamRow, ExamSchedule (+9 more)

### Community 138 - "Any"
Cohesion: 0.09
Nodes (18): DEFAULT_DASHBOARD_ORIGINS, __dirname, getAllowedCorsOrigins(), regenerateUnifiedKey(), errorHandler(), createProxyRateLimiter(), parseLimit(), WindowState (+10 more)

### Community 139 - "studentAiBridge.service.ts"
Cohesion: 0.36
Nodes (9): chunked(), clamp(), gradeFor(), GRID, main(), rand(), SLOTS, studentBase() (+1 more)

### Community 140 - "Path"
Cohesion: 0.10
Nodes (20): FloatingBar(), ModelsTabs(), PageHeader(), Switch(), EmbeddingsData, EmbeddingsPage(), Family, formatTokens() (+12 more)

### Community 141 - "bestEffortStudentAi"
Cohesion: 0.16
Nodes (22): env, envSchema, amzDate(), basePath, deleteObject(), enc(), encPath(), ensureBucketAcceptsAllTypes() (+14 more)

### Community 144 - "seed-sy3-timetable-attendance.ts"
Cohesion: 0.11
Nodes (36): parseBudget(), fallbackRouter, routingSchema, SORT_PRESETS, updateSchema, ChainRow, decayWeight(), getAllPenalties() (+28 more)

### Community 145 - "App.tsx"
Cohesion: 0.10
Nodes (17): getPreferredDarkMode(), Navbar(), navItems, queryClient, useDarkMode(), DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent() (+9 more)

### Community 146 - "@prisma/adapter-pg"
Cohesion: 0.12
Nodes (28): AnalyticsScreen(), AnnouncementsScreen(), ArchiveScreen(), AttendanceScreen(), DashboardScreen(), DAYS, ExamPanelScreen(), FacultyScreen() (+20 more)

### Community 147 - "@prisma/client"
Cohesion: 0.13
Nodes (18): AuthForm(), AuthGate(), AuthStatus, Button(), buttonVariants, Input(), Label(), setToken() (+10 more)

### Community 148 - "@types/pdfkit"
Cohesion: 0.08
Nodes (25): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+17 more)

### Community 149 - "zod"
Cohesion: 0.13
Nodes (19): IconBell(), IconClose(), IconMenu(), NavIcon(), P, TabAttendance(), TabHome(), TabMore() (+11 more)

### Community 150 - "getDb"
Cohesion: 0.10
Nodes (29): getDb(), getSetting(), setSetting(), updateSchema, logRequest(), callProvider(), EmbeddingModelRow, EmbeddingsError (+21 more)

### Community 151 - "devDependencies"
Cohesion: 0.08
Nodes (25): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, @types/node, @types/react (+17 more)

### Community 152 - "react-router-dom"
Cohesion: 0.47
Nodes (4): JsonSchemaish, repairToolArguments(), toolSchemaMap(), PLAN_SCHEMA

### Community 153 - "seed-sy3-marks.ts"
Cohesion: 0.09
Nodes (21): styles, AnalyticsKpi, AnnouncementRow, AtRiskRow, AttendanceSummary, AttendanceTrend, AuthUser, DashboardSummary (+13 more)

### Community 154 - "@tanstack/react-query"
Cohesion: 0.40
Nodes (4): compilerOptions, strict, extends, expo/tsconfig.base

### Community 161 - "getFacultyScopeData"
Cohesion: 0.09
Nodes (22): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+14 more)

### Community 162 - "AppShell.tsx"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 163 - "StudentsPage.tsx"
Cohesion: 0.15
Nodes (14): hashPassword(), verifyPassword(), requireAuth(), attempts, authRouter, credentialsSchema, createSession(), deleteSession() (+6 more)

### Community 164 - "hodAllBatchIds"
Cohesion: 0.10
Nodes (21): dependencies, class-variance-authority, clsx, @dnd-kit/core, @dnd-kit/sortable, @fontsource-variable/geist-mono, react, react-router-dom (+13 more)

### Community 165 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+12 more)

### Community 166 - "student.ts"
Cohesion: 0.12
Nodes (17): axios, date-fns, dependencies, axios, date-fns, lucide-react, react-hot-toast, react-router-dom (+9 more)

### Community 167 - "FacultyPage.tsx"
Cohesion: 0.18
Nodes (12): Table(), TableBody(), TableCaption(), TableCell(), TableFooter(), TableHead(), TableHeader(), TableRow() (+4 more)

### Community 171 - "process_note_document"
Cohesion: 0.09
Nodes (42): _extract_from_path(), extract_text(), file_hash(), _is_remote(), Path, extract_document_text(), _extract_note_structure(), _extract_scanned_pdf_text() (+34 more)

### Community 172 - "auth.ts"
Cohesion: 0.13
Nodes (14): devDependencies, concurrently, name, private, scripts, build, build:server, dev (+6 more)

### Community 173 - "SemesterHistorySelector.tsx"
Cohesion: 0.13
Nodes (13): Paged, PromotionDashboard, PromotionHodRow, UniBatch, UniFacultyRow, UniHod, UniHodsResponse, UniOverview (+5 more)

### Community 174 - "Topbar.tsx"
Cohesion: 0.60
Nodes (4): createApp(), errorHandler(), notFoundHandler(), apiRouter

### Community 175 - "FacultyDetailModal.tsx"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, preview, type (+1 more)

### Community 176 - "InternalServicePermission"
Cohesion: 0.29
Nodes (9): apiFetch(), BASE, clearToken(), getToken(), logout(), FallbackPage(), CustomProviderSection(), UnifiedKeySection() (+1 more)

### Community 177 - "documents.py"
Cohesion: 0.08
Nodes (24): AIDocumentChunk, AIServiceError, Any, SharedAIService, EmbeddingService, Subject, Deterministic placeholder until a vector database/provider is added., GeminiDocumentService (+16 more)

### Community 178 - "proxy-empty-completion.test.ts"
Cohesion: 0.20
Nodes (5): chatCompletion, EMPTY_RESULT, fakeProvider, GOOD_RESULT, streamChatCompletion

### Community 179 - "package.json"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, preview, type (+1 more)

### Community 183 - "Student"
Cohesion: 0.42
Nodes (8): chunked(), clamp(), gradeFor(), lectureDates(), main(), rand(), studentBase(), SUBJECTS

### Community 184 - "Path"
Cohesion: 0.22
Nodes (9): scripts, build, dev, postinstall, prisma:generate, prisma:migrate, prisma:push, reset:import-faculty (+1 more)

### Community 185 - "Path"
Cohesion: 0.36
Nodes (8): chunked(), clamp(), GRID, LECTURES, main(), rand(), studentBase(), T

### Community 186 - "Student"
Cohesion: 0.25
Nodes (7): compilerOptions, baseUrl, paths, files, ./src/*, @/*, references

### Community 187 - "Subject"
Cohesion: 0.25
Nodes (5): BROKEN_ARGS, chatCompletion, fakeProvider, streamChatCompletion, UPDATE_PLAN_TOOL

### Community 188 - "auth.ts"
Cohesion: 0.25
Nodes (6): AuthUser, LoginResponse, LoginRole, RefreshResponse, University, UserRole

### Community 189 - "formatStudyPlan"
Cohesion: 0.25
Nodes (10): buffered(), clip(), DailyBatch, DailyLecture, DailyPdfData, pctStr(), renderDailyAttendancePdf(), renderWeeklyAttendancePdf() (+2 more)

### Community 190 - "getStudentEnrollment"
Cohesion: 0.22
Nodes (9): batchById(), currentEnrollmentForStudent(), ensureStudentSubject(), getMentorAssignment(), getStudentEnrollment(), getStudentMentorAssignment(), getStudentSubjectIds(), getStudentUser() (+1 more)

### Community 191 - "NON_WORKING_TYPES"
Cohesion: 0.33
Nodes (5): main, name, private, types, version

### Community 192 - "overallAttendancePctBulk"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 193 - "_emp015.ts"
Cohesion: 0.70
Nodes (4): chunkedCreate(), gradeFor(), main(), rand()

### Community 194 - "Dashboard.tsx"
Cohesion: 0.13
Nodes (12): hodApi, IconCalendarCheck(), IconClipboard(), IconFaculty(), IconShield(), IconStudents(), IconTrend(), Dashboard() (+4 more)

### Community 196 - "App.tsx"
Cohesion: 0.25
Nodes (5): MarksData, PyqData, PyqFile, Subject, Topic

### Community 197 - "LoginScreen.tsx"
Cohesion: 0.14
Nodes (6): CalendarTab(), Coordinator, ExamManagementPage(), fmtDate(), PickerFaculty, TABS

### Community 199 - "@prisma/adapter-pg"
Cohesion: 0.13
Nodes (7): examRouter, s(), facultyRouter, upload, hodRouter, upload, examService

### Community 219 - "content.ts"
Cohesion: 0.32
Nodes (8): facultyActiveSemester(), getActiveSemester(), getSemester(), hodActiveSemester(), hodAllBatchIds(), hodEnrollmentWhere(), scopedCurrentEnrollments(), scopeSemester()

### Community 229 - "studentAiBridge.service.ts"
Cohesion: 0.22
Nodes (7): getProvider(), db, Key, keyStmt, models, results, Row

### Community 232 - "facultyActiveSemester"
Cohesion: 0.20
Nodes (5): adminRouter, upload, studentRouter, upload, portalService

### Community 235 - "bestEffortStudentAi"
Cohesion: 0.31
Nodes (8): BASE, code(), DAYS, facultyName(), name(), Palette, Slot, TimetablePage()

### Community 236 - "seed-week-attendance.ts"
Cohesion: 0.70
Nodes (4): chunked(), main(), pick(), rand()

### Community 237 - "CalendarGrid.tsx"
Cohesion: 0.18
Nodes (7): WIPE_TABLES, FacultyRow, main(), parseCsv(), adapter, pool, prisma

### Community 239 - "compression"
Cohesion: 0.25
Nodes (5): DjangoChat, LeaderboardEntry, LeaderboardResponse, Params, studentApi

### Community 241 - "SchedulePage.tsx"
Cohesion: 0.33
Nodes (5): dateStr(), CalendarGrid(), EVENT_META, EVENT_TONE, WEEKDAYS

### Community 242 - "formatStudyPlan"
Cohesion: 0.44
Nodes (8): djangoAiApi, djangoAiDelete(), djangoAiErrorMessage(), djangoAiGet(), djangoAiPatch(), djangoAiPost(), DjangoResponse, unwrapDjangoResponse()

### Community 243 - "getAttendanceRules"
Cohesion: 0.40
Nodes (5): ensureFacultyAssignedBatch(), ensureFacultyAssignedSubject(), getFacultyAssignments(), getFacultyScopeData(), getFacultyVisibleEnrollments()

### Community 245 - "hod.ts"
Cohesion: 0.25
Nodes (7): AttendanceCoordinators, FacultyOption, hodApi, Params, SubjectComponentCfg, SubjectConfig, SubjectConfigInput

### Community 249 - "faculty.ts"
Cohesion: 0.50
Nodes (3): facultyApi, FacultyPyq, Params

### Community 250 - "AttendanceCoordinatorPage.tsx"
Cohesion: 0.70
Nodes (4): AttendanceCoordinatorPage(), statusLabel(), statusTone(), today()

## Knowledge Gaps
- **898 isolated node(s):** `YEAR_LABEL`, `PromoContext`, `LeaderRow`, `YearPreview`, `STEPS` (+893 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **80 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `req()` connect `storage.ts` to `ResultsPage.tsx`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `asyncHandler()` connect `storage.ts` to `facultyActiveSemester`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `getDb()` connect `getDb` to `buildPagination`, `StudentsPage.tsx`, `http.ts`, `studentAiBridge.service.ts`, `ExamPanelPage.tsx`, `facultyActiveSemester`, `Any`, `seed-sy3-timetable-attendance.ts`, `SchedulePage.tsx`, `AttendancePage.tsx`, `ResultsPage.tsx`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Are the 27 inferred relationships involving `StudentContextMixin` (e.g. with `AIConversation` and `BackgroundJob`) actually correct?**
  _`StudentContextMixin` has 27 INFERRED edges - model-reasoned connections that need verification._
- **Are the 37 inferred relationships involving `StudentAIChatSession` (e.g. with `ChatCreateSerializer` and `ChatMessageSerializer`) actually correct?**
  _`StudentAIChatSession` has 37 INFERRED edges - model-reasoned connections that need verification._
- **What connects `YEAR_LABEL`, `PromoContext`, `LeaderRow` to the rest of the system?**
  _898 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Confirmed Bugs` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._