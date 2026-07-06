import prisma from "../config/prisma.js";
import type { Role, YearLevel } from "../types/domain.js";
import { ApiError, buildPagination } from "../utils/http.js";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type Scope = {
  universityId: string;
  hodBatchIds: string[];
  hodSemesterIds: string[];
  userId: string;
};

// ─────────────────────────────────────────────────────────────
// Pure utility helpers (no DB calls)
// ─────────────────────────────────────────────────────────────

function paginate<T>(rows: T[], page = 1, limit = 20) {
  const total = rows.length;
  const start = (page - 1) * limit;
  return {
    data: rows.slice(start, start + limit),
    ...buildPagination(page, limit, total),
  };
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Number((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(1));
}

function matchesPassword(hash: string | null | undefined, candidate: string) {
  return (hash ?? "") === candidate;
}

function setPasswordHash<T extends { passwordHash?: string | null }>(entity: T, next: string) {
  entity.passwordHash = next;
}

function monthLabels(months: number) {
  const now = new Date();
  return Array.from({ length: months }, (_v, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - i - 1), 1));
    return d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  });
}

function parseCsvRecords(fileBuffer: Buffer, requiredHeaders: string[]) {
  const raw = fileBuffer.toString("utf8").trim();
  if (!raw) throw new ApiError(422, "UNPROCESSABLE_CSV", "CSV file is empty.");
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new ApiError(422, "UNPROCESSABLE_CSV", "CSV must include a header and at least one data row.");
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const missing = requiredHeaders.filter((h) => !headers.includes(h));
  if (missing.length > 0) throw new ApiError(422, "UNPROCESSABLE_CSV", `CSV is missing required columns: ${missing.join(", ")}.`);
  return lines.slice(1).map((line, i) => {
    const values = line.split(",").map((v) => v.trim());
    return { row: i + 2, record: Object.fromEntries(headers.map((h, hi) => [h, values[hi] ?? ""])) };
  });
}

function gradeFromPct(pct: number): string {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
}

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ─────────────────────────────────────────────────────────────
// DB Helper functions (async, Prisma-backed)
// ─────────────────────────────────────────────────────────────

async function getUniversity(universityId: string) {
  const u = await prisma.university.findUnique({ where: { id: universityId } });
  if (!u) throw new ApiError(404, "UNIVERSITY_NOT_FOUND", "University not found.");
  return u;
}

async function getActiveSemester(universityId: string) {
  const s = await prisma.semester.findFirst({ where: { universityId, status: "ACTIVE" } });
  if (s) return s;
  // ponytail: no-op placeholder so scope/dashboard endpoints render empty state
  // instead of 404 when the tenant hasn't seeded semesters yet.
  return { id: "", universityId, label: "No active semester", number: 0, status: "ACTIVE" as const, yearLevel: "FY" as const, academicYearId: "", startDate: new Date(), endDate: new Date(), createdAt: new Date(), updatedAt: new Date() };
}

async function getSemester(semesterId?: string, universityId?: string) {
  if (semesterId) {
    const s = await prisma.semester.findUnique({ where: { id: semesterId } });
    if (!s) throw new ApiError(404, "SEMESTER_NOT_FOUND", "Semester not found.");
    return s;
  }
  if (universityId) return getActiveSemester(universityId);
  throw new ApiError(400, "SEMESTER_REQUIRED", "Semester or university ID required.");
}

async function getAcademicYear(academicYearId: string) {
  const y = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
  if (!y) throw new ApiError(404, "ACADEMIC_YEAR_NOT_FOUND", "Academic year not found.");
  return y;
}

async function batchById(batchId: string) {
  const b = await prisma.batch.findUnique({ where: { id: batchId } });
  if (!b) throw new ApiError(404, "BATCH_NOT_FOUND", "Batch not found.");
  return b;
}

async function subjectById(subjectId: string) {
  const s = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!s) throw new ApiError(404, "SUBJECT_NOT_FOUND", "Subject not found.");
  return s;
}

async function phaseById(phaseId: string) {
  const p = await prisma.phase.findUnique({ where: { id: phaseId } });
  if (!p) throw new ApiError(404, "PHASE_NOT_FOUND", "Phase not found.");
  return p;
}

async function enrollmentById(enrollmentId: string) {
  const e = await prisma.studentEnrollment.findUnique({ where: { id: enrollmentId } });
  if (!e) throw new ApiError(404, "ENROLLMENT_NOT_FOUND", "Enrollment not found.");
  return e;
}

async function facultyById(facultyId: string) {
  const f = await prisma.faculty.findFirst({ where: { id: facultyId, deletedAt: null } });
  if (!f) throw new ApiError(404, "FACULTY_NOT_FOUND", "Faculty not found.");
  return f;
}

async function facultyByEmployeeId(employeeId: string) {
  const f = await prisma.faculty.findFirst({ where: { employeeId, deletedAt: null } });
  if (!f) throw new ApiError(404, "FACULTY_NOT_FOUND", "Faculty not found.");
  return f;
}

async function studentByEnrollmentNo(enrollmentNo: string) {
  const s = await prisma.student.findFirst({ where: { enrollmentNo, deletedAt: null } });
  if (!s) throw new ApiError(404, "STUDENT_NOT_FOUND", "Student not found.");
  return s;
}

async function getStudentUser(studentId: string) {
  const s = await prisma.student.findFirst({ where: { id: studentId, deletedAt: null } });
  if (!s) throw new ApiError(404, "NOT_FOUND", "Student not found.");
  return s;
}

async function getFacultyUser(facultyId: string) {
  const f = await prisma.faculty.findFirst({
    where: { id: facultyId, deletedAt: null, NOT: { employeeId: "ADMIN001" } },
  });
  if (!f) throw new ApiError(404, "FACULTY_NOT_FOUND", "Faculty not found.");
  return f;
}

async function currentEnrollmentForStudent(studentId: string, semesterId?: string) {
  return prisma.studentEnrollment.findFirst({
    where: { studentId, isCurrent: true, ...(semesterId ? { semesterId } : {}) },
  });
}

async function scopedCurrentEnrollments(scope: Scope, semesterId?: string) {
  return prisma.studentEnrollment.findMany({
    where: {
      isCurrent: true,
      batchId: { in: scope.hodBatchIds },
      ...(semesterId ? { semesterId } : {}),
    },
  });
}

async function getMentorAssignment(studentId: string, semesterId: string) {
  return prisma.mentorAssignment.findFirst({ where: { studentId, semesterId } });
}

async function getFacultyAssignments(facultyId: string, semesterId?: string) {
  return prisma.facultyBatchAssignment.findMany({
    where: { facultyId, ...(semesterId ? { semesterId } : {}) },
  });
}

async function getFacultyScopeData(facultyId: string, universityId: string, semesterId?: string) {
  const semester = await getSemester(semesterId, universityId);
  const assignments = await getFacultyAssignments(facultyId, semester.id);
  const assignedBatchIds = [...new Set(assignments.map((a) => a.batchId))];
  const assignedSubjectIds = [...new Set(assignments.map((a) => a.subjectId).filter((id): id is string => Boolean(id)))];
  const mentorAssignments = await prisma.mentorAssignment.findMany({
    where: { facultyId, semesterId: semester.id },
  });
  return {
    semester,
    assignments,
    assignedBatchIds,
    assignedSubjectIds,
    mentorAssignments,
    mentorStudentIds: mentorAssignments.map((m) => m.studentId),
  };
}

async function ensureFacultyAssignedBatch(facultyId: string, universityId: string, batchId: string, semesterId?: string) {
  const { assignedBatchIds } = await getFacultyScopeData(facultyId, universityId, semesterId);
  if (!assignedBatchIds.includes(batchId)) {
    throw new ApiError(403, "NOT_ASSIGNED_TO_BATCH", "You are not assigned to this batch.");
  }
}

async function ensureFacultyAssignedSubject(facultyId: string, universityId: string, subjectId: string, semesterId?: string) {
  const { assignedSubjectIds } = await getFacultyScopeData(facultyId, universityId, semesterId);
  if (!assignedSubjectIds.includes(subjectId)) {
    throw new ApiError(403, "NOT_ASSIGNED_TO_SUBJECT", "You are not assigned to this subject.");
  }
}

async function getFacultyVisibleEnrollments(facultyId: string, universityId: string, semesterId?: string) {
  const { assignedBatchIds, semester } = await getFacultyScopeData(facultyId, universityId, semesterId);
  return prisma.studentEnrollment.findMany({
    where: { isCurrent: true, semesterId: semester.id, batchId: { in: assignedBatchIds } },
  });
}

async function getStudentEnrollment(studentId: string, universityId: string, semesterId?: string) {
  const student = await getStudentUser(studentId);
  const semester = await getSemester(semesterId, universityId);
  const enrollment = await currentEnrollmentForStudent(student.id, semester.id);
  if (!enrollment) throw new ApiError(404, "NOT_FOUND", "Current enrollment not found.");
  return { student, semester, enrollment };
}

async function getStudentSubjectIds(studentId: string, universityId: string, semesterId?: string) {
  const { enrollment, semester } = await getStudentEnrollment(studentId, universityId, semesterId);
  const assignments = await prisma.facultyBatchAssignment.findMany({
    where: { batchId: enrollment.batchId, semesterId: semester.id },
    select: { subjectId: true },
  });
  return [...new Set(assignments.map((a) => a.subjectId))];
}

async function ensureStudentSubject(studentId: string, universityId: string, subjectId: string, semesterId?: string) {
  const ids = await getStudentSubjectIds(studentId, universityId, semesterId);
  if (!ids.includes(subjectId)) {
    throw new ApiError(403, "SUBJECT_NOT_IN_ENROLLMENT", "Subject is not in student's current enrollment.");
  }
}

async function getStudentMentorAssignment(studentId: string, universityId: string, semesterId?: string) {
  const { semester } = await getStudentEnrollment(studentId, universityId, semesterId);
  return getMentorAssignment(studentId, semester.id);
}

async function currentPhaseForSemester(semesterId: string) {
  const active = await prisma.phase.findFirst({ where: { semesterId, isComplete: false }, orderBy: { number: "asc" } });
  if (active) return active;
  return prisma.phase.findFirst({ where: { semesterId }, orderBy: { number: "asc" } });
}

async function getAttendanceRules(universityId: string) {
  const rules = await prisma.attendanceRules.findUnique({ where: { universityId } });
  return rules ?? { minThresholdPct: 75, warningThresholdPct: 80, autoNotifyMentor: true, autoLockAfterDays: 7 };
}

/** Compute attendance % for an enrollment+subject from per-lecture rows */
async function computeAttendancePct(enrollmentId: string, subjectId: string) {
  const records = await prisma.attendanceRecord.findMany({
    where: { enrollmentId, subjectId },
    select: { isPresent: true },
  });
  if (records.length === 0) return 0;
  return Number(((records.filter((r) => r.isPresent).length / records.length) * 100).toFixed(2));
}

/** Compute overall attendance pct across all subjects for an enrollment */
async function computeOverallAttendancePct(enrollmentId: string) {
  const records = await prisma.attendanceRecord.findMany({
    where: { enrollmentId },
    select: { isPresent: true },
  });
  if (records.length === 0) return 0;
  return Number(((records.filter((r) => r.isPresent).length / records.length) * 100).toFixed(2));
}

async function getScopedFaculty(scope: Scope) {
  return prisma.faculty.findMany({
    where: { universityId: scope.universityId, deletedAt: null, NOT: { employeeId: "ADMIN001" } },
  });
}

async function ensureBatchInScope(batchId: string, scope: Scope) {
  if (!scope.hodBatchIds.includes(batchId)) {
    throw new ApiError(403, "BATCH_NOT_IN_SCOPE", "Requested batch is not in this HOD's scope.");
  }
}

async function studentAnnouncementVisible(
  announcement: { deletedAt: Date | null; universityId: string; scope: string; scopeValue: string | null },
  studentId: string,
  universityId: string,
  semesterId?: string,
) {
  const { enrollment } = await getStudentEnrollment(studentId, universityId, semesterId);
  const batch = await batchById(enrollment.batchId);
  return (
    !announcement.deletedAt &&
    announcement.universityId === universityId &&
    (announcement.scope === "ALL" ||
      (announcement.scope === "BATCH" && announcement.scopeValue === enrollment.batchId) ||
      (announcement.scope === "YEAR_LEVEL" && announcement.scopeValue === batch.yearLevel))
  );
}

async function isAnnouncementRead(studentId: string, announcementId: string) {
  const r = await prisma.announcementRead.findUnique({ where: { announcementId_studentId: { announcementId, studentId } } });
  return Boolean(r);
}

async function statusFromAttendancePctAndMarks(attendancePct: number, avgMarksPct: number, universityId: string, isActive = true) {
  if (!isActive) return "INACTIVE";
  const rules = await getAttendanceRules(universityId);
  if (attendancePct < rules.minThresholdPct || avgMarksPct < 40) return "AT_RISK";
  return "ACTIVE";
}

// ─────────────────────────────────────────────────────────────
// Service export
// ─────────────────────────────────────────────────────────────

export const portalService = {
  // ── Auth ──────────────────────────────────────────────────
  async login(email: string, password: string, role?: Role | "HOD") {
    if (role === "STUDENT") {
      const student = await prisma.student.findFirst({
        where: { OR: [{ email }, { enrollmentNo: email }], deletedAt: null },
        select: { id: true, email: true, enrollmentNo: true, name: true, passwordHash: true, isActive: true, branch: true, admissionYear: true, profilePhotoUrl: true, phone: true, universityId: true },
      });
      if (!student || !matchesPassword(student.passwordHash, password)) throw new ApiError(401, "INVALID_CREDENTIALS", "Wrong email or password.");
      if (!student.isActive) throw new ApiError(403, "ACCOUNT_INACTIVE", "Account is inactive.");
      const refreshToken = `refresh:STUDENT:${student.id}:${Date.now()}`;
      await prisma.refreshToken.create({ data: { token: refreshToken, studentId: student.id, expiresAt: new Date("2026-12-31T23:59:59.000Z") } });
      return {
        accessToken: `STUDENT:${student.id}`,
        refreshToken,
        expiresIn: 900,
        user: { id: student.id, enrollmentNo: student.enrollmentNo, name: student.name, email: student.email, role: "STUDENT", isHod: false, universityId: student.universityId, branch: student.branch, isFirstLogin: student.passwordHash === `${student.enrollmentNo}@123` },
      };
    }
    const faculty = await prisma.faculty.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, passwordHash: true, isActive: true, isHod: true, department: true, mentorCode: true, profilePhotoUrl: true, employeeId: true, universityId: true },
    });
    if (!faculty || !matchesPassword(faculty.passwordHash, password)) throw new ApiError(401, "INVALID_CREDENTIALS", "Wrong email or password.");
    if (!faculty.isActive) throw new ApiError(403, "ACCOUNT_INACTIVE", "Account is inactive.");
    const resolvedRole: "HOD" | "FACULTY" | "SUPER_ADMIN" = role === "SUPER_ADMIN" ? "SUPER_ADMIN" : faculty.isHod ? "HOD" : "FACULTY";
    const refreshToken = `refresh:${resolvedRole}:${faculty.id}:${Date.now()}`;
    await prisma.refreshToken.create({ data: { token: refreshToken, facultyId: faculty.id, expiresAt: new Date("2026-12-31T23:59:59.000Z") } });
    return {
      accessToken: `${resolvedRole}:${faculty.id}`,
      refreshToken,
      expiresIn: 900,
      user: { id: faculty.id, name: faculty.name, email: faculty.email, role: "FACULTY", isHod: faculty.isHod, universityId: faculty.universityId, department: faculty.department, mentorCode: faculty.mentorCode },
    };
  },

  async register(
    body: { role: "HOD" | "FACULTY" | "STUDENT"; name: string; email: string; password: string; universityId?: string; employeeId?: string; enrollmentNo?: string; department?: string; phone?: string; branch?: string; admissionYear?: number; isHod?: boolean },
    universityId: string,
  ) {
    if (body.password.length < 8) throw new ApiError(400, "PASSWORD_TOO_WEAK", "Password must be at least 8 characters.");
    if (body.role === "STUDENT") {
      if (!body.enrollmentNo || !body.branch || !body.admissionYear) throw new ApiError(400, "VALIDATION_ERROR", "Student registration requires enrollmentNo, branch, and admissionYear.");
      const existing = await prisma.student.findFirst({ where: { OR: [{ email: body.email }, { enrollmentNo: body.enrollmentNo }] }, select: { id: true } });
      if (existing) throw new ApiError(409, "CONFLICT", "Student email or enrollment number already exists.");
      const student = await prisma.student.create({
        data: { universityId, enrollmentNo: body.enrollmentNo, name: body.name, email: body.email, phone: body.phone ?? null, branch: body.branch, admissionYear: body.admissionYear, isActive: true, passwordHash: body.password, profilePhotoUrl: null },
      });
      return { id: student.id, role: "STUDENT", enrollmentNo: student.enrollmentNo, name: student.name, email: student.email };
    }
    if (!body.employeeId || !body.department) throw new ApiError(400, "VALIDATION_ERROR", "Faculty/HOD registration requires employeeId and department.");
    const existingF = await prisma.faculty.findFirst({ where: { OR: [{ email: body.email }, { employeeId: body.employeeId }] }, select: { id: true } });
    if (existingF) throw new ApiError(409, "CONFLICT", "Faculty email or employeeId already exists.");
    const isHod = body.role === "HOD" || body.isHod === true;
    const faculty = await prisma.faculty.create({
      data: { universityId, employeeId: body.employeeId, name: body.name, email: body.email, department: body.department, isHod, isActive: true, phone: body.phone ?? null, mentorCode: null, profilePhotoUrl: null, passwordHash: body.password },
    });
    return { id: faculty.id, role: isHod ? "HOD" : "FACULTY", employeeId: faculty.employeeId, name: faculty.name, email: faculty.email, department: faculty.department };
  },

  async refresh(refreshToken: string) {
    const token = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!token) throw new ApiError(401, "REFRESH_TOKEN_INVALID", "Refresh token is invalid.");
    const parts = refreshToken.split(":");
    if (parts.length < 4 || parts[0] !== "refresh") throw new ApiError(401, "REFRESH_TOKEN_INVALID", "Refresh token is invalid.");
    const accessRole = parts[1] as "STUDENT" | "HOD" | "FACULTY" | "SUPER_ADMIN";
    const userId = parts[2];
    if (accessRole === "STUDENT" && token.studentId !== userId) throw new ApiError(401, "REFRESH_TOKEN_INVALID", "Refresh token is invalid.");
    if (accessRole !== "STUDENT" && token.facultyId !== userId) throw new ApiError(401, "REFRESH_TOKEN_INVALID", "Refresh token is invalid.");
    return { accessToken: `${accessRole}:${userId}`, expiresIn: 900 };
  },

  async logout(refreshToken: string) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  },

  async me(userId: string, role: Role, universityId: string) {
    if (role === "STUDENT") {
      const student = await prisma.student.findUnique({ where: { id: userId }, select: { id: true, enrollmentNo: true, name: true, email: true, branch: true, admissionYear: true, profilePhotoUrl: true, phone: true, universityId: true } });
      if (!student) throw new ApiError(404, "NOT_FOUND", "User not found.");
      return { id: student.id, enrollmentNo: student.enrollmentNo, name: student.name, email: student.email, branch: student.branch, admissionYear: student.admissionYear, profilePhotoUrl: student.profilePhotoUrl ?? null, phone: student.phone, university: await getUniversity(universityId) };
    }
    if (role === "SUPER_ADMIN") {
      const admin = await prisma.faculty.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, department: true, employeeId: true, profilePhotoUrl: true } });
      if (!admin) throw new ApiError(404, "NOT_FOUND", "User not found.");
      return { id: admin.id, name: admin.name, email: admin.email, role: "SUPER_ADMIN", isHod: false, department: admin.department, employeeId: admin.employeeId, profilePhotoUrl: admin.profilePhotoUrl, university: await getUniversity(universityId) };
    }
    const faculty = await prisma.faculty.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, isHod: true, department: true, employeeId: true, profilePhotoUrl: true } });
    if (!faculty) throw new ApiError(404, "NOT_FOUND", "User not found.");
    return { id: faculty.id, name: faculty.name, email: faculty.email, role: "FACULTY", isHod: faculty.isHod, department: faculty.department, employeeId: faculty.employeeId, profilePhotoUrl: faculty.profilePhotoUrl, university: await getUniversity(universityId) };
  },

  // ── HOD Scope / Dashboard ─────────────────────────────────

  async myScope(scope: Scope) {
    const faculty = await facultyById(scope.userId);
    const activeSemester = await getActiveSemester(scope.universityId);
    const allFaculty = await getScopedFaculty(scope);
    const assignedFacultyIds = new Set(
      (await prisma.facultyBatchAssignment.findMany({ where: { batchId: { in: scope.hodBatchIds } }, select: { facultyId: true } })).map((a) => a.facultyId),
    );
    const batches = await Promise.all(
      scope.hodBatchIds.map(async (batchId) => {
        const batch = await batchById(batchId);
        const studentCount = await prisma.studentEnrollment.count({ where: { batchId, semesterId: activeSemester.id, isCurrent: true } });
        return { id: batch.id, code: batch.code, yearLevel: batch.yearLevel, studentCount };
      }),
    );
    return {
      hod: { id: faculty.id, name: faculty.name, department: faculty.department, employeeId: faculty.employeeId },
      activeSemester: { id: activeSemester.id, label: activeSemester.label, number: activeSemester.number },
      batches,
      totalStudents: batches.reduce((s, b) => s + b.studentCount, 0),
      totalFaculty: assignedFacultyIds.size,
    };
  },

  async dashboardSummary(scope: Scope) {
    const enrollments = await scopedCurrentEnrollments(scope);
    const allFaculty = await getScopedFaculty(scope);
    const activeSemester = await getActiveSemester(scope.universityId);
    const attendancePcts = await Promise.all(enrollments.map((e) => computeOverallAttendancePct(e.id)));
    const avgAttendance = average(attendancePcts);
    const results = await prisma.result.findMany({ where: { enrollment: { batchId: { in: scope.hodBatchIds }, isCurrent: true } } });
    const published = results.filter((r) => r.isPublished).length;
    return {
      totalStudents: { value: enrollments.length, deltaLabel: `${enrollments.length} current enrollments`, trend: "neutral" },
      totalFaculty: { value: allFaculty.length, deltaLabel: `${allFaculty.length} visible faculty`, trend: "neutral" },
      activeBatches: { value: scope.hodBatchIds.length, deltaLabel: scope.hodBatchIds.length === 0 ? "No batches assigned" : `${scope.hodBatchIds.length} assigned batches`, trend: "neutral" },
      avgAttendance: { value: avgAttendance, deltaLabel: enrollments.length === 0 ? "No attendance data" : "Current average", trend: "neutral" },
      resultsUploadedPct: { value: results.length === 0 ? 0 : Math.round((published / results.length) * 100), deltaLabel: results.length === 0 ? "No results uploaded" : `${published}/${results.length} published`, trend: "neutral" },
    };
  },

  async dashboardAttendanceTrend(scope: Scope, months = 6) {
    const labels = monthLabels(months);
    const enrollments = await scopedCurrentEnrollments(scope);
    const attendancePcts = await Promise.all(enrollments.map((e) => computeOverallAttendancePct(e.id)));
    const avg = average(attendancePcts);
    return { labels, series: [{ label: "Overall", data: Array.from({ length: months }, () => avg) }] };
  },

  async dashboardAtRisk(scope: Scope) {
    const rules = await getAttendanceRules(scope.universityId);
    const enrollments = await scopedCurrentEnrollments(scope);
    const rows = await Promise.all(
      enrollments.map(async (e) => {
        const student = await prisma.student.findUnique({ where: { id: e.studentId } });
        const attendancePct = await computeOverallAttendancePct(e.id);
        const results = await prisma.result.findMany({ where: { enrollmentId: e.id, isPublished: true }, select: { marksObtained: true, maxMarks: true } });
        const avgMarksPct = results.length === 0 ? 0 : average(results.map((r) => (r.marksObtained / r.maxMarks) * 100));
        const mentor = await getMentorAssignment(e.studentId, e.semesterId);
        const mentorFaculty = mentor ? await facultyById(mentor.facultyId) : null;
        const batch = await batchById(e.batchId);
        const riskFactor = attendancePct < rules.minThresholdPct && avgMarksPct < 40 ? "BOTH" : attendancePct < rules.minThresholdPct ? "ATTENDANCE" : "MARKS";
        return {
          enrollmentNo: student?.enrollmentNo ?? "",
          name: student?.name ?? "",
          batchCode: batch.code,
          attendancePct,
          avgMarksPct,
          riskFactor,
          mentorCode: mentorFaculty?.mentorCode ?? null,
          isAtRisk: attendancePct < rules.minThresholdPct || avgMarksPct < 40,
        };
      }),
    );
    return { data: rows.filter((r) => r.isAtRisk).map(({ isAtRisk: _, ...rest }) => rest) };
  },

  async dashboardRecentActivity(scope: Scope, limit = 10) {
    const logs = await prisma.activityLog.findMany({
      where: { universityId: scope.universityId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return { data: logs.map((l) => ({ id: l.id, type: l.type, title: l.title, description: l.description, createdAt: l.createdAt })) };
  },

  // ponytail: routes call these two — either they were never written or got renamed.
  // Both return empty-safe payloads matching API.md so the frontend renders.
  async dashboardResultsOverview(scope: Scope, semesterId?: string) {
    const semester = semesterId
      ? await prisma.semester.findUnique({ where: { id: semesterId } })
      : await prisma.semester.findFirst({ where: { universityId: scope.universityId, status: "ACTIVE" } });
    if (!semester) return { phases: [] };
    const phases = await prisma.phase.findMany({ where: { semesterId: semester.id }, orderBy: { number: "asc" } });
    const rows = await Promise.all(
      phases.map(async (p) => {
        const results = await prisma.result.findMany({
          where: { phaseId: p.id, enrollment: { batchId: { in: scope.hodBatchIds }, isCurrent: true }, isPublished: true },
          select: { marksObtained: true, maxMarks: true },
        });
        const avg = results.length === 0 ? null : Math.round(average(results.map((r) => (r.marksObtained / r.maxMarks) * 100)));
        return { phase: p.label, avgMarksPct: avg, status: p.isComplete ? "complete" : "pending" };
      }),
    );
    return { phases: rows };
  },

  async dashboardActivityFeed(scope: Scope, page = 1, limit = 10) {
    const total = await prisma.activityLog.count({ where: { universityId: scope.universityId } });
    const logs = await prisma.activityLog.findMany({
      where: { universityId: scope.universityId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data: logs.map((l) => ({ id: l.id, type: l.type, title: l.title, description: l.description, createdAt: l.createdAt })),
      ...buildPagination(page, limit, total),
    };
  },

  // ── Student list / management ─────────────────────────────

  async listStudents(scope: Scope, query: Record<string, string | number | undefined>) {
    const semester = await getSemester(query.semesterId as string | undefined, scope.universityId);
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { isCurrent: true, semesterId: semester.id, batchId: { in: scope.hodBatchIds }, ...(query.batchId ? { batchId: query.batchId as string } : {}) },
      include: { student: true, batch: true },
    });
    const rules = await getAttendanceRules(scope.universityId);
    const rows = await Promise.all(
      enrollments.map(async (e) => {
        const attendancePct = await computeOverallAttendancePct(e.id);
        const results = await prisma.result.findMany({ where: { enrollmentId: e.id, isPublished: true }, select: { marksObtained: true, maxMarks: true } });
        const avgMarksPct = results.length === 0 ? 0 : average(results.map((r) => (r.marksObtained / r.maxMarks) * 100));
        const status = !e.student.isActive ? "INACTIVE" : attendancePct < rules.minThresholdPct || avgMarksPct < 40 ? "AT_RISK" : "ACTIVE";
        return {
          enrollmentNo: e.student.enrollmentNo,
          name: e.student.name,
          branch: e.student.branch,
          batchCode: e.batch.code,
          rollNo: e.rollNo,
          yearLevel: e.yearLevel,
          attendancePct,
          avgMarksPct,
          status,
        };
      }),
    );
    const search = query.search as string | undefined;
    const filtered = rows
      .filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.enrollmentNo.includes(search))
      .filter((r) => !query.batchId || true) // batchId already filtered in DB
      .filter((r) => !query.status || r.status === query.status);
    return paginate(filtered, Number(query.page ?? 1), Number(query.limit ?? 20));
  },

  async getStudentByEnrollmentNo(enrollmentNo: string, scope: Scope) {
    const student = await studentByEnrollmentNo(enrollmentNo);
    const enrollment = await currentEnrollmentForStudent(student.id);
    if (!enrollment || !scope.hodBatchIds.includes(enrollment.batchId)) {
      throw new ApiError(403, "STUDENT_NOT_IN_SCOPE", "Student is not in your scope.");
    }
    const batch = await batchById(enrollment.batchId);
    const semester = await getSemester(enrollment.semesterId);
    return { enrollmentNo: student.enrollmentNo, name: student.name, branch: student.branch, batchCode: batch.code, rollNo: enrollment.rollNo, semesterLabel: semester.label, yearLevel: enrollment.yearLevel };
  },

  async uploadStudentCsv(fileBuffer: Buffer | undefined, universityId: string, semesterId: string, batchId: string) {
    if (!fileBuffer) throw new ApiError(400, "VALIDATION_ERROR", "CSV file is required.");
    const rows = parseCsvRecords(fileBuffer, ["enrollment_no", "name", "email", "branch", "admission_year", "roll_no"]);
    let created = 0;
    const errors: Array<{ row: number; enrollmentNo: string; reason: string }> = [];
    for (const { row, record } of rows) {
      const enrollmentNo = String(record.enrollment_no ?? "");
      try {
        let student = await prisma.student.findFirst({ where: { enrollmentNo } });
        if (!student) {
          student = await prisma.student.create({
            data: {
              universityId,
              enrollmentNo,
              name: String(record.name ?? ""),
              email: String(record.email ?? ""),
              branch: String(record.branch ?? ""),
              admissionYear: Number(record.admission_year ?? 0),
              passwordHash: `${enrollmentNo}@123`,
              isActive: true,
            },
          });
        }
        const existingEnrollment = await prisma.studentEnrollment.findFirst({ where: { studentId: student.id, semesterId } });
        if (!existingEnrollment) {
          const semester = await getSemester(semesterId);
          await prisma.studentEnrollment.create({
            data: { studentId: student.id, semesterId, batchId, rollNo: String(record.roll_no ?? ""), yearLevel: semester.yearLevel, isCurrent: true },
          });
        }
        created += 1;
      } catch {
        errors.push({ row, enrollmentNo, reason: "Failed to create student or enrollment." });
      }
    }
    return { created, errors, totalRows: rows.length };
  },

  // ── Faculty list / management ─────────────────────────────

  async listFaculty(scope: Scope, query: Record<string, string | number | undefined>) {
    const faculties = await prisma.faculty.findMany({
      where: { universityId: scope.universityId, deletedAt: null, NOT: { employeeId: "ADMIN001" } },
    });
    const semester = await getActiveSemester(scope.universityId);
    const rows = await Promise.all(
      faculties.map(async (f) => {
        const assignments = await prisma.facultyBatchAssignment.findMany({ where: { facultyId: f.id, semesterId: semester.id }, select: { batchId: true, subjectId: true } });
        const menteeCount = await prisma.mentorAssignment.count({ where: { facultyId: f.id, semesterId: semester.id } });
        return {
          id: f.id,
          employeeId: f.employeeId,
          name: f.name,
          email: f.email,
          department: f.department,
          isHod: f.isHod,
          mentorCode: f.mentorCode,
          isActive: f.isActive,
          assignedBatches: [...new Set(assignments.map((a) => a.batchId))].length,
          assignedSubjects: [...new Set(assignments.map((a) => a.subjectId).filter(Boolean))].length,
          menteeCount,
        };
      }),
    );
    const search = query.search as string | undefined;
    const filtered = rows.filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.employeeId.includes(search));
    return paginate(filtered, Number(query.page ?? 1), Number(query.limit ?? 20));
  },

  async getFacultyProfile(facultyId: string) {
    const f = await facultyById(facultyId);
    return { id: f.id, employeeId: f.employeeId, name: f.name, email: f.email, phone: f.phone, department: f.department, isHod: f.isHod, mentorCode: f.mentorCode, isActive: f.isActive, profilePhotoUrl: f.profilePhotoUrl };
  },

  async uploadFacultyCsv(fileBuffer: Buffer | undefined, universityId: string) {
    if (!fileBuffer) throw new ApiError(400, "VALIDATION_ERROR", "CSV file is required.");
    const rows = parseCsvRecords(fileBuffer, ["employee_id", "name", "email", "department"]);
    let created = 0;
    const errors: Array<{ row: number; employeeId: string; reason: string }> = [];
    for (const { row, record } of rows) {
      const employeeId = String(record.employee_id ?? "");
      try {
        const existing = await prisma.faculty.findFirst({ where: { OR: [{ employeeId }, { email: String(record.email ?? "") }] } });
        if (!existing) {
          await prisma.faculty.create({
            data: { universityId, employeeId, name: String(record.name ?? ""), email: String(record.email ?? ""), department: String(record.department ?? ""), isHod: false, isActive: true, passwordHash: `${employeeId}@123` },
          });
          created += 1;
        } else {
          errors.push({ row, employeeId, reason: "Faculty already exists." });
        }
      } catch {
        errors.push({ row, employeeId, reason: "Failed to create faculty." });
      }
    }
    return { created, errors, totalRows: rows.length };
  },

  async deactivateFaculty(facultyId: string) {
    const f = await facultyById(facultyId);
    if (f.isHod) throw new ApiError(403, "CANNOT_DEACTIVATE_HOD", "Cannot deactivate an HOD.");
    await prisma.faculty.update({ where: { id: facultyId }, data: { isActive: false } });
    return { id: facultyId, isActive: false };
  },

  async assignFacultyBatch(facultyId: string, subjectId: string, batchId: string, semesterId: string) {
    await facultyById(facultyId);
    const existing = await prisma.facultyBatchAssignment.findFirst({ where: { facultyId, batchId, subjectId, semesterId } });
    if (existing) throw new ApiError(409, "ALREADY_ASSIGNED", "Faculty already assigned to this batch/subject.");
    const assignment = await prisma.facultyBatchAssignment.create({ data: { facultyId, batchId, subjectId, semesterId } });
    return { id: assignment.id, facultyId, subjectId, batchId, semesterId };
  },

  // ── Results ───────────────────────────────────────────────

  async listResults(scope: Scope, query: Record<string, string | number | undefined>) {
    const semester = await getSemester(query.semesterId as string | undefined, scope.universityId);
    const where = {
      enrollment: { batchId: { in: scope.hodBatchIds }, isCurrent: true, semesterId: semester.id },
      ...(query.phaseId ? { phaseId: query.phaseId as string } : {}),
      ...(query.subjectId ? { subjectId: query.subjectId as string } : {}),
      ...(query.batchId ? { enrollment: { batchId: query.batchId as string, isCurrent: true } } : {}),
    };
    const results = await prisma.result.findMany({ where, include: { enrollment: { include: { student: true, batch: true } }, phase: true, subject: true } });
    const rows = results.map((r) => ({
      enrollmentNo: r.enrollment.student.enrollmentNo,
      studentName: r.enrollment.student.name,
      batchCode: r.enrollment.batch.code,
      phaseLabel: r.phase.label,
      subjectCode: r.subject.code,
      marksObtained: r.marksObtained,
      maxMarks: r.maxMarks,
      grade: r.grade,
      isPublished: r.isPublished,
      publishedAt: r.publishedAt,
    }));
    return paginate(rows, Number(query.page ?? 1), Number(query.limit ?? 20));
  },

  async uploadResults(
    scope: Scope,
    batchId: string,
    phaseId: string,
    subjectId: string,
    results: Array<{ enrollmentId: string; marksObtained: number; maxMarks?: number }>,
    uploadedById: string,
  ) {
    ensureBatchInScope(batchId, scope);
    let uploaded = 0;
    for (const r of results) {
      const pct = (r.marksObtained / (r.maxMarks ?? 100)) * 100;
      await prisma.result.upsert({
        where: { enrollmentId_phaseId_subjectId: { enrollmentId: r.enrollmentId, phaseId, subjectId } },
        update: { marksObtained: r.marksObtained, maxMarks: r.maxMarks ?? 100, grade: gradeFromPct(pct), updatedAt: new Date() },
        create: { enrollmentId: r.enrollmentId, phaseId, subjectId, marksObtained: r.marksObtained, maxMarks: r.maxMarks ?? 100, grade: gradeFromPct(pct), isPublished: false, uploadedById },
      });
      uploaded += 1;
    }
    return { uploaded, phaseId, subjectId };
  },

  async uploadResultsCsv(fileBuffer: Buffer | undefined, scope: Scope, phaseId: string, subjectId: string, batchId: string, uploadedById: string) {
    if (!fileBuffer) throw new ApiError(400, "VALIDATION_ERROR", "CSV file is required.");
    await ensureBatchInScope(batchId, scope);
    const rows = parseCsvRecords(fileBuffer, ["enrollment_no", "marks_obtained"]);
    let uploaded = 0;
    const errors: Array<{ row: number; enrollmentNo: string; reason: string }> = [];
    for (const { row, record } of rows) {
      const enrollmentNo = String(record.enrollment_no ?? "");
      try {
        const student = await prisma.student.findFirst({ where: { enrollmentNo } });
        if (!student) { errors.push({ row, enrollmentNo, reason: "Student not found" }); continue; }
        const enrollment = await currentEnrollmentForStudent(student.id);
        if (!enrollment) { errors.push({ row, enrollmentNo, reason: "No active enrollment" }); continue; }
        const marksObtained = Number(record.marks_obtained);
        const maxMarks = Number(record.max_marks ?? 100);
        const pct = (marksObtained / maxMarks) * 100;
        await prisma.result.upsert({
          where: { enrollmentId_phaseId_subjectId: { enrollmentId: enrollment.id, phaseId, subjectId } },
          update: { marksObtained, maxMarks, grade: gradeFromPct(pct), updatedAt: new Date() },
          create: { enrollmentId: enrollment.id, phaseId, subjectId, marksObtained, maxMarks, grade: gradeFromPct(pct), isPublished: false, uploadedById },
        });
        uploaded += 1;
      } catch {
        errors.push({ row, enrollmentNo, reason: "Upload failed." });
      }
    }
    return { uploaded, errors };
  },

  async publishResults(phaseId: string, subjectId: string, batchId: string, scope: Scope) {
    await ensureBatchInScope(batchId, scope);
    const enrollments = await prisma.studentEnrollment.findMany({ where: { batchId, isCurrent: true }, select: { id: true } });
    const ids = enrollments.map((e) => e.id);
    const { count } = await prisma.result.updateMany({
      where: { enrollmentId: { in: ids }, phaseId, subjectId, isPublished: false },
      data: { isPublished: true, publishedAt: new Date() },
    });
    return { published: count, phaseId, subjectId };
  },

  async resultsSummary(scope: Scope, semesterId?: string) {
    const semester = await getSemester(semesterId, scope.universityId);
    const phases = await prisma.phase.findMany({ where: { semesterId: semester.id }, orderBy: { number: "asc" } });
    const subjects = await prisma.subject.findMany({ where: { semesterId: semester.id } });
    const summary = await Promise.all(
      phases.map(async (phase) => ({
        phaseLabel: phase.label,
        phaseNumber: phase.number,
        isComplete: phase.isComplete,
        subjects: await Promise.all(
          subjects.map(async (subject) => {
            const results = await prisma.result.findMany({ where: { phaseId: phase.id, subjectId: subject.id, enrollment: { batchId: { in: scope.hodBatchIds }, isCurrent: true } } });
            return {
              subjectCode: subject.code,
              uploadedCount: results.length,
              publishedCount: results.filter((r) => r.isPublished).length,
              avgMarksPct: results.length === 0 ? null : average(results.map((r) => (r.marksObtained / r.maxMarks) * 100)),
            };
          }),
        ),
      })),
    );
    return { semesterLabel: semester.label, summary };
  },

  // ── Batches ───────────────────────────────────────────────

  async listBatches(scope: Scope, semesterId?: string) {
    const semester = await getSemester(semesterId, scope.universityId);
    const batches = await prisma.batch.findMany({
      where: { id: { in: scope.hodBatchIds } },
      include: { hodScope: true },
    });
    const result = await Promise.all(
      batches.map(async (b) => {
        const studentCount = await prisma.studentEnrollment.count({ where: { batchId: b.id, semesterId: semester.id, isCurrent: true } });
        const facultyCount = await prisma.facultyBatchAssignment.count({ where: { batchId: b.id, semesterId: semester.id } });
        return { id: b.id, code: b.code, yearLevel: b.yearLevel, studentCount, facultyCount };
      }),
    );
    return { data: result };
  },

  async createBatch(universityId: string, academicYearId: string, code: string, yearLevel: YearLevel) {
    const existing = await prisma.batch.findFirst({ where: { academicYearId, code } });
    if (existing) throw new ApiError(409, "BATCH_CODE_EXISTS", "Batch code already exists in this academic year.");
    const batch = await prisma.batch.create({ data: { universityId, academicYearId, code, yearLevel } });
    return { id: batch.id, code: batch.code, yearLevel: batch.yearLevel };
  },

  async getBatch(batchId: string) {
    return batchById(batchId);
  },

  // ── Subjects ──────────────────────────────────────────────

  async listSubjects(scope: Scope, semesterId?: string, search?: string, type?: string) {
    const semester = await getSemester(semesterId, scope.universityId);
    const subjects = await prisma.subject.findMany({
      where: {
        semesterId: semester.id,
        deletedAt: null,
        ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { code: { contains: search, mode: "insensitive" } }] } : {}),
        ...(type ? { type: type as any } : {}),
      },
    });
    const data = await Promise.all(
      subjects.map(async (subject) => {
        const assignments = await prisma.facultyBatchAssignment.findMany({ where: { subjectId: subject.id }, include: { batch: { select: { code: true } } } });
        const assignedFacultyId = assignments[0]?.facultyId;
        const assignedFaculty = assignedFacultyId ? await prisma.faculty.findUnique({ where: { id: assignedFacultyId }, select: { id: true, name: true } }) : null;
        const pyqCount = await prisma.pYQFile.count({ where: { subjectId: subject.id } });
        return {
          id: subject.id,
          code: subject.code,
          name: subject.name,
          credits: subject.credits,
          type: subject.type,
          assignedFaculty: assignedFaculty ? { id: assignedFaculty.id, name: assignedFaculty.name } : null,
          batches: [...new Set(assignments.map((a) => a.batch.code))],
          pyqUploaded: pyqCount > 0,
        };
      }),
    );
    return {
      data,
      summary: { totalSubjects: data.length, totalCredits: data.reduce((s, d) => s + d.credits, 0), assignedCount: data.filter((d) => d.assignedFaculty).length, unassignedCount: data.filter((d) => !d.assignedFaculty).length },
    };
  },

  async getSubject(subjectId: string) {
    return subjectById(subjectId);
  },

  async createSubject(body: { semesterId: string; universityId: string; code: string; name: string; credits: number; type: string; facultyId?: string; batchIds?: string[] }) {
    const existing = await prisma.subject.findUnique({ where: { semesterId_code: { semesterId: body.semesterId, code: body.code } } });
    if (existing) throw new ApiError(409, "SUBJECT_CODE_EXISTS_IN_SEMESTER", "Subject code already exists in semester.");
    const subject = await prisma.subject.create({
      data: { semesterId: body.semesterId, universityId: body.universityId, code: body.code, name: body.name, credits: body.credits, type: body.type as any },
    });
    if (body.facultyId && body.batchIds?.length) {
      for (const batchId of body.batchIds) {
        await prisma.facultyBatchAssignment.create({ data: { facultyId: body.facultyId, subjectId: subject.id, batchId, semesterId: body.semesterId } });
      }
    }
    return { id: subject.id, code: subject.code, name: subject.name };
  },

  async updateSubject(subjectId: string, body: { code?: string; name?: string; credits?: number; type?: string }) {
    const updated = await prisma.subject.update({ where: { id: subjectId }, data: { ...body, type: body.type as any } });
    return updated;
  },

  async deleteSubject(subjectId: string) {
    const hasResults = await prisma.result.findFirst({ where: { subjectId } });
    const hasAttendance = await prisma.attendanceRecord.findFirst({ where: { subjectId } });
    if (hasResults || hasAttendance) throw new ApiError(409, "SUBJECT_HAS_RESULTS_OR_ATTENDANCE", "Subject has dependent data.");
    await prisma.subject.update({ where: { id: subjectId }, data: { deletedAt: new Date() } });
  },

  async copySubjects(fromSemesterId: string, toSemesterId: string, universityId: string) {
    const source = await prisma.subject.findMany({ where: { semesterId: fromSemesterId, deletedAt: null } });
    let copiedCount = 0; let skippedCount = 0;
    for (const s of source) {
      const exists = await prisma.subject.findUnique({ where: { semesterId_code: { semesterId: toSemesterId, code: s.code } } });
      if (exists) { skippedCount++; continue; }
      await prisma.subject.create({ data: { semesterId: toSemesterId, universityId, code: s.code, name: s.name, credits: s.credits, type: s.type } });
      copiedCount++;
    }
    return { copiedCount, skippedCount };
  },

  async uploadPyq(subjectId: string, uploadedById: string, year: string, fileUrl: string, fileKey: string) {
    await prisma.pYQFile.create({ data: { subjectId, uploadedById, year, fileUrl, fileKey } });
    return { uploaded: 1, subjectId, processingStatus: "uploaded" };
  },

  // ── Attendance (HOD) ──────────────────────────────────────

  async attendanceSummary(scope: Scope, semesterId?: string) {
    const semester = semesterId
      ? await prisma.semester.findUnique({ where: { id: semesterId } })
      : await prisma.semester.findFirst({ where: { universityId: scope.universityId, status: "ACTIVE" } });
    const rules = await getAttendanceRules(scope.universityId);
    const where = { batchId: { in: scope.hodBatchIds }, isCurrent: true, ...(semester ? { semesterId: semester.id } : {}) };
    const enrollments = await prisma.studentEnrollment.findMany({ where });
    const attendancePcts = await Promise.all(enrollments.map((e) => computeOverallAttendancePct(e.id)));
    const records = await prisma.attendanceRecord.findMany({ where: { enrollment: where } });
    const lockedCount = records.filter((r) => r.isLocked).length;
    return {
      overallAvgPct: average(attendancePcts),
      deltaLabel: enrollments.length === 0 ? "No attendance data" : "Current attendance average",
      belowThresholdCount: attendancePcts.filter((p) => p < rules.minThresholdPct).length,
      totalLectures: [...new Set(records.map((r) => r.lectureDate.toISOString().slice(0, 10)))].length,
      lockedRecordsPct: records.length === 0 ? 0 : Math.round((lockedCount / records.length) * 100),
    };
  },

  async attendanceHeatmap(scope: Scope, batchId: string, semesterId: string) {
    await ensureBatchInScope(batchId, scope);
    const subjects = await prisma.subject.findMany({ where: { semesterId } });
    const enrollments = await prisma.studentEnrollment.findMany({ where: { batchId, semesterId, isCurrent: true }, include: { student: true } });
    const students = await Promise.all(
      enrollments.map(async (e) => {
        const perSubjectPct = await Promise.all(subjects.map((s) => computeAttendancePct(e.id, s.id)));
        return { enrollmentNo: e.student.enrollmentNo, name: e.student.name, perSubjectPct: perSubjectPct.map((p) => Math.round(p)), avgPct: Math.round(average(perSubjectPct)) };
      }),
    );
    return { subjects: subjects.map((s) => s.code), students };
  },

  async attendanceTable(scope: Scope, batchId: string, semesterId: string, search?: string, page = 1, limit = 20) {
    await ensureBatchInScope(batchId, scope);
    const subjects = await prisma.subject.findMany({ where: { semesterId } });
    const enrollments = await prisma.studentEnrollment.findMany({ where: { batchId, semesterId, isCurrent: true }, include: { student: true } });
    const rules = await getAttendanceRules(scope.universityId);
    const rows = await Promise.all(
      enrollments.map(async (e) => {
        const perSubjectEntries = await Promise.all(
          subjects.map(async (s) => [s.code, Math.round(await computeAttendancePct(e.id, s.id))] as [string, number]),
        );
        const avgPct = Math.round(average(perSubjectEntries.map(([, pct]) => pct)));
        const allRecords = await prisma.attendanceRecord.findMany({ where: { enrollmentId: e.id } });
        return {
          enrollmentNo: e.student.enrollmentNo,
          name: e.student.name,
          perSubject: Object.fromEntries(perSubjectEntries),
          avgPct,
          status: avgPct < rules.minThresholdPct ? "AT_RISK" : "ACTIVE",
          isLocked: allRecords.length > 0 && allRecords.every((r) => r.isLocked),
        };
      }),
    );
    const filtered = rows.filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.enrollmentNo.includes(search));
    return paginate(filtered, page, limit);
  },

  async attendanceBySubject(scope: Scope, batchId: string, semesterId: string) {
    await ensureBatchInScope(batchId, scope);
    const subjects = await prisma.subject.findMany({ where: { semesterId } });
    const enrollments = await prisma.studentEnrollment.findMany({ where: { batchId, semesterId, isCurrent: true } });
    const result = await Promise.all(
      subjects.map(async (subject) => {
        const pcts = await Promise.all(enrollments.map((e) => computeAttendancePct(e.id, subject.id)));
        return { code: subject.code, avgPct: Math.round(average(pcts)) };
      }),
    );
    return { subjects: result };
  },

  async lockAttendance(subjectId: string, batchId: string, semesterId: string) {
    const enrollments = await prisma.studentEnrollment.findMany({ where: { batchId, semesterId, isCurrent: true }, select: { id: true } });
    const { count } = await prisma.attendanceRecord.updateMany({
      where: { enrollmentId: { in: enrollments.map((e) => e.id) }, subjectId },
      data: { isLocked: true },
    });
    return { lockedCount: count, isLocked: true };
  },

  async unlockAttendance(enrollmentId: string, subjectId: string) {
    const enrollment = await enrollmentById(enrollmentId);
    await prisma.attendanceRecord.updateMany({ where: { enrollmentId, subjectId }, data: { isLocked: false } });
    const student = await prisma.student.findUnique({ where: { id: enrollment.studentId }, select: { enrollmentNo: true } });
    return { enrollmentNo: student?.enrollmentNo ?? "", isLocked: false };
  },

  async lockAllAttendance(batchId: string, semesterId: string) {
    const enrollments = await prisma.studentEnrollment.findMany({ where: { batchId, semesterId, isCurrent: true }, select: { id: true } });
    const { count } = await prisma.attendanceRecord.updateMany({ where: { enrollmentId: { in: enrollments.map((e) => e.id) } }, data: { isLocked: true } });
    return { lockedCount: count };
  },

  async attendanceExport(scope: Scope, batchId: string, semesterId: string) {
    const table = (await this.attendanceTable(scope, batchId, semesterId, undefined, 1, 1000)).data;
    const subjects = await prisma.subject.findMany({ where: { semesterId } });
    const subjectCodes = subjects.map((s) => s.code);
    const lines = [["enrollment_no", "name", ...subjectCodes, "avg_pct", "status"].join(",")];
    for (const row of table) {
      lines.push([row.enrollmentNo, row.name, ...subjectCodes.map((c) => row.perSubject[c] ?? 0), row.avgPct, row.status].join(","));
    }
    return lines.join("\n");
  },

  // ── Faculty Attendance (marking) ──────────────────────────

  async facultyAttendance(
    body: { subjectId: string; batchId: string; lectureDate: string; attendance: Array<{ enrollmentId: string; isPresent: boolean }> },
    facultyId: string,
    universityId: string,
  ) {
    const assignment = await prisma.facultyBatchAssignment.findFirst({ where: { facultyId, batchId: body.batchId, subjectId: body.subjectId } });
    if (!assignment) throw new ApiError(403, "NOT_ASSIGNED_TO_BATCH", "Faculty is not assigned to this batch.");
    const lectureDate = new Date(body.lectureDate);
    for (const item of body.attendance) {
      const existing = await prisma.attendanceRecord.findUnique({
        where: { enrollmentId_subjectId_lectureDate: { enrollmentId: item.enrollmentId, subjectId: body.subjectId, lectureDate } },
      });
      if (existing?.isLocked) throw new ApiError(409, "ATTENDANCE_RECORD_LOCKED", "Attendance record is locked.");
      if (existing) {
        await prisma.attendanceRecord.update({ where: { id: existing.id }, data: { isPresent: item.isPresent, updatedAt: new Date() } });
      } else {
        await prisma.attendanceRecord.create({ data: { enrollmentId: item.enrollmentId, subjectId: body.subjectId, facultyId, lectureDate, isPresent: item.isPresent } });
      }
    }
    const subject = await subjectById(body.subjectId);
    return { recordsCreated: body.attendance.length, lectureDate: body.lectureDate, subjectCode: subject.code };
  },

  // ── Mentorship ────────────────────────────────────────────

  async mentorshipSummary(scope: Scope, semesterId?: string) {
    const semester = await getSemester(semesterId, scope.universityId);
    const enrollments = await scopedCurrentEnrollments(scope, semester.id);
    const assignments = await prisma.mentorAssignment.findMany({ where: { semesterId: semester.id } });
    const activeMentors = new Set(assignments.map((a) => a.facultyId)).size;
    const assignedStudentIds = new Set(assignments.map((a) => a.studentId));
    return {
      activeMentors,
      studentsAssigned: assignments.length,
      unassignedStudents: enrollments.filter((e) => !assignedStudentIds.has(e.studentId)).length,
      avgMenteesPerMentor: activeMentors === 0 ? 0 : Number((assignments.length / activeMentors).toFixed(1)),
    };
  },

  async mentorshipMentors(scope: Scope, semesterId?: string) {
    const semester = await getSemester(semesterId, scope.universityId);
    const allFaculty = await getScopedFaculty(scope);
    const assignments = await prisma.mentorAssignment.findMany({ where: { semesterId: semester.id }, include: { student: true } });
    const data = allFaculty
      .filter((f) => !f.isHod && f.mentorCode)
      .map((faculty) => {
        const mentees = assignments.filter((a) => a.facultyId === faculty.id).map((a) => ({ enrollmentNo: a.student.enrollmentNo, name: a.student.name }));
        return { facultyId: faculty.id, name: faculty.name, department: faculty.department, mentorCode: faculty.mentorCode, menteeCount: mentees.length, mentees };
      });
    return { data };
  },

  async mentorshipAssignments(scope: Scope, query: Record<string, string | number | undefined>) {
    const semester = await getSemester(query.semesterId as string | undefined, scope.universityId);
    const assignments = await prisma.mentorAssignment.findMany({
      where: { semesterId: semester.id },
      include: { student: true, faculty: true },
    });
    const rows = await Promise.all(
      assignments.map(async (a) => {
        const enrollment = await currentEnrollmentForStudent(a.studentId, semester.id);
        const batch = enrollment ? await batchById(enrollment.batchId) : null;
        return { enrollmentNo: a.student.enrollmentNo, studentName: a.student.name, batchCode: batch?.code ?? "", mentorName: a.faculty.name, mentorCode: a.faculty.mentorCode };
      }),
    );
    const search = query.search as string | undefined;
    const filtered = rows
      .filter((r) => !search || r.studentName.toLowerCase().includes(search.toLowerCase()) || r.enrollmentNo.includes(search))
      .filter((r) => !query.mentorCode || r.mentorCode === query.mentorCode);
    return paginate(filtered, Number(query.page ?? 1), Number(query.limit ?? 20));
  },

  async mentorshipUnassigned(scope: Scope, semesterId?: string) {
    const semester = await getSemester(semesterId, scope.universityId);
    const assignedIds = new Set((await prisma.mentorAssignment.findMany({ where: { semesterId: semester.id }, select: { studentId: true } })).map((a) => a.studentId));
    const enrollments = await scopedCurrentEnrollments(scope, semester.id);
    const data = await Promise.all(
      enrollments.filter((e) => !assignedIds.has(e.studentId)).map(async (e) => {
        const student = await prisma.student.findUnique({ where: { id: e.studentId }, select: { enrollmentNo: true, name: true, branch: true } });
        const batch = await batchById(e.batchId);
        return { enrollmentNo: student?.enrollmentNo ?? "", name: student?.name ?? "", batchCode: batch.code, branch: student?.branch ?? "" };
      }),
    );
    return { data, total: data.length };
  },

  async assignMentor(studentEnrollmentNo: string, facultyId: string, semesterId: string) {
    const student = await studentByEnrollmentNo(studentEnrollmentNo);
    const faculty = await facultyById(facultyId);
    if (faculty.isHod) throw new ApiError(400, "CANNOT_ASSIGN_TO_HOD", "Cannot assign mentor to HOD.");
    const existing = await getMentorAssignment(student.id, semesterId);
    if (existing) throw new ApiError(409, "STUDENT_ALREADY_HAS_MENTOR_THIS_SEMESTER", "Student already assigned.");
    const assignment = await prisma.mentorAssignment.create({ data: { facultyId, studentId: student.id, semesterId, mentorCode: faculty.mentorCode ?? "" } });
    return { id: assignment.id, mentorCode: faculty.mentorCode, student: { enrollmentNo: student.enrollmentNo, name: student.name }, faculty: { id: faculty.id, name: faculty.name } };
  },

  async assignMentorCsv(fileBuffer: Buffer | undefined, semesterId: string) {
    if (!fileBuffer) throw new ApiError(400, "VALIDATION_ERROR", "CSV file is required.");
    const rows = parseCsvRecords(fileBuffer, ["enrollment_no", "mentor_code"]);
    let assigned = 0;
    const errors: Array<{ row: number; enrollmentNo: string; reason: string }> = [];
    for (const { row, record } of rows) {
      const enrollmentNo = String(record.enrollment_no ?? "");
      const mentorCode = String(record.mentor_code ?? "");
      const student = await prisma.student.findFirst({ where: { enrollmentNo } });
      const faculty = await prisma.faculty.findFirst({ where: { mentorCode } });
      if (!student) { errors.push({ row, enrollmentNo, reason: "Student not found" }); continue; }
      if (!faculty) { errors.push({ row, enrollmentNo, reason: `Mentor code ${mentorCode} not found` }); continue; }
      const existing = await getMentorAssignment(student.id, semesterId);
      if (existing) { errors.push({ row, enrollmentNo, reason: "Student already has mentor this semester" }); continue; }
      await prisma.mentorAssignment.create({ data: { facultyId: faculty.id, studentId: student.id, semesterId, mentorCode } });
      assigned += 1;
    }
    return { assigned, errors };
  },

  async reassignMentor(studentEnrollmentNo: string, newFacultyId: string, semesterId: string) {
    const student = await studentByEnrollmentNo(studentEnrollmentNo);
    const existing = await getMentorAssignment(student.id, semesterId);
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Mentor assignment not found.");
    const newFaculty = await facultyById(newFacultyId);
    await prisma.mentorAssignment.update({ where: { id: existing.id }, data: { facultyId: newFacultyId, mentorCode: newFaculty.mentorCode ?? "" } });
    return { enrollmentNo: student.enrollmentNo, newMentorCode: newFaculty.mentorCode };
  },

  async autoAssignMentors(scope: Scope, semesterId: string) {
    const unassigned = (await this.mentorshipUnassigned(scope, semesterId)).data;
    const allFaculty = await getScopedFaculty(scope);
    const mentors = allFaculty.filter((f) => !f.isHod && f.mentorCode);
    const distribution = mentors.map((f) => ({ mentorCode: f.mentorCode!, newCount: 0 }));
    for (let i = 0; i < unassigned.length; i++) {
      const mentor = mentors[i % mentors.length];
      await this.assignMentor(unassigned[i].enrollmentNo, mentor.id, semesterId);
      distribution[i % mentors.length].newCount += 1;
    }
    return { assignedCount: unassigned.length, distribution };
  },

  async deleteMentorAssignment(assignmentId: string) {
    await prisma.mentorAssignment.delete({ where: { id: assignmentId } });
  },

  async resetMentorAssignments(semesterId: string, confirm: boolean) {
    if (!confirm) throw new ApiError(400, "VALIDATION_ERROR", "Confirmation required.");
    const { count } = await prisma.mentorAssignment.deleteMany({ where: { semesterId } });
    return { clearedCount: count };
  },

  // ── Analytics ─────────────────────────────────────────────

  async analyticsKpi(scope: Scope, batchId?: string) {
    const semester = await getActiveSemester(scope.universityId);
    const rules = await getAttendanceRules(scope.universityId);
    // ponytail: prefer the *last completed* phase for KPIs so avg-marks isn't 0 mid-semester
    const currentPhase = (await prisma.phase.findFirst({ where: { semesterId: semester.id, isComplete: true }, orderBy: { number: "desc" } }))
      ?? await currentPhaseForSemester(semester.id);
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { isCurrent: true, batchId: { in: batchId ? [batchId] : scope.hodBatchIds } },
      include: { student: true },
    });
    const attendancePcts = await Promise.all(enrollments.map((e) => computeOverallAttendancePct(e.id)));
    const avgAttendance = average(attendancePcts);
    const phaseResults = currentPhase
      ? await prisma.result.findMany({ where: { phaseId: currentPhase.id, enrollmentId: { in: enrollments.map((e) => e.id) } } })
      : [];
    const avgMarks = phaseResults.length === 0 ? 0 : average(phaseResults.map((r) => (r.marksObtained / r.maxMarks) * 100));
    const atRiskCount = enrollments.filter((_, i) => attendancePcts[i] < rules.minThresholdPct).length;
    const passRate = phaseResults.length === 0 ? 0 : Number(((phaseResults.filter((r) => r.marksObtained >= 40).length / phaseResults.length) * 100).toFixed(1));
    const markPcts = await Promise.all(enrollments.map(async (e) => {
      const results = await prisma.result.findMany({ where: { enrollmentId: e.id, isPublished: true }, select: { marksObtained: true, maxMarks: true } });
      return results.length === 0 ? 0 : average(results.map((r) => (r.marksObtained / r.maxMarks) * 100));
    }));
    let topIdx = 0;
    for (let i = 1; i < markPcts.length; i++) { if (markPcts[i] > markPcts[topIdx]) topIdx = i; }
    const topStudent = enrollments[topIdx]?.student ?? null;
    return {
      avgAttendance: { value: avgAttendance, deltaLabel: `${enrollments.length} students` },
      avgMarksLatestPhase: { value: avgMarks, phaseLabel: currentPhase?.label ?? "", deltaLabel: `${phaseResults.length} rows` },
      atRiskCount: { value: atRiskCount, deltaLabel: "Current count" },
      passRateLatestPhase: { value: passRate, phaseLabel: currentPhase?.label ?? "", deltaLabel: `${phaseResults.length} rows` },
      topScorer: topStudent ? { name: topStudent.name, avgPct: markPcts[topIdx] } : { name: "-", avgPct: 0 },
    };
  },

  async analyticsAttendanceTrend(scope: Scope, months = 6) {
    const labels = monthLabels(months);
    const series = await Promise.all(
      scope.hodBatchIds.map(async (batchId) => {
        const enrollments = await prisma.studentEnrollment.findMany({ where: { batchId, isCurrent: true }, select: { id: true } });
        const pcts = await Promise.all(enrollments.map((e) => computeOverallAttendancePct(e.id)));
        const avg = average(pcts);
        const batch = await batchById(batchId);
        return { batchCode: batch.code, data: Array.from({ length: months }, () => avg) };
      }),
    );
    return { labels, series };
  },

  async analyticsAttendanceDistribution(scope: Scope, batchId?: string) {
    const enrollments = await prisma.studentEnrollment.findMany({ where: { isCurrent: true, batchId: { in: batchId ? [batchId] : scope.hodBatchIds } } });
    const values = await Promise.all(enrollments.map((e) => computeOverallAttendancePct(e.id)));
    return {
      buckets: [
        { range: "< 60%", count: values.filter((v) => v < 60).length },
        { range: "60–74%", count: values.filter((v) => v >= 60 && v < 75).length },
        { range: "75–84%", count: values.filter((v) => v >= 75 && v < 85).length },
        { range: "85–94%", count: values.filter((v) => v >= 85 && v < 95).length },
        { range: "≥ 95%", count: values.filter((v) => v >= 95).length },
      ],
    };
  },

  async analyticsAttendanceBySubject(scope: Scope, semesterId?: string, batchId?: string) {
    const targetBatchId = batchId ?? scope.hodBatchIds[0];
    if (!targetBatchId) return { subjects: [] };
    return this.attendanceBySubject(scope, targetBatchId, (await getSemester(semesterId, scope.universityId)).id);
  },

  async analyticsMarksByPhase(scope: Scope) {
    const semester = await getActiveSemester(scope.universityId);
    const phases = await prisma.phase.findMany({ where: { semesterId: semester.id }, orderBy: { number: "asc" } });
    const subjects = await prisma.subject.findMany({ where: { semesterId: semester.id } });
    const series = await Promise.all(
      subjects.slice(0, 2).map(async (subject) => ({
        subjectCode: subject.code,
        data: await Promise.all(
          phases.map(async (phase) => {
            const rows = await prisma.result.findMany({ where: { phaseId: phase.id, subjectId: subject.id, enrollment: { batchId: { in: scope.hodBatchIds }, isCurrent: true } } });
            return rows.length === 0 ? null : average(rows.map((r) => (r.marksObtained / r.maxMarks) * 100));
          }),
        ),
      })),
    );
    return { phases: phases.map((p) => p.label), series };
  },

  async analyticsMarksBySubject(scope: Scope, phaseId: string, batchId?: string) {
    const phase = await phaseById(phaseId);
    const subjects = await prisma.subject.findMany({ where: { semesterId: phase.semesterId } });
    const result = await Promise.all(
      subjects.map(async (subject) => {
        const rows = await prisma.result.findMany({
          where: { phaseId, subjectId: subject.id, enrollment: { batchId: { in: batchId ? [batchId] : scope.hodBatchIds }, isCurrent: true } },
        });
        return { code: subject.code, avgMarksPct: rows.length === 0 ? 0 : Math.round(average(rows.map((r) => (r.marksObtained / r.maxMarks) * 100))) };
      }),
    );
    return { subjects: result };
  },

  async analyticsGradeDistribution(scope: Scope, phaseId: string, batchId?: string) {
    const rows = await prisma.result.findMany({ where: { phaseId, enrollment: { batchId: { in: batchId ? [batchId] : scope.hodBatchIds }, isCurrent: true } } });
    const grades = rows.map((r) => r.grade);
    return {
      buckets: [
        { grade: "A+ (≥90)", count: grades.filter((g) => g === "A+").length },
        { grade: "A (80–89)", count: grades.filter((g) => g === "A").length },
        { grade: "B (70–79)", count: grades.filter((g) => g === "B").length },
        { grade: "C (60–69)", count: grades.filter((g) => g === "C").length },
        { grade: "D (50–59)", count: grades.filter((g) => g === "D").length },
        { grade: "F (<50)", count: grades.filter((g) => g === "F").length },
      ],
    };
  },

  async analyticsLeaderboard(scope: Scope, phaseId: string, batchId?: string, limit = 10) {
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { isCurrent: true, batchId: { in: batchId ? [batchId] : scope.hodBatchIds } },
      include: { student: true, batch: true },
    });
    const rows = await Promise.all(
      enrollments.map(async (e) => {
        const results = await prisma.result.findMany({ where: { enrollmentId: e.id, phaseId } });
        const avgPct = results.length === 0 ? 0 : average(results.map((r) => (r.marksObtained / r.maxMarks) * 100));
        return { enrollmentNo: e.student.enrollmentNo, name: e.student.name, batchCode: e.batch.code, avgPct };
      }),
    );
    return { data: rows.sort((a, b) => b.avgPct - a.avgPct).slice(0, limit).map((r, i) => ({ rank: i + 1, ...r })) };
  },

  async analyticsAtRisk(scope: Scope, query: Record<string, string | number | undefined>) {
    const rules = await getAttendanceRules(scope.universityId);
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { isCurrent: true, batchId: { in: scope.hodBatchIds } },
      include: { student: true, batch: true },
    });
    const rows = await Promise.all(
      enrollments.map(async (e) => {
        const attendancePct = await computeOverallAttendancePct(e.id);
        const results = await prisma.result.findMany({ where: { enrollmentId: e.id, isPublished: true }, select: { marksObtained: true, maxMarks: true } });
        const avgMarksPct = results.length === 0 ? 0 : average(results.map((r) => (r.marksObtained / r.maxMarks) * 100));
        const mentor = await getMentorAssignment(e.studentId, e.semesterId);
        const mentorFaculty = mentor ? await prisma.faculty.findUnique({ where: { id: mentor.facultyId }, select: { mentorCode: true } }) : null;
        const riskFactor = attendancePct < rules.minThresholdPct && avgMarksPct < 40 ? "BOTH" : attendancePct < rules.minThresholdPct ? "ATTENDANCE" : "MARKS";
        return { enrollmentNo: e.student.enrollmentNo, name: e.student.name, batchCode: e.batch.code, mentorCode: mentorFaculty?.mentorCode ?? null, avgAttendancePct: attendancePct, latestPhaseMarksPct: avgMarksPct, riskFactor, batchId: e.batchId };
      }),
    );
    const filtered = rows
      .filter((r) => r.avgAttendancePct < rules.minThresholdPct || r.latestPhaseMarksPct < 40)
      .filter((r) => !query.batchId || r.batchId === query.batchId)
      .filter((r) => !query.riskFactor || r.riskFactor === query.riskFactor)
      .map(({ batchId: _, ...rest }) => rest);
    return paginate(filtered, Number(query.page ?? 1), Number(query.limit ?? 20));
  },

  async notifyAtRiskMentor(enrollmentNo: string) {
    const student = await studentByEnrollmentNo(enrollmentNo);
    const current = await currentEnrollmentForStudent(student.id);
    if (!current) throw new ApiError(404, "NOT_FOUND", "Student not found.");
    const assignment = await getMentorAssignment(student.id, current.semesterId);
    const mentorFaculty = assignment ? await prisma.faculty.findUnique({ where: { id: assignment.facultyId }, select: { mentorCode: true } }) : null;
    return { notified: Boolean(assignment), mentorCode: mentorFaculty?.mentorCode ?? null };
  },

  async analyticsYearComparison(universityId: string) {
    const years = await prisma.academicYear.findMany({ where: { universityId }, orderBy: { startDate: "desc" }, take: 2 });
    const subjects = await prisma.subject.findMany({ where: { semester: { universityId } }, select: { code: true }, distinct: ["code"] });
    const subjectCodes = subjects.map((s) => s.code);
    return {
      subjects: subjectCodes,
      current: { label: years[0]?.label ?? "", data: Array.from({ length: subjectCodes.length }, () => 0) },
      compare: { label: years[1]?.label ?? "", data: Array.from({ length: subjectCodes.length }, () => 0) },
      attendanceComparison: { current: 0, compare: 0 },
      passRateComparison: { current: 0, compare: 0 },
    };
  },

  async analyticsExport() {
    return Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");
  },

  async analyticsPerformanceRadar(scope: Scope, phaseId: string) {
    const phase = await phaseById(phaseId);
    const subjects = await prisma.subject.findMany({ where: { semesterId: phase.semesterId } });
    const leaderboard = (await this.analyticsLeaderboard(scope, phaseId, undefined, 10)).data;
    const bottomboard = (await this.analyticsLeaderboard(scope, phaseId, undefined, 1000)).data.slice(-10);
    return {
      subjects: subjects.map((s) => s.code),
      topAvg: Array.from({ length: subjects.length }, () => average(leaderboard.map((r) => r.avgPct))),
      bottomAvg: Array.from({ length: subjects.length }, () => average(bottomboard.map((r) => r.avgPct))),
    };
  },

  // ── Promotion ─────────────────────────────────────────────

  async promotionYears(universityId: string) {
    const years = await prisma.academicYear.findMany({ where: { universityId } });
    const data = await Promise.all(
      years.map(async (y) => ({
        id: y.id,
        label: y.label,
        status: y.status,
        studentCount: await prisma.studentEnrollment.count({ where: { semester: { academicYearId: y.id } } }),
      })),
    );
    return { years: data };
  },

  async promotionPreview(fromAcademicYearId: string, toAcademicYearId: string) {
    const fromYear = await getAcademicYear(fromAcademicYearId);
    const toYear = await getAcademicYear(toAcademicYearId);
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { isCurrent: true, semester: { academicYearId: fromAcademicYearId } },
      include: { student: true, batch: true, semester: true },
    });
    const groups: Array<{ yearLevel: YearLevel; targetYearLevel: YearLevel; students: Array<{ enrollmentNo: string; name: string; fromBatchCode: string; fromSemesterLabel: string }>; availableTargetBatches: Array<{ id: string; code: string }> }> = [];
    for (const e of enrollments) {
      const targetYL: YearLevel = e.batch.yearLevel === "FY" ? "SY" : e.batch.yearLevel === "SY" ? "TY" : "FINAL";
      let group = groups.find((g) => g.yearLevel === e.batch.yearLevel);
      if (!group) {
        const targetBatches = await prisma.batch.findMany({ where: { academicYearId: toAcademicYearId, yearLevel: targetYL }, select: { id: true, code: true } });
        group = { yearLevel: e.batch.yearLevel, targetYearLevel: targetYL, students: [], availableTargetBatches: targetBatches };
        groups.push(group);
      }
      group.students.push({ enrollmentNo: e.student.enrollmentNo, name: e.student.name, fromBatchCode: e.batch.code, fromSemesterLabel: e.semester.label });
    }
    return { fromYearLabel: fromYear.label, toYearLabel: toYear.label, groups, unmappedCount: groups.reduce((s, g) => s + g.students.length, 0) };
  },

  async savePromotionMapping(hodId: string, fromAcademicYearId: string, toAcademicYearId: string, mappings: Array<{ enrollmentNo: string; toBatchId: string; fromEnrollmentId?: string; fromSemesterId?: string; toSemesterId?: string }>) {
    const draft = await prisma.promotionDraft.create({ data: { hodId, fromAcademicYearId, toAcademicYearId, status: "IN_PROGRESS" } });
    for (const m of mappings) {
      const student = await prisma.student.findFirst({ where: { enrollmentNo: m.enrollmentNo } });
      if (!student) continue;
      const enrollment = m.fromEnrollmentId ? { id: m.fromEnrollmentId } : await currentEnrollmentForStudent(student.id);
      if (!enrollment) continue;
      const sem = await prisma.semester.findFirst({ where: { academicYearId: toAcademicYearId, yearLevel: { not: "FY" } } });
      await prisma.promotionMapping.create({
        data: { draftId: draft.id, enrollmentNo: m.enrollmentNo, fromEnrollmentId: enrollment.id, fromSemesterId: m.fromSemesterId ?? "", toSemesterId: m.toSemesterId ?? sem?.id ?? "", toBatchId: m.toBatchId },
      });
    }
    return { savedCount: mappings.length, draftId: draft.id };
  },

  async suggestRollNumbers(draftId: string) {
    const draft = await prisma.promotionDraft.findUnique({ where: { id: draftId }, include: { mappings: true } });
    if (!draft) throw new ApiError(404, "NOT_FOUND", "Draft not found.");
    return {
      suggestions: draft.mappings.map((m, i) => ({ enrollmentNo: m.enrollmentNo, suggestedRollNo: m.toRollNo ?? `IT-25-00${i + 1}` })),
    };
  },

  async promotionRollCsv(fileBuffer: Buffer | undefined, draftId: string) {
    if (!fileBuffer) throw new ApiError(400, "VALIDATION_ERROR", "CSV file is required.");
    const draft = await prisma.promotionDraft.findUnique({ where: { id: draftId }, include: { mappings: true } });
    if (!draft) throw new ApiError(404, "NOT_FOUND", "Draft not found.");
    const rows = parseCsvRecords(fileBuffer, ["enrollment_no", "new_roll_no", "new_batch_code"]);
    let assigned = 0;
    const errors: Array<{ row: number; enrollmentNo: string; reason: string }> = [];
    for (const { row, record } of rows) {
      const enrollmentNo = String(record.enrollment_no ?? "");
      const newRollNo = String(record.new_roll_no ?? "");
      const newBatchCode = String(record.new_batch_code ?? "");
      const mapping = draft.mappings.find((m) => m.enrollmentNo === enrollmentNo);
      const batch = await prisma.batch.findFirst({ where: { code: newBatchCode } });
      if (!mapping || !batch) { errors.push({ row, enrollmentNo, reason: "Draft mapping or batch not found" }); continue; }
      await prisma.promotionMapping.update({ where: { id: mapping.id }, data: { toBatchId: batch.id, toRollNo: newRollNo } });
      assigned += 1;
    }
    return { assigned, errors };
  },

  async promotionPreviewSummary(draftId: string) {
    const draft = await prisma.promotionDraft.findUnique({ where: { id: draftId }, include: { mappings: true } });
    if (!draft) throw new ApiError(404, "NOT_FOUND", "Draft not found.");
    const byBatch: Record<string, number> = {};
    for (const m of draft.mappings) {
      const batch = await prisma.batch.findUnique({ where: { id: m.toBatchId }, select: { code: true } });
      const code = batch?.code ?? m.toBatchId;
      byBatch[code] = (byBatch[code] ?? 0) + 1;
    }
    return { totalStudents: draft.mappings.length, mappedStudents: draft.mappings.length, heldStudents: draft.mappings.filter((m) => m.isHeld).length, byBatch: Object.entries(byBatch).map(([toBatchCode, count]) => ({ toBatchCode, count })) };
  },

  async executePromotion(draftId: string, mappings: Array<{ enrollmentNo: string; fromEnrollmentId: string; toSemesterId: string; toBatchId: string; toRollNo: string }>) {
    const draft = await prisma.promotionDraft.findUnique({ where: { id: draftId } });
    if (!draft) throw new ApiError(404, "NOT_FOUND", "Draft not found.");
    for (const m of mappings) {
      const student = await prisma.student.findFirst({ where: { enrollmentNo: m.enrollmentNo } });
      if (!student) continue;
      await prisma.studentEnrollment.update({ where: { id: m.fromEnrollmentId }, data: { isCurrent: false } });
      const semester = await getSemester(m.toSemesterId);
      await prisma.studentEnrollment.create({
        data: { studentId: student.id, semesterId: m.toSemesterId, batchId: m.toBatchId, rollNo: m.toRollNo, yearLevel: semester.yearLevel, isCurrent: true, promotedFromId: m.fromEnrollmentId },
      });
    }
    await prisma.promotionDraft.update({ where: { id: draftId }, data: { status: "EXECUTED", executedAt: new Date() } });
    return { promoted: mappings.length, skipped: 0, executedAt: new Date().toISOString(), executedBy: "System" };
  },

  async promotionHistory(page = 1, limit = 10) {
    const drafts = await prisma.promotionDraft.findMany({ where: { status: "EXECUTED" }, orderBy: { executedAt: "desc" } });
    return paginate(drafts.map((d) => ({ id: d.id, executedAt: d.executedAt, status: d.status })), page, limit);
  },

  async promotionMappingCsv(fileBuffer: Buffer | undefined, toAcademicYearId: string) {
    if (!fileBuffer) throw new ApiError(400, "VALIDATION_ERROR", "CSV file is required.");
    await getAcademicYear(toAcademicYearId);
    const rows = parseCsvRecords(fileBuffer, ["enrollment_no", "new_batch_code"]);
    let mapped = 0;
    const errors: Array<{ row: number; enrollmentNo: string; reason: string }> = [];
    for (const { row, record } of rows) {
      const enrollmentNo = String(record.enrollment_no ?? "");
      const batchCode = String(record.new_batch_code ?? "");
      const batch = await prisma.batch.findFirst({ where: { code: batchCode, academicYearId: toAcademicYearId } });
      if (!batch) { errors.push({ row, enrollmentNo, reason: `Batch code '${batchCode}' does not exist in target year` }); continue; }
      mapped += 1;
    }
    return { mapped, errors };
  },

  // ── Calendar Events ───────────────────────────────────────

  async calendarEvents(universityId: string, query: Record<string, string | number | undefined>) {
    const where: any = { universityId };
    if (query.year && query.month) {
      const y = Number(query.year); const m = Number(query.month);
      const start = new Date(y, m - 1, 1); const end = new Date(y, m, 0);
      where.startDate = { gte: start, lte: end };
    }
    if (query.startDate && query.endDate) {
      where.startDate = { gte: new Date(String(query.startDate)) };
      where.endDate = { lte: new Date(String(query.endDate)) };
    }
    const rows = await prisma.calendarEvent.findMany({ where, orderBy: { startDate: "asc" } });
    return { data: rows.map((e) => ({ id: e.id, date: e.startDate, title: e.title, type: e.eventType })) };
  },

  async upcomingEvents(universityId: string, limit = 6) {
    const rows = await prisma.calendarEvent.findMany({
      where: { universityId, startDate: { gte: new Date() }, deletedAt: null },
      orderBy: { startDate: "asc" },
      take: limit,
    });
    return { data: rows.map((e) => ({ id: e.id, date: e.startDate, title: e.title, type: e.eventType })) };
  },

  async getEvent(eventId: string) {
    const event = await prisma.calendarEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new ApiError(404, "NOT_FOUND", "Event not found.");
    return { id: event.id, title: event.title, date: event.startDate, endDate: event.endDate, type: event.eventType, description: event.description, visibleTo: event.visibleTo, createdBy: event.createdById };
  },

  async createEvent(universityId: string, facultyId: string, body: Record<string, string>) {
    const event = await prisma.calendarEvent.create({
      data: { universityId, title: body.title, description: body.description ?? null, startDate: new Date(body.startDate), endDate: new Date(body.endDate), eventType: body.type as any, visibleTo: (body.visibleTo as any) ?? "ALL", createdById: facultyId, semesterId: body.semesterId ?? null },
    });
    return { id: event.id, title: event.title, startDate: event.startDate };
  },

  async updateEvent(eventId: string, body: Record<string, string>) {
    const event = await prisma.calendarEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new ApiError(404, "NOT_FOUND", "Event not found.");
    const updated = await prisma.calendarEvent.update({
      where: { id: eventId },
      data: { title: body.title ?? event.title, startDate: body.startDate ? new Date(body.startDate) : event.startDate, endDate: body.endDate ? new Date(body.endDate) : event.endDate, eventType: (body.type as any) ?? event.eventType },
    });
    return { id: updated.id, title: updated.title, date: updated.startDate, endDate: updated.endDate, type: updated.eventType };
  },

  async deleteEvent(eventId: string) {
    await prisma.calendarEvent.update({ where: { id: eventId }, data: { deletedAt: new Date() } });
  },

  async phaseTimeline(scope: Scope, semesterId?: string) {
    const semester = await getSemester(semesterId, scope.universityId);
    const phases = await prisma.phase.findMany({ where: { semesterId: semester.id }, orderBy: { number: "asc" } });
    return { phases: phases.map((p) => ({ label: p.label, startDate: p.startDate, endDate: p.endDate, examDate: p.examDate, isComplete: p.isComplete })) };
  },

  async calendarExport() {
    return Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");
  },

  // ── Announcements (HOD) ───────────────────────────────────

  async listAnnouncements(scope: Scope, page = 1, limit = 20) {
    const rows = await prisma.announcement.findMany({
      where: { universityId: scope.universityId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { faculty: { select: { name: true, isHod: true } } },
    });
    const data = rows.map((a) => ({ id: a.id, title: a.title, body: a.body, scope: a.scope, scopeValue: a.scopeValue, senderName: a.faculty.name, senderRole: a.faculty.isHod ? "HOD" : "FACULTY", createdAt: a.createdAt }));
    return paginate(data, page, limit);
  },

  async createAnnouncement(scope: Scope, facultyId: string, body: { title: string; body: string; scope: string; scopeValue?: string }) {
    const a = await prisma.announcement.create({
      data: { universityId: scope.universityId, facultyId, title: body.title, body: body.body, scope: body.scope as any, scopeValue: body.scopeValue ?? null },
    });
    return { id: a.id, title: a.title, scope: a.scope, createdAt: a.createdAt };
  },

  async updateAnnouncement(announcementId: string, facultyId: string, body: { title?: string; body?: string }) {
    const a = await prisma.announcement.findFirst({ where: { id: announcementId, facultyId, deletedAt: null } });
    if (!a) throw new ApiError(404, "NOT_FOUND", "Announcement not found.");
    return prisma.announcement.update({ where: { id: announcementId }, data: { title: body.title ?? a.title, body: body.body ?? a.body, updatedAt: new Date() } });
  },

  async deleteAnnouncement(announcementId: string, facultyId: string) {
    const a = await prisma.announcement.findFirst({ where: { id: announcementId, facultyId, deletedAt: null } });
    if (!a) throw new ApiError(404, "NOT_FOUND", "Announcement not found.");
    await prisma.announcement.update({ where: { id: announcementId }, data: { deletedAt: new Date() } });
  },

  // ── Settings ──────────────────────────────────────────────

  async settingsProfile(userId: string) {
    const f = await facultyById(userId);
    return { employeeId: f.employeeId, name: f.name, email: f.email, phone: f.phone, department: f.department, profilePhotoUrl: f.profilePhotoUrl };
  },

  async updateSettingsProfile(userId: string, body: Record<string, string>) {
    await prisma.faculty.update({ where: { id: userId }, data: { name: body.name, phone: body.phone ?? null } });
    return this.settingsProfile(userId);
  },

  async uploadProfilePhoto(userId: string, photoUrl: string) {
    const student = await prisma.student.findFirst({ where: { id: userId, deletedAt: null } });
    if (student) {
      await prisma.student.update({ where: { id: userId }, data: { profilePhotoUrl: photoUrl } });
      return { profilePhotoUrl: photoUrl };
    }
    await prisma.faculty.update({ where: { id: userId }, data: { profilePhotoUrl: photoUrl } });
    return { profilePhotoUrl: photoUrl };
  },

  async universitySettings(universityId: string) {
    return getUniversity(universityId);
  },

  async updateUniversity(universityId: string, body: Record<string, string>) {
    return prisma.university.update({ where: { id: universityId }, data: { name: body.name, website: body.website, contactEmail: body.contactEmail, address: body.address } });
  },

  async addUniversityBranch(universityId: string, code: string, name: string) {
    const existing = await prisma.universityBranch.findFirst({ where: { universityId, code } });
    if (existing) throw new ApiError(409, "BRANCH_EXISTS", "Branch already exists.");
    await prisma.universityBranch.create({ data: { universityId, code, name } });
    const branches = await prisma.universityBranch.findMany({ where: { universityId } });
    return { branches: branches.map((b) => b.code) };
  },

  async academicYears(universityId: string) {
    const years = await prisma.academicYear.findMany({ where: { universityId }, include: { semesters: true }, orderBy: { startDate: "desc" } });
    return {
      data: years.map((y) => ({
        id: y.id,
        label: y.label,
        status: y.status,
        semesters: y.semesters.map((s) => ({ id: s.id, number: s.number, label: s.label, status: s.status })),
      })),
    };
  },

  async createAcademicYear(universityId: string, body: { label: string; startDate: string; endDate: string }) {
    const year = await prisma.academicYear.create({ data: { universityId, label: body.label, startDate: new Date(body.startDate), endDate: new Date(body.endDate), status: "DRAFT" } });
    return { id: year.id, label: year.label, status: year.status };
  },

  async activateAcademicYear(yearId: string, universityId: string) {
    await prisma.academicYear.updateMany({ where: { universityId, status: "ACTIVE" }, data: { status: "ARCHIVED" } });
    await prisma.academicYear.update({ where: { id: yearId }, data: { status: "ACTIVE" } });
    return { id: yearId, status: "ACTIVE" };
  },

  async createSemester(yearId: string, universityId: string, body: { number: number; yearLevel: YearLevel; startDate: string; endDate: string }) {
    const year = await getAcademicYear(yearId);
    const semester = await prisma.semester.create({
      data: { universityId, academicYearId: yearId, number: body.number, label: `Semester ${body.number}`, yearLevel: body.yearLevel, status: "UPCOMING", startDate: new Date(body.startDate), endDate: new Date(body.endDate) },
    });
    return { id: semester.id, number: semester.number, label: semester.label };
  },

  async notifications(userId: string) {
    const prefs = await prisma.notificationConfig.findMany({ where: { facultyId: userId } });
    return { preferences: prefs.map((p) => ({ key: p.key, enabled: p.enabled })) };
  },

  async updateNotifications(userId: string, universityId: string, preferences: Array<{ key: string; enabled: boolean }>) {
    for (const pref of preferences) {
      await prisma.notificationConfig.upsert({
        where: { facultyId_key: { facultyId: userId, key: pref.key as any } },
        update: { enabled: pref.enabled },
        create: { universityId, facultyId: userId, key: pref.key as any, enabled: pref.enabled },
      });
    }
    return this.notifications(userId);
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (newPassword.length < 8) throw new ApiError(400, "PASSWORD_TOO_WEAK", "Password must be at least 8 characters.");
    const faculty = await facultyById(userId);
    if (!matchesPassword(faculty.passwordHash, currentPassword)) throw new ApiError(401, "CURRENT_PASSWORD_INCORRECT", "Current password is incorrect.");
    await prisma.faculty.update({ where: { id: userId }, data: { passwordHash: newPassword } });
    return { message: "Password updated successfully" };
  },

  async securitySessions(userId: string) {
    const tokens = await prisma.refreshToken.findMany({ where: { OR: [{ facultyId: userId }, { studentId: userId }] } });
    return { data: tokens.map((t) => ({ id: t.id, userAgent: t.userAgent, ipAddress: t.ipAddress, createdAt: t.createdAt, expiresAt: t.expiresAt })) };
  },

  async revokeSession(sessionId: string) {
    await prisma.refreshToken.delete({ where: { id: sessionId } });
  },

  async attendanceRules(universityId: string) {
    return getAttendanceRules(universityId);
  },

  async updateAttendanceRules(universityId: string, body: { minThresholdPct?: number; warningThresholdPct?: number; autoNotifyMentor?: boolean; autoLockAfterDays?: number }) {
    return prisma.attendanceRules.upsert({
      where: { universityId },
      update: { ...body },
      create: { universityId, minThresholdPct: body.minThresholdPct ?? 75, warningThresholdPct: body.warningThresholdPct ?? 80, autoNotifyMentor: body.autoNotifyMentor ?? true, autoLockAfterDays: body.autoLockAfterDays ?? 7 },
    });
  },

  async deleteAttendanceRecords(universityId: string, semesterId: string, confirm: boolean) {
    if (!confirm) throw new ApiError(400, "VALIDATION_ERROR", "Confirmation required.");
    const enrollments = await prisma.studentEnrollment.findMany({ where: { semesterId }, select: { id: true } });
    const ids = enrollments.map((e) => e.id);
    const lockedCount = await prisma.attendanceRecord.count({ where: { enrollmentId: { in: ids }, isLocked: true } });
    if (lockedCount > 0) return { deletedCount: 0, blocked: true, reason: `${lockedCount} records are locked. Unlock before deleting.` };
    const { count } = await prisma.attendanceRecord.deleteMany({ where: { enrollmentId: { in: ids } } });
    return { deletedCount: count, blocked: false };
  },

  async archiveYear(universityId: string, academicYearId: string, requestedById: string) {
    const job = await prisma.archiveJob.create({ data: { universityId, academicYearId, requestedById, status: "QUEUED" } });
    return { jobId: job.id, status: "queued", estimatedTimeSeconds: 45 };
  },

  async archiveStatus(jobId: string) {
    const job = await prisma.archiveJob.findUnique({ where: { id: jobId } });
    if (!job) throw new ApiError(404, "NOT_FOUND", "Archive job not found.");
    return { jobId: job.id, status: job.status, academicYearId: job.academicYearId };
  },

  // ── Student endpoints ─────────────────────────────────────

  async studentAttendance(userId: string, universityId: string, semesterId?: string) {
    const { student, semester, enrollment } = await getStudentEnrollment(userId, universityId, semesterId);
    const subjectIds = await getStudentSubjectIds(userId, universityId, semester.id);
    const rules = await getAttendanceRules(universityId);
    const subjects = await Promise.all(
      subjectIds.map(async (subjectId) => {
        const subject = await subjectById(subjectId);
        const records = await prisma.attendanceRecord.findMany({ where: { enrollmentId: enrollment.id, subjectId }, select: { isPresent: true } });
        const totalLectures = records.length;
        const attended = records.filter((r) => r.isPresent).length;
        const absent = totalLectures - attended;
        const pct = totalLectures === 0 ? 0 : Number(((attended / totalLectures) * 100).toFixed(2));
        const lecturesNeeded = (threshold: number) => {
          if (pct >= threshold) return 0;
          let extra = 0;
          while (((attended + extra) / (totalLectures + extra || 1)) * 100 < threshold) {
            extra++;
            if (extra > 1000) break;
          }
          return extra;
        };
        return {
          subjectId: subject.id, subjectCode: subject.code, subjectName: subject.name, totalLectures, attended, absent, percentage: pct,
          status: pct < rules.minThresholdPct ? "AT_RISK" : pct < rules.warningThresholdPct ? "WARNING" : "GOOD",
          isBelowThreshold: pct < rules.minThresholdPct, isBelowWarning: pct < rules.warningThresholdPct,
          lecturesNeededToReach75: lecturesNeeded(rules.minThresholdPct), lecturesNeededToReach85: lecturesNeeded(85),
        };
      }),
    );
    const overallPct = average(subjects.map((s) => s.percentage));
    return {
      semesterLabel: semester.label,
      threshold: rules.minThresholdPct,
      warningThreshold: rules.warningThresholdPct,
      overallPct,
      overallStatus: overallPct < rules.minThresholdPct ? "AT_RISK" : overallPct < rules.warningThresholdPct ? "WARNING" : "GOOD",
      subjects,
    };
  },

  async studentDashboard(studentId: string, universityId: string) {
    const { student, semester, enrollment } = await getStudentEnrollment(studentId, universityId);
    const attendance = await this.studentAttendance(studentId, universityId, semester.id);
    const currentPhase = await currentPhaseForSemester(semester.id);
    const mentorAssignment = await getStudentMentorAssignment(studentId, universityId, semester.id);
    const mentor = mentorAssignment ? await facultyById(mentorAssignment.facultyId) : null;
    const recentResults = await prisma.result.findMany({
      where: { enrollmentId: enrollment.id, isPublished: true },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { phase: true, subject: true },
    });
    const batch = await batchById(enrollment.batchId);
    const ay = await getAcademicYear((await getSemester(semester.id)).academicYearId);
    const unreadAnnouncements = await prisma.announcement.findMany({ where: { universityId, deletedAt: null } });
    const unreadAnn = (await Promise.all(unreadAnnouncements.map(async (a) => {
      const visible = await studentAnnouncementVisible(a, studentId, universityId, semester.id);
      if (!visible) return false;
      return !(await isAnnouncementRead(studentId, a.id));
    }))).filter(Boolean).length;
    const unreadMentorMessages = mentorAssignment
      ? await prisma.chatMessage.count({ where: { mentorAssignmentId: mentorAssignment.id, senderRole: "FACULTY", isRead: false } })
      : 0;
    const subjectIds = await getStudentSubjectIds(studentId, universityId, semester.id);
    const pendingQuizzes = await prisma.quiz.count({ where: { isPublished: true, deletedAt: null, semesterId: semester.id, subjectId: { in: subjectIds }, attempts: { none: { studentId } } } });
    const upcomingEvents = await prisma.calendarEvent.findMany({ where: { universityId, startDate: { gte: new Date() }, deletedAt: null }, orderBy: { startDate: "asc" }, take: 5 });
    const latestPhaseResults = currentPhase ? await prisma.result.findMany({ where: { enrollmentId: enrollment.id, phaseId: currentPhase.id, isPublished: true } }) : [];
    return {
      student: { enrollmentNo: student.enrollmentNo, name: student.name, branch: student.branch },
      currentEnrollment: { semesterLabel: semester.label, yearLevel: batch.yearLevel, batchCode: batch.code, rollNo: enrollment.rollNo, academicYear: ay.label },
      stats: {
        overallAttendancePct: attendance.overallPct, attendanceStatus: attendance.overallStatus,
        subjectsBelowThreshold: attendance.subjects.filter((s) => s.isBelowThreshold).length,
        latestPhaseLabel: currentPhase?.label ?? null,
        latestPhaseAvgPct: latestPhaseResults.length === 0 ? null : average(latestPhaseResults.map((r) => (r.marksObtained / r.maxMarks) * 100)),
        pendingQuizzes, unreadAnnouncements: unreadAnn, unreadMentorMessages,
      },
      upcomingEvents: upcomingEvents.map((e) => ({ id: e.id, title: e.title, date: e.startDate, type: e.eventType })),
      recentResults: recentResults.map((r) => ({ phase: r.phase.label, subjectCode: r.subject.code, marks: r.marksObtained, maxMarks: r.maxMarks, grade: r.grade })),
      mentor: mentor ? { name: mentor.name, mentorCode: mentor.mentorCode, unreadMessages: unreadMentorMessages } : null,
    };
  },

  async studentProfile(studentId: string, universityId: string) {
    const { student, semester, enrollment } = await getStudentEnrollment(studentId, universityId);
    const batch = await batchById(enrollment.batchId);
    return {
      enrollmentNo: student.enrollmentNo, name: student.name, email: student.email, phone: student.phone, branch: student.branch, admissionYear: student.admissionYear, profilePhotoUrl: student.profilePhotoUrl ?? null,
      currentEnrollment: { batchCode: batch.code, rollNo: enrollment.rollNo, semesterLabel: semester.label, yearLevel: batch.yearLevel },
    };
  },

  async updateStudentProfile(studentId: string, universityId: string, body: Record<string, string>) {
    if ("email" in body || "enrollmentNo" in body || "branch" in body) throw new ApiError(400, "READONLY_FIELD", "email, enrollmentNo, and branch are read-only.");
    await prisma.student.update({ where: { id: studentId }, data: { name: body.name, phone: body.phone ?? null } });
    return this.studentProfile(studentId, universityId);
  },

  async changeStudentPassword(studentId: string, currentPassword: string, newPassword: string, confirmPassword: string) {
    if (newPassword !== confirmPassword) throw new ApiError(400, "PASSWORDS_DO_NOT_MATCH", "Passwords do not match.");
    if (newPassword.length < 8) throw new ApiError(400, "PASSWORD_TOO_WEAK", "Password must be at least 8 characters.");
    const student = await getStudentUser(studentId);
    if (!matchesPassword(student.passwordHash, currentPassword)) throw new ApiError(401, "CURRENT_PASSWORD_INCORRECT", "Current password is incorrect.");
    await prisma.student.update({ where: { id: studentId }, data: { passwordHash: newPassword } });
    return { message: "Password updated successfully", isFirstLogin: false };
  },

  async studentCurrentEnrollment(studentId: string, universityId: string) {
    const { student, semester, enrollment } = await getStudentEnrollment(studentId, universityId);
    const batch = await batchById(enrollment.batchId);
    const ay = await getAcademicYear(semester.academicYearId);
    return { id: enrollment.id, enrollmentNo: student.enrollmentNo, semesterId: semester.id, semesterLabel: semester.label, semesterNumber: semester.number, yearLevel: batch.yearLevel, batchCode: batch.code, rollNo: enrollment.rollNo, academicYear: ay.label, startDate: semester.startDate, endDate: semester.endDate };
  },

  async studentEnrollmentHistory(studentId: string) {
    const student = await getStudentUser(studentId);
    const enrollments = await prisma.studentEnrollment.findMany({ where: { studentId }, include: { semester: { include: { academicYear: true } }, batch: true }, orderBy: { semester: { number: "asc" } } });
    return {
      enrollmentNo: student.enrollmentNo, branch: student.branch, admissionYear: student.admissionYear,
      journey: enrollments.map((e) => ({ semesterNumber: e.semester.number, semesterLabel: e.semester.label, yearLevel: e.batch.yearLevel, batchCode: e.batch.code, rollNo: e.rollNo, academicYear: e.semester.academicYear.label, isCurrent: e.isCurrent, promotedFromId: e.promotedFromId ?? null })),
    };
  },

  async studentSubjects(studentId: string, universityId: string, semesterId?: string) {
    const { semester, enrollment } = await getStudentEnrollment(studentId, universityId, semesterId);
    const subjectIds = await getStudentSubjectIds(studentId, universityId, semester.id);
    const subjects = await Promise.all(
      subjectIds.map(async (subjectId) => {
        const subject = await subjectById(subjectId);
        const assignment = await prisma.facultyBatchAssignment.findFirst({ where: { batchId: enrollment.batchId, semesterId: semester.id, subjectId: subject.id } });
        const faculty = assignment ? await prisma.faculty.findUnique({ where: { id: assignment.facultyId }, select: { name: true } }) : null;
        return { id: subject.id, code: subject.code, name: subject.name, credits: subject.credits, type: subject.type, facultyName: faculty?.name ?? null };
      }),
    );
    return { semesterLabel: semester.label, subjects, totalCredits: subjects.reduce((s, sub) => s + sub.credits, 0) };
  },

  async studentTimetable(studentId: string, universityId: string, semesterId?: string) {
    const { semester, enrollment } = await getStudentEnrollment(studentId, universityId, semesterId);
    const slots = await prisma.timetableSlot.findMany({ where: { batchId: enrollment.batchId, semesterId: semester.id }, orderBy: [{ dayOfWeek: "asc" }, { slotStart: "asc" }] });
    const batch = await batchById(enrollment.batchId);
    const mappedSlots = await Promise.all(
      slots.map(async (slot) => {
        const subject = await subjectById(slot.subjectId);
        const faculty = slot.facultyId ? await prisma.faculty.findUnique({ where: { id: slot.facultyId }, select: { name: true } }) : null;
        return { id: slot.id, dayOfWeek: slot.dayOfWeek, dayLabel: DAY_LABELS[slot.dayOfWeek] ?? "", slotStart: slot.slotStart, slotEnd: slot.slotEnd, subject: { code: subject.code, name: subject.name }, faculty: { name: faculty?.name ?? "" }, room: slot.room };
      }),
    );
    return { batchCode: batch.code, semesterLabel: semester.label, slots: mappedSlots };
  },

  async studentTodayTimetable(studentId: string, universityId: string, semesterId?: string) {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const timetable = await this.studentTimetable(studentId, universityId, semesterId);
    return {
      date: today.toISOString().slice(0, 10),
      dayLabel: DAY_LABELS[dayOfWeek] ?? "",
      slots: timetable.slots.filter((s) => s.dayOfWeek === dayOfWeek).map((s) => ({ id: s.id, slotStart: s.slotStart, slotEnd: s.slotEnd, subject: { code: s.subject.code }, faculty: s.faculty, room: s.room })),
    };
  },

  async studentResults(studentId: string, universityId: string, semesterId?: string) {
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { studentId, ...(semesterId ? { semesterId } : {}) },
      include: { semester: { include: { academicYear: true } }, batch: true },
      orderBy: { semester: { number: "desc" } },
    });
    const semesters = await Promise.all(
      enrollments.map(async (e) => {
        const phases = await prisma.phase.findMany({ where: { semesterId: e.semesterId }, orderBy: { number: "asc" } });
        const phaseData = await Promise.all(
          phases.map(async (phase) => {
            const rows = await prisma.result.findMany({ where: { enrollmentId: e.id, phaseId: phase.id, isPublished: true }, include: { subject: true } });
            const subjects = rows.map((r) => ({ subjectCode: r.subject.code, subjectName: r.subject.name, marksObtained: r.marksObtained, maxMarks: r.maxMarks, grade: r.grade, isPublished: r.isPublished, publishedAt: r.publishedAt }));
            return { phaseLabel: phase.label, phaseNumber: phase.number, subjects, phaseAvgPct: subjects.length === 0 ? null : average(subjects.map((s) => (s.marksObtained / s.maxMarks) * 100)), phaseTotalMarks: subjects.reduce((s, r) => s + r.marksObtained, 0), phaseMaxMarks: subjects.reduce((s, r) => s + r.maxMarks, 0), ...(subjects.length === 0 ? { status: "pending" } : {}) };
          }),
        );
        return {
          semesterId: e.semesterId, semesterLabel: e.semester.label, semesterNumber: e.semester.number, yearLevel: e.batch.yearLevel, batchCode: e.batch.code, academicYear: e.semester.academicYear.label, phases: phaseData,
          semesterAvgPct: average(phaseData.flatMap((p) => p.subjects.map((s) => (s.marksObtained / s.maxMarks) * 100))),
        };
      }),
    );
    const student = await getStudentUser(studentId);
    return { enrollmentNo: student.enrollmentNo, semesters };
  },

  async studentResultsSummary(studentId: string) {
    const enrollments = await prisma.studentEnrollment.findMany({ where: { studentId }, include: { semester: true, batch: true }, orderBy: { semester: { number: "asc" } } });
    const summary = await Promise.all(
      enrollments.map(async (e) => {
        const rows = await prisma.result.findMany({ where: { enrollmentId: e.id, isPublished: true }, select: { marksObtained: true, maxMarks: true } });
        return { semesterNumber: e.semester.number, label: `Sem ${e.semester.number}`, yearLevel: e.batch.yearLevel, avgPct: rows.length === 0 ? null : average(rows.map((r) => (r.marksObtained / r.maxMarks) * 100)), status: e.semester.status === "ACTIVE" ? "in_progress" : "complete" };
      }),
    );
    return { summary };
  },

  async studentResultsSemester(studentId: string, semesterId: string) {
    const student = await getStudentUser(studentId);
    return this.studentResults(studentId, student.universityId, semesterId);
  },

  async studentPhaseProgress(studentId: string, universityId: string) {
    const { enrollment, semester } = await getStudentEnrollment(studentId, universityId);
    const phases = await prisma.phase.findMany({ where: { semesterId: semester.id }, orderBy: { number: "asc" } });
    return {
      semesterLabel: semester.label,
      phases: await Promise.all(phases.map(async (phase) => {
        const rows = await prisma.result.findMany({ where: { enrollmentId: enrollment.id, phaseId: phase.id, isPublished: true }, select: { marksObtained: true, maxMarks: true } });
        return { label: phase.label, number: phase.number, avgPct: rows.length === 0 ? null : average(rows.map((r) => (r.marksObtained / r.maxMarks) * 100)), isPublished: rows.length > 0, examDate: phase.examDate };
      })),
    };
  },

  async studentAttendanceLog(studentId: string, universityId: string, subjectId: string, semesterId?: string) {
    await ensureStudentSubject(studentId, universityId, subjectId, semesterId);
    const { enrollment } = await getStudentEnrollment(studentId, universityId, semesterId);
    const records = await prisma.attendanceRecord.findMany({ where: { enrollmentId: enrollment.id, subjectId }, include: { faculty: { select: { name: true } } }, orderBy: { lectureDate: "asc" } });
    const subject = await subjectById(subjectId);
    return {
      subjectCode: subject.code, subjectName: subject.name, totalLectures: records.length,
      attended: records.filter((r) => r.isPresent).length,
      percentage: records.length === 0 ? 0 : Number(((records.filter((r) => r.isPresent).length / records.length) * 100).toFixed(2)),
      log: records.map((r) => ({ date: r.lectureDate.toISOString().slice(0, 10), isPresent: r.isPresent, markedBy: r.faculty.name })),
    };
  },

  async studentAttendanceHistory(studentId: string) {
    const enrollments = await prisma.studentEnrollment.findMany({ where: { studentId }, include: { semester: { include: { academicYear: true } } }, orderBy: { semester: { number: "asc" } } });
    const history = await Promise.all(enrollments.map(async (e) => ({
      semesterLabel: e.semester.label,
      academicYear: e.semester.academicYear.label,
      overallPct: await computeOverallAttendancePct(e.id),
    })));
    return { history };
  },

  // ── Student — Notes ───────────────────────────────────────

  async studentNotes(studentId: string, universityId: string, query: Record<string, string | number | undefined>) {
    const { enrollment, semester } = await getStudentEnrollment(studentId, universityId, query.semesterId as string | undefined);
    const notes = await prisma.note.findMany({
      where: {
        deletedAt: null,
        subject: { semesterId: semester.id },
        ...(query.subjectId ? { subjectId: query.subjectId as string } : {}),
        ...(query.search ? { OR: [{ title: { contains: String(query.search), mode: "insensitive" } }, { description: { contains: String(query.search), mode: "insensitive" } }] } : {}),
      },
      include: { subject: true, faculty: { select: { name: true } }, flashcards: { select: { id: true } } },
    });
    // Filter by batch visibility (faculty assignments for this batch)
    const batchSubjectIds = await getStudentSubjectIds(studentId, universityId, semester.id);
    const visibleNotes = notes.filter((n) => batchSubjectIds.includes(n.subjectId));
    const rows = visibleNotes.map((n) => ({
      id: n.id, subjectCode: n.subject.code, subjectName: n.subject.name, title: n.title, description: n.description,
      mimeType: n.mimeType, fileSizeKb: n.fileSizeKb, hasAiSummary: Boolean(n.aiSummary), hasFlashcards: n.flashcards.length > 0,
      flashcardCount: n.flashcards.length, uploadedBy: n.faculty.name, createdAt: n.createdAt,
    }));
    return paginate(rows, Number(query.page ?? 1), Number(query.limit ?? 20));
  },

  async studentNote(studentId: string, universityId: string, noteId: string) {
    const note = await prisma.note.findFirst({ where: { id: noteId, deletedAt: null }, include: { subject: true, faculty: { select: { name: true } }, flashcards: { orderBy: { order: "asc" } } } });
    if (!note) throw new ApiError(404, "NOT_FOUND", "Note not found.");
    const batchSubjectIds = await getStudentSubjectIds(studentId, universityId);
    if (!batchSubjectIds.includes(note.subjectId)) throw new ApiError(403, "SUBJECT_NOT_IN_ENROLLMENT", "Note is not visible to this student.");
    return { id: note.id, subjectCode: note.subject.code, subjectName: note.subject.name, title: note.title, description: note.description, mimeType: note.mimeType, fileSizeKb: note.fileSizeKb, uploadedBy: note.faculty.name, createdAt: note.createdAt, aiSummary: note.aiSummary, flashcards: note.flashcards };
  },

  async studentNoteDownload(studentId: string, universityId: string, noteId: string) {
    const note = await this.studentNote(studentId, universityId, noteId);
    return { downloadUrl: `https://example.com/downloads/${noteId}`, expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), mimeType: note.mimeType, filename: `${note.title.replace(/\s+/g, "_")}_${note.subjectCode}.${note.mimeType.includes("pdf") ? "pdf" : "bin"}` };
  },

  async studentNoteFlashcards(studentId: string, universityId: string, noteId: string) {
    const note = await this.studentNote(studentId, universityId, noteId);
    return { noteTitle: note.title, subjectCode: note.subjectCode, flashcards: note.flashcards, total: note.flashcards.length };
  },

  // ── Student — Self Notes ──────────────────────────────────

  async studentSelfNotes(studentId: string, universityId: string, query: Record<string, string | number | undefined>) {
    const selfNotes = await prisma.selfNote.findMany({
      where: {
        studentId,
        deletedAt: null,
        ...(query.subjectId ? { subjectId: query.subjectId as string } : {}),
        ...(query.search ? { OR: [{ title: { contains: String(query.search), mode: "insensitive" } }, { content: { contains: String(query.search), mode: "insensitive" } }] } : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: { student: { select: { id: true } } },
    });
    const semesterId = query.semesterId as string | undefined;
    const filtered = semesterId
      ? await Promise.all(selfNotes.map(async (n) => {
          if (!n.subjectId) return n;
          const subject = await prisma.subject.findUnique({ where: { id: n.subjectId }, select: { semesterId: true } });
          return subject?.semesterId === semesterId ? n : null;
        })).then((r) => r.filter(Boolean) as typeof selfNotes)
      : selfNotes;
    const rows = await Promise.all(filtered.map(async (n) => {
      const subject = n.subjectId ? await prisma.subject.findUnique({ where: { id: n.subjectId }, select: { code: true } }) : null;
      return { id: n.id, title: n.title, subjectCode: subject?.code ?? null, contentPreview: n.content.slice(0, 120), createdAt: n.createdAt, updatedAt: n.updatedAt };
    }));
    return paginate(rows, Number(query.page ?? 1), Number(query.limit ?? 20));
  },

  async studentSelfNote(studentId: string, selfNoteId: string) {
    const note = await prisma.selfNote.findUnique({ where: { id: selfNoteId } });
    if (!note) throw new ApiError(404, "NOT_FOUND", "Self note not found.");
    if (note.studentId !== studentId) throw new ApiError(403, "STUDENT_NOT_OWNER", "Self note does not belong to this student.");
    const subject = note.subjectId ? await prisma.subject.findUnique({ where: { id: note.subjectId }, select: { code: true } }) : null;
    return { id: note.id, title: note.title, subjectId: note.subjectId, subjectCode: subject?.code ?? null, content: note.content, createdAt: note.createdAt, updatedAt: note.updatedAt };
  },

  async createStudentSelfNote(studentId: string, universityId: string, body: { title: string; subjectId?: string; content: string }) {
    if (body.subjectId) await ensureStudentSubject(studentId, universityId, body.subjectId);
    const note = await prisma.selfNote.create({ data: { studentId, subjectId: body.subjectId ?? null, title: body.title, content: body.content } });
    const subject = note.subjectId ? await prisma.subject.findUnique({ where: { id: note.subjectId }, select: { code: true } }) : null;
    return { id: note.id, title: note.title, subjectCode: subject?.code ?? null, createdAt: note.createdAt };
  },

  async updateStudentSelfNote(studentId: string, selfNoteId: string, body: { title?: string; subjectId?: string; content?: string }) {
    const note = await prisma.selfNote.findUnique({ where: { id: selfNoteId } });
    if (!note) throw new ApiError(404, "NOT_FOUND", "Self note not found.");
    if (note.studentId !== studentId) throw new ApiError(403, "STUDENT_NOT_OWNER", "Self note does not belong to this student.");
    await prisma.selfNote.update({ where: { id: selfNoteId }, data: { title: body.title ?? note.title, content: body.content ?? note.content, subjectId: body.subjectId !== undefined ? (body.subjectId || null) : note.subjectId, updatedAt: new Date() } });
    return this.studentSelfNote(studentId, selfNoteId);
  },

  async deleteStudentSelfNote(studentId: string, selfNoteId: string) {
    const note = await prisma.selfNote.findUnique({ where: { id: selfNoteId } });
    if (!note) throw new ApiError(404, "NOT_FOUND", "Self note not found.");
    if (note.studentId !== studentId) throw new ApiError(403, "STUDENT_NOT_OWNER", "Self note does not belong to this student.");
    await prisma.selfNote.update({ where: { id: selfNoteId }, data: { deletedAt: new Date() } });
  },

  // ── Student — Quizzes ─────────────────────────────────────

  async studentQuizzes(studentId: string, universityId: string, query: Record<string, string | number | undefined>) {
    const { semester } = await getStudentEnrollment(studentId, universityId, query.semesterId as string | undefined);
    const subjectIds = await getStudentSubjectIds(studentId, universityId, semester.id);
    const now = new Date();
    const quizzes = await prisma.quiz.findMany({ where: { isPublished: true, deletedAt: null, semesterId: semester.id, subjectId: { in: subjectIds } }, include: { _count: { select: { questions: true } }, attempts: { where: { studentId }, select: { score: true, submittedAt: true } } } });
    const rows = quizzes.map((quiz) => {
      const attempt = quiz.attempts[0];
      const expired = Boolean(quiz.dueDate && quiz.dueDate < now);
      const status = attempt ? "ATTEMPTED" : expired ? "EXPIRED" : "PENDING";
      return { id: quiz.id, title: quiz.title, subjectId: quiz.subjectId, semesterId: quiz.semesterId, questionCount: quiz._count.questions, timeLimitMins: quiz.timeLimitMins, isAiGenerated: quiz.isAiGenerated, dueDate: quiz.dueDate, status, attemptedAt: attempt?.submittedAt ?? null, score: attempt?.score ?? null };
    });
    return paginate(
      rows.filter((r) => !query.subjectId || r.subjectId === query.subjectId).filter((r) => !query.status || r.status === query.status).map(({ subjectId: _, semesterId: __, ...rest }) => rest),
      Number(query.page ?? 1), Number(query.limit ?? 20),
    );
  },

  async studentQuiz(studentId: string, universityId: string, quizId: string) {
    const quiz = await prisma.quiz.findFirst({ where: { id: quizId, isPublished: true, deletedAt: null }, include: { _count: { select: { questions: true } } } });
    if (!quiz) throw new ApiError(404, "NOT_FOUND", "Quiz not found.");
    await ensureStudentSubject(studentId, universityId, quiz.subjectId, quiz.semesterId);
    if (quiz.dueDate && quiz.dueDate < new Date()) throw new ApiError(410, "QUIZ_EXPIRED", "Quiz due date has passed.");
    const attempt = await prisma.quizAttempt.findUnique({ where: { studentId_quizId: { studentId, quizId } } });
    const subject = await subjectById(quiz.subjectId);
    return { id: quiz.id, title: quiz.title, description: quiz.description, subjectCode: subject.code, questionCount: quiz._count.questions, timeLimitMins: quiz.timeLimitMins, dueDate: quiz.dueDate, isAiGenerated: quiz.isAiGenerated, status: attempt ? "ATTEMPTED" : "PENDING", alreadyAttempted: Boolean(attempt) };
  },

  async startStudentQuiz(studentId: string, universityId: string, quizId: string) {
    const quiz = await prisma.quiz.findFirst({ where: { id: quizId, isPublished: true, deletedAt: null } });
    if (!quiz) throw new ApiError(404, "NOT_FOUND", "Quiz not found.");
    await ensureStudentSubject(studentId, universityId, quiz.subjectId, quiz.semesterId);
    const existing = await prisma.quizAttempt.findUnique({ where: { studentId_quizId: { studentId, quizId } } });
    if (existing) throw new ApiError(409, "ALREADY_ATTEMPTED", "Quiz already attempted.");
    if (quiz.dueDate && quiz.dueDate < new Date()) throw new ApiError(410, "QUIZ_EXPIRED", "Quiz due date has passed.");
    const questions = await prisma.question.findMany({ where: { quizId }, orderBy: { order: "asc" }, select: { id: true, order: true, text: true, options: true } });
    const startedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + (quiz.timeLimitMins ?? 0) * 60000).toISOString();
    return { attemptId: `att_${Date.now()}`, quizId, title: quiz.title, timeLimitMins: quiz.timeLimitMins, startedAt, expiresAt, questions };
  },

  async submitStudentQuiz(studentId: string, universityId: string, quizId: string, answers: Record<string, string>) {
    const quiz = await prisma.quiz.findFirst({ where: { id: quizId, isPublished: true, deletedAt: null } });
    if (!quiz) throw new ApiError(404, "NOT_FOUND", "Quiz not found.");
    await ensureStudentSubject(studentId, universityId, quiz.subjectId, quiz.semesterId);
    const existing = await prisma.quizAttempt.findUnique({ where: { studentId_quizId: { studentId, quizId } } });
    if (existing) throw new ApiError(409, "ALREADY_SUBMITTED", "Quiz already submitted.");
    const questions = await prisma.question.findMany({ where: { quizId }, orderBy: { order: "asc" } });
    if (questions.some((q) => !answers[q.id])) throw new ApiError(400, "MISSING_ANSWERS", "Some quiz questions are unanswered.");
    const results = questions.map((q) => ({ questionId: q.id, questionText: q.text, selectedOption: answers[q.id], correctOption: q.correctOption, isCorrect: answers[q.id] === q.correctOption, explanation: q.explanation }));
    const correctCount = results.filter((r) => r.isCorrect).length;
    const score = questions.length === 0 ? 0 : Number(((correctCount / questions.length) * 100).toFixed(1));
    const attempt = await prisma.quizAttempt.create({ data: { studentId, quizId, score, answers } });
    return { attemptId: attempt.id, score, correctCount, incorrectCount: questions.length - correctCount, totalQuestions: questions.length, submittedAt: attempt.submittedAt, results };
  },

  async studentQuizResult(studentId: string, quizId: string) {
    const attempt = await prisma.quizAttempt.findUnique({ where: { studentId_quizId: { studentId, quizId } } });
    if (!attempt) throw new ApiError(404, "NOT_FOUND", "Quiz attempt not found.");
    const questions = await prisma.question.findMany({ where: { quizId }, orderBy: { order: "asc" } });
    const answers = attempt.answers as Record<string, string>;
    const results = questions.map((q) => ({ questionId: q.id, questionText: q.text, selectedOption: answers[q.id], correctOption: q.correctOption, isCorrect: answers[q.id] === q.correctOption, explanation: q.explanation }));
    const correctCount = results.filter((r) => r.isCorrect).length;
    return { attemptId: attempt.id, score: attempt.score, correctCount, incorrectCount: questions.length - correctCount, totalQuestions: questions.length, submittedAt: attempt.submittedAt, results };
  },

  async studentQuizHistory(studentId: string, universityId: string, query: Record<string, string | number | undefined>) {
    const attempts = await prisma.quizAttempt.findMany({
      where: { studentId },
      include: { quiz: { include: { _count: { select: { questions: true } } } } },
      orderBy: { submittedAt: "desc" },
    });
    const rows = attempts
      .filter((a) => !query.subjectId || a.quiz.subjectId === query.subjectId)
      .filter((a) => !query.semesterId || a.quiz.semesterId === query.semesterId)
      .map((a) => ({ quizId: a.quizId, title: a.quiz.title, score: a.score, totalQuestions: a.quiz._count.questions, submittedAt: a.submittedAt }));
    return paginate(rows, Number(query.page ?? 1), Number(query.limit ?? 20));
  },

  // ── Student — Announcements ───────────────────────────────

  async studentAnnouncements(studentId: string, universityId: string, page = 1, limit = 20, unreadOnly = false) {
    const allAnn = await prisma.announcement.findMany({ where: { universityId, deletedAt: null }, orderBy: { createdAt: "desc" }, include: { faculty: { select: { name: true, isHod: true } }, reads: { where: { studentId } } } });
    const visible = await Promise.all(allAnn.map(async (a) => {
      const vis = await studentAnnouncementVisible(a, studentId, universityId);
      return vis ? a : null;
    }));
    const filtered = visible.filter(Boolean) as typeof allAnn;
    const rows = await Promise.all(filtered.map(async (a) => {
      const isRead = a.reads.length > 0;
      const batch = a.scope === "BATCH" && a.scopeValue ? await prisma.batch.findUnique({ where: { id: a.scopeValue }, select: { code: true } }) : null;
      return { id: a.id, title: a.title, body: a.body, senderName: a.faculty.name, senderRole: a.faculty.isHod ? "HOD" : "FACULTY", scope: a.scope, scopeLabel: a.scope === "ALL" ? "All Students" : a.scope === "BATCH" && batch ? `Batch ${batch.code}` : a.scopeValue, isRead, createdAt: a.createdAt };
    }));
    const final = rows.filter((r) => !unreadOnly || !r.isRead);
    return { ...paginate(final, page, limit), unreadCount: rows.filter((r) => !r.isRead).length };
  },

  async studentAnnouncement(studentId: string, universityId: string, announcementId: string) {
    const a = await prisma.announcement.findUnique({ where: { id: announcementId }, include: { faculty: { select: { name: true, isHod: true } } } });
    if (!a) throw new ApiError(404, "NOT_FOUND", "Announcement not found.");
    const visible = await studentAnnouncementVisible(a, studentId, universityId);
    if (!visible) throw new ApiError(404, "NOT_FOUND", "Announcement not found.");
    const isRead = await isAnnouncementRead(studentId, announcementId);
    return { id: a.id, title: a.title, body: a.body, senderName: a.faculty.name, senderRole: a.faculty.isHod ? "HOD" : "FACULTY", scope: a.scope, isRead, createdAt: a.createdAt };
  },

  async markStudentAnnouncementRead(studentId: string, universityId: string, announcementId: string) {
    await this.studentAnnouncement(studentId, universityId, announcementId);
    const result = await prisma.announcementRead.upsert({ where: { announcementId_studentId: { announcementId, studentId } }, update: {}, create: { announcementId, studentId } });
    return { announcementId, isRead: true, readAt: result.readAt };
  },

  async markAllStudentAnnouncementsRead(studentId: string, universityId: string) {
    const allAnn = await prisma.announcement.findMany({ where: { universityId, deletedAt: null }, select: { id: true, universityId: true, scope: true, scopeValue: true, deletedAt: true } });
    const visibleIds = (await Promise.all(allAnn.map(async (a) => ((await studentAnnouncementVisible(a, studentId, universityId)) ? a.id : null)))).filter(Boolean) as string[];
    let count = 0;
    for (const announcementId of visibleIds) {
      await prisma.announcementRead.upsert({ where: { announcementId_studentId: { announcementId, studentId } }, update: {}, create: { announcementId, studentId } });
      count++;
    }
    return { markedRead: count };
  },

  async studentAnnouncementUnreadCount(studentId: string, universityId: string) {
    const allAnn = await prisma.announcement.findMany({ where: { universityId, deletedAt: null }, select: { id: true, universityId: true, scope: true, scopeValue: true, deletedAt: true } });
    const unread = (await Promise.all(allAnn.map(async (a) => {
      const vis = await studentAnnouncementVisible(a, studentId, universityId);
      if (!vis) return false;
      return !(await isAnnouncementRead(studentId, a.id));
    }))).filter(Boolean).length;
    return { unreadCount: unread };
  },

  // ── Student — Mentor / Chat ───────────────────────────────

  async studentMentor(studentId: string, universityId: string, semesterId?: string) {
    const assignment = await getStudentMentorAssignment(studentId, universityId, semesterId);
    if (!assignment) return { mentorAssignmentId: null, mentor: null, message: "No mentor has been assigned to you for this semester. Contact your HOD." };
    const mentor = await facultyById(assignment.facultyId);
    const unread = await prisma.chatMessage.count({ where: { mentorAssignmentId: assignment.id, senderRole: "FACULTY", isRead: false } });
    const lastMsg = await prisma.chatMessage.findFirst({ where: { mentorAssignmentId: assignment.id }, orderBy: { sentAt: "desc" } });
    return { mentorAssignmentId: assignment.id, mentor: { name: mentor.name, department: mentor.department, mentorCode: mentor.mentorCode, profilePhotoUrl: mentor.profilePhotoUrl }, unreadMessages: unread, lastMessageAt: lastMsg?.sentAt ?? null };
  },

  async studentMentorMessages(studentId: string, universityId: string, page = 1, limit = 30) {
    const assignment = await getStudentMentorAssignment(studentId, universityId);
    if (!assignment) throw new ApiError(404, "NO_MENTOR_ASSIGNED", "No mentor assigned.");
    const mentor = await facultyById(assignment.facultyId);
    const rows = await prisma.chatMessage.findMany({ where: { mentorAssignmentId: assignment.id }, orderBy: { sentAt: "asc" } });
    return { mentorAssignmentId: assignment.id, mentor: { name: mentor.name, mentorCode: mentor.mentorCode }, ...paginate(rows, page, limit) };
  },

  async sendStudentMentorMessage(studentId: string, universityId: string, content: string) {
    const assignment = await getStudentMentorAssignment(studentId, universityId);
    if (!assignment) throw new ApiError(404, "NO_MENTOR_ASSIGNED", "No mentor assigned.");
    if (!content.trim()) throw new ApiError(400, "EMPTY_MESSAGE", "Message cannot be empty.");
    const msg = await prisma.chatMessage.create({ data: { mentorAssignmentId: assignment.id, senderRole: "STUDENT", studentId, content: content.trim(), isRead: false } });
    return { id: msg.id, senderRole: msg.senderRole, content: msg.content, sentAt: msg.sentAt };
  },

  async markStudentMentorMessagesRead(studentId: string, universityId: string) {
    const assignment = await getStudentMentorAssignment(studentId, universityId);
    if (!assignment) throw new ApiError(404, "NO_MENTOR_ASSIGNED", "No mentor assigned.");
    const { count } = await prisma.chatMessage.updateMany({ where: { mentorAssignmentId: assignment.id, senderRole: "FACULTY", isRead: false }, data: { isRead: true } });
    return { markedRead: count };
  },

  async studentMentorUnreadCount(studentId: string, universityId: string) {
    const assignment = await getStudentMentorAssignment(studentId, universityId);
    if (!assignment) return { unreadCount: 0 };
    const count = await prisma.chatMessage.count({ where: { mentorAssignmentId: assignment.id, senderRole: "FACULTY", isRead: false } });
    return { unreadCount: count };
  },

  // ── Student — AI Conversations ────────────────────────────

  async studentAiConversations(studentId: string) {
    const conversations = await prisma.aIConversation.findMany({ where: { studentId }, orderBy: { updatedAt: "desc" } });
    const data = await Promise.all(conversations.map(async (c) => {
      const subject = c.subjectId ? await prisma.subject.findUnique({ where: { id: c.subjectId }, select: { code: true, name: true } }) : null;
      const messages = c.messages as Array<{ role: string; content: string }>;
      return { id: c.id, subjectCode: subject?.code ?? null, subjectName: subject?.name ?? "General", lastMessage: messages[messages.length - 1]?.content ?? null, messageCount: messages.length, updatedAt: c.updatedAt };
    }));
    return { data };
  },

  async createStudentAiConversation(studentId: string, universityId: string, body: { subjectId?: string; initialMessage: string }) {
    if (!body.initialMessage.trim()) throw new ApiError(400, "EMPTY_MESSAGE", "Message cannot be empty.");
    if (body.subjectId) await ensureStudentSubject(studentId, universityId, body.subjectId);
    const subject = body.subjectId ? await prisma.subject.findUnique({ where: { id: body.subjectId }, select: { code: true } }) : null;
    const now = new Date().toISOString();
    const messages = [
      { role: "user", content: body.initialMessage.trim(), timestamp: now },
      { role: "assistant", content: `Study help for ${subject?.code ?? "general topics"} is ready. Start with: ${body.initialMessage.trim()}`, timestamp: now },
    ];
    const conversation = await prisma.aIConversation.create({ data: { studentId, subjectId: body.subjectId ?? null, messages } });
    return { conversationId: conversation.id, subjectCode: subject?.code ?? null, reply: messages[1].content };
  },

  async studentAiConversation(studentId: string, conversationId: string) {
    const c = await prisma.aIConversation.findUnique({ where: { id: conversationId } });
    if (!c) throw new ApiError(404, "NOT_FOUND", "Conversation not found.");
    if (c.studentId !== studentId) throw new ApiError(403, "STUDENT_NOT_OWNER", "Conversation does not belong to this student.");
    const subject = c.subjectId ? await prisma.subject.findUnique({ where: { id: c.subjectId }, select: { code: true } }) : null;
    return { id: c.id, subjectCode: subject?.code ?? null, messages: c.messages };
  },

  async sendStudentAiMessage(studentId: string, conversationId: string, content: string) {
    const c = await prisma.aIConversation.findUnique({ where: { id: conversationId } });
    if (!c) throw new ApiError(404, "NOT_FOUND", "Conversation not found.");
    if (c.studentId !== studentId) throw new ApiError(403, "STUDENT_NOT_OWNER", "Conversation does not belong to this student.");
    if (!content.trim()) throw new ApiError(400, "EMPTY_MESSAGE", "Message cannot be empty.");
    const messages = c.messages as Array<{ role: string; content: string; timestamp: string }>;
    const now = new Date().toISOString();
    messages.push({ role: "user", content: content.trim(), timestamp: now });
    messages.push({ role: "assistant", content: `Quick explanation: ${content.trim()}`, timestamp: now });
    await prisma.aIConversation.update({ where: { id: conversationId }, data: { messages, updatedAt: new Date() } });
    return { conversationId, reply: messages[messages.length - 1].content };
  },

  async deleteStudentAiConversation(studentId: string, conversationId: string) {
    await this.studentAiConversation(studentId, conversationId);
    await prisma.aIConversation.delete({ where: { id: conversationId } });
  },

  // ── Student — Leaderboard ─────────────────────────────────

  async studentLeaderboard(studentId: string, universityId: string, phaseId?: string, subjectId?: string) {
    const { enrollment, semester } = await getStudentEnrollment(studentId, universityId);
    const phase = phaseId ? await phaseById(phaseId) : await currentPhaseForSemester(semester.id);
    if (!phase) throw new ApiError(404, "PHASE_NOT_FOUND", "No phase found.");
    const batchEnrollments = await prisma.studentEnrollment.findMany({ where: { batchId: enrollment.batchId, semesterId: semester.id, isCurrent: true }, include: { student: true } });
    const leaderboard = await Promise.all(batchEnrollments.map(async (e) => {
      const rows = await prisma.result.findMany({ where: { enrollmentId: e.id, phaseId: phase.id, isPublished: true, ...(subjectId ? { subjectId } : {}) } });
      return { studentId: e.studentId, name: e.student.name, enrollmentNo: e.student.enrollmentNo, avgPct: rows.length === 0 ? 0 : average(rows.map((r) => (r.marksObtained / r.maxMarks) * 100)) };
    }));
    const sorted = leaderboard.sort((a, b) => b.avgPct - a.avgPct);
    const mapped = sorted.map((r, i) => ({ rank: i + 1, name: r.name, enrollmentNo: r.enrollmentNo, avgPct: r.avgPct, isMe: r.studentId === studentId }));
    const me = mapped.find((r) => r.isMe) ?? { rank: batchEnrollments.length, avgPct: 0 };
    const batch = await batchById(enrollment.batchId);
    return { batchCode: batch.code, phaseLabel: phase.label, myRank: me.rank, myAvgPct: me.avgPct, totalStudents: batchEnrollments.length, leaderboard: mapped.slice(0, 10) };
  },

  async studentLeaderboardMyRank(studentId: string, universityId: string, phaseId?: string) {
    const lb = await this.studentLeaderboard(studentId, universityId, phaseId);
    return { batchCode: lb.batchCode, phaseLabel: lb.phaseLabel, myRank: lb.myRank, totalStudents: lb.totalStudents, myAvgPct: lb.myAvgPct, percentile: lb.totalStudents === 0 ? 0 : Number((((lb.totalStudents - lb.myRank + 1) / lb.totalStudents) * 100).toFixed(1)) };
  },

  async studentSubjectLeaderboard(studentId: string, universityId: string, subjectId: string, phaseId?: string) {
    const board = await this.studentLeaderboard(studentId, universityId, phaseId, subjectId);
    const { enrollment, semester } = await getStudentEnrollment(studentId, universityId);
    const phase = phaseId ? await phaseById(phaseId) : await currentPhaseForSemester(semester.id);
    const myResult = phase ? await prisma.result.findFirst({ where: { enrollmentId: enrollment.id, phaseId: phase.id, subjectId, isPublished: true } }) : null;
    return { subjectCode: (await subjectById(subjectId)).code, batchCode: board.batchCode, phaseLabel: board.phaseLabel, myRank: board.myRank, myMarks: myResult?.marksObtained ?? null, maxMarks: myResult?.maxMarks ?? null, topStudents: board.leaderboard.map((r) => ({ rank: r.rank, name: r.name, marksObtained: r.avgPct, isMe: r.isMe })) };
  },

  async studentPyqAnalysis(studentId: string, universityId: string, subjectId: string) {
    await ensureStudentSubject(studentId, universityId, subjectId);
    const subject = await subjectById(subjectId);
    const analysis = await prisma.pYQAnalysis.findFirst({ where: { subjectId } });
    return { subjectCode: subject.code, subjectName: subject.name, analyzedAt: analysis?.analyzedAt ?? new Date(), topicFrequencies: analysis ? Object.entries(analysis.topicFrequencies as Record<string, number>).map(([topic, frequency]) => ({ topic, frequency, priority: frequency >= 5 ? "HIGH" : frequency >= 3 ? "MEDIUM" : "LOW" })) : [{ topic: "Core Concepts", frequency: 3, priority: "HIGH" }, { topic: "Important Definitions", frequency: 2, priority: "MEDIUM" }], totalPYQsAnalyzed: await prisma.pYQFile.count({ where: { subjectId } }) };
  },

  async studentSmartNoteSummary(studentId: string, universityId: string, noteId: string) {
    const note = await this.studentNote(studentId, universityId, noteId);
    if (!note.aiSummary) throw new ApiError(404, "SUMMARY_NOT_YET_GENERATED", "AI summary has not been generated yet.");
    return { noteId, noteTitle: note.title, subjectCode: note.subjectCode, summary: note.aiSummary, generatedAt: note.createdAt };
  },

  // ── Faculty Dashboard / Profile ───────────────────────────

  async facultyDashboardSummary(facultyId: string, universityId: string, semesterId?: string) {
    const faculty = await getFacultyUser(facultyId);
    const scope = await getFacultyScopeData(facultyId, universityId, semesterId);
    const enrollments = await getFacultyVisibleEnrollments(facultyId, universityId, semesterId);
    const attendancePcts = await Promise.all(enrollments.map((e) => computeOverallAttendancePct(e.id)));
    const unreadMenteeMessages = await prisma.chatMessage.count({ where: { mentorAssignment: { facultyId }, senderRole: "STUDENT", isRead: false } });
    const unreadAnnouncements = await prisma.announcement.count({ where: { universityId, deletedAt: null, facultyId: { not: facultyId }, OR: [{ scope: "ALL" }, { scope: "BATCH", scopeValue: { in: scope.assignedBatchIds } }] } });
    const pending = await this.facultyAttendancePending(facultyId, universityId, semesterId);
    return {
      faculty: { id: faculty.id, name: faculty.name, mentorCode: faculty.mentorCode, department: faculty.department },
      activeSemester: { id: scope.semester.id, label: scope.semester.label, number: scope.semester.number },
      stats: { totalStudents: enrollments.length, assignedBatches: scope.assignedBatchIds.length, assignedSubjects: scope.assignedSubjectIds.length, totalMentees: scope.mentorAssignments.length, avgAttendance: { value: average(attendancePcts), trend: "neutral", deltaLabel: "Current average" }, pendingAttendance: pending.count, unreadMenteeMessages, unreadAnnouncements },
    };
  },

  async facultyProfile(facultyId: string) {
    const f = await getFacultyUser(facultyId);
    return { id: f.id, employeeId: f.employeeId, name: f.name, email: f.email, phone: f.phone, department: f.department, isHod: f.isHod, mentorCode: f.mentorCode, profilePhotoUrl: f.profilePhotoUrl, isActive: f.isActive, createdAt: f.createdAt };
  },

  async updateFacultyProfile(facultyId: string, body: Record<string, string>) {
    if ("email" in body || "department" in body) throw new ApiError(400, "VALIDATION_ERROR", "email and department are read-only.");
    await prisma.faculty.update({ where: { id: facultyId }, data: { name: body.name, phone: body.phone ?? null } });
    return this.facultyProfile(facultyId);
  },

  async changeFacultyPassword(facultyId: string, currentPassword: string, newPassword: string, confirmPassword: string) {
    if (newPassword !== confirmPassword) throw new ApiError(400, "PASSWORDS_DO_NOT_MATCH", "Passwords do not match.");
    return this.changePassword(facultyId, currentPassword, newPassword);
  },

  async facultySessions(facultyId: string) {
    return this.securitySessions(facultyId);
  },

  async revokeFacultySession(facultyId: string, sessionId: string) {
    const token = await prisma.refreshToken.findFirst({ where: { id: sessionId, facultyId } });
    if (!token) throw new ApiError(404, "NOT_FOUND", "Session not found.");
    await this.revokeSession(sessionId);
  },

  async facultyActivityFeed(facultyId: string, page = 1, limit = 10) {
    const rows = await prisma.activityLog.findMany({ where: { facultyId }, orderBy: { createdAt: "desc" } });
    return paginate(rows.map((r) => ({ id: r.id, type: r.type, title: r.title, description: r.description, createdAt: r.createdAt })), page, limit);
  },

  async facultyMyScope(facultyId: string, universityId: string, semesterId?: string) {
    const faculty = await getFacultyUser(facultyId);
    const scope = await getFacultyScopeData(facultyId, universityId, semesterId);
    const assignments = await Promise.all(scope.assignments.map(async (a) => {
      const subject = a.subjectId ? await subjectById(a.subjectId) : null;
      const batch = await batchById(a.batchId);
      const studentCount = await prisma.studentEnrollment.count({ where: { batchId: a.batchId, semesterId: scope.semester.id, isCurrent: true } });
      return { id: a.id, subject: subject ? { id: subject.id, code: subject.code, name: subject.name, type: subject.type } : null, batch: { id: batch.id, code: batch.code, yearLevel: batch.yearLevel }, studentCount };
    }));
    const enrollments = await getFacultyVisibleEnrollments(facultyId, universityId, semesterId);
    return {
      activeSemester: { id: scope.semester.id, label: scope.semester.label, number: scope.semester.number, yearLevel: scope.semester.yearLevel },
      assignments: assignments.filter((a) => a.subject !== null),
      uniqueBatches: await Promise.all(scope.assignedBatchIds.map(async (id) => ({ id, code: (await batchById(id)).code }))),
      uniqueSubjects: await Promise.all(scope.assignedSubjectIds.map(async (id) => ({ id, code: (await subjectById(id)).code }))),
      totalStudents: enrollments.length,
      mentorCode: faculty.mentorCode,
    };
  },

  // ── Faculty — Timetable ───────────────────────────────────

  async facultyTimetable(facultyId: string, universityId: string, semesterId?: string) {
    const scope = await getFacultyScopeData(facultyId, universityId, semesterId);
    const slots = await prisma.timetableSlot.findMany({ where: { facultyId, semesterId: scope.semester.id }, orderBy: [{ dayOfWeek: "asc" }, { slotStart: "asc" }] });
    const mappedSlots = await Promise.all(slots.map(async (slot) => {
      const subject = await subjectById(slot.subjectId);
      const batch = await batchById(slot.batchId);
      return { id: slot.id, dayOfWeek: slot.dayOfWeek, dayLabel: DAY_LABELS[slot.dayOfWeek] ?? "", slotStart: slot.slotStart, slotEnd: slot.slotEnd, subject: { code: subject.code, name: subject.name }, batch: { code: batch.code }, room: slot.room };
    }));
    return { semesterLabel: scope.semester.label, slots: mappedSlots };
  },

  async facultyTodayTimetable(facultyId: string, universityId: string, semesterId?: string) {
    const date = new Date();
    const dayOfWeek = date.getDay();
    const isoDate = date.toISOString().slice(0, 10);
    const scope = await getFacultyScopeData(facultyId, universityId, semesterId);
    const slots = await prisma.timetableSlot.findMany({ where: { facultyId, semesterId: scope.semester.id, dayOfWeek } });
    const mappedSlots = await Promise.all(slots.map(async (slot) => {
      const subject = await subjectById(slot.subjectId);
      const batch = await batchById(slot.batchId);
      const attendanceMarked = await prisma.attendanceRecord.findFirst({ where: { subjectId: slot.subjectId, enrollment: { batchId: slot.batchId }, lectureDate: new Date(isoDate), facultyId } });
      return { id: slot.id, slotStart: slot.slotStart, slotEnd: slot.slotEnd, subject: { code: subject.code }, batch: { code: batch.code }, attendanceMarked: Boolean(attendanceMarked) };
    }));
    return { date: isoDate, dayLabel: DAY_LABELS[dayOfWeek] ?? "", slots: mappedSlots };
  },

  // ── Faculty — Students ────────────────────────────────────

  async facultyStudents(facultyId: string, universityId: string, query: Record<string, string | number | undefined>) {
    const scope = await getFacultyScopeData(facultyId, universityId, query.semesterId as string | undefined);
    const batchId = query.batchId as string | undefined;
    const subjectId = query.subjectId as string | undefined;
    if (batchId) await ensureFacultyAssignedBatch(facultyId, universityId, batchId, scope.semester.id);
    if (subjectId) await ensureFacultyAssignedSubject(facultyId, universityId, subjectId, scope.semester.id);
    const enrollments = await getFacultyVisibleEnrollments(facultyId, universityId, scope.semester.id);
    const rules = await getAttendanceRules(universityId);
    const rows = await Promise.all(
      enrollments.filter((e) => !batchId || e.batchId === batchId).map(async (e) => {
        const student = await prisma.student.findUnique({ where: { id: e.studentId } })!;
        const batch = await batchById(e.batchId);
        const attendancePct = await computeOverallAttendancePct(e.id);
        const results = await prisma.result.findMany({ where: { enrollmentId: e.id, isPublished: true }, select: { marksObtained: true, maxMarks: true } });
        const avgMarksPct = results.length === 0 ? 0 : average(results.map((r) => (r.marksObtained / r.maxMarks) * 100));
        const status = !student?.isActive ? "INACTIVE" : attendancePct < rules.minThresholdPct || avgMarksPct < 40 ? "AT_RISK" : "ACTIVE";
        return { enrollmentNo: student?.enrollmentNo ?? "", name: student?.name ?? "", branch: student?.branch ?? "", currentBatch: { code: batch.code }, rollNo: e.rollNo, attendancePct, status };
      }),
    );
    const search = query.search as string | undefined;
    return paginate(rows.filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.enrollmentNo.includes(search)).filter((r) => !query.status || r.status === query.status), Number(query.page ?? 1), Number(query.limit ?? 20));
  },

  async facultyStudentProfile(facultyId: string, universityId: string, enrollmentNo: string, semesterId?: string) {
    const scope = await getFacultyScopeData(facultyId, universityId, semesterId);
    const student = await studentByEnrollmentNo(enrollmentNo);
    const enrollment = await currentEnrollmentForStudent(student.id, scope.semester.id);
    if (!enrollment || !scope.assignedBatchIds.includes(enrollment.batchId)) throw new ApiError(403, "STUDENT_NOT_IN_ASSIGNED_BATCH", "Student is not in your assigned batch.");
    const batch = await batchById(enrollment.batchId);
    const attendancePct = await computeOverallAttendancePct(enrollment.id);
    const results = await prisma.result.findMany({ where: { enrollmentId: enrollment.id, isPublished: true }, select: { marksObtained: true, maxMarks: true } });
    const avgMarksPct = results.length === 0 ? 0 : average(results.map((r) => (r.marksObtained / r.maxMarks) * 100));
    const rules = await getAttendanceRules(universityId);
    const status = !student.isActive ? "INACTIVE" : attendancePct < rules.minThresholdPct || avgMarksPct < 40 ? "AT_RISK" : "ACTIVE";
    return { enrollmentNo: student.enrollmentNo, name: student.name, branch: student.branch, rollNo: enrollment.rollNo, currentBatch: { code: batch.code }, currentSemester: { label: scope.semester.label }, phone: student.phone, attendancePct, status, isMentee: scope.mentorStudentIds.includes(student.id) };
  },

  async facultyStudentAttendance(facultyId: string, universityId: string, enrollmentNo: string, semesterId?: string) {
    const scope = await getFacultyScopeData(facultyId, universityId, semesterId);
    const student = await studentByEnrollmentNo(enrollmentNo);
    const enrollment = await currentEnrollmentForStudent(student.id, scope.semester.id);
    if (!enrollment || !scope.assignedBatchIds.includes(enrollment.batchId)) throw new ApiError(403, "STUDENT_NOT_IN_ASSIGNED_BATCH", "Student is not in your assigned batch.");
    const rules = await getAttendanceRules(universityId);
    const subjects = await Promise.all(scope.assignedSubjectIds.map(async (subjectId) => {
      const subject = await subjectById(subjectId);
      const records = await prisma.attendanceRecord.findMany({ where: { subjectId, enrollmentId: enrollment.id }, select: { isPresent: true, lectureDate: true } });
      const total = records.length; const attended = records.filter((r) => r.isPresent).length;
      return { subjectCode: subject.code, totalLectures: total, attended, percentage: total === 0 ? 0 : Number(((attended / total) * 100).toFixed(2)), isBelowThreshold: total === 0 ? false : (attended / total) * 100 < rules.minThresholdPct, lectureLog: records.map((r) => ({ date: r.lectureDate.toISOString().slice(0, 10), isPresent: r.isPresent })) };
    }));
    return { enrollmentNo: student.enrollmentNo, name: student.name, subjects };
  },

  async facultyStudentResults(facultyId: string, universityId: string, enrollmentNo: string, semesterId?: string) {
    const scope = await getFacultyScopeData(facultyId, universityId, semesterId);
    const student = await studentByEnrollmentNo(enrollmentNo);
    const enrollment = await currentEnrollmentForStudent(student.id, scope.semester.id);
    if (!enrollment || !scope.assignedBatchIds.includes(enrollment.batchId)) throw new ApiError(403, "STUDENT_NOT_IN_ASSIGNED_BATCH", "Student is not in your assigned batch.");
    const results = await prisma.result.findMany({ where: { enrollmentId: enrollment.id, subjectId: { in: scope.assignedSubjectIds } }, include: { phase: true, subject: true } });
    return { enrollmentNo: student.enrollmentNo, name: student.name, results: results.map((r) => ({ phase: r.phase.label, subjectCode: r.subject.code, marksObtained: r.marksObtained, maxMarks: r.maxMarks, grade: r.grade, isPublished: r.isPublished })) };
  },

  // ── Faculty — Attendance ──────────────────────────────────

  async facultyAttendancePending(facultyId: string, universityId: string, semesterId?: string) {
    const scope = await getFacultyScopeData(facultyId, universityId, semesterId);
    const today = new Date().toISOString().slice(0, 10);
    const slots = await prisma.timetableSlot.findMany({ where: { facultyId, semesterId: scope.semester.id } });
    const pending = await Promise.all(slots.map(async (slot) => {
      const alreadyMarked = await prisma.attendanceRecord.findFirst({ where: { subjectId: slot.subjectId, enrollment: { batchId: slot.batchId }, lectureDate: new Date(today), facultyId } });
      if (alreadyMarked) return null;
      const subject = await subjectById(slot.subjectId);
      const batch = await batchById(slot.batchId);
      return { subjectCode: subject.code, batchCode: batch.code, lectureDateScheduled: today, slotStart: slot.slotStart, slotEnd: slot.slotEnd };
    }));
    const filtered = pending.filter(Boolean) as Array<{ subjectCode: string; batchCode: string; lectureDateScheduled: string; slotStart: string; slotEnd: string }>;
    return { pending: filtered, count: filtered.length };
  },

  async facultyAttendanceSession(facultyId: string, universityId: string, subjectId: string, batchId: string, date: string) {
    await ensureFacultyAssignedBatch(facultyId, universityId, batchId);
    await ensureFacultyAssignedSubject(facultyId, universityId, subjectId);
    const enrollments = await getFacultyVisibleEnrollments(facultyId, universityId);
    const batchEnrollments = enrollments.filter((e) => e.batchId === batchId);
    const lectureDate = new Date(date);
    const existing = await prisma.attendanceRecord.findMany({ where: { subjectId, enrollment: { batchId }, lectureDate } });
    const subject = await subjectById(subjectId);
    const batch = await batchById(batchId);
    return {
      subjectCode: subject.code, subjectName: subject.name, batchCode: batch.code, date, existingRecord: existing.length > 0,
      students: await Promise.all(batchEnrollments.map(async (e) => {
        const student = await prisma.student.findUnique({ where: { id: e.studentId }, select: { enrollmentNo: true, name: true } });
        const existingRow = existing.find((r) => r.enrollmentId === e.id);
        const attendancePct = await computeOverallAttendancePct(e.id);
        return { enrollmentId: e.id, enrollmentNo: student?.enrollmentNo ?? "", name: student?.name ?? "", rollNo: e.rollNo, isPresent: existingRow?.isPresent ?? null, attendancePctSoFar: attendancePct };
      })),
    };
  },

  async updateFacultyAttendance(body: { subjectId: string; batchId: string; lectureDate: string; corrections: Array<{ enrollmentId: string; isPresent: boolean; remarks?: string }> }, facultyId: string, universityId: string) {
    await ensureFacultyAssignedBatch(facultyId, universityId, body.batchId);
    await ensureFacultyAssignedSubject(facultyId, universityId, body.subjectId);
    const lectureDate = new Date(body.lectureDate);
    const existing = await prisma.attendanceRecord.findMany({ where: { subjectId: body.subjectId, enrollment: { batchId: body.batchId }, lectureDate } });
    if (existing.length === 0) throw new ApiError(404, "ATTENDANCE_NOT_YET_MARKED", "Attendance was not marked yet.");
    if (existing.some((r) => r.isLocked)) throw new ApiError(403, "ATTENDANCE_RECORD_LOCKED", "Attendance record is locked.");
    for (const correction of body.corrections) {
      const row = existing.find((r) => r.enrollmentId === correction.enrollmentId);
      if (row) await prisma.attendanceRecord.update({ where: { id: row.id }, data: { isPresent: correction.isPresent, remarks: correction.remarks, updatedAt: new Date() } });
    }
    const subject = await subjectById(body.subjectId);
    return { corrected: body.corrections.length, lectureDate: body.lectureDate, subjectCode: subject.code };
  },

  async deleteFacultyAttendance(facultyId: string, universityId: string, subjectId: string, batchId: string, date: string) {
    await ensureFacultyAssignedBatch(facultyId, universityId, batchId);
    await ensureFacultyAssignedSubject(facultyId, universityId, subjectId);
    const lectureDate = new Date(date);
    const rows = await prisma.attendanceRecord.findMany({ where: { subjectId, enrollment: { batchId }, lectureDate } });
    if (rows.some((r) => r.isLocked)) throw new ApiError(403, "ATTENDANCE_RECORD_LOCKED", "Attendance record is locked.");
    const { count } = await prisma.attendanceRecord.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
    return { deletedCount: count, lectureDate: date };
  },

  async facultyAttendanceSummary(facultyId: string, universityId: string, semesterId?: string) {
    const scope = await getFacultyScopeData(facultyId, universityId, semesterId);
    const rules = await getAttendanceRules(universityId);
    const bySubjectAndBatch = await Promise.all(
      scope.assignments.filter((a) => a.subjectId).map(async (a) => {
        const batchEnrollments = await getFacultyVisibleEnrollments(facultyId, universityId, scope.semester.id).then((e) => e.filter((en) => en.batchId === a.batchId));
        const studentPcts = await Promise.all(batchEnrollments.map((e) => computeAttendancePct(e.id, a.subjectId!)));
        const lectureRecords = await prisma.attendanceRecord.findMany({ where: { subjectId: a.subjectId!, enrollment: { batchId: a.batchId } } });
        const subject = await subjectById(a.subjectId!);
        const batch = await batchById(a.batchId);
        return { subjectCode: subject.code, batchCode: batch.code, totalStudents: batchEnrollments.length, avgAttendancePct: average(studentPcts), belowThresholdCount: studentPcts.filter((p) => p < rules.minThresholdPct).length, totalLecturesMarked: new Set(lectureRecords.map((r) => r.lectureDate.toISOString().slice(0, 10))).size };
      }),
    );
    return { semesterLabel: scope.semester.label, bySubjectAndBatch };
  },

  async facultyAttendanceLectureLog(facultyId: string, universityId: string, subjectId: string, batchId: string, semesterId?: string) {
    await ensureFacultyAssignedBatch(facultyId, universityId, batchId, semesterId);
    await ensureFacultyAssignedSubject(facultyId, universityId, subjectId, semesterId);
    const records = await prisma.attendanceRecord.findMany({ where: { subjectId, enrollment: { batchId } }, orderBy: { lectureDate: "asc" } });
    const dateMap = new Map<string, typeof records>();
    for (const r of records) {
      const d = r.lectureDate.toISOString().slice(0, 10);
      if (!dateMap.has(d)) dateMap.set(d, []);
      dateMap.get(d)!.push(r);
    }
    const lectures = Array.from(dateMap.entries()).map(([date, rows]) => ({ date, presentCount: rows.filter((r) => r.isPresent).length, absentCount: rows.filter((r) => !r.isPresent).length, isLocked: rows.every((r) => r.isLocked) }));
    const subject = await subjectById(subjectId);
    const batch = await batchById(batchId);
    return { subjectCode: subject.code, batchCode: batch.code, lectures, totalLectures: lectures.length };
  },

  async facultyAttendanceBelowThreshold(facultyId: string, universityId: string, semesterId?: string, subjectId?: string) {
    const scope = await getFacultyScopeData(facultyId, universityId, semesterId);
    const rules = await getAttendanceRules(universityId);
    if (subjectId) await ensureFacultyAssignedSubject(facultyId, universityId, subjectId, scope.semester.id);
    const filteredSubjectIds = subjectId ? [subjectId] : scope.assignedSubjectIds;
    const enrollments = await getFacultyVisibleEnrollments(facultyId, universityId, scope.semester.id);
    const data = (await Promise.all(enrollments.flatMap(async (e) =>
      Promise.all(filteredSubjectIds.map(async (sid) => {
        const student = await prisma.student.findUnique({ where: { id: e.studentId }, select: { enrollmentNo: true, name: true } });
        const batch = await batchById(e.batchId);
        const subject = await subjectById(sid);
        const pct = await computeAttendancePct(e.id, sid);
        return { enrollmentNo: student?.enrollmentNo ?? "", name: student?.name ?? "", batchCode: batch.code, subjectCode: subject.code, attendancePct: pct, isMentee: scope.mentorStudentIds.includes(e.studentId) };
      })),
    ))).flat().filter((r) => r.attendancePct < rules.minThresholdPct);
    return { threshold: rules.minThresholdPct, data, total: data.length };
  },

  // ── Faculty — Notes ───────────────────────────────────────

  async facultyNotes(facultyId: string, query: Record<string, string | number | undefined>) {
    const notes = await prisma.note.findMany({
      where: { facultyId, deletedAt: null, ...(query.subjectId ? { subjectId: query.subjectId as string } : {}) },
      include: { subject: { select: { code: true } }, _count: { select: { flashcards: true } } },
      orderBy: { createdAt: "desc" },
    });
    const rows = notes.map((n) => ({ id: n.id, subjectCode: n.subject.code, title: n.title, description: n.description, fileUrl: n.fileUrl, mimeType: n.mimeType, fileSizeKb: n.fileSizeKb, aiSummary: n.aiSummary, hasFlashcards: n._count.flashcards > 0, createdAt: n.createdAt }));
    return paginate(rows, Number(query.page ?? 1), Number(query.limit ?? 20));
  },

  async getFacultyNote(facultyId: string, noteId: string) {
    const note = await prisma.note.findFirst({ where: { id: noteId, facultyId, deletedAt: null }, include: { subject: { select: { code: true } }, flashcards: { orderBy: { order: "asc" } } } });
    if (!note) throw new ApiError(404, "NOT_FOUND", "Note not found.");
    return { id: note.id, subjectCode: note.subject.code, title: note.title, description: note.description, fileUrl: note.fileUrl, mimeType: note.mimeType, fileSizeKb: note.fileSizeKb, aiSummary: note.aiSummary, flashcards: note.flashcards, createdAt: note.createdAt };
  },

  async createFacultyNote(facultyId: string, universityId: string, fileBuffer: Buffer | undefined, fileMeta: { originalname?: string; mimetype?: string; size?: number }, body: Record<string, string>) {
    if (!fileBuffer) throw new ApiError(400, "VALIDATION_ERROR", "File is required.");
    await ensureFacultyAssignedSubject(facultyId, universityId, String(body.subjectId));
    const note = await prisma.note.create({
      data: { subjectId: String(body.subjectId), facultyId, universityId, title: String(body.title), description: body.description ?? null, fileUrl: `/mock/notes/${Date.now()}/${fileMeta.originalname ?? "file"}`, fileKey: `notes/${facultyId}/${Date.now()}`, mimeType: fileMeta.mimetype ?? "application/octet-stream", fileSizeKb: Math.round((fileMeta.size ?? fileBuffer.length) / 1024) },
    });
    return { id: note.id, title: note.title, fileUrl: note.fileUrl, aiJobId: null, aiStatus: "QUEUED", message: "Note uploaded. AI summary will be available after processing." };
  },

  async updateFacultyNote(facultyId: string, noteId: string, body: Record<string, string>) {
    const note = await prisma.note.findFirst({ where: { id: noteId, facultyId, deletedAt: null } });
    if (!note) throw new ApiError(404, "NOT_FOUND", "Note not found.");
    await prisma.note.update({ where: { id: noteId }, data: { title: body.title ?? note.title, description: body.description ?? note.description } });
    return this.getFacultyNote(facultyId, noteId);
  },

  async deleteFacultyNote(facultyId: string, noteId: string) {
    const note = await prisma.note.findFirst({ where: { id: noteId, facultyId, deletedAt: null } });
    if (!note) throw new ApiError(404, "NOT_FOUND", "Note not found.");
    await prisma.note.update({ where: { id: noteId }, data: { deletedAt: new Date() } });
  },

  async facultyNoteAiStatus(facultyId: string, noteId: string) {
    const note = await prisma.note.findFirst({ where: { id: noteId, facultyId, deletedAt: null }, include: { _count: { select: { flashcards: true } } } });
    if (!note) throw new ApiError(404, "NOT_FOUND", "Note not found.");
    return { noteId, jobId: note.aiJobId, status: "QUEUED", aiSummary: note.aiSummary, flashcardCount: note._count.flashcards };
  },

  async addFacultyFlashcard(facultyId: string, noteId: string, question: string, answer: string) {
    await this.getFacultyNote(facultyId, noteId);
    const count = await prisma.flashcard.count({ where: { noteId } });
    return prisma.flashcard.create({ data: { noteId, question, answer, order: count + 1 } });
  },

  async deleteFacultyFlashcard(facultyId: string, noteId: string, flashcardId: string) {
    await this.getFacultyNote(facultyId, noteId);
    await prisma.flashcard.delete({ where: { id: flashcardId } });
  },

  // ── Faculty — Quizzes ─────────────────────────────────────

  async facultyQuizzes(facultyId: string, query: Record<string, string | number | undefined>) {
    const quizzes = await prisma.quiz.findMany({
      where: { facultyId, deletedAt: null, ...(query.subjectId ? { subjectId: query.subjectId as string } : {}), ...(query.isPublished !== undefined ? { isPublished: query.isPublished === "true" || query.isPublished === true } : {}) },
      include: { _count: { select: { questions: true, attempts: true } }, attempts: { select: { score: true } } },
      orderBy: { createdAt: "desc" },
    });
    const rows = quizzes.map((q) => ({ id: q.id, title: q.title, subjectId: q.subjectId, isAiGenerated: q.isAiGenerated, isPublished: q.isPublished, questionCount: q._count.questions, attemptCount: q._count.attempts, avgScore: average(q.attempts.map((a) => a.score)), dueDate: q.dueDate, createdAt: q.createdAt }));
    return paginate(rows, Number(query.page ?? 1), Number(query.limit ?? 20));
  },

  async getFacultyQuiz(facultyId: string, quizId: string) {
    const quiz = await prisma.quiz.findFirst({ where: { id: quizId, facultyId, deletedAt: null }, include: { questions: { orderBy: { order: "asc" } }, attempts: { select: { score: true } }, subject: { select: { code: true } }, semester: { select: { label: true } } } });
    if (!quiz) throw new ApiError(404, "NOT_FOUND", "Quiz not found.");
    const scores = quiz.attempts.map((a) => a.score);
    return { id: quiz.id, title: quiz.title, description: quiz.description, subjectCode: quiz.subject.code, semesterLabel: quiz.semester.label, isAiGenerated: quiz.isAiGenerated, isPublished: quiz.isPublished, timeLimitMins: quiz.timeLimitMins, dueDate: quiz.dueDate, questions: quiz.questions, stats: { attemptCount: scores.length, avgScore: average(scores), highScore: scores.length === 0 ? 0 : Math.max(...scores), lowScore: scores.length === 0 ? 0 : Math.min(...scores) } };
  },

  async createFacultyQuiz(facultyId: string, universityId: string, body: { subjectId: string; semesterId: string; title: string; description?: string; timeLimitMins?: number; dueDate?: string; questions: Array<{ text: string; options: any; correctOption: string; explanation?: string; order: number }> }) {
    await ensureFacultyAssignedSubject(facultyId, universityId, body.subjectId, body.semesterId);
    const quiz = await prisma.quiz.create({ data: { facultyId, subjectId: body.subjectId, semesterId: body.semesterId, title: body.title, description: body.description ?? null, timeLimitMins: body.timeLimitMins ?? null, dueDate: body.dueDate ? new Date(body.dueDate) : null, isAiGenerated: false, isPublished: false } });
    for (const q of body.questions) {
      await prisma.question.create({ data: { quizId: quiz.id, text: q.text, options: q.options, correctOption: q.correctOption, explanation: q.explanation ?? null, order: q.order } });
    }
    return { id: quiz.id, title: quiz.title, isPublished: false, questionCount: body.questions.length, message: "Quiz created as draft. Publish when ready." };
  },

  async createAiQuizJob(facultyId: string, universityId: string, body: { subjectId: string; semesterId: string; topic: string; questionCount: number; difficulty: string }) {
    await ensureFacultyAssignedSubject(facultyId, universityId, body.subjectId, body.semesterId);
    const jobId = `ai_quiz_job_${Date.now()}`;
    return { jobId, status: "QUEUED", message: `AI is generating ${body.questionCount} questions. Poll /faculty/quizzes/ai-status/${jobId}` };
  },

  async getAiQuizStatus(jobId: string) {
    return { jobId, status: "COMPLETE", draftQuizId: null, questionCount: 0, message: "Quiz generation in progress." };
  },

  async updateFacultyQuiz(facultyId: string, quizId: string, body: Record<string, string | number>) {
    const quiz = await prisma.quiz.findFirst({ where: { id: quizId, facultyId, deletedAt: null } });
    if (!quiz) throw new ApiError(404, "NOT_FOUND", "Quiz not found.");
    const updated = await prisma.quiz.update({ where: { id: quizId }, data: { title: body.title ? String(body.title) : quiz.title, timeLimitMins: body.timeLimitMins ? Number(body.timeLimitMins) : quiz.timeLimitMins, dueDate: body.dueDate ? new Date(String(body.dueDate)) : quiz.dueDate } });
    const subject = await subjectById(updated.subjectId);
    return { id: updated.id, title: updated.title, description: updated.description, subjectCode: subject.code, isPublished: updated.isPublished, timeLimitMins: updated.timeLimitMins, dueDate: updated.dueDate };
  },

  async replaceFacultyQuizQuestions(facultyId: string, quizId: string, questions: Array<{ text: string; options: any; correctOption: string; explanation?: string; order: number }>) {
    await this.getFacultyQuiz(facultyId, quizId);
    await prisma.question.deleteMany({ where: { quizId } });
    for (const q of questions) {
      await prisma.question.create({ data: { quizId, text: q.text, options: q.options, correctOption: q.correctOption, explanation: q.explanation ?? null, order: q.order } });
    }
    return { quizId, questionCount: questions.length };
  },

  async publishFacultyQuiz(facultyId: string, quizId: string) {
    const quiz = await prisma.quiz.findFirst({ where: { id: quizId, facultyId, deletedAt: null } });
    if (!quiz) throw new ApiError(404, "NOT_FOUND", "Quiz not found.");
    const questionCount = await prisma.question.count({ where: { quizId } });
    if (questionCount === 0) throw new ApiError(400, "QUIZ_HAS_NO_QUESTIONS", "Quiz has no questions.");
    if (quiz.isPublished) throw new ApiError(409, "QUIZ_ALREADY_PUBLISHED", "Quiz already published.");
    const updated = await prisma.quiz.update({ where: { id: quizId }, data: { isPublished: true, updatedAt: new Date() } });
    return { quizId, isPublished: true, publishedAt: updated.updatedAt };
  },

  async unpublishFacultyQuiz(facultyId: string, quizId: string) {
    const quiz = await prisma.quiz.findFirst({ where: { id: quizId, facultyId, deletedAt: null } });
    if (!quiz) throw new ApiError(404, "NOT_FOUND", "Quiz not found.");
    await prisma.quiz.update({ where: { id: quizId }, data: { isPublished: false } });
    return { quizId, isPublished: false };
  },

  async deleteFacultyQuiz(facultyId: string, quizId: string) {
    const quiz = await prisma.quiz.findFirst({ where: { id: quizId, facultyId, deletedAt: null } });
    if (!quiz) throw new ApiError(404, "NOT_FOUND", "Quiz not found.");
    const hasAttempts = await prisma.quizAttempt.findFirst({ where: { quizId } });
    if (hasAttempts) throw new ApiError(409, "QUIZ_HAS_ATTEMPTS", "Quiz has attempts.");
    await prisma.quiz.update({ where: { id: quizId }, data: { deletedAt: new Date() } });
  },

  async facultyQuizAttempts(facultyId: string, quizId: string, query: Record<string, string | number | undefined>) {
    await this.getFacultyQuiz(facultyId, quizId);
    const attempts = await prisma.quizAttempt.findMany({ where: { quizId }, include: { student: { select: { name: true, enrollmentNo: true } } } });
    const rows = await Promise.all(attempts.map(async (a) => {
      const enrollment = await currentEnrollmentForStudent(a.studentId);
      const batch = enrollment ? await batchById(enrollment.batchId) : null;
      return { studentName: a.student.name, enrollmentNo: a.student.enrollmentNo, batchCode: batch?.code ?? "", score: a.score, submittedAt: a.submittedAt };
    }));
    const scores = rows.map((r) => r.score);
    const stats = { avgScore: average(scores), highScore: scores.length === 0 ? 0 : Math.max(...scores), lowScore: scores.length === 0 ? 0 : Math.min(...scores), attemptCount: scores.length };
    return { ...paginate(rows, Number(query.page ?? 1), Number(query.limit ?? 20)), stats };
  },

  async facultyQuizAttemptDetail(facultyId: string, quizId: string, attemptId: string) {
    await this.getFacultyQuiz(facultyId, quizId);
    const attempt = await prisma.quizAttempt.findFirst({ where: { id: attemptId, quizId }, include: { student: { select: { name: true, enrollmentNo: true } } } });
    if (!attempt) throw new ApiError(404, "NOT_FOUND", "Attempt not found.");
    const questions = await prisma.question.findMany({ where: { quizId }, orderBy: { order: "asc" } });
    const answers = attempt.answers as Record<string, string>;
    return {
      studentName: attempt.student.name, enrollmentNo: attempt.student.enrollmentNo, score: attempt.score, submittedAt: attempt.submittedAt,
      questions: questions.map((q) => ({ questionText: q.text, selectedOption: answers[q.id] ?? null, correctOption: q.correctOption, isCorrect: answers[q.id] === q.correctOption, explanation: q.explanation })),
    };
  },

  async facultyQuizPerformance(facultyId: string, quizId: string) {
    const quiz = await this.getFacultyQuiz(facultyId, quizId);
    const attempts = await prisma.quizAttempt.findMany({ where: { quizId } });
    const questions = await prisma.question.findMany({ where: { quizId } });
    return {
      quizId, title: quiz.title, publishedAt: quiz.isPublished ? new Date() : null, totalEligibleStudents: attempts.length, attemptCount: attempts.length, completionRate: attempts.length === 0 ? 0 : 100, avgScore: average(attempts.map((a) => a.score)),
      questionAnalysis: questions.map((q) => {
        const selected = attempts.map((a) => (a.answers as Record<string, string>)[q.id]).filter(Boolean);
        return { questionId: q.id, questionText: q.text, correctRate: selected.length === 0 ? 0 : Number(((selected.filter((s) => s === q.correctOption).length / selected.length) * 100).toFixed(1)), wrongOptionFrequency: (q.options as Array<{ id: string }>).filter((o) => o.id !== q.correctOption).map((o) => ({ optionId: o.id, count: selected.filter((s) => s === o.id).length })) };
      }),
    };
  },

  // ── Faculty — Announcements ───────────────────────────────

  async facultyAnnouncements(facultyId: string, universityId: string, page = 1, limit = 20) {
    const scope = await getFacultyScopeData(facultyId, universityId);
    const rows = await prisma.announcement.findMany({
      where: {
        universityId, deletedAt: null,
        OR: [{ scope: "ALL" }, { scope: "BATCH", scopeValue: { in: scope.assignedBatchIds } }, { scope: "YEAR_LEVEL" }],
      },
      orderBy: { createdAt: "desc" },
      include: { faculty: { select: { name: true, isHod: true } } },
    });
    const data = await Promise.all(rows.map(async (a) => {
      const batch = a.scope === "BATCH" && a.scopeValue ? await prisma.batch.findUnique({ where: { id: a.scopeValue }, select: { code: true } }) : null;
      return { id: a.id, title: a.title, body: a.body, scope: a.scope, scopeValue: a.scopeValue, scopeLabel: a.scope === "BATCH" && batch ? `Batch ${batch.code}` : a.scopeValue, senderName: a.faculty.name, senderRole: a.faculty.isHod ? "HOD" : "FACULTY", createdAt: a.createdAt, isOwn: a.facultyId === facultyId };
    }));
    return paginate(data, page, limit);
  },

  async createFacultyAnnouncement(facultyId: string, universityId: string, body: { title: string; body: string; scope: "BATCH" | "YEAR_LEVEL" | "ALL"; scopeValue?: string }) {
    if (body.scope === "ALL") throw new ApiError(403, "SCOPE_NOT_ALLOWED", "Faculty cannot post ALL scope announcements.");
    if (!body.scopeValue) throw new ApiError(400, "VALIDATION_ERROR", "scopeValue is required for scoped announcements.");
    if (body.scope === "BATCH") await ensureFacultyAssignedBatch(facultyId, universityId, body.scopeValue);
    if (body.scope === "YEAR_LEVEL") {
      const scope = await getFacultyScopeData(facultyId, universityId);
      const allowedYearLevels = new Set(await Promise.all(scope.assignments.map(async (a) => (await batchById(a.batchId)).yearLevel)));
      if (!allowedYearLevels.has(body.scopeValue as YearLevel)) throw new ApiError(403, "SCOPE_NOT_ALLOWED", "Faculty can only post to year levels they are assigned to.");
    }
    const a = await prisma.announcement.create({ data: { universityId, facultyId, title: body.title, body: body.body, scope: body.scope as any, scopeValue: body.scopeValue } });
    const batch = body.scope === "BATCH" ? await prisma.batch.findUnique({ where: { id: body.scopeValue! }, select: { code: true } }) : null;
    return { id: a.id, title: a.title, scope: a.scope, scopeLabel: a.scope === "BATCH" && batch ? `Batch ${batch.code}` : a.scopeValue, createdAt: a.createdAt };
  },

  async updateFacultyAnnouncement(facultyId: string, announcementId: string, body: { title?: string; body?: string }) {
    const a = await prisma.announcement.findFirst({ where: { id: announcementId, facultyId, deletedAt: null } });
    if (!a) throw new ApiError(404, "NOT_FOUND", "Announcement not found.");
    return prisma.announcement.update({ where: { id: announcementId }, data: { title: body.title ?? a.title, body: body.body ?? a.body, updatedAt: new Date() } });
  },

  async deleteFacultyAnnouncement(facultyId: string, announcementId: string) {
    const a = await prisma.announcement.findFirst({ where: { id: announcementId, facultyId, deletedAt: null } });
    if (!a) throw new ApiError(404, "NOT_FOUND", "Announcement not found.");
    await prisma.announcement.update({ where: { id: announcementId }, data: { deletedAt: new Date() } });
  },

  // ── Faculty — Mentees / Chat ──────────────────────────────

  async facultyMentees(facultyId: string, universityId: string, query: Record<string, string | number | undefined>) {
    const scope = await getFacultyScopeData(facultyId, universityId, query.semesterId as string | undefined);
    const rules = await getAttendanceRules(universityId);
    const rows = await Promise.all(scope.mentorAssignments.map(async (a) => {
      const student = await prisma.student.findUnique({ where: { id: a.studentId } });
      const enrollment = await currentEnrollmentForStudent(a.studentId, scope.semester.id);
      const batch = enrollment ? await batchById(enrollment.batchId) : null;
      const attendancePct = enrollment ? await computeOverallAttendancePct(enrollment.id) : 0;
      const results = enrollment ? await prisma.result.findMany({ where: { enrollmentId: enrollment.id, isPublished: true }, select: { marksObtained: true, maxMarks: true } }) : [];
      const avgMarksPct = results.length === 0 ? 0 : average(results.map((r) => (r.marksObtained / r.maxMarks) * 100));
      const status = !student?.isActive ? "INACTIVE" : attendancePct < rules.minThresholdPct || avgMarksPct < 40 ? "AT_RISK" : "ACTIVE";
      const unreadMessages = await prisma.chatMessage.count({ where: { mentorAssignmentId: a.id, senderRole: "STUDENT", isRead: false } });
      const lastMsg = await prisma.chatMessage.findFirst({ where: { mentorAssignmentId: a.id }, orderBy: { sentAt: "desc" } });
      return { mentorAssignmentId: a.id, enrollmentNo: student?.enrollmentNo ?? "", name: student?.name ?? "", branch: student?.branch ?? "", batchCode: batch?.code ?? "", rollNo: enrollment?.rollNo ?? "", attendancePct, latestMarksPct: avgMarksPct, status, unreadMessages, lastMessageAt: lastMsg?.sentAt ?? null };
    }));
    const search = query.search as string | undefined;
    const faculty = await getFacultyUser(facultyId);
    return { mentorCode: faculty.mentorCode, semesterLabel: scope.semester.label, ...paginate(rows.filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.enrollmentNo.includes(search)), Number(query.page ?? 1), Number(query.limit ?? 20)) };
  },

  async facultyMenteeProfile(facultyId: string, universityId: string, enrollmentNo: string, semesterId?: string) {
    const scope = await getFacultyScopeData(facultyId, universityId, semesterId);
    const student = await studentByEnrollmentNo(enrollmentNo);
    const assignment = scope.mentorAssignments.find((a) => a.studentId === student.id);
    if (!assignment) throw new ApiError(403, "NOT_MENTOR_OF_STUDENT", "Student is not your mentee.");
    const enrollment = await currentEnrollmentForStudent(student.id, scope.semester.id);
    if (!enrollment) throw new ApiError(404, "NOT_FOUND", "Enrollment not found.");
    const batch = await batchById(enrollment.batchId);
    const attendanceSummary = await Promise.all(scope.assignedSubjectIds.map(async (subjectId) => {
      const subject = await subjectById(subjectId);
      const pct = await computeAttendancePct(enrollment.id, subjectId);
      return { subjectCode: subject.code, pct };
    }));
    const resultsSummary = await prisma.result.findMany({ where: { enrollmentId: enrollment.id }, include: { phase: { select: { label: true } }, subject: { select: { code: true } } } });
    const attendancePct = await computeOverallAttendancePct(enrollment.id);
    const results = await prisma.result.findMany({ where: { enrollmentId: enrollment.id, isPublished: true }, select: { marksObtained: true, maxMarks: true } });
    const avgMarksPct = results.length === 0 ? 0 : average(results.map((r) => (r.marksObtained / r.maxMarks) * 100));
    const riskFlag = attendancePct < 75 && avgMarksPct < 40 ? "BOTH" : attendancePct < 75 ? "ATTENDANCE" : avgMarksPct < 40 ? "MARKS" : "NONE";
    const history = await prisma.studentEnrollment.findMany({ where: { studentId: student.id }, include: { semester: { select: { label: true } }, batch: { select: { yearLevel: true, code: true } } } });
    return { mentorAssignmentId: assignment.id, enrollmentNo: student.enrollmentNo, name: student.name, branch: student.branch, batchCode: batch.code, rollNo: enrollment.rollNo, phone: student.phone, admissionYear: student.admissionYear, attendanceSummary, resultsSummary: resultsSummary.map((r) => ({ phase: r.phase.label, subjectCode: r.subject.code, marks: r.marksObtained, grade: r.grade })), riskFlag, academicHistory: history.map((h) => ({ semesterLabel: h.semester.label, yearLevel: h.batch.yearLevel, batchCode: h.batch.code, rollNo: h.rollNo })) };
  },

  async facultyMenteeUnreadCounts(facultyId: string, universityId: string, semesterId?: string) {
    const scope = await getFacultyScopeData(facultyId, universityId, semesterId);
    const perMentee = await Promise.all(scope.mentorAssignments.map(async (a) => {
      const student = await prisma.student.findUnique({ where: { id: a.studentId }, select: { name: true } });
      const unreadCount = await prisma.chatMessage.count({ where: { mentorAssignmentId: a.id, senderRole: "STUDENT", isRead: false } });
      return { mentorAssignmentId: a.id, studentName: student?.name ?? "", unreadCount };
    }));
    return { totalUnread: perMentee.reduce((s, r) => s + r.unreadCount, 0), perMentee };
  },

  async facultyMenteesAtRisk(facultyId: string, universityId: string, semesterId?: string) {
    const scope = await getFacultyScopeData(facultyId, universityId, semesterId);
    const data = (await Promise.all(scope.mentorAssignments.map(async (a) => {
      const student = await prisma.student.findUnique({ where: { id: a.studentId } });
      const enrollment = await currentEnrollmentForStudent(a.studentId, scope.semester.id);
      if (!enrollment) return null;
      const attendancePct = await computeOverallAttendancePct(enrollment.id);
      const results = await prisma.result.findMany({ where: { enrollmentId: enrollment.id, isPublished: true }, select: { marksObtained: true, maxMarks: true } });
      const avgMarksPct = results.length === 0 ? 0 : average(results.map((r) => (r.marksObtained / r.maxMarks) * 100));
      const batch = await batchById(enrollment.batchId);
      return { enrollmentNo: student?.enrollmentNo ?? "", name: student?.name ?? "", batchCode: batch.code, attendancePct, latestMarksPct: avgMarksPct, riskFactor: attendancePct < 75 && avgMarksPct < 40 ? "BOTH" : attendancePct < 75 ? "ATTENDANCE" : "MARKS" };
    }))).filter(Boolean) as Array<{ enrollmentNo: string; name: string; batchCode: string; attendancePct: number; latestMarksPct: number; riskFactor: string }>;
    return { data: data.filter((r) => r.attendancePct < 75 || r.latestMarksPct < 40), total: data.filter((r) => r.attendancePct < 75 || r.latestMarksPct < 40).length };
  },

  async facultyChatMessages(facultyId: string, universityId: string, mentorAssignmentId: string, page = 1, limit = 30) {
    const scope = await getFacultyScopeData(facultyId, universityId);
    const assignment = scope.mentorAssignments.find((a) => a.id === mentorAssignmentId);
    if (!assignment) throw new ApiError(403, "NOT_MENTOR_OF_STUDENT", "Mentor assignment does not belong to this faculty.");
    const student = await prisma.student.findUnique({ where: { id: assignment.studentId }, select: { name: true, enrollmentNo: true } });
    const rows = await prisma.chatMessage.findMany({ where: { mentorAssignmentId }, orderBy: { sentAt: "asc" } });
    return { mentorAssignmentId, student: { name: student?.name ?? "", enrollmentNo: student?.enrollmentNo ?? "" }, ...paginate(rows, page, limit) };
  },

  async facultySendChatMessage(facultyId: string, universityId: string, mentorAssignmentId: string, content: string) {
    const scope = await getFacultyScopeData(facultyId, universityId);
    if (!scope.mentorAssignments.find((a) => a.id === mentorAssignmentId)) throw new ApiError(403, "NOT_MENTOR_OF_STUDENT", "Mentor assignment does not belong to this faculty.");
    if (!content.trim()) throw new ApiError(400, "EMPTY_MESSAGE", "Message cannot be empty.");
    const msg = await prisma.chatMessage.create({ data: { mentorAssignmentId, senderRole: "FACULTY", facultyId, content: content.trim(), isRead: false } });
    return { id: msg.id, senderRole: msg.senderRole, content: msg.content, sentAt: msg.sentAt };
  },

  async facultyMarkChatRead(facultyId: string, universityId: string, mentorAssignmentId: string) {
    const scope = await getFacultyScopeData(facultyId, universityId);
    if (!scope.mentorAssignments.find((a) => a.id === mentorAssignmentId)) throw new ApiError(403, "NOT_MENTOR_OF_STUDENT", "Mentor assignment does not belong to this faculty.");
    const { count } = await prisma.chatMessage.updateMany({ where: { mentorAssignmentId, senderRole: "STUDENT", isRead: false }, data: { isRead: true } });
    return { markedRead: count };
  },

  // ── Faculty — Results ─────────────────────────────────────

  async facultyResultsSummary(facultyId: string, universityId: string, semesterId?: string) {
    const scope = await getFacultyScopeData(facultyId, universityId, semesterId);
    const phases = await prisma.phase.findMany({ where: { semesterId: scope.semester.id }, orderBy: { number: "asc" } });
    const bySubject = await Promise.all(scope.assignedSubjectIds.map(async (subjectId) => {
      const subject = await subjectById(subjectId);
      return {
        subjectCode: subject.code,
        phases: await Promise.all(phases.map(async (phase) => {
          const rows = await prisma.result.findMany({ where: { subjectId, phaseId: phase.id } });
          return { phase: phase.label, isPublished: rows.length > 0 && rows.every((r) => r.isPublished), avgMarksPct: rows.length === 0 ? null : average(rows.map((r) => (r.marksObtained / r.maxMarks) * 100)) };
        })),
      };
    }));
    return { semesterLabel: scope.semester.label, bySubject };
  },

  async facultyResults(facultyId: string, universityId: string, query: Record<string, string | number | undefined>) {
    const scope = await getFacultyScopeData(facultyId, universityId, query.semesterId as string | undefined);
    const subjectId = query.subjectId as string | undefined;
    const batchId = query.batchId as string | undefined;
    const phaseId = query.phaseId as string | undefined;
    if (subjectId) await ensureFacultyAssignedSubject(facultyId, universityId, subjectId, scope.semester.id);
    if (batchId) await ensureFacultyAssignedBatch(facultyId, universityId, batchId, scope.semester.id);
    const results = await prisma.result.findMany({
      where: { subjectId: subjectId ? subjectId : { in: scope.assignedSubjectIds }, ...(phaseId ? { phaseId } : {}), enrollment: { batchId: batchId ? batchId : { in: scope.assignedBatchIds }, isCurrent: true } },
      include: { enrollment: { include: { student: true, batch: true } }, phase: true, subject: true },
    });
    const rows = results.map((r) => ({ enrollmentNo: r.enrollment.student.enrollmentNo, studentName: r.enrollment.student.name, batchCode: r.enrollment.batch.code, subjectCode: r.subject.code, phase: r.phase.label, marksObtained: r.marksObtained, maxMarks: r.maxMarks, grade: r.grade, isPublished: r.isPublished }));
    const stats = { avgMarksPct: average(rows.map((r) => (r.marksObtained / r.maxMarks) * 100)), passCount: rows.filter((r) => r.marksObtained >= 40).length, failCount: rows.filter((r) => r.marksObtained < 40).length };
    return { ...paginate(rows, Number(query.page ?? 1), Number(query.limit ?? 50)), stats };
  },

  async facultyResultsLeaderboard(facultyId: string, universityId: string, subjectId: string, phaseId: string, batchId?: string, limit = 10) {
    await ensureFacultyAssignedSubject(facultyId, universityId, subjectId);
    if (batchId) await ensureFacultyAssignedBatch(facultyId, universityId, batchId);
    const results = await prisma.result.findMany({
      where: { subjectId, phaseId, ...(batchId ? { enrollment: { batchId } } : {}) },
      include: { enrollment: { include: { student: true } } },
      orderBy: { marksObtained: "desc" },
      take: limit,
    });
    const data = results.map((r, i) => ({ rank: i + 1, enrollmentNo: r.enrollment.student.enrollmentNo, name: r.enrollment.student.name, marksObtained: r.marksObtained, grade: r.grade }));
    const phase = await phaseById(phaseId);
    const subject = await subjectById(subjectId);
    const batch = batchId ? await batchById(batchId) : null;
    return { phase: phase.label, subjectCode: subject.code, batchCode: batch?.code ?? null, data };
  },

  // ── Faculty — Calendar / Analytics ───────────────────────

  async facultyCalendarEvents(universityId: string, year: number, month: number) {
    return this.calendarEvents(universityId, { year, month });
  },

  async facultyUpcomingEvents(universityId: string, limit = 6) {
    return this.upcomingEvents(universityId, limit);
  },

  async facultyAnalyticsAttendance(facultyId: string, universityId: string, semesterId?: string, subjectId?: string, batchId?: string) {
    const summary = (await this.facultyAttendanceSummary(facultyId, universityId, semesterId)).bySubjectAndBatch
      .filter((r) => !subjectId || r.subjectCode === (subjectId ? (prisma.subject.findUnique({ where: { id: subjectId } }).then((s) => s?.code)) : null))
      .filter((r) => !batchId || r.batchCode === (batchId ? (prisma.batch.findUnique({ where: { id: batchId } }).then((b) => b?.code)) : null));
    const labels = ["Week 1", "Week 2", "Week 3", "Week 4"];
    return {
      overview: { avgAttendancePct: average(summary.map((s) => s.avgAttendancePct)), belowThresholdCount: summary.reduce((s, r) => s + r.belowThresholdCount, 0), totalLecturesDelivered: summary.reduce((s, r) => s + r.totalLecturesMarked, 0) },
      bySubjectBatch: summary,
      trend: { labels, data: Array.from({ length: labels.length }, () => average(summary.map((s) => s.avgAttendancePct))) },
    };
  },

  async facultyAnalyticsMarks(facultyId: string, universityId: string, semesterId?: string, subjectId?: string, phaseId?: string) {
    const results = (await this.facultyResults(facultyId, universityId, { semesterId, subjectId, phaseId, page: 1, limit: 1000 })).data;
    const subject = subjectId ? await subjectById(subjectId) : null;
    const phase = phaseId ? await phaseById(phaseId) : null;
    return {
      subjectCode: subject?.code ?? null,
      phase: phase?.label ?? null,
      stats: { avgMarksPct: average(results.map((r) => (r.marksObtained / r.maxMarks) * 100)), passRate: results.length === 0 ? 0 : Number(((results.filter((r) => r.marksObtained >= 40).length / results.length) * 100).toFixed(1)), highestMarks: results.length === 0 ? 0 : Math.max(...results.map((r) => r.marksObtained)), lowestMarks: results.length === 0 ? 0 : Math.min(...results.map((r) => r.marksObtained)) },
      gradeDistribution: ["A+", "A", "B", "C", "D", "F"].map((g) => ({ grade: g, count: results.filter((r) => r.grade === g).length })),
      phaseComparison: phase ? [{ phase: phase.label, avgPct: average(results.map((r) => (r.marksObtained / r.maxMarks) * 100)) }] : [],
    };
  },

  async facultyAnalyticsMentees(facultyId: string, universityId: string, semesterId?: string) {
    const scope = await getFacultyScopeData(facultyId, universityId, semesterId);
    const data = (await Promise.all(scope.mentorAssignments.map(async (a) => {
      const student = await prisma.student.findUnique({ where: { id: a.studentId } });
      const enrollment = await currentEnrollmentForStudent(a.studentId, scope.semester.id);
      if (!enrollment) return null;
      const attendancePct = await computeOverallAttendancePct(enrollment.id);
      const results = await prisma.result.findMany({ where: { enrollmentId: enrollment.id, isPublished: true }, select: { marksObtained: true, maxMarks: true } });
      const avgMarksPct = results.length === 0 ? 0 : average(results.map((r) => (r.marksObtained / r.maxMarks) * 100));
      const batch = await batchById(enrollment.batchId);
      const riskFactor = attendancePct < 75 && avgMarksPct < 40 ? "BOTH" : attendancePct < 75 ? "ATTENDANCE" : avgMarksPct < 40 ? "MARKS" : "NONE";
      const subjectBreakdown = await Promise.all(scope.assignedSubjectIds.map(async (subjectId) => {
        const subject = await subjectById(subjectId);
        const subjectPct = await computeAttendancePct(enrollment.id, subjectId);
        const lastResult = await prisma.result.findFirst({ where: { enrollmentId: enrollment.id, subjectId }, orderBy: { createdAt: "desc" } });
        return { subjectCode: subject.code, attendancePct: subjectPct, t2Marks: lastResult?.marksObtained ?? null };
      }));
      return { enrollmentNo: student?.enrollmentNo ?? "", name: student?.name ?? "", batchCode: batch.code, avgAttendancePct: attendancePct, avgMarksPct, riskFactor, subjectBreakdown };
    }))).filter(Boolean) as Array<any>;
    return { semesterLabel: scope.semester.label, totalMentees: data.length, atRiskCount: data.filter((r) => r.riskFactor !== "NONE").length, data };
  },

  // ─────────────────────────────────────────────────────────────
  // ponytail: HOD shims — routes referenced methods that were never
  // written. Minimal, correct implementations using existing helpers.
  // ─────────────────────────────────────────────────────────────

  // ── Students ──
  async getStudent(_scope: Scope, enrollmentNo: string) {
    const s = await studentByEnrollmentNo(enrollmentNo);
    const enrollment = await prisma.studentEnrollment.findFirst({ where: { studentId: s.id, isCurrent: true }, include: { batch: true, semester: true } });
    const attendancePct = enrollment ? await computeOverallAttendancePct(enrollment.id) : 0;
    const results = enrollment ? await prisma.result.findMany({ where: { enrollmentId: enrollment.id, isPublished: true }, select: { marksObtained: true, maxMarks: true } }) : [];
    const avgMarks = results.length === 0 ? 0 : average(results.map((r) => (r.marksObtained / r.maxMarks) * 100));
    const rules = await getAttendanceRules(s.universityId);
    const status = !s.isActive ? "INACTIVE" : (attendancePct < rules.minThresholdPct || avgMarks < 40) ? "AT_RISK" : "ACTIVE";
    return {
      enrollmentNo: s.enrollmentNo, name: s.name, email: s.email, phone: s.phone ?? undefined,
      branch: s.branch, admissionYear: s.admissionYear, status,
      currentEnrollment: enrollment ? {
        batchCode: enrollment.batch.code, semesterLabel: enrollment.semester.label,
        yearLevel: enrollment.yearLevel, rollNo: enrollment.rollNo, attendancePct,
      } : null,
    };
  },

  async getStudentHistory(_scope: Scope, enrollmentNo: string) {
    const s = await studentByEnrollmentNo(enrollmentNo);
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { studentId: s.id }, include: { batch: true, semester: { include: { academicYear: true } } },
      orderBy: { semester: { number: "asc" } },
    });
    return {
      enrollmentNo: s.enrollmentNo,
      journey: enrollments.map((e) => ({
        semesterNumber: e.semester.number, yearLevel: e.yearLevel,
        batchCode: e.batch.code, rollNo: e.rollNo, academicYear: e.semester.academicYear.label,
      })),
    };
  },

  async createStudent(body: { enrollmentNo: string; name: string; email: string; branch: string; phone?: string; admissionYear: number; universityId?: string }) {
    const existing = await prisma.student.findFirst({ where: { OR: [{ email: body.email }, { enrollmentNo: body.enrollmentNo }] }, select: { id: true } });
    if (existing) throw new ApiError(409, "ENROLLMENT_NO_ALREADY_EXISTS", "Student email or enrollment number already exists.");
    const universityId = body.universityId ?? (await prisma.university.findFirst({ select: { id: true } }))!.id;
    const temporaryPassword = `${body.enrollmentNo}@123`;
    const s = await prisma.student.create({
      data: {
        universityId, enrollmentNo: body.enrollmentNo, name: body.name, email: body.email,
        phone: body.phone ?? null, branch: body.branch, admissionYear: body.admissionYear,
        isActive: true, passwordHash: temporaryPassword,
      },
    });
    return { id: s.id, enrollmentNo: s.enrollmentNo, name: s.name, temporaryPassword };
  },

  async updateStudent(_scope: Scope, enrollmentNo: string, body: { name?: string; email?: string; phone?: string; branch?: string }) {
    const s = await studentByEnrollmentNo(enrollmentNo);
    const updated = await prisma.student.update({
      where: { id: s.id },
      data: { name: body.name, email: body.email, phone: body.phone ?? undefined, branch: body.branch },
    });
    return { enrollmentNo: updated.enrollmentNo, name: updated.name, email: updated.email, phone: updated.phone, branch: updated.branch };
  },

  async updateStudentStatus(enrollmentNo: string, isActive: boolean) {
    const s = await studentByEnrollmentNo(enrollmentNo);
    await prisma.student.update({ where: { id: s.id }, data: { isActive } });
    return { enrollmentNo, isActive };
  },

  async deleteStudent(enrollmentNo: string) {
    const s = await studentByEnrollmentNo(enrollmentNo);
    const active = await prisma.studentEnrollment.count({ where: { studentId: s.id, isCurrent: true } });
    if (active > 0) throw new ApiError(409, "STUDENT_HAS_ACTIVE_ENROLLMENT", "Deactivate the student before deleting.");
    await prisma.student.update({ where: { id: s.id }, data: { deletedAt: new Date() } });
  },

  async studentCsvUpload(scope: Scope, buffer: Buffer | undefined, opts: { semesterId?: string; batchId?: string }) {
    if (!opts.batchId) throw new ApiError(400, "VALIDATION_ERROR", "batchId is required.");
    const semesterId = opts.semesterId || (await getActiveSemester(scope.universityId)).id;
    return this.uploadStudentCsv(buffer, scope.universityId, semesterId, opts.batchId);
  },

  async studentCsvTemplate() {
    return "enrollment_no,name,email,branch,admission_year,roll_no\n";
  },

  async studentExport(scope: Scope) {
    const rows = await prisma.studentEnrollment.findMany({
      where: { isCurrent: true, batchId: { in: scope.hodBatchIds } },
      include: { student: true, batch: true },
    });
    const header = "enrollment_no,name,email,branch,batch,roll_no\n";
    const body = rows.map((r) => `${r.student.enrollmentNo},${r.student.name},${r.student.email},${r.student.branch},${r.batch.code},${r.rollNo}`).join("\n");
    return header + body;
  },

  // ── Faculty ──
  async getFaculty(_scope: Scope, employeeId: string) {
    const f = await facultyByEmployeeId(employeeId);
    const assignments = await prisma.facultyBatchAssignment.findMany({
      where: { facultyId: f.id }, include: { subject: true, batch: true },
    });
    const bySubject = new Map<string, { code: string; name: string; batches: string[] }>();
    for (const a of assignments) {
      const key = a.subjectId;
      if (!bySubject.has(key)) bySubject.set(key, { code: a.subject.code, name: a.subject.name, batches: [] });
      bySubject.get(key)!.batches.push(a.batch.code);
    }
    const menteeCount = f.isHod ? 0 : await prisma.mentorAssignment.count({ where: { facultyId: f.id } });
    return {
      employeeId: f.employeeId, name: f.name, email: f.email, phone: f.phone ?? undefined,
      department: f.department, isHod: f.isHod, mentorCode: f.mentorCode,
      menteeCount, subjects: Array.from(bySubject.values()),
      status: f.isActive ? "ACTIVE" : "INACTIVE",
    };
  },

  async createFaculty(body: { employeeId: string; name: string; email: string; department: string; isHod?: boolean; phone?: string; universityId?: string }) {
    const existing = await prisma.faculty.findFirst({ where: { OR: [{ email: body.email }, { employeeId: body.employeeId }] }, select: { id: true } });
    if (existing) throw new ApiError(409, "CONFLICT", "Faculty email or employeeId already exists.");
    const universityId = body.universityId ?? (await prisma.university.findFirst({ select: { id: true } }))!.id;
    const temporaryPassword = `${body.employeeId}@123`;
    const f = await prisma.faculty.create({
      data: {
        universityId, employeeId: body.employeeId, name: body.name, email: body.email,
        department: body.department, isHod: !!body.isHod, isActive: true,
        phone: body.phone ?? null, passwordHash: temporaryPassword,
      },
    });
    return { id: f.id, employeeId: f.employeeId, name: f.name, temporaryPassword };
  },

  async updateFaculty(employeeId: string, body: { name?: string; email?: string; phone?: string; department?: string }) {
    const f = await facultyByEmployeeId(employeeId);
    const updated = await prisma.faculty.update({
      where: { id: f.id },
      data: { name: body.name, email: body.email, phone: body.phone ?? undefined, department: body.department },
    });
    return { employeeId: updated.employeeId, name: updated.name, email: updated.email };
  },

  async updateMentorCode(employeeId: string, mentorCode: string) {
    const f = await facultyByEmployeeId(employeeId);
    if (f.isHod) throw new ApiError(400, "CANNOT_SET_MENTOR_CODE_FOR_HOD", "HOD cannot have a mentor code.");
    const conflict = await prisma.faculty.findFirst({ where: { mentorCode, universityId: f.universityId, id: { not: f.id } } });
    if (conflict) throw new ApiError(409, "MENTOR_CODE_ALREADY_IN_USE", "Mentor code already in use.");
    await prisma.faculty.update({ where: { id: f.id }, data: { mentorCode } });
    return { employeeId, mentorCode };
  },

  async updateFacultyStatus(employeeId: string, isActive: boolean) {
    const f = await facultyByEmployeeId(employeeId);
    if (f.isHod && !isActive) throw new ApiError(403, "CANNOT_DEACTIVATE_HOD", "Cannot deactivate an HOD.");
    await prisma.faculty.update({ where: { id: f.id }, data: { isActive } });
    return { employeeId, status: isActive ? "ACTIVE" : "INACTIVE" };
  },

  async deleteFaculty(employeeId: string) {
    const f = await facultyByEmployeeId(employeeId);
    if (f.isHod) throw new ApiError(403, "CANNOT_DELETE_HOD", "Cannot delete an HOD.");
    const active = await prisma.facultyBatchAssignment.count({ where: { facultyId: f.id } });
    if (active > 0) throw new ApiError(409, "FACULTY_HAS_ACTIVE_ASSIGNMENTS", "Remove assignments first.");
    await prisma.faculty.update({ where: { id: f.id }, data: { deletedAt: new Date(), isActive: false } });
  },

  async facultyCsvUpload(buffer: Buffer | undefined, universityId: string) {
    return this.uploadFacultyCsv(buffer, universityId);
  },

  async createFacultyAssignment(body: { facultyId: string; subjectId: string; batchId: string; semesterId: string }) {
    const created = await this.assignFacultyBatch(body.facultyId, body.subjectId, body.batchId, body.semesterId);
    const faculty = await facultyById(body.facultyId);
    const subject = await prisma.subject.findUnique({ where: { id: body.subjectId } });
    const batch = await prisma.batch.findUnique({ where: { id: body.batchId } });
    return { id: created.id ?? "", faculty: { id: faculty.id, name: faculty.name }, subject: { code: subject?.code ?? "" }, batch: { code: batch?.code ?? "" } };
  },

  async deleteFacultyAssignment(assignmentId: string) {
    await prisma.facultyBatchAssignment.delete({ where: { id: assignmentId } });
  },

  async facultyExport(scope: Scope) {
    const faculty = await prisma.faculty.findMany({ where: { universityId: scope.universityId, deletedAt: null } });
    const header = "employee_id,name,email,department,is_hod,mentor_code,status\n";
    const body = faculty.map((f) => `${f.employeeId},${f.name},${f.email},${f.department},${f.isHod},${f.mentorCode ?? ""},${f.isActive ? "ACTIVE" : "INACTIVE"}`).join("\n");
    return header + body;
  },

  // ── Results ──
  async resultsUploadContext(scope: Scope, semesterId?: string) {
    const semester = semesterId
      ? await prisma.semester.findUnique({ where: { id: semesterId }, include: { academicYear: true } })
      : await prisma.semester.findFirst({ where: { universityId: scope.universityId, status: "ACTIVE" }, include: { academicYear: true } });
    if (!semester) return { academicYears: [], semesters: [], phases: [], subjects: [], batches: [] };
    const [years, semesters, phases, subjects, batches] = await Promise.all([
      prisma.academicYear.findMany({ where: { universityId: scope.universityId }, orderBy: { label: "desc" } }),
      prisma.semester.findMany({ where: { universityId: scope.universityId }, orderBy: { number: "asc" } }),
      prisma.phase.findMany({ where: { semesterId: semester.id }, orderBy: { number: "asc" } }),
      prisma.subject.findMany({ where: { semesterId: semester.id } }),
      prisma.batch.findMany({ where: { id: { in: scope.hodBatchIds } } }),
    ]);
    return {
      academicYears: years.map((y) => ({ id: y.id, label: y.label })),
      semesters: semesters.map((s) => ({ id: s.id, label: s.label, number: s.number })),
      phases: phases.map((p, i, arr) => ({ id: p.id, label: p.label, number: p.number, isActive: !p.isComplete && arr.slice(0, i).every((q) => q.isComplete), isComplete: p.isComplete })),
      subjects: subjects.map((s) => ({ id: s.id, code: s.code, name: s.name })),
      batches: batches.map((b) => ({ id: b.id, code: b.code })),
    };
  },

  async resultsStudents(_scope: Scope, semesterId: string, batchId: string, subjectId: string) {
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { semesterId, batchId, isCurrent: true }, include: { student: true },
    });
    const data = await Promise.all(enrollments.map(async (e) => {
      const existing = await prisma.result.findFirst({ where: { enrollmentId: e.id, subjectId }, select: { marksObtained: true, maxMarks: true, grade: true } });
      return { enrollmentId: e.id, enrollmentNo: e.student.enrollmentNo, name: e.student.name, existingMarks: existing };
    }));
    return { data };
  },

  async resultsUpload(buffer: Buffer | undefined, body: { phaseId?: string; subjectId?: string; batchId?: string }) {
    if (!buffer) throw new ApiError(400, "VALIDATION_ERROR", "CSV file is required.");
    if (!body.phaseId || !body.subjectId || !body.batchId) throw new ApiError(400, "VALIDATION_ERROR", "phaseId, subjectId, and batchId are required.");
    const rows = parseCsvRecords(buffer, ["enrollment_no", "marks_obtained"]);
    const errors: { row: number; enrollmentNo?: string; reason: string }[] = [];
    let inserted = 0, updated = 0, totalMarks = 0, belowPass = 0, studentCount = 0;
    for (const { row, record } of rows) {
      const enrollmentNo = record.enrollment_no;
      const marksObtained = Number(record.marks_obtained);
      const maxMarks = Number(record.max_marks || 100);
      if (!Number.isFinite(marksObtained)) { errors.push({ row, enrollmentNo, reason: "Invalid marks" }); continue; }
      const student = await prisma.student.findFirst({ where: { enrollmentNo, deletedAt: null } });
      if (!student) { errors.push({ row, enrollmentNo, reason: "Student not found" }); continue; }
      const enrollment = await prisma.studentEnrollment.findFirst({ where: { studentId: student.id, batchId: body.batchId, isCurrent: true } });
      if (!enrollment) { errors.push({ row, enrollmentNo, reason: "Enrollment not in batch" }); continue; }
      const pct = (marksObtained / maxMarks) * 100;
      const grade = record.grade || gradeFromPct(pct);
      const existing = await prisma.result.findFirst({ where: { enrollmentId: enrollment.id, phaseId: body.phaseId, subjectId: body.subjectId } });
      if (existing) {
        await prisma.result.update({ where: { id: existing.id }, data: { marksObtained, maxMarks, grade } });
        updated++;
      } else {
        await prisma.result.create({ data: { enrollmentId: enrollment.id, phaseId: body.phaseId, subjectId: body.subjectId, marksObtained, maxMarks, grade, uploadedById: student.universityId } });
        inserted++;
      }
      totalMarks += pct; studentCount++;
      if (pct < 40) belowPass++;
    }
    return { totalRows: rows.length, inserted, updated, errors, summary: { avgMarks: studentCount === 0 ? 0 : totalMarks / studentCount, belowPassCount: belowPass, studentCount } };
  },

  async resultsManual(body: { phaseId: string; subjectId: string; batchId: string; results: { enrollmentId: string; marksObtained: number; maxMarks: number; grade?: string }[] }) {
    let inserted = 0, updated = 0, totalMarks = 0, belowPass = 0;
    for (const r of body.results) {
      const pct = (r.marksObtained / r.maxMarks) * 100;
      const grade = r.grade || gradeFromPct(pct);
      const existing = await prisma.result.findFirst({ where: { enrollmentId: r.enrollmentId, phaseId: body.phaseId, subjectId: body.subjectId } });
      if (existing) {
        await prisma.result.update({ where: { id: existing.id }, data: { marksObtained: r.marksObtained, maxMarks: r.maxMarks, grade } });
        updated++;
      } else {
        const enrollment = await enrollmentById(r.enrollmentId);
        await prisma.result.create({ data: { enrollmentId: r.enrollmentId, phaseId: body.phaseId, subjectId: body.subjectId, marksObtained: r.marksObtained, maxMarks: r.maxMarks, grade, uploadedById: enrollment.studentId } });
        inserted++;
      }
      totalMarks += pct;
      if (pct < 40) belowPass++;
    }
    return { inserted, updated, summary: { avgMarks: body.results.length === 0 ? 0 : totalMarks / body.results.length, belowPassCount: belowPass } };
  },

  async resultsPreview(phaseId: string, subjectId: string, batchId: string) {
    const enrollments = await prisma.studentEnrollment.findMany({ where: { batchId, isCurrent: true }, include: { student: true } });
    const results = await Promise.all(enrollments.map(async (e) => {
      const r = await prisma.result.findFirst({ where: { enrollmentId: e.id, phaseId, subjectId } });
      if (!r) return { enrollmentNo: e.student.enrollmentNo, name: e.student.name, marksObtained: null, maxMarks: null, grade: null, status: "Pending", isPublished: false };
      const pct = (r.marksObtained / r.maxMarks) * 100;
      return { enrollmentNo: e.student.enrollmentNo, name: e.student.name, marksObtained: r.marksObtained, maxMarks: r.maxMarks, grade: r.grade, status: pct < 40 ? "Fail" : "Pass", isPublished: r.isPublished };
    }));
    const filled = results.filter((r) => r.marksObtained != null);
    const avgMarks = filled.length === 0 ? 0 : average(filled.map((r) => ((r.marksObtained ?? 0) / (r.maxMarks ?? 100)) * 100));
    const belowPassCount = results.filter((r) => r.status === "Fail").length;
    return { studentCount: results.length, avgMarks, belowPassCount, isPublished: results.some((r) => r.isPublished), results };
  },

  async resultsPublish(phaseId: string, subjectId: string, batchId: string) {
    const enrollments = await prisma.studentEnrollment.findMany({ where: { batchId, isCurrent: true }, select: { id: true } });
    const ids = enrollments.map((e) => e.id);
    const existing = await prisma.result.findMany({ where: { enrollmentId: { in: ids }, phaseId, subjectId } });
    if (existing.length < enrollments.length) throw new ApiError(400, "INCOMPLETE_RESULTS", "Not all students have marks entered.");
    if (existing.every((r) => r.isPublished)) throw new ApiError(409, "RESULTS_ALREADY_PUBLISHED", "Already published.");
    const publishedAt = new Date();
    await prisma.result.updateMany({ where: { id: { in: existing.map((r) => r.id) } }, data: { isPublished: true, publishedAt } });
    return { published: true, publishedAt, studentCount: existing.length };
  },

  async resultsUploadHistory(scope: Scope, page = 1, limit = 10) {
    const results = await prisma.result.findMany({
      where: { enrollment: { batchId: { in: scope.hodBatchIds } } },
      include: { phase: true, subject: true, enrollment: { include: { batch: true } } },
      orderBy: { createdAt: "desc" },
    });
    // Group by (phase, subject, batch, createdAt-day) as one "upload"
    const grouped = new Map<string, { phase: string; subjectCode: string; batchCode: string; uploadedAt: Date; studentCount: number }>();
    for (const r of results) {
      const key = `${r.phaseId}-${r.subjectId}-${r.enrollment.batchId}-${r.createdAt.toISOString().slice(0, 10)}`;
      const cur = grouped.get(key);
      if (cur) cur.studentCount++;
      else grouped.set(key, { phase: r.phase.label, subjectCode: r.subject.code, batchCode: r.enrollment.batch.code, uploadedAt: r.createdAt, studentCount: 1 });
    }
    const rows = Array.from(grouped.values()).sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
    return paginate(rows, page, limit);
  },

  async resultsPhaseStatus(scope: Scope, semesterId?: string) {
    const semester = semesterId
      ? await prisma.semester.findUnique({ where: { id: semesterId } })
      : await prisma.semester.findFirst({ where: { universityId: scope.universityId, status: "ACTIVE" } });
    if (!semester) return { phases: [] };
    const phases = await prisma.phase.findMany({ where: { semesterId: semester.id }, orderBy: { number: "asc" } });
    const subjectsTotal = await prisma.subject.count({ where: { semesterId: semester.id } });
    const rows = await Promise.all(phases.map(async (p) => {
      const uploadedSubjects = await prisma.result.groupBy({
        by: ["subjectId"],
        where: { phaseId: p.id, enrollment: { batchId: { in: scope.hodBatchIds }, isCurrent: true } },
      });
      const subjectsUploaded = uploadedSubjects.length;
      const status = subjectsUploaded === 0 ? "Pending" : subjectsUploaded < subjectsTotal ? "In Progress" : "Complete";
      return { phase: p.label, subjectsTotal, subjectsUploaded, status };
    }));
    return { phases: rows };
  },

  async updateResult(resultId: string, marksObtained: number, grade: string) {
    const updated = await prisma.result.update({ where: { id: resultId }, data: { marksObtained, grade } });
    return { id: updated.id, marksObtained: updated.marksObtained, grade: updated.grade, updatedAt: updated.updatedAt };
  },

  async deleteResult(resultId: string) {
    await prisma.result.delete({ where: { id: resultId } });
  },

  // ponytail: study planner is client-persisted for now (localStorage-side).
  // Return empty-safe shapes so the routes don't 500 until we back it with a DB table.
  async studentStudyPlanner(_studentId: string, _universityId: string) {
    return { plan: [], updatedAt: null };
  },
  async saveStudentStudyPlanner(_studentId: string, _universityId: string, plan: unknown[]) {
    return { plan, updatedAt: new Date().toISOString(), savedCount: Array.isArray(plan) ? plan.length : 0 };
  },
  async updateStudentStudyPlannerSession(_studentId: string, _universityId: string, date: string, sessionIndex: number, isCompleted: boolean) {
    return { date, sessionIndex, isCompleted };
  },
  async studentStudyPlannerAiSuggest(_studentId: string, _universityId: string, _body: Record<string, unknown>) {
    return { jobId: `stub-${Date.now()}`, status: "queued" };
  },
  async studentStudyPlannerAiStatus(jobId: string) {
    return { jobId, status: "complete", suggestions: [] };
  },

  // ─── HOD: Timetable CRUD ───────────────────────────────────
  async listTimetable(scope: Scope, batchId?: string, semesterId?: string) {
    const semId = semesterId || (await getActiveSemester(scope.universityId)).id;
    const slots = await prisma.timetableSlot.findMany({
      where: { semesterId: semId, ...(batchId ? { batchId } : { batchId: { in: scope.hodBatchIds } }) },
      include: { subject: { select: { id: true, code: true, name: true } }, batch: { select: { id: true, code: true } } },
      orderBy: [{ dayOfWeek: "asc" }, { slotStart: "asc" }],
    });
    const facultyIds = [...new Set(slots.map((s) => s.facultyId).filter(Boolean) as string[])];
    const faculties = facultyIds.length
      ? await prisma.faculty.findMany({ where: { id: { in: facultyIds } }, select: { id: true, name: true, employeeId: true } })
      : [];
    const facById = new Map(faculties.map((f) => [f.id, f]));
    return {
      semesterId: semId,
      slots: slots.map((s) => ({
        id: s.id, dayOfWeek: s.dayOfWeek, slotStart: s.slotStart, slotEnd: s.slotEnd, room: s.room,
        batchId: s.batchId, batchCode: s.batch.code,
        subjectId: s.subjectId, subjectCode: s.subject.code, subjectName: s.subject.name,
        facultyId: s.facultyId, facultyName: s.facultyId ? facById.get(s.facultyId)?.name ?? null : null,
      })),
    };
  },

  async createTimetableSlot(scope: Scope, body: { batchId: string; subjectId: string; facultyId?: string | null; dayOfWeek: number; slotStart: string; slotEnd: string; room?: string; semesterId?: string }) {
    const semId = body.semesterId || (await getActiveSemester(scope.universityId)).id;
    if (!scope.hodBatchIds.includes(body.batchId)) throw new ApiError(403, "BATCH_NOT_IN_SCOPE", "Batch not in your scope.");
    const slot = await prisma.timetableSlot.create({
      data: {
        semesterId: semId, batchId: body.batchId, subjectId: body.subjectId,
        facultyId: body.facultyId ?? null,
        dayOfWeek: body.dayOfWeek, slotStart: body.slotStart, slotEnd: body.slotEnd,
        room: body.room ?? null,
      },
    });
    return { id: slot.id };
  },

  async updateTimetableSlot(id: string, body: Partial<{ subjectId: string; facultyId: string | null; dayOfWeek: number; slotStart: string; slotEnd: string; room: string | null }>) {
    await prisma.timetableSlot.update({
      where: { id },
      data: {
        subjectId: body.subjectId, facultyId: body.facultyId,
        dayOfWeek: body.dayOfWeek, slotStart: body.slotStart, slotEnd: body.slotEnd,
        room: body.room,
      },
    });
    return { id };
  },

  async deleteTimetableSlot(id: string) {
    await prisma.timetableSlot.delete({ where: { id } });
  },

  // ─── Faculty: batches under HOD (all in dept) ──────────────
  async facultyHodBatches(universityId: string, facultyId: string) {
    const me = await facultyById(facultyId);
    const activeSem = await getActiveSemester(universityId);
    const batches = await prisma.batch.findMany({
      where: { universityId, academicYearId: activeSem.academicYearId || undefined },
      orderBy: { code: "asc" },
    });
    // Filter to dept-aligned batches: for now return all — dept mapping isn't on Batch.
    // ponytail: department scoping when Batch.department exists.
    void me;
    return {
      activeSemester: { id: activeSem.id, label: activeSem.label },
      data: batches.map((b) => ({ id: b.id, code: b.code, yearLevel: b.yearLevel })),
    };
  },

  // ─── Faculty: daily attendance matrix ──────────────────────
  async facultyAttendanceDay(universityId: string, facultyId: string, batchId: string, dateStr: string) {
    if (!batchId || !dateStr) throw new ApiError(400, "VALIDATION_ERROR", "batchId and date are required.");
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) throw new ApiError(400, "VALIDATION_ERROR", "Invalid date.");
    // ponytail: use DB `Date` (day-only) — align to UTC midnight
    const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayOfWeek = day.getUTCDay(); // 0=Sun..6=Sat
    const activeSem = await getActiveSemester(universityId);

    const slots = await prisma.timetableSlot.findMany({
      where: { batchId, semesterId: activeSem.id, dayOfWeek },
      include: { subject: { select: { id: true, code: true, name: true } } },
      orderBy: { slotStart: "asc" },
    });

    const enrollments = await prisma.studentEnrollment.findMany({
      where: { batchId, semesterId: activeSem.id, isCurrent: true },
      include: { student: { select: { id: true, name: true, enrollmentNo: true } } },
      orderBy: { rollNo: "asc" },
    });

    // Existing marks for THIS batch on THIS date, keyed by slot so paired lectures stay separate.
    const enrollmentIds = enrollments.map((e) => e.id);
    const slotIds = slots.map((s) => s.id);
    const existing = slotIds.length && enrollmentIds.length
      ? await prisma.attendanceRecord.findMany({
        where: { enrollmentId: { in: enrollmentIds }, lectureDate: day, slotId: { in: slotIds } },
      })
      : [];
    // key: `${enrollmentId}:${slotId}` — frontend reads by slot
    const markMap: Record<string, boolean> = {};
    for (const r of existing) if (r.slotId) markMap[`${r.enrollmentId}:${r.slotId}`] = r.isPresent;

    // 7-day edit window (past only). Future dates blocked here too.
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const daysDelta = Math.round((today.getTime() - day.getTime()) / 86400000);
    const isEditable = daysDelta >= 0 && daysDelta <= 7;

    // Subject-swap suggestions: any subject in the same semester, in case of proxy
    const allSubjects = await prisma.subject.findMany({
      where: { semesterId: activeSem.id, deletedAt: null },
      select: { id: true, code: true, name: true },
    });

    void facultyId;
    return {
      date: day.toISOString().slice(0, 10),
      dayOfWeek,
      isEditable,
      daysDelta,
      lectures: slots.map((s) => ({
        slotId: s.id,
        subjectId: s.subjectId,
        subjectCode: s.subject.code,
        subjectName: s.subject.name,
        slotStart: s.slotStart,
        slotEnd: s.slotEnd,
        room: s.room,
      })),
      students: enrollments.map((e) => ({
        enrollmentId: e.id,
        rollNo: e.rollNo,
        name: e.student.name,
        enrollmentNo: e.student.enrollmentNo,
      })),
      marks: markMap,
      subjects: allSubjects,
    };
  },

  async facultyAttendanceDaySave(universityId: string, facultyId: string, body: {
    batchId: string;
    date: string;
    lectures: { slotId?: string; subjectId: string; marks: Record<string, boolean> }[];
  }) {
    if (!body.batchId || !body.date || !Array.isArray(body.lectures)) throw new ApiError(400, "VALIDATION_ERROR", "batchId, date, lectures required.");
    const d = new Date(body.date);
    const day = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const daysDelta = Math.round((today.getTime() - day.getTime()) / 86400000);
    if (daysDelta < 0) throw new ApiError(400, "FUTURE_DATE", "Cannot mark future attendance.");
    if (daysDelta > 7) throw new ApiError(403, "EDIT_WINDOW_EXPIRED", "Attendance older than 7 days cannot be edited.");

    const activeSem = await getActiveSemester(universityId);
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { batchId: body.batchId, semesterId: activeSem.id, isCurrent: true },
      select: { id: true },
    });
    const enrIds = new Set(enrollments.map((e) => e.id));

    let inserted = 0, updated = 0;
    for (const lec of body.lectures) {
      if (!lec.slotId) continue; // ponytail: require slotId so paired lectures don't collide
      for (const [enrollmentId, isPresent] of Object.entries(lec.marks)) {
        if (!enrIds.has(enrollmentId)) continue;
        const existing = await prisma.attendanceRecord.findFirst({
          where: { enrollmentId, lectureDate: day, slotId: lec.slotId },
        });
        if (existing) {
          if (existing.isLocked) continue;
          await prisma.attendanceRecord.update({
            where: { id: existing.id },
            data: { isPresent, facultyId, subjectId: lec.subjectId },
          });
          updated++;
        } else {
          await prisma.attendanceRecord.create({
            data: { enrollmentId, subjectId: lec.subjectId, slotId: lec.slotId, facultyId, lectureDate: day, isPresent },
          });
          inserted++;
        }
      }
    }
    return { inserted, updated };
  },
};
