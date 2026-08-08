// ─────────────────────────────────────────────────────────────
// Examination Management Module (Year-HOD level)
//
// One Exam is a shared examination SESSION owned by an academic year + year
// level. Every HOD of that year works on the same Exam. Student blocks are
// generated per owning HOD but visible/editable by all same-year HODs and by
// exam coordinators. Supervision uses own-year faculty first, then other years
// (free only, ±buffer timetable check), then external invigilators.
// ─────────────────────────────────────────────────────────────
import prisma from "../config/prisma.js";
import { ApiError } from "../utils/http.js";
import { splitBlockSizes } from "../utils/examBlocks.js";
import type { YearLevel } from "../types/domain.js";

// Marks are always stored out of 25 (T1–T3 entered /25, T4 entered /50 → ÷2).
const gradeFromPct = (pct: number) => (pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 60 ? "C" : pct >= 50 ? "D" : "F");

const YEAR_ORDER: YearLevel[] = ["FY", "SY", "TY", "FINAL"];

// ── time helpers ──
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && bStart < aEnd;
const minToStr = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const addMinutes = (hhmm: string, n: number) => minToStr(toMin(hhmm) + n);
// Coding subjects split their total: offline written + online coding.
const componentSplit = (total: number) => (total >= 50 ? { offline: 35, online: 15 } : { offline: 16, online: 9 });
const dayOnly = (raw: string | Date) => {
  const d = raw instanceof Date ? raw : new Date(`${String(raw).slice(0, 10)}T00:00:00.000Z`);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};
const dateStr = (d: Date) => d.toISOString().slice(0, 10);

// A schedule is "over" once its exam DATE has passed. Date-granular on purpose:
// keeps the whole exam day editable for morning emergencies and is timezone-safe
// (exam times are local wall-clock). After the day, only paper checking can change.
// ponytail: date-granular lock. Add an IST offset constant here for minute-precision.
const scheduleOver = (sched: { date: Date }) => dateStr(sched.date) < dateStr(new Date());
const examOver = (schedules: { date: Date }[]) => schedules.length > 0 && schedules.every(scheduleOver);

// Fisher–Yates in-place shuffle — paper-checking allocation is randomised every run.
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── access + workspace resolution ──
type YearContext = { yearLevel: YearLevel; academicYearId: string; semesterId: string; isHod: boolean };

async function yearContext(facultyId: string, universityId: string): Promise<YearContext> {
  const fac = await prisma.faculty.findFirst({ where: { id: facultyId, universityId, deletedAt: null }, select: { year: true, isHod: true } });
  if (!fac?.year) throw new ApiError(403, "NO_YEAR", "Only a year HOD or exam coordinator can manage exams.");
  const sem = await prisma.semester.findFirst({ where: { universityId, status: "ACTIVE", yearLevel: fac.year as YearLevel } });
  if (!sem) throw new ApiError(400, "NO_ACTIVE_SEMESTER", `No active semester for ${fac.year}.`);
  return { yearLevel: fac.year as YearLevel, academicYearId: sem.academicYearId, semesterId: sem.id, isHod: fac.isHod };
}

// Coordinators are recognised via ExamCoordinator on the year's active semester.
async function isExamCoordinator(facultyId: string, semesterId: string) {
  return Boolean(await prisma.examCoordinator.findFirst({ where: { semesterId, facultyId } }));
}

// Everyone allowed to MANAGE (HOD of the year, or an exam coordinator of the year's semester).
async function assertManager(facultyId: string, universityId: string): Promise<YearContext> {
  const ctx = await yearContext(facultyId, universityId);
  if (ctx.isHod) return ctx;
  if (await isExamCoordinator(facultyId, ctx.semesterId)) return ctx;
  throw new ApiError(403, "NOT_EXAM_MANAGER", "Only a year HOD or exam coordinator can manage exams.");
}

async function getExamOrThrow(examId: string, ctx: YearContext) {
  const exam = await prisma.exam.findFirst({ where: { id: examId, deletedAt: null } });
  if (!exam) throw new ApiError(404, "EXAM_NOT_FOUND", "Exam not found.");
  // Cross-year access is denied: an exam belongs to one year workspace.
  if (exam.academicYearId !== ctx.academicYearId || exam.yearLevel !== ctx.yearLevel) {
    throw new ApiError(403, "CROSS_YEAR", "You cannot access another academic year's examination data.");
  }
  return exam;
}

async function audit(examId: string, actorId: string, action: string, detail?: string) {
  await prisma.examAuditLog.create({ data: { examId, actorId, action, detail: detail ?? null } });
}

// ── set of exam coordinator faculty ids for the semester (never get duty) ──
async function coordinatorIds(semesterId: string) {
  const rows = await prisma.examCoordinator.findMany({ where: { semesterId }, select: { facultyId: true } });
  return new Set(rows.map((r) => r.facultyId));
}

// ── availability engine ──
// Returns a busy reason (string) if the faculty has a lecture/lab or an exam
// supervision duty overlapping the exam window ±buffer; null if free.
async function busyReason(
  facultyId: string, universityId: string, date: Date, startMin: number, endMin: number,
  buffer: number, excludeAllocId?: string,
): Promise<string | null> {
  const winStart = startMin - buffer, winEnd = endMin + buffer;
  const dow = date.getUTCDay();
  const slots = await prisma.timetableSlot.findMany({
    where: { facultyId, dayOfWeek: dow, semester: { universityId, status: "ACTIVE" } },
    include: { subject: { select: { code: true } }, batch: { select: { code: true } } },
  });
  for (const s of slots) {
    if (overlaps(winStart, winEnd, toMin(s.slotStart), toMin(s.slotEnd))) {
      return `Lecture ${s.subject.code} (${s.batch.code}) ${s.slotStart}-${s.slotEnd}`;
    }
  }
  // Existing supervision duty on the same date overlapping the window.
  const duties = await prisma.supervisorAllocation.findMany({
    where: { facultyId, schedule: { date } },
    include: { schedule: { select: { startTime: true, endTime: true } } },
  });
  for (const d of duties) {
    if (excludeAllocId && d.id === excludeAllocId) continue;
    if (overlaps(winStart, winEnd, toMin(d.schedule.startTime), toMin(d.schedule.endTime))) {
      return `Exam duty ${d.schedule.startTime}-${d.schedule.endTime}`;
    }
  }
  return null;
}

// ── paper-checking marks helpers ──
// Marks write into the shared Result table, keyed by the exam's phase + the
// schedule's subject, so students/analytics/results all reuse the same store.
async function phaseEntryMax(phaseId: string | null): Promise<{ phaseId: string; number: number; entryMax: number }> {
  if (!phaseId) throw new ApiError(400, "NO_PHASE", "Link this exam to a phase (T1–T4) before entering marks.");
  const p = await prisma.phase.findUnique({ where: { id: phaseId }, select: { id: true, number: true } });
  if (!p) throw new ApiError(404, "PHASE_NOT_FOUND", "Exam phase not found.");
  return { phaseId: p.id, number: p.number, entryMax: p.number === 4 ? 50 : 25 };
}

// Ordered students of a paper-checking allocation (across its blocks), mapped to
// the current-semester StudentEnrollment that Result rows reference.
async function allocationStudents(blockIds: string[], semesterId: string) {
  if (!blockIds.length) return [] as { enrollmentId: string; enrollmentNo: string; rollNo: string; name: string; blockNumber: number; ownerHodId: string }[];
  const bs = await prisma.blockStudent.findMany({
    where: { blockId: { in: blockIds } },
    include: { block: { select: { blockNumber: true, ownerHodId: true } } },
    orderBy: [{ block: { blockNumber: "asc" } }, { seatOrder: "asc" }],
  });
  const enrs = await prisma.studentEnrollment.findMany({
    where: { studentId: { in: bs.map((b) => b.studentId) }, semesterId, isCurrent: true },
    include: { student: { select: { name: true } } },
  });
  const enrByStudent = new Map(enrs.map((e) => [e.studentId, e]));
  return bs.flatMap((b) => {
    const e = enrByStudent.get(b.studentId);
    if (!e) return [];
    return [{ enrollmentId: e.id, enrollmentNo: b.enrollmentNo, rollNo: e.rollNo, name: e.student.name, blockNumber: b.block.blockNumber, ownerHodId: b.block.ownerHodId }];
  });
}

// Human block labels: "SY-C-1" = year level + owning HOD's division letter (their batch
// code's first letter, A/B/C/D…) + block number. Used on every page that shows a block so
// blocks from different HODs sharing one exam never collide as bare "Block 1".
async function blockLabeler(exam: { id: string; yearLevel: string; semesterId: string }) {
  const scopes = await prisma.hodBatchScope.findMany({ where: { semesterId: exam.semesterId }, select: { facultyId: true, batchId: true } });
  const batchIds = [...new Set(scopes.map((s) => s.batchId))];
  const batches = batchIds.length ? await prisma.batch.findMany({ where: { id: { in: batchIds } }, select: { id: true, code: true } }) : [];
  const codeById = new Map(batches.map((b) => [b.id, b.code]));
  const initial = new Map<string, string>();
  for (const s of scopes) {
    if (initial.has(s.facultyId)) continue;
    const ch = codeById.get(s.batchId)?.trim()?.[0]?.toUpperCase();
    if (ch && ch >= "A" && ch <= "Z") initial.set(s.facultyId, ch);
  }
  const blocks = await prisma.examBlock.findMany({ where: { examId: exam.id }, select: { id: true, blockNumber: true, ownerHodId: true } });
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const label = (ownerHodId: string, blockNumber: number) => `${exam.yearLevel}-${initial.get(ownerHodId) ?? "?"}-${blockNumber}`;
  const rangeOf = (blockIds: string[]) => {
    const bs = blockIds.map((id) => byId.get(id)).filter(Boolean).sort((a, b) => a!.blockNumber - b!.blockNumber);
    if (!bs.length) return "—";
    const lo = label(bs[0]!.ownerHodId, bs[0]!.blockNumber);
    const hi = label(bs[bs.length - 1]!.ownerHodId, bs[bs.length - 1]!.blockNumber);
    return lo === hi ? lo : `${lo} – ${hi}`;
  };
  return { label, rangeOf, initial };
}

// Access to a paper-checking allocation: the assigned checker, a semester exam
// coordinator, or a HOD of the exam's year.
async function assertPaperCheckAccess(alloc: { facultyId: string; examId: string }, facultyId: string, universityId: string) {
  const exam = await prisma.exam.findFirst({ where: { id: alloc.examId, deletedAt: null } });
  if (!exam || exam.universityId !== universityId) throw new ApiError(404, "EXAM_NOT_FOUND", "Exam not found.");
  if (alloc.facultyId !== facultyId) {
    const coord = await isExamCoordinator(facultyId, exam.semesterId);
    const fac = await prisma.faculty.findFirst({ where: { id: facultyId, universityId, deletedAt: null }, select: { isHod: true, year: true } });
    const isYearHod = Boolean(fac?.isHod && fac.year === exam.yearLevel);
    if (!coord && !isYearHod) throw new ApiError(403, "FORBIDDEN", "This paper set is not assigned to you.");
  }
  return exam;
}

export const examService = {
  // ── Exam CRUD ──
  async createExam(actorId: string, universityId: string, body: { name?: string; phaseId?: string; blockSize?: number; bufferMinutes?: number; excludeHods?: boolean }) {
    const ctx = await assertManager(actorId, universityId);
    const name = (body.name ?? "").trim();
    if (!name) throw new ApiError(400, "NAME_REQUIRED", "Exam name is required.");
    const exam = await prisma.exam.create({
      data: {
        universityId, academicYearId: ctx.academicYearId, yearLevel: ctx.yearLevel, semesterId: ctx.semesterId,
        phaseId: body.phaseId ?? null, name, blockSize: Math.max(1, Math.min(Number(body.blockSize ?? 20), 40)),
        bufferMinutes: Math.max(0, Math.min(Number(body.bufferMinutes ?? 30), 120)), excludeHods: Boolean(body.excludeHods),
        createdById: actorId,
      },
    });
    await audit(exam.id, actorId, "CREATE_EXAM", name);
    return exam;
  },

  async listExams(actorId: string, universityId: string) {
    const ctx = await assertManager(actorId, universityId);
    const exams = await prisma.exam.findMany({
      where: { academicYearId: ctx.academicYearId, yearLevel: ctx.yearLevel, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    const withCounts = await Promise.all(exams.map(async (e) => ({
      ...e,
      scheduleCount: await prisma.examSchedule.count({ where: { examId: e.id } }),
      blockCount: await prisma.examBlock.count({ where: { examId: e.id } }),
    })));
    return { yearLevel: ctx.yearLevel, exams: withCounts };
  },

  async getExam(actorId: string, universityId: string, examId: string) {
    const ctx = await assertManager(actorId, universityId);
    const exam = await getExamOrThrow(examId, ctx);
    const [schedules, blockCount, externals] = await Promise.all([
      prisma.examSchedule.findMany({ where: { examId }, orderBy: [{ date: "asc" }, { startTime: "asc" }] }),
      prisma.examBlock.count({ where: { examId } }),
      prisma.externalFaculty.count({ where: { examId } }),
    ]);
    const subjIds = [...new Set(schedules.map((s) => s.subjectId))];
    const subs = subjIds.length ? await prisma.subject.findMany({ where: { id: { in: subjIds } }, select: { id: true, code: true, name: true } }) : [];
    const subById = new Map(subs.map((s) => [s.id, s]));
    // The exam's phase window comes straight from the academic calendar (Phase dates) —
    // the calendar picker uses it to auto-fill exam-day dates instead of manual entry.
    const phase = exam.phaseId ? await prisma.phase.findUnique({ where: { id: exam.phaseId }, select: { label: true, startDate: true, endDate: true, examDate: true } }) : null;
    return {
      exam, blockCount, externalCount: externals,
      phase: phase ? { label: phase.label, startDate: dateStr(phase.startDate), endDate: dateStr(phase.endDate), examDate: phase.examDate ? dateStr(phase.examDate) : null } : null,
      schedules: schedules.map((s) => ({ ...s, subjectCode: subById.get(s.subjectId)?.code ?? "?", subjectName: subById.get(s.subjectId)?.name ?? "" })),
    };
  },

  async deleteExam(actorId: string, universityId: string, examId: string) {
    const ctx = await assertManager(actorId, universityId);
    const exam = await getExamOrThrow(examId, ctx);
    // Delete the complete exam workspace atomically. Some dependent models
    // cascade through schedules/blocks, while audit logs have no relation.
    await prisma.$transaction(async (tx) => {
      await tx.supervisorAllocation.deleteMany({ where: { examId } });
      await tx.paperCheckingAllocation.deleteMany({ where: { examId } });
      await tx.standbyFaculty.deleteMany({ where: { examId } });
      await tx.examSchedule.deleteMany({ where: { examId } });
      await tx.examBlock.deleteMany({ where: { examId } });
      await tx.externalFaculty.deleteMany({ where: { examId } });
      await tx.examAuditLog.deleteMany({ where: { examId } });
      await tx.exam.delete({ where: { id: examId } });
    });
    return { deleted: true };
  },

  // ── Exam calendar / schedules ──
  async addSchedule(actorId: string, universityId: string, examId: string, body: { subjectId: string; date: string; startTime: string; endTime: string; branch?: string; coding?: boolean; online?: { startTime?: string; endTime?: string; blockSize?: number; supervisorsPerBlock?: number } }) {
    const ctx = await assertManager(actorId, universityId);
    const exam = await getExamOrThrow(examId, ctx);
    if (!body.subjectId || !body.date || !body.startTime || !body.endTime) throw new ApiError(400, "VALIDATION_ERROR", "subject, date, start and end time are required.");
    const subject = await prisma.subject.findFirst({ where: { id: body.subjectId, universityId, deletedAt: null }, select: { semesterNumber: true } });
    if (!subject) throw new ApiError(404, "SUBJECT_NOT_FOUND", "Subject not found.");
    const dur = toMin(body.endTime) - toMin(body.startTime);
    if (dur <= 0) throw new ApiError(400, "BAD_TIME", "End time must be after start time.");
    const date = dayOnly(body.date);
    const base = { examId, subjectId: body.subjectId, semesterNumber: subject.semesterNumber, branch: body.branch ?? null, date };

    // Non-coding: one OFFLINE paper, full marks (componentMax null).
    if (!body.coding) {
      const s = await prisma.examSchedule.create({ data: { ...base, mode: "OFFLINE", startTime: body.startTime, endTime: body.endTime, durationMinutes: dur } });
      await audit(examId, actorId, "ADD_SCHEDULE", `${dateStr(date)} ${body.startTime}`);
      return s;
    }

    // Coding: OFFLINE written + ONLINE coding paper on the same day. Marks split by phase total.
    const total = exam.phaseId ? (await phaseEntryMax(exam.phaseId)).entryMax : 25;
    const split = componentSplit(total);
    const on = body.online ?? {};
    const onStart = on.startTime || addMinutes(body.endTime, 30);
    const onEnd = on.endTime || addMinutes(onStart, 75);
    const onDur = toMin(onEnd) - toMin(onStart);
    if (onDur <= 0) throw new ApiError(400, "BAD_TIME", "Online end time must be after its start time.");
    const [offline, online] = await prisma.$transaction([
      prisma.examSchedule.create({ data: { ...base, mode: "OFFLINE", componentMax: split.offline, startTime: body.startTime, endTime: body.endTime, durationMinutes: dur } }),
      prisma.examSchedule.create({ data: { ...base, mode: "ONLINE", componentMax: split.online, supervisorsPerBlock: Math.max(1, Math.min(Number(on.supervisorsPerBlock ?? 2), 3)), blockSize: Math.max(1, Math.min(Number(on.blockSize ?? 12), 40)), startTime: onStart, endTime: onEnd, durationMinutes: onDur } }),
    ]);
    await audit(examId, actorId, "ADD_SCHEDULE", `${dateStr(date)} coding: offline ${split.offline} + online ${split.online}`);
    return { offline, online };
  },

  async updateSchedule(actorId: string, universityId: string, scheduleId: string, body: { date?: string; startTime?: string; endTime?: string; branch?: string; room?: string }) {
    const ctx = await assertManager(actorId, universityId);
    const sched = await prisma.examSchedule.findUnique({ where: { id: scheduleId } });
    if (!sched) throw new ApiError(404, "NOT_FOUND", "Schedule not found.");
    await getExamOrThrow(sched.examId, ctx);
    const start = body.startTime ?? sched.startTime, end = body.endTime ?? sched.endTime;
    const dur = toMin(end) - toMin(start);
    if (dur <= 0) throw new ApiError(400, "BAD_TIME", "End time must be after start time.");
    const updated = await prisma.examSchedule.update({
      where: { id: scheduleId },
      data: { date: body.date ? dayOnly(body.date) : undefined, startTime: start, endTime: end, durationMinutes: dur, branch: body.branch ?? undefined },
    });
    await audit(sched.examId, actorId, "EDIT_SCHEDULE", scheduleId);
    return updated;
  },

  async deleteSchedule(actorId: string, universityId: string, scheduleId: string) {
    const ctx = await assertManager(actorId, universityId);
    const sched = await prisma.examSchedule.findUnique({ where: { id: scheduleId } });
    if (!sched) throw new ApiError(404, "NOT_FOUND", "Schedule not found.");
    await getExamOrThrow(sched.examId, ctx);
    await prisma.examSchedule.delete({ where: { id: scheduleId } });
    await audit(sched.examId, actorId, "DELETE_SCHEDULE", scheduleId);
    return { deleted: true };
  },

  // Subjects available for the year's active semester (for the calendar picker).
  // When an examId is given, each subject also carries the exam date fetched from the
  // Academic Calendar: the EXAM event (within the exam's phase window) whose title names
  // that subject's code — e.g. "Test-4 (SEE): TOC" → TOC's date. Falls back to null.
  async yearSubjects(actorId: string, universityId: string, examId?: string) {
    const ctx = await assertManager(actorId, universityId);
    const sem = await prisma.semester.findUnique({ where: { id: ctx.semesterId }, select: { number: true } });
    const subjects = await prisma.subject.findMany({ where: { universityId, semesterNumber: sem!.number, deletedAt: null }, select: { id: true, code: true, name: true }, orderBy: { code: "asc" } });
    if (!examId) return subjects.map((s) => ({ ...s, examDate: null as string | null }));
    const exam = await prisma.exam.findFirst({ where: { id: examId, deletedAt: null }, select: { phaseId: true } });
    const phase = exam?.phaseId ? await prisma.phase.findUnique({ where: { id: exam.phaseId }, select: { startDate: true, endDate: true } }) : null;
    if (!phase) return subjects.map((s) => ({ ...s, examDate: null as string | null }));
    const events = await prisma.calendarEvent.findMany({
      where: { universityId, eventType: "EXAM", deletedAt: null, startDate: { gte: dayOnly(phase.startDate), lte: dayOnly(phase.endDate) } },
      select: { title: true, startDate: true }, orderBy: { startDate: "asc" },
    });
    // A subject code matches a title only as a whole token (so "DM" ≠ "ADMIN", but "FSD-2" hits).
    const matchDate = (code: string, name: string) => {
      const up = code.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(^|[^A-Z0-9])${up}([^A-Z0-9]|$)`, "i");
      const byCode = events.find((e) => re.test(e.title));
      const byName = byCode ?? events.find((e) => e.title.toLowerCase().includes(name.toLowerCase()));
      return byName ? dateStr(byName.startDate) : null;
    };
    return subjects.map((s) => ({ ...s, examDate: matchDate(s.code, s.name) }));
  },

  // ── Student block generation (session-level; per-HOD numbering) ──
  async generateBlocks(actorId: string, universityId: string, examId: string) {
    const ctx = await assertManager(actorId, universityId);
    const exam = await getExamOrThrow(examId, ctx);
    if (exam.status === "PUBLISHED") throw new ApiError(409, "PUBLISHED", "Unpublish before regenerating blocks.");

    // Every HOD of the year owns a set of batches (HodBatchScope). Generate each
    // HOD's blocks from their own students, numbered independently.
    const scopes = await prisma.hodBatchScope.findMany({
      where: { semesterId: exam.semesterId },
      select: { facultyId: true, batchId: true },
    });
    const byHod = new Map<string, string[]>();
    for (const s of scopes) { const arr = byHod.get(s.facultyId) ?? []; arr.push(s.batchId); byHod.set(s.facultyId, arr); }
    if (byHod.size === 0) throw new ApiError(400, "NO_STUDENTS", "No HOD batch scopes for this year's semester.");

    // Wipe existing blocks (cascade clears students + allocations) then rebuild.
    await prisma.examBlock.deleteMany({ where: { examId } });

    // OFFLINE always; ONLINE (smaller lab blocks) only when a coding component exists.
    const onlineSched = await prisma.examSchedule.findFirst({ where: { examId, mode: "ONLINE" }, orderBy: { blockSize: "asc" }, select: { blockSize: true } });
    const modes: { mode: "OFFLINE" | "ONLINE"; size: number }[] = [{ mode: "OFFLINE", size: exam.blockSize }];
    if (onlineSched) modes.push({ mode: "ONLINE", size: onlineSched.blockSize ?? 12 });

    let totalBlocks = 0, totalStudents = 0;
    for (const [hodId, batchIds] of byHod) {
      const enrollments = await prisma.studentEnrollment.findMany({
        where: { batchId: { in: batchIds }, semesterId: exam.semesterId, isCurrent: true },
        include: { student: { select: { id: true, enrollmentNo: true } } },
      });
      enrollments.sort((a, b) => a.student.enrollmentNo.localeCompare(b.student.enrollmentNo));
      totalStudents += enrollments.length; // counted once (both modes seat everyone)
      for (const { mode, size } of modes) {
        // Balanced split: no block below 15; remainder grows blocks toward size+4.
        const sizes = splitBlockSizes(enrollments.length, size);
        let cursor = 0;
        for (let b = 0; b < sizes.length; b++) {
          const chunk = enrollments.slice(cursor, cursor + sizes[b]);
          cursor += sizes[b];
          await prisma.examBlock.create({
            data: {
              examId, mode, ownerHodId: hodId, blockNumber: b + 1,
              students: { create: chunk.map((e, idx) => ({ studentId: e.student.id, enrollmentNo: e.student.enrollmentNo, seatOrder: idx + 1 })) },
            },
          });
          totalBlocks++;
        }
      }
    }
    await prisma.examSchedule.updateMany({ where: { examId }, data: { studentCount: totalStudents } });
    await audit(examId, actorId, "GENERATE_BLOCKS", `${totalBlocks} blocks (${modes.map((m) => m.mode).join("+")}) / ${totalStudents} students`);
    return { blocks: totalBlocks, students: totalStudents, hods: byHod.size, modes: modes.map((m) => m.mode) };
  },

  async listBlocks(actorId: string, universityId: string, examId: string, mode?: "OFFLINE" | "ONLINE") {
    const ctx = await assertManager(actorId, universityId);
    const exam = await getExamOrThrow(examId, ctx);
    const labeler = await blockLabeler(exam);
    const blocks = await prisma.examBlock.findMany({
      where: { examId, ...(mode ? { mode } : {}) },
      include: { students: { orderBy: { seatOrder: "asc" }, select: { studentId: true, enrollmentNo: true, seatOrder: true } }, _count: { select: { students: true } } },
      orderBy: [{ mode: "asc" }, { ownerHodId: "asc" }, { blockNumber: "asc" }],
    });
    const hodIds = [...new Set(blocks.map((b) => b.ownerHodId))];
    const hods = hodIds.length ? await prisma.faculty.findMany({ where: { id: { in: hodIds } }, select: { id: true, name: true } }) : [];
    const hodName = new Map(hods.map((h) => [h.id, h.name]));
    // Order by division letter (A→B→C…) then block number — ownerHodId is a UUID, so the
    // DB sort can't do it; the initial map gives the human A/B/C/D order.
    const div = (hodId: string) => labeler.initial.get(hodId) ?? "~";
    return blocks
      .sort((a, b) => (a.mode < b.mode ? -1 : a.mode > b.mode ? 1 : 0) || div(a.ownerHodId).localeCompare(div(b.ownerHodId)) || a.blockNumber - b.blockNumber)
      .map((b) => ({
        id: b.id, mode: b.mode, ownerHodId: b.ownerHodId, ownerHodName: hodName.get(b.ownerHodId) ?? "—",
        blockNumber: b.blockNumber, label: labeler.label(b.ownerHodId, b.blockNumber),
        room: b.room, isLocked: b.isLocked, studentCount: b._count.students,
        firstEnrollment: b.students[0]?.enrollmentNo ?? null, lastEnrollment: b.students[b.students.length - 1]?.enrollmentNo ?? null,
        students: b.students,
      }));
  },

  // ── Block manual edits ──
  async setBlockRoom(actorId: string, universityId: string, blockId: string, room: string) {
    const ctx = await assertManager(actorId, universityId);
    const block = await prisma.examBlock.findUnique({ where: { id: blockId } });
    if (!block) throw new ApiError(404, "NOT_FOUND", "Block not found.");
    await getExamOrThrow(block.examId, ctx);
    await prisma.examBlock.update({ where: { id: blockId }, data: { room: room.trim() || null } });
    await audit(block.examId, actorId, "SET_BLOCK_ROOM", `${block.blockNumber} → ${room}`);
    return { blockId, room };
  },

  async lockBlock(actorId: string, universityId: string, blockId: string, isLocked: boolean) {
    const ctx = await assertManager(actorId, universityId);
    const block = await prisma.examBlock.findUnique({ where: { id: blockId } });
    if (!block) throw new ApiError(404, "NOT_FOUND", "Block not found.");
    await getExamOrThrow(block.examId, ctx);
    await prisma.examBlock.update({ where: { id: blockId }, data: { isLocked } });
    return { blockId, isLocked };
  },

  async moveStudent(actorId: string, universityId: string, body: { studentId: string; fromBlockId: string; toBlockId: string }) {
    const ctx = await assertManager(actorId, universityId);
    const [from, to] = await Promise.all([
      prisma.examBlock.findUnique({ where: { id: body.fromBlockId } }),
      prisma.examBlock.findUnique({ where: { id: body.toBlockId } }),
    ]);
    if (!from || !to) throw new ApiError(404, "NOT_FOUND", "Block not found.");
    if (from.examId !== to.examId) throw new ApiError(400, "CROSS_EXAM", "Blocks belong to different exams.");
    await getExamOrThrow(from.examId, ctx);
    if (examOver(await prisma.examSchedule.findMany({ where: { examId: from.examId }, select: { date: true } }))) throw new ApiError(409, "EXAM_OVER", "This exam is over — only paper checking can be changed now.");
    if (from.isLocked || to.isLocked) throw new ApiError(409, "LOCKED", "A locked block cannot be edited.");
    const row = await prisma.blockStudent.findFirst({ where: { blockId: body.fromBlockId, studentId: body.studentId } });
    if (!row) throw new ApiError(404, "NOT_IN_BLOCK", "Student is not in the source block.");
    const maxSeat = await prisma.blockStudent.aggregate({ where: { blockId: body.toBlockId }, _max: { seatOrder: true } });
    await prisma.blockStudent.update({ where: { id: row.id }, data: { blockId: body.toBlockId, seatOrder: (maxSeat._max.seatOrder ?? 0) + 1 } });
    await audit(from.examId, actorId, "MOVE_STUDENT", `${row.enrollmentNo}: ${from.blockNumber}→${to.blockNumber}`);
    return { moved: true };
  },

  // Swap the entire student rosters of two blocks. IDs are collected first so the
  // second updateMany doesn't also catch students moved by the first.
  async swapBlocks(actorId: string, universityId: string, body: { blockAId: string; blockBId: string }) {
    const ctx = await assertManager(actorId, universityId);
    const [a, b] = await Promise.all([prisma.examBlock.findUnique({ where: { id: body.blockAId } }), prisma.examBlock.findUnique({ where: { id: body.blockBId } })]);
    if (!a || !b) throw new ApiError(404, "NOT_FOUND", "Block not found.");
    if (a.examId !== b.examId) throw new ApiError(400, "CROSS_EXAM", "Blocks belong to different exams.");
    await getExamOrThrow(a.examId, ctx);
    if (examOver(await prisma.examSchedule.findMany({ where: { examId: a.examId }, select: { date: true } }))) throw new ApiError(409, "EXAM_OVER", "This exam is over — only paper checking can be changed now.");
    if (a.isLocked || b.isLocked) throw new ApiError(409, "LOCKED", "A locked block cannot be edited.");
    const [aIds, bIds] = await Promise.all([
      prisma.blockStudent.findMany({ where: { blockId: a.id }, select: { id: true } }),
      prisma.blockStudent.findMany({ where: { blockId: b.id }, select: { id: true } }),
    ]);
    await prisma.$transaction([
      prisma.blockStudent.updateMany({ where: { id: { in: aIds.map((s) => s.id) } }, data: { blockId: b.id } }),
      prisma.blockStudent.updateMany({ where: { id: { in: bIds.map((s) => s.id) } }, data: { blockId: a.id } }),
    ]);
    await audit(a.examId, actorId, "SWAP_BLOCKS", `${a.blockNumber}↔${b.blockNumber}`);
    return { swapped: true };
  },

  // ── External faculty ──
  async addExternal(actorId: string, universityId: string, examId: string, body: { name: string; mobile?: string; college?: string; experience?: string; remarks?: string; availability?: string }) {
    const ctx = await assertManager(actorId, universityId);
    await getExamOrThrow(examId, ctx);
    if (!body.name?.trim()) throw new ApiError(400, "NAME_REQUIRED", "External faculty name is required.");
    const ext = await prisma.externalFaculty.create({
      data: { examId, name: body.name.trim(), mobile: body.mobile ?? null, college: body.college ?? null, experience: body.experience ?? null, remarks: body.remarks ?? null, availability: body.availability ?? null },
    });
    await audit(examId, actorId, "ADD_EXTERNAL", ext.name);
    return ext;
  },

  async listExternal(actorId: string, universityId: string, examId: string) {
    const ctx = await assertManager(actorId, universityId);
    await getExamOrThrow(examId, ctx);
    return prisma.externalFaculty.findMany({ where: { examId }, orderBy: { createdAt: "asc" } });
  },

  async removeExternal(actorId: string, universityId: string, externalId: string) {
    const ctx = await assertManager(actorId, universityId);
    const ext = await prisma.externalFaculty.findUnique({ where: { id: externalId } });
    if (!ext) throw new ApiError(404, "NOT_FOUND", "External faculty not found.");
    await getExamOrThrow(ext.examId, ctx);
    await prisma.externalFaculty.delete({ where: { id: externalId } });
    return { removed: true };
  },

  // ── Faculty availability screen for a schedule ──
  async availability(actorId: string, universityId: string, scheduleId: string) {
    const ctx = await assertManager(actorId, universityId);
    const sched = await prisma.examSchedule.findUnique({ where: { id: scheduleId } });
    if (!sched) throw new ApiError(404, "NOT_FOUND", "Schedule not found.");
    const exam = await getExamOrThrow(sched.examId, ctx);
    const coords = await coordinatorIds(exam.semesterId);
    const startMin = toMin(sched.startTime), endMin = toMin(sched.endTime);
    // Supervisors are never HODs or exam coordinators — exclude them from the pool.
    const faculties = (await prisma.faculty.findMany({
      where: { universityId, isDean: false, isHod: false, isActive: true, deletedAt: null },
      select: { id: true, name: true, employeeId: true, year: true, isHod: true },
    })).filter((f) => !coords.has(f.id));
    // Bulk-fetch the two things busyReason checks (timetable + existing duties) in
    // 2 queries, then compute per-faculty in memory — avoids a per-faculty query storm.
    const facIds = faculties.map((f) => f.id);
    const buffer = exam.bufferMinutes, winStart = startMin - buffer, winEnd = endMin + buffer;
    const dow = sched.date.getUTCDay();
    const [slots, duties] = await Promise.all([
      prisma.timetableSlot.findMany({ where: { facultyId: { in: facIds }, dayOfWeek: dow, semester: { universityId, status: "ACTIVE" } }, include: { subject: { select: { code: true } }, batch: { select: { code: true } } } }),
      prisma.supervisorAllocation.findMany({ where: { facultyId: { in: facIds }, schedule: { date: sched.date } }, include: { schedule: { select: { startTime: true, endTime: true } } } }),
    ]);
    const busy = new Map<string, string>();
    for (const s of slots) if (s.facultyId && !busy.has(s.facultyId) && overlaps(winStart, winEnd, toMin(s.slotStart), toMin(s.slotEnd))) busy.set(s.facultyId, `Lecture ${s.subject.code} (${s.batch.code}) ${s.slotStart}-${s.slotEnd}`);
    for (const d of duties) if (d.facultyId && !busy.has(d.facultyId) && overlaps(winStart, winEnd, toMin(d.schedule.startTime), toMin(d.schedule.endTime))) busy.set(d.facultyId, `Exam duty ${d.schedule.startTime}-${d.schedule.endTime}`);
    const rows = faculties.map((f) => {
      const reason = busy.get(f.id) ?? null;
      return { facultyId: f.id, name: f.name, employeeId: f.employeeId, year: f.year, isHod: f.isHod, isOwnYear: f.year === exam.yearLevel, free: !reason, reason };
    });
    // Own year first, then year by year (FY→SY→TY→FINAL), then name.
    rows.sort((a, b) =>
      Number(b.isOwnYear) - Number(a.isOwnYear)
      || YEAR_ORDER.indexOf(a.year as YearLevel) - YEAR_ORDER.indexOf(b.year as YearLevel)
      || a.name.localeCompare(b.name));
    return { scheduleId, examYear: exam.yearLevel, buffer: exam.bufferMinutes, window: `${sched.startTime}-${sched.endTime} (±${exam.bufferMinutes}m)`, faculties: rows };
  },

  // ── Supervision allocation for one schedule ──
  async generateSupervision(actorId: string, universityId: string, scheduleId: string, facultyIds?: string[]) {
    const ctx = await assertManager(actorId, universityId);
    const sched = await prisma.examSchedule.findUnique({ where: { id: scheduleId } });
    if (!sched) throw new ApiError(404, "NOT_FOUND", "Schedule not found.");
    const exam = await getExamOrThrow(sched.examId, ctx);
    if (exam.status === "PUBLISHED") throw new ApiError(409, "PUBLISHED", "Unpublish before regenerating.");

    // Supervision uses the blocks of THIS schedule's mode (OFFLINE vs ONLINE lab set).
    const blocks = await prisma.examBlock.findMany({ where: { examId: exam.id, mode: sched.mode }, orderBy: [{ ownerHodId: "asc" }, { blockNumber: "asc" }], select: { id: true } });
    if (blocks.length === 0) throw new ApiError(400, "NO_BLOCKS", "Generate student blocks first.");
    const perBlock = Math.max(1, sched.supervisorsPerBlock); // ONLINE labs need 2

    const coords = await coordinatorIds(exam.semesterId);
    const startMin = toMin(sched.startTime), endMin = toMin(sched.endTime);

    // Candidate faculty in priority tiers, free only, never coordinators.
    // If the HOD hand-picked a pool (select/deselect dialog), restrict to it.
    const picked = facultyIds && facultyIds.length ? new Set(facultyIds) : null;
    // Supervisors are never HODs (they run the exam, not invigilate).
    const all = (await prisma.faculty.findMany({
      where: { universityId, isDean: false, isHod: false, isActive: true, deletedAt: null },
      select: { id: true, year: true, isHod: true },
    })).filter((f) => !picked || picked.has(f.id));
    const examYearIdx = YEAR_ORDER.indexOf(exam.yearLevel);
    const tierOf = (year: string | null) => {
      if (year === exam.yearLevel) return 0; // own year
      const idx = YEAR_ORDER.indexOf((year ?? "") as YearLevel);
      return idx < 0 ? 99 : 1 + Math.abs(idx - examYearIdx); // nearer years first
    };
    // Duty counts so far across the whole exam (balance across days).
    const dutyRows = await prisma.supervisorAllocation.groupBy({ by: ["facultyId"], where: { examId: exam.id, facultyId: { not: null } }, _count: { _all: true } });
    const dutyCount = new Map<string, number>(dutyRows.map((d) => [d.facultyId as string, d._count._all]));

    // Filter: not coordinator, not HOD if excluded, and FREE for this window.
    const candidates: { id: string; tier: number }[] = [];
    for (const f of all) {
      if (coords.has(f.id)) continue;
      if (exam.excludeHods && f.isHod) continue;
      const reason = await busyReason(f.id, universityId, sched.date, startMin, endMin, exam.bufferMinutes);
      if (reason) continue;
      candidates.push({ id: f.id, tier: tierOf(f.year) });
    }
    // Sort by tier, then by current duty load (round-robin balance).
    candidates.sort((a, b) => a.tier - b.tier || (dutyCount.get(a.id) ?? 0) - (dutyCount.get(b.id) ?? 0));

    const externals = await prisma.externalFaculty.findMany({ where: { examId: exam.id }, select: { id: true } });

    // Clear this schedule's supervisors then assign distinct supervisors per block —
    // `perBlock` of them (1 offline, 2 online), each in its own slot.
    await prisma.supervisorAllocation.deleteMany({ where: { scheduleId } });
    let ci = 0, ei = 0, ownYear = 0, otherYear = 0, external = 0, unfilled = 0;
    for (const block of blocks) {
      for (let slot = 1; slot <= perBlock; slot++) {
        if (ci < candidates.length) {
          const cand = candidates[ci++];
          const source = cand.tier === 0 ? "OWN_YEAR" : "OTHER_YEAR";
          await prisma.supervisorAllocation.create({ data: { examId: exam.id, scheduleId, blockId: block.id, slot, facultyId: cand.id, source } });
          if (cand.tier === 0) ownYear++; else otherYear++;
        } else if (ei < externals.length) {
          await prisma.supervisorAllocation.create({ data: { examId: exam.id, scheduleId, blockId: block.id, slot, externalFacultyId: externals[ei++].id, source: "EXTERNAL" } });
          external++;
        } else {
          unfilled++;
        }
      }
    }
    await audit(exam.id, actorId, "GENERATE_SUPERVISION", `sched ${scheduleId}: own ${ownYear}, other ${otherYear}, ext ${external}, unfilled ${unfilled}`);
    return { blocks: blocks.length, supervisorsPerBlock: perBlock, ownYear, otherYear, external, unfilled };
  },

  async listSupervision(actorId: string, universityId: string, scheduleId: string) {
    const ctx = await assertManager(actorId, universityId);
    const sched = await prisma.examSchedule.findUnique({ where: { id: scheduleId } });
    if (!sched) throw new ApiError(404, "NOT_FOUND", "Schedule not found.");
    const exam = await getExamOrThrow(sched.examId, ctx);
    const labeler = await blockLabeler(exam);
    const allocs = await prisma.supervisorAllocation.findMany({
      where: { scheduleId },
      include: { block: { select: { blockNumber: true, room: true, ownerHodId: true } } },
    });
    // Division letter (A→B→C…) then block number, then invigilator slot — so a 2-invigilator
    // block reads SY-A-1, SY-A-1, SY-A-2… ownerHodId is a UUID, so sort by its initial in JS.
    const div = (hodId: string) => labeler.initial.get(hodId) ?? "~";
    allocs.sort((a, b) => div(a.block.ownerHodId).localeCompare(div(b.block.ownerHodId)) || a.block.blockNumber - b.block.blockNumber || a.slot - b.slot);
    const facIds = allocs.map((a) => a.facultyId).filter(Boolean) as string[];
    const extIds = allocs.map((a) => a.externalFacultyId).filter(Boolean) as string[];
    const [facs, exts] = await Promise.all([
      facIds.length ? prisma.faculty.findMany({ where: { id: { in: facIds } }, select: { id: true, name: true, employeeId: true, year: true } }) : [],
      extIds.length ? prisma.externalFaculty.findMany({ where: { id: { in: extIds } }, select: { id: true, name: true } }) : [],
    ]);
    const facById = new Map(facs.map((f) => [f.id, f]));
    const extById = new Map(exts.map((e) => [e.id, e]));
    return allocs.map((a) => ({
      id: a.id, blockNumber: a.block.blockNumber, blockLabel: labeler.label(a.block.ownerHodId, a.block.blockNumber), slot: a.slot, room: a.block.room, source: a.source,
      supervisor: a.facultyId ? `${facById.get(a.facultyId)?.name ?? "?"} (${facById.get(a.facultyId)?.employeeId ?? ""})`
        : a.externalFacultyId ? `${extById.get(a.externalFacultyId)?.name ?? "?"} (External)` : "—",
      facultyId: a.facultyId, externalFacultyId: a.externalFacultyId,
    }));
  },

  async editSupervision(actorId: string, universityId: string, allocationId: string, body: { facultyId?: string; externalFacultyId?: string }) {
    const ctx = await assertManager(actorId, universityId);
    const alloc = await prisma.supervisorAllocation.findUnique({ where: { id: allocationId }, include: { schedule: true } });
    if (!alloc) throw new ApiError(404, "NOT_FOUND", "Allocation not found.");
    const exam = await getExamOrThrow(alloc.examId, ctx);
    if (scheduleOver(alloc.schedule)) throw new ApiError(409, "SCHEDULE_OVER", "This exam day is over — only paper checking can be changed now.");
    if (body.externalFacultyId) {
      await prisma.supervisorAllocation.update({ where: { id: allocationId }, data: { facultyId: null, externalFacultyId: body.externalFacultyId, source: "EXTERNAL" } });
    } else if (body.facultyId) {
      const coords = await coordinatorIds(exam.semesterId);
      if (coords.has(body.facultyId)) throw new ApiError(409, "COORDINATOR", "Exam coordinators cannot receive supervision duty.");
      const reason = await busyReason(body.facultyId, universityId, alloc.schedule.date, toMin(alloc.schedule.startTime), toMin(alloc.schedule.endTime), exam.bufferMinutes, allocationId);
      if (reason) throw new ApiError(409, "BUSY", `Faculty is not free: ${reason}.`);
      const fac = await prisma.faculty.findUnique({ where: { id: body.facultyId }, select: { year: true } });
      await prisma.supervisorAllocation.update({ where: { id: allocationId }, data: { facultyId: body.facultyId, externalFacultyId: null, source: fac?.year === exam.yearLevel ? "OWN_YEAR" : "OTHER_YEAR" } });
    } else {
      throw new ApiError(400, "VALIDATION_ERROR", "Provide facultyId or externalFacultyId.");
    }
    await audit(exam.id, actorId, "EDIT_SUPERVISION", allocationId);
    return { updated: true };
  },

  // ── Paper checking (continuous block ranges to subject faculty) ──
  async generatePaperChecking(actorId: string, universityId: string, scheduleId: string, facultyIds?: string[]) {
    const ctx = await assertManager(actorId, universityId);
    const sched = await prisma.examSchedule.findUnique({ where: { id: scheduleId } });
    if (!sched) throw new ApiError(404, "NOT_FOUND", "Schedule not found.");
    const exam = await getExamOrThrow(sched.examId, ctx);
    if (exam.status === "PUBLISHED") throw new ApiError(409, "PUBLISHED", "Unpublish before regenerating.");

    const coords = await coordinatorIds(exam.semesterId);
    // Pool = hand-picked faculty (select/deselect dialog) or, by default, the
    // subject's own teachers. Coordinators are always excluded.
    let facIds: string[];
    if (facultyIds && facultyIds.length) {
      facIds = [...new Set(facultyIds.filter((id) => !coords.has(id)))];
    } else {
      const fbas = await prisma.facultyBatchAssignment.findMany({ where: { subjectId: sched.subjectId, semesterId: exam.semesterId }, select: { facultyId: true } });
      facIds = [...new Set(fbas.map((f) => f.facultyId).filter((id) => !coords.has(id)))];
    }
    if (facIds.length === 0) throw new ApiError(400, "NO_SUBJECT_FACULTY", "No faculty selected for paper checking.");
    const facs = await prisma.faculty.findMany({ where: { id: { in: facIds }, deletedAt: null }, select: { id: true } });
    const eligible = facs.map((f) => f.id);

    // Coding subjects run an offline + an online paper. Both must be checked by the SAME
    // faculty per student, so we build ONE assignment on the OFFLINE block set and write it
    // identically to both schedules (the online rows reference the offline blocks/students).
    const siblings = await prisma.examSchedule.findMany({ where: { examId: exam.id, subjectId: sched.subjectId }, select: { id: true, mode: true } });
    const isCoding = siblings.length > 1;
    const blockMode = isCoding ? "OFFLINE" : sched.mode;
    const targetScheduleIds = isCoding ? siblings.map((s) => s.id) : [scheduleId];

    const blocks = await prisma.examBlock.findMany({ where: { examId: exam.id, mode: blockMode }, orderBy: [{ ownerHodId: "asc" }, { blockNumber: "asc" }], select: { id: true, blockNumber: true, ownerHodId: true } });
    if (blocks.length === 0) throw new ApiError(400, "NO_BLOCKS", "Generate student blocks first.");

    // Each checker's OWN HOD(s): the HOD(s) whose batches this checker teaches for this
    // subject/semester. A checker must never check their own HOD's students, so we assign
    // only OTHER HODs' blocks — cross-checking to avoid bias.
    const [subjFbas, scopes] = await Promise.all([
      prisma.facultyBatchAssignment.findMany({ where: { subjectId: sched.subjectId, semesterId: exam.semesterId, facultyId: { in: eligible } }, select: { facultyId: true, batchId: true } }),
      prisma.hodBatchScope.findMany({ where: { semesterId: exam.semesterId }, select: { facultyId: true, batchId: true } }),
    ]);
    const hodOfBatch = new Map(scopes.map((s) => [s.batchId, s.facultyId]));
    const ownHods = new Map<string, Set<string>>();
    for (const f of subjFbas) {
      const h = hodOfBatch.get(f.batchId); if (!h) continue;
      let set = ownHods.get(f.facultyId); if (!set) { set = new Set(); ownHods.set(f.facultyId, set); }
      set.add(h);
    }
    // Fallback to faculty.hodId for checkers who teach no scoped batch for this subject.
    const noOwn = eligible.filter((id) => !ownHods.has(id));
    if (noOwn.length) {
      const facHods = await prisma.faculty.findMany({ where: { id: { in: noOwn } }, select: { id: true, hodId: true } });
      for (const f of facHods) if (f.hodId) ownHods.set(f.id, new Set([f.hodId]));
    }

    // Group blocks by owner HOD; distribute each group (contiguous, near-equal ranges) among
    // checkers NOT in that HOD, shuffled every run. If no cross-HOD checker exists (single-HOD
    // pool) fall back to all eligible so no paper is left unchecked.
    const labeler = await blockLabeler(exam);
    const byOwner = new Map<string, typeof blocks>();
    for (const b of blocks) { const arr = byOwner.get(b.ownerHodId) ?? []; arr.push(b); byOwner.set(b.ownerHodId, arr); }
    const loadOf = new Map<string, number>();
    const plan: { facultyId: string; blockIds: string[]; fromLabel: string; toLabel: string }[] = [];
    for (const [ownerHod, group] of byOwner) {
      let pool = shuffle(eligible.filter((id) => !ownHods.get(id)?.has(ownerHod)));
      if (pool.length === 0) pool = shuffle([...eligible]);
      const n = pool.length, base = Math.floor(group.length / n), extra = group.length % n;
      let idx = 0;
      for (let i = 0; i < n; i++) {
        const take = base + (i < extra ? 1 : 0);
        if (take === 0) continue;
        const slice = group.slice(idx, idx + take); idx += take;
        plan.push({
          facultyId: pool[i], blockIds: slice.map((b) => b.id),
          fromLabel: labeler.label(slice[0].ownerHodId, slice[0].blockNumber),
          toLabel: labeler.label(slice[slice.length - 1].ownerHodId, slice[slice.length - 1].blockNumber),
        });
        loadOf.set(pool[i], (loadOf.get(pool[i]) ?? 0) + take);
      }
    }
    // Write the SAME plan to every target schedule (offline + online for coding).
    await prisma.paperCheckingAllocation.deleteMany({ where: { scheduleId: { in: targetScheduleIds } } });
    for (const tsid of targetScheduleIds) {
      for (const a of plan) {
        await prisma.paperCheckingAllocation.create({ data: { examId: exam.id, scheduleId: tsid, subjectId: sched.subjectId, facultyId: a.facultyId, blockIds: a.blockIds, fromLabel: a.fromLabel, toLabel: a.toLabel } });
      }
    }
    const distribution = [...loadOf.entries()].map(([facultyId, count]) => ({ facultyId, count }));
    await audit(exam.id, actorId, "GENERATE_PAPER_CHECKING", `${blocks.length} blocks → ${targetScheduleIds.length} schedule(s)${isCoding ? " (offline+online mirrored)" : ""}`);
    return { blocks: blocks.length, faculty: distribution.length, distribution, mirrored: isCoding };
  },

  async listPaperChecking(actorId: string, universityId: string, scheduleId: string) {
    const ctx = await assertManager(actorId, universityId);
    const sched = await prisma.examSchedule.findUnique({ where: { id: scheduleId } });
    if (!sched) throw new ApiError(404, "NOT_FOUND", "Schedule not found.");
    const exam = await getExamOrThrow(sched.examId, ctx);
    const labeler = await blockLabeler(exam);
    // Created in block order; order by that (fromLabel is a string → "Block 11" < "Block 2").
    const allocs = await prisma.paperCheckingAllocation.findMany({ where: { scheduleId }, orderBy: { createdAt: "asc" } });
    const facs = allocs.length ? await prisma.faculty.findMany({ where: { id: { in: allocs.map((a) => a.facultyId) } }, select: { id: true, name: true, employeeId: true } }) : [];
    const facById = new Map(facs.map((f) => [f.id, f]));
    // Live marking progress per allocation (checker saves are visible immediately).
    // Sequential — the Supabase pooler caps concurrent clients at 15.
    const out = [];
    for (const a of allocs) {
      const students = await allocationStudents(a.blockIds, exam.semesterId);
      const enrIds = students.map((s) => s.enrollmentId);
      const results = exam.phaseId && enrIds.length ? await prisma.result.findMany({ where: { enrollmentId: { in: enrIds }, phaseId: exam.phaseId, subjectId: sched.subjectId }, select: { isPublished: true } }) : [];
      const marked = results.length;
      const published = results.length > 0 && results.every((r) => r.isPublished);
      out.push({
        id: a.id, facultyId: a.facultyId, faculty: `${facById.get(a.facultyId)?.name ?? "?"} (${facById.get(a.facultyId)?.employeeId ?? ""})`,
        range: labeler.rangeOf(a.blockIds), blockCount: a.blockIds.length,
        totalStudents: students.length, markedCount: marked,
        status: published ? "Published" : marked === 0 ? "Pending" : marked < students.length ? "In Progress" : "Complete",
      });
    }
    return out;
  },

  // Reassign one paper-checking block-range to a different checker. Unlike every
  // other allocation, paper checking has NO time lock — it stays editable even after
  // the exam day is over (checking happens afterwards). Already-entered marks live in
  // Result (keyed by student/phase/subject), so they survive a checker change.
  async editPaperChecking(actorId: string, universityId: string, allocationId: string, facultyId: string) {
    const ctx = await assertManager(actorId, universityId);
    const alloc = await prisma.paperCheckingAllocation.findUnique({ where: { id: allocationId } });
    if (!alloc) throw new ApiError(404, "NOT_FOUND", "Allocation not found.");
    const exam = await getExamOrThrow(alloc.examId, ctx);
    if (!facultyId) throw new ApiError(400, "VALIDATION_ERROR", "Provide a facultyId.");
    const coords = await coordinatorIds(exam.semesterId);
    if (coords.has(facultyId)) throw new ApiError(409, "COORDINATOR", "Exam coordinators are not assigned paper-checking ranges.");
    const fac = await prisma.faculty.findFirst({ where: { id: facultyId, universityId, deletedAt: null }, select: { id: true } });
    if (!fac) throw new ApiError(404, "FACULTY_NOT_FOUND", "Faculty not found.");
    await prisma.paperCheckingAllocation.update({ where: { id: allocationId }, data: { facultyId } });
    await audit(exam.id, actorId, "EDIT_PAPER_CHECKING", `${allocationId} → ${facultyId}`);
    return { updated: true };
  },

  // Candidate faculty for the paper-checking select/deselect dialog: subject
  // teachers flagged, plus every active faculty for support from other years.
  async paperCheckingFaculty(actorId: string, universityId: string, scheduleId: string) {
    const ctx = await assertManager(actorId, universityId);
    const sched = await prisma.examSchedule.findUnique({ where: { id: scheduleId } });
    if (!sched) throw new ApiError(404, "NOT_FOUND", "Schedule not found.");
    const exam = await getExamOrThrow(sched.examId, ctx);
    const coords = await coordinatorIds(exam.semesterId);
    const fbas = await prisma.facultyBatchAssignment.findMany({ where: { subjectId: sched.subjectId, semesterId: exam.semesterId }, select: { facultyId: true } });
    const subjectSet = new Set(fbas.map((f) => f.facultyId));
    const faculties = await prisma.faculty.findMany({
      where: { universityId, isDean: false, isActive: true, deletedAt: null },
      select: { id: true, name: true, employeeId: true, year: true },
    });
    // Subject teachers first, then all other faculty (own year, then year by year).
    const rows = faculties.filter((f) => !coords.has(f.id)).map((f) => ({ ...f, isSubjectFaculty: subjectSet.has(f.id), isOwnYear: f.year === exam.yearLevel }));
    rows.sort((a, b) =>
      Number(b.isSubjectFaculty) - Number(a.isSubjectFaculty)
      || Number(b.isOwnYear) - Number(a.isOwnYear)
      || YEAR_ORDER.indexOf(a.year as YearLevel) - YEAR_ORDER.indexOf(b.year as YearLevel)
      || a.name.localeCompare(b.name));
    return {
      examYear: exam.yearLevel,
      subjectFacultyIds: [...subjectSet].filter((id) => !coords.has(id)),
      faculties: rows,
    };
  },

  // Checker (or coordinator/HOD) opens an allocation → the enrollment numbers of
  // its blocks, with any marks already entered.
  async paperCheckingStudents(facultyId: string, universityId: string, allocationId: string) {
    const alloc = await prisma.paperCheckingAllocation.findUnique({ where: { id: allocationId } });
    if (!alloc) throw new ApiError(404, "NOT_FOUND", "Allocation not found.");
    const exam = await assertPaperCheckAccess(alloc, facultyId, universityId);
    const { phaseId, number, entryMax } = await phaseEntryMax(exam.phaseId); // entryMax = subject total 25/50
    const sched = await prisma.examSchedule.findUnique({ where: { id: alloc.scheduleId }, select: { mode: true, componentMax: true } });
    const subject = await prisma.subject.findUnique({ where: { id: alloc.subjectId }, select: { code: true, name: true } });
    // A split (coding) subject entry edits only one component; the other is read-only.
    const isSplit = sched?.componentMax != null;
    const split = componentSplit(entryMax);
    const editableComponent = !isSplit ? "FULL" : sched!.mode === "ONLINE" ? "ONLINE" : "OFFLINE";
    const componentMax = editableComponent === "FULL" ? entryMax : editableComponent === "ONLINE" ? split.online : split.offline;
    const passMark = entryMax >= 50 ? 18 : 9; // below this the total is a fail (shown red)
    const labeler = await blockLabeler(exam);
    const students = await allocationStudents(alloc.blockIds, exam.semesterId);
    const results = students.length ? await prisma.result.findMany({ where: { enrollmentId: { in: students.map((s) => s.enrollmentId) }, phaseId, subjectId: alloc.subjectId } }) : [];
    const rById = new Map(results.map((r) => [r.enrollmentId, r]));
    return {
      allocation: {
        id: alloc.id, examName: (await prisma.exam.findUnique({ where: { id: exam.id }, select: { name: true } }))?.name ?? "",
        subjectCode: subject?.code ?? "?", subjectName: subject?.name ?? "", range: labeler.rangeOf(alloc.blockIds),
        entryMax, totalMax: entryMax, phaseNumber: number, isSplit, editableComponent, componentMax,
        offlineMax: split.offline, onlineMax: split.online, passMark,
        isPublished: results.length > 0 && results.every((r) => r.isPublished),
      },
      students: students.map((s) => {
        const r = rById.get(s.enrollmentId);
        const offline = r?.offlineMarks ?? null;
        const online = r?.onlineMarks ?? null;
        const total = r && !r.isAbsent ? r.marksObtained : null;
        return {
          enrollmentId: s.enrollmentId, enrollmentNo: s.enrollmentNo, rollNo: s.rollNo, name: s.name, blockNumber: s.blockNumber, blockLabel: labeler.label(s.ownerHodId, s.blockNumber),
          offlineMarks: offline, onlineMarks: online, total,
          // non-split convenience: the single editable value is the total
          enteredMarks: !isSplit ? total : (editableComponent === "ONLINE" ? online : offline),
          grade: r?.grade ?? null, isAbsent: r?.isAbsent ?? false, isPublished: r?.isPublished ?? false,
        };
      }),
    };
  },

  async savePaperCheckingMarks(facultyId: string, universityId: string, allocationId: string, marks: { enrollmentId: string; marks: number | null; absent?: boolean }[]) {
    const alloc = await prisma.paperCheckingAllocation.findUnique({ where: { id: allocationId } });
    if (!alloc) throw new ApiError(404, "NOT_FOUND", "Allocation not found.");
    const exam = await assertPaperCheckAccess(alloc, facultyId, universityId);
    const { phaseId, entryMax } = await phaseEntryMax(exam.phaseId); // subject total 25/50
    const sched = await prisma.examSchedule.findUnique({ where: { id: alloc.scheduleId }, select: { mode: true, componentMax: true } });
    const isSplit = sched?.componentMax != null;
    const split = componentSplit(entryMax);
    const compMax = !isSplit ? entryMax : sched!.mode === "ONLINE" ? split.online : split.offline; // max for THIS field
    const allowed = new Set((await allocationStudents(alloc.blockIds, exam.semesterId)).map((s) => s.enrollmentId));
    let saved = 0;
    for (const m of marks) {
      // A plain null (untouched) is skipped so autosave never wipes existing entries.
      if (!m.absent && m.marks == null) continue;
      if (!allowed.has(m.enrollmentId)) throw new ApiError(400, "OUT_OF_RANGE", "Student is outside your assigned blocks.");
      const isAbsent = Boolean(m.absent);
      if (!isAbsent && (!Number.isFinite(m.marks!) || m.marks! < 0 || m.marks! > compMax)) throw new ApiError(400, "VALIDATION_ERROR", `Marks must be between 0 and ${compMax}.`);
      const existing = await prisma.result.findUnique({ where: { enrollmentId_phaseId_subjectId: { enrollmentId: m.enrollmentId, phaseId, subjectId: alloc.subjectId } } });
      if (existing?.isPublished) throw new ApiError(409, "ALREADY_PUBLISHED", "Marks are live — they can no longer be edited.");

      let data: { marksObtained: number; maxMarks: number; offlineMarks: number | null; onlineMarks: number | null; grade: string; isAbsent: boolean; uploadedById: string };
      if (isAbsent) {
        // Absent = didn't appear (applies to the whole subject, both papers).
        data = { marksObtained: 0, maxMarks: entryMax, offlineMarks: null, onlineMarks: null, grade: "AB", isAbsent: true, uploadedById: facultyId };
      } else if (isSplit) {
        const offline = sched!.mode === "OFFLINE" ? m.marks! : (existing?.offlineMarks ?? null);
        const online = sched!.mode === "ONLINE" ? m.marks! : (existing?.onlineMarks ?? null);
        const total = (offline ?? 0) + (online ?? 0);
        data = { marksObtained: total, maxMarks: entryMax, offlineMarks: offline, onlineMarks: online, grade: gradeFromPct((total / entryMax) * 100), isAbsent: false, uploadedById: facultyId };
      } else {
        data = { marksObtained: m.marks!, maxMarks: entryMax, offlineMarks: null, onlineMarks: null, grade: gradeFromPct((m.marks! / entryMax) * 100), isAbsent: false, uploadedById: facultyId };
      }
      if (existing) await prisma.result.update({ where: { id: existing.id }, data });
      else await prisma.result.create({ data: { enrollmentId: m.enrollmentId, phaseId, subjectId: alloc.subjectId, ...data } });
      saved++;
    }
    await audit(exam.id, facultyId, "SAVE_MARKS", `alloc ${allocationId}: ${saved}`);
    return { saved };
  },

  // A checker's own paper-checking duties (published exams), with live progress.
  async myPaperChecking(facultyId: string, universityId: string) {
    // Visible as soon as allocated — marks stay draft until the HOD publishes
    // results, independent of supervision-duty publishing.
    const allocs = await prisma.paperCheckingAllocation.findMany({
      where: { facultyId, schedule: { exam: { universityId, deletedAt: null } } },
      include: { schedule: { select: { date: true, exam: { select: { id: true, name: true, phaseId: true, semesterId: true, yearLevel: true } } } } },
      orderBy: { createdAt: "asc" },
    });
    const subjIds = [...new Set(allocs.map((a) => a.subjectId))];
    const subs = subjIds.length ? await prisma.subject.findMany({ where: { id: { in: subjIds } }, select: { id: true, code: true } }) : [];
    const subCode = new Map(subs.map((s) => [s.id, s.code]));
    const labelers = new Map<string, Awaited<ReturnType<typeof blockLabeler>>>();
    const out = [];
    for (const a of allocs) {
      const ex = a.schedule.exam;
      if (!labelers.has(ex.id)) labelers.set(ex.id, await blockLabeler({ id: ex.id, yearLevel: ex.yearLevel, semesterId: ex.semesterId }));
      const students = await allocationStudents(a.blockIds, ex.semesterId);
      const enrIds = students.map((s) => s.enrollmentId);
      const phaseId = ex.phaseId;
      const results = phaseId && enrIds.length ? await prisma.result.findMany({ where: { enrollmentId: { in: enrIds }, phaseId, subjectId: a.subjectId }, select: { isPublished: true } }) : [];
      const marked = results.length;
      const published = results.length > 0 && results.every((r) => r.isPublished);
      out.push({
        id: a.id, exam: ex.name, subjectCode: subCode.get(a.subjectId) ?? "?", date: dateStr(a.schedule.date),
        range: labelers.get(ex.id)!.rangeOf(a.blockIds), totalStudents: students.length, markedCount: marked,
        status: published ? "Published" : marked === 0 ? "Pending" : marked < students.length ? "In Progress" : "Complete",
      });
    }
    return out;
  },

  // HOD pushes the phase's marks live: draft Results → published, students notified.
  async publishResults(actorId: string, universityId: string, examId: string) {
    const ctx = await assertManager(actorId, universityId);
    const exam = await getExamOrThrow(examId, ctx);
    const { phaseId } = await phaseEntryMax(exam.phaseId);
    const allocs = await prisma.paperCheckingAllocation.findMany({ where: { examId } });
    if (allocs.length === 0) throw new ApiError(400, "NO_PAPER_CHECKING", "Allocate paper checking and enter marks first.");
    const enrollmentIds = new Set<string>();
    let unmarked = 0;
    for (const a of allocs) {
      const students = await allocationStudents(a.blockIds, exam.semesterId);
      const enrIds = students.map((s) => s.enrollmentId);
      enrIds.forEach((id) => enrollmentIds.add(id));
      const marked = enrIds.length ? await prisma.result.count({ where: { enrollmentId: { in: enrIds }, phaseId, subjectId: a.subjectId } }) : 0;
      unmarked += Math.max(0, students.length - marked);
    }
    if (unmarked > 0) throw new ApiError(400, "INCOMPLETE_RESULTS", `${unmarked} paper(s) still have no marks. Complete marking before publishing.`);
    const publishedAt = new Date();
    await prisma.result.updateMany({ where: { phaseId, enrollmentId: { in: [...enrollmentIds] }, isPublished: false }, data: { isPublished: true, publishedAt } });
    const enrs = await prisma.studentEnrollment.findMany({ where: { id: { in: [...enrollmentIds] } }, select: { studentId: true } });
    const studentIds = [...new Set(enrs.map((e) => e.studentId))];
    if (studentIds.length) {
      await prisma.notification.createMany({
        data: studentIds.map((studentId) => ({ universityId, studentId, type: "RESULT_UPLOADED", title: `${exam.name} results are live`, body: `Your ${exam.name} results have been published. Tap to view.`, linkPath: "/student/results" })),
      });
    }
    await audit(examId, actorId, "PUBLISH_RESULTS", `${studentIds.length} students`);
    return { published: true, students: studentIds.length };
  },

  // ── Standby (2 subject faculty per schedule) ──
  async generateStandby(actorId: string, universityId: string, scheduleId: string) {
    const ctx = await assertManager(actorId, universityId);
    const sched = await prisma.examSchedule.findUnique({ where: { id: scheduleId } });
    if (!sched) throw new ApiError(404, "NOT_FOUND", "Schedule not found.");
    const exam = await getExamOrThrow(sched.examId, ctx);
    const coords = await coordinatorIds(exam.semesterId);
    const supervisors = new Set((await prisma.supervisorAllocation.findMany({ where: { scheduleId }, select: { facultyId: true } })).map((s) => s.facultyId).filter(Boolean) as string[]);
    const fbas = await prisma.facultyBatchAssignment.findMany({ where: { subjectId: sched.subjectId, semesterId: exam.semesterId }, select: { facultyId: true } });
    const pool = [...new Set(fbas.map((f) => f.facultyId))].filter((id) => !coords.has(id) && !supervisors.has(id));
    await prisma.standbyFaculty.deleteMany({ where: { scheduleId } });
    const chosen: string[] = [];
    for (const id of pool) {
      if (chosen.length >= 2) break;
      const reason = await busyReason(id, universityId, sched.date, toMin(sched.startTime), toMin(sched.endTime), exam.bufferMinutes);
      if (!reason) chosen.push(id);
    }
    for (let i = 0; i < chosen.length; i++) {
      await prisma.standbyFaculty.create({ data: { examId: exam.id, scheduleId, facultyId: chosen[i], slot: i + 1 } });
    }
    await audit(exam.id, actorId, "GENERATE_STANDBY", `sched ${scheduleId}: ${chosen.length}`);
    return { standby: chosen.length };
  },

  async setStandby(actorId: string, universityId: string, scheduleId: string, slot: number, facultyId: string) {
    const ctx = await assertManager(actorId, universityId);
    const sched = await prisma.examSchedule.findUnique({ where: { id: scheduleId } });
    if (!sched) throw new ApiError(404, "NOT_FOUND", "Schedule not found.");
    const exam = await getExamOrThrow(sched.examId, ctx);
    if (scheduleOver(sched)) throw new ApiError(409, "SCHEDULE_OVER", "This exam day is over — only paper checking can be changed now.");
    if (slot !== 1 && slot !== 2) throw new ApiError(400, "VALIDATION_ERROR", "Slot must be 1 or 2.");
    const coords = await coordinatorIds(exam.semesterId);
    if (coords.has(facultyId)) throw new ApiError(409, "COORDINATOR", "Exam coordinators cannot be standby.");
    await prisma.standbyFaculty.upsert({
      where: { scheduleId_slot: { scheduleId, slot } },
      update: { facultyId },
      create: { examId: exam.id, scheduleId, facultyId, slot },
    });
    return { scheduleId, slot, facultyId };
  },

  // Hand-pick the standby faculty (select/deselect dialog) — up to 2, coordinators excluded.
  async setStandbyList(actorId: string, universityId: string, scheduleId: string, facultyIds: string[]) {
    const ctx = await assertManager(actorId, universityId);
    const sched = await prisma.examSchedule.findUnique({ where: { id: scheduleId } });
    if (!sched) throw new ApiError(404, "NOT_FOUND", "Schedule not found.");
    const exam = await getExamOrThrow(sched.examId, ctx);
    if (scheduleOver(sched)) throw new ApiError(409, "SCHEDULE_OVER", "This exam day is over — only paper checking can be changed now.");
    const coords = await coordinatorIds(exam.semesterId);
    const ids = [...new Set(facultyIds.filter((id) => !coords.has(id)))].slice(0, 2);
    await prisma.standbyFaculty.deleteMany({ where: { scheduleId } });
    for (let i = 0; i < ids.length; i++) await prisma.standbyFaculty.create({ data: { examId: exam.id, scheduleId, facultyId: ids[i], slot: i + 1 } });
    await audit(exam.id, actorId, "SET_STANDBY", `sched ${scheduleId}: ${ids.length}`);
    return { standby: ids.length };
  },

  async listStandby(actorId: string, universityId: string, scheduleId: string) {
    const ctx = await assertManager(actorId, universityId);
    const sched = await prisma.examSchedule.findUnique({ where: { id: scheduleId } });
    if (!sched) throw new ApiError(404, "NOT_FOUND", "Schedule not found.");
    await getExamOrThrow(sched.examId, ctx);
    const rows = await prisma.standbyFaculty.findMany({ where: { scheduleId }, orderBy: { slot: "asc" } });
    const facs = rows.length ? await prisma.faculty.findMany({ where: { id: { in: rows.map((r) => r.facultyId) } }, select: { id: true, name: true, employeeId: true } }) : [];
    const facById = new Map(facs.map((f) => [f.id, f]));
    return rows.map((r) => ({ slot: r.slot, facultyId: r.facultyId, isActive: r.isActive, faculty: `${facById.get(r.facultyId)?.name ?? "?"} (${facById.get(r.facultyId)?.employeeId ?? ""})` }));
  },

  // ── Conflict detection ──
  async detectConflicts(actorId: string, universityId: string, examId: string) {
    const ctx = await assertManager(actorId, universityId);
    const exam = await getExamOrThrow(examId, ctx);
    const coords = await coordinatorIds(exam.semesterId);
    const conflicts: { type: string; detail: string }[] = [];

    const supervisors = await prisma.supervisorAllocation.findMany({
      where: { examId }, include: { schedule: { select: { date: true, startTime: true, endTime: true, mode: true } }, block: { select: { blockNumber: true, room: true } } },
    });
    // Faculty double-booked at overlapping times (across schedules).
    const byFaculty = new Map<string, typeof supervisors>();
    for (const s of supervisors) {
      if (!s.facultyId) continue;
      const arr = byFaculty.get(s.facultyId) ?? []; arr.push(s); byFaculty.set(s.facultyId, arr);
      if (coords.has(s.facultyId)) conflicts.push({ type: "COORDINATOR_ASSIGNED", detail: `A coordinator has a supervision duty (block ${s.block.blockNumber}).` });
    }
    for (const [, list] of byFaculty) {
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (dateStr(a.schedule.date) === dateStr(b.schedule.date) && overlaps(toMin(a.schedule.startTime), toMin(a.schedule.endTime), toMin(b.schedule.startTime), toMin(b.schedule.endTime))) {
          conflicts.push({ type: "FACULTY_DOUBLE_BOOKED", detail: `A faculty supervises two blocks at ${a.schedule.startTime} on ${dateStr(a.schedule.date)}.` });
        }
      }
    }
    // Room double-booked — OFFLINE only. Online labs deliberately hold several blocks
    // (e.g. 519-A has blocks 1 & 2) and 2 invigilators per block, so they don't conflict.
    const perSchedule = new Map<string, Map<string, Set<number>>>();
    for (const s of supervisors) {
      if (!s.block.room || s.schedule.mode === "ONLINE") continue;
      const rooms = perSchedule.get(s.scheduleId) ?? new Map<string, Set<number>>();
      const blks = rooms.get(s.block.room) ?? new Set<number>();
      blks.add(s.block.blockNumber);
      rooms.set(s.block.room, blks);
      perSchedule.set(s.scheduleId, rooms);
    }
    for (const [, rooms] of perSchedule) for (const [room, blks] of rooms) if (blks.size > 1) conflicts.push({ type: "ROOM_DOUBLE_BOOKED", detail: `Room ${room} is used by ${blks.size} blocks in one slot.` });
    // Unfilled supervision: expected = (blocks of the schedule's mode) × supervisors-per-block.
    const [offlineBlocks, onlineBlocks] = await Promise.all([
      prisma.examBlock.count({ where: { examId, mode: "OFFLINE" } }),
      prisma.examBlock.count({ where: { examId, mode: "ONLINE" } }),
    ]);
    const schedules = await prisma.examSchedule.findMany({ where: { examId }, select: { id: true, mode: true, supervisorsPerBlock: true } });
    for (const sc of schedules) {
      const need = (sc.mode === "ONLINE" ? onlineBlocks : offlineBlocks) * Math.max(1, sc.supervisorsPerBlock);
      const filled = await prisma.supervisorAllocation.count({ where: { scheduleId: sc.id } });
      if (need > 0 && filled < need) conflicts.push({ type: "UNFILLED_SUPERVISION", detail: `A ${sc.mode.toLowerCase()} schedule has ${need - filled} supervisor slot(s) unfilled.` });
    }
    // Duplicate standby.
    const standbys = await prisma.standbyFaculty.findMany({ where: { examId }, select: { scheduleId: true, facultyId: true } });
    const stBySchedule = new Map<string, string[]>();
    for (const st of standbys) { const arr = stBySchedule.get(st.scheduleId) ?? []; arr.push(st.facultyId); stBySchedule.set(st.scheduleId, arr); }
    for (const [, ids] of stBySchedule) if (new Set(ids).size !== ids.length) conflicts.push({ type: "DUPLICATE_STANDBY", detail: "The same faculty holds both standby slots in a schedule." });

    return { examId, ok: conflicts.length === 0, conflicts };
  },

  // ── Publish ──
  async publishExam(actorId: string, universityId: string, examId: string) {
    const ctx = await assertManager(actorId, universityId);
    const exam = await getExamOrThrow(examId, ctx);
    const { ok, conflicts } = await this.detectConflicts(actorId, universityId, examId);
    if (!ok) throw new ApiError(409, "CONFLICTS", `Resolve ${conflicts.length} conflict(s) before publishing.`);

    await prisma.exam.update({ where: { id: examId }, data: { status: "PUBLISHED", publishedAt: new Date() } });

    // Notify every assigned faculty: supervision, paper checking, standby.
    const [sup, pc, st] = await Promise.all([
      prisma.supervisorAllocation.findMany({ where: { examId, facultyId: { not: null } }, include: { schedule: { select: { date: true, startTime: true } }, block: { select: { blockNumber: true, room: true } } } }),
      prisma.paperCheckingAllocation.findMany({ where: { examId } }),
      prisma.standbyFaculty.findMany({ where: { examId }, include: { schedule: { select: { date: true, startTime: true } } } }),
    ]);
    const notes: { facultyId: string; type: string; title: string; body: string }[] = [];
    for (const s of sup) notes.push({ facultyId: s.facultyId!, type: "EXAM_SUPERVISION", title: `Supervision duty — ${exam.name}`, body: `Block ${s.block.blockNumber}${s.block.room ? ` (Room ${s.block.room})` : ""} on ${dateStr(s.schedule.date)} at ${s.schedule.startTime}.` });
    for (const p of pc) notes.push({ facultyId: p.facultyId, type: "EXAM_PAPER_CHECKING", title: `Paper checking — ${exam.name}`, body: `You are assigned ${p.fromLabel} – ${p.toLabel} (${p.blockIds.length} blocks).` });
    for (const s of st) notes.push({ facultyId: s.facultyId, type: "EXAM_STANDBY", title: `Standby duty — ${exam.name}`, body: `Standby-${s.slot} on ${dateStr(s.schedule.date)} at ${s.schedule.startTime}.` });
    if (notes.length) {
      await prisma.notification.createMany({
        data: notes.map((n) => ({ universityId, facultyId: n.facultyId, type: n.type, title: n.title, body: n.body, linkPath: "/faculty/exam-duties" })),
      });
    }
    await audit(examId, actorId, "PUBLISH", `${notes.length} notifications`);
    return { published: true, notified: notes.length };
  },

  async unpublishExam(actorId: string, universityId: string, examId: string) {
    const ctx = await assertManager(actorId, universityId);
    await getExamOrThrow(examId, ctx);
    await prisma.exam.update({ where: { id: examId }, data: { status: "DRAFT", publishedAt: null } });
    await audit(examId, actorId, "UNPUBLISH");
    return { unpublished: true };
  },

  // ── Dashboard ──
  async dashboard(actorId: string, universityId: string, examId: string) {
    const ctx = await assertManager(actorId, universityId);
    const exam = await getExamOrThrow(examId, ctx);
    const coords = await coordinatorIds(exam.semesterId);
    const [blockCount, offlineBlocks, onlineBlocks, schedules, externalCount] = await Promise.all([
      prisma.examBlock.count({ where: { examId } }),
      prisma.examBlock.count({ where: { examId, mode: "OFFLINE" } }),
      prisma.examBlock.count({ where: { examId, mode: "ONLINE" } }),
      prisma.examSchedule.findMany({ where: { examId }, select: { id: true, mode: true, supervisorsPerBlock: true } }),
      prisma.externalFaculty.count({ where: { examId } }),
    ]);
    let allocated = 0, pending = 0, standby = 0, paperPending = 0;
    for (const sc of schedules) {
      const filled = await prisma.supervisorAllocation.count({ where: { scheduleId: sc.id } });
      const need = (sc.mode === "ONLINE" ? onlineBlocks : offlineBlocks) * Math.max(1, sc.supervisorsPerBlock);
      allocated += filled;
      pending += Math.max(0, need - filled);
      standby += await prisma.standbyFaculty.count({ where: { scheduleId: sc.id } });
      if ((await prisma.paperCheckingAllocation.count({ where: { scheduleId: sc.id } })) === 0) paperPending++;
    }
    const totalFaculty = await prisma.faculty.count({ where: { universityId, isDean: false, isActive: true, deletedAt: null } });
    return {
      exam: { id: exam.id, name: exam.name, status: exam.status, yearLevel: exam.yearLevel },
      totalSchedules: schedules.length, generatedBlocks: blockCount, allocatedBlocks: allocated, pendingBlocks: pending,
      externalFaculties: externalCount, standbyFaculties: standby, paperCheckingPending: paperPending,
      coordinators: coords.size, totalFaculty, published: exam.status === "PUBLISHED",
    };
  },

  // Does this faculty manage exams? Drives the faculty-portal "Exam Coordination"
  // tab (coordinators are faculty, so they need the manager UI outside the HOD portal).
  async myExamManagerStatus(facultyId: string, universityId: string) {
    const fac = await prisma.faculty.findFirst({ where: { id: facultyId, universityId, deletedAt: null }, select: { year: true, isHod: true } });
    if (!fac?.year) return { isManager: false, isCoordinator: false, isHod: false, yearLevel: null as string | null };
    const sem = await prisma.semester.findFirst({ where: { universityId, status: "ACTIVE", yearLevel: fac.year as YearLevel } });
    const isCoordinator = sem ? await isExamCoordinator(facultyId, sem.id) : false;
    return { isManager: Boolean(fac.isHod) || isCoordinator, isCoordinator, isHod: Boolean(fac.isHod), yearLevel: fac.year };
  },

  // ── Faculty views (published duties) ──
  async facultyDuties(facultyId: string, universityId: string) {
    const supervision = await prisma.supervisorAllocation.findMany({
      where: { facultyId, schedule: { exam: { status: "PUBLISHED", universityId } } },
      include: { schedule: { select: { date: true, startTime: true, endTime: true, subjectId: true, exam: { select: { id: true, name: true, yearLevel: true, semesterId: true } } } }, block: { select: { blockNumber: true, room: true, ownerHodId: true } } },
      orderBy: { schedule: { date: "asc" } },
    });
    const paperChecking = await prisma.paperCheckingAllocation.findMany({
      where: { facultyId, schedule: { exam: { status: "PUBLISHED", universityId } } },
      include: { schedule: { select: { date: true, subjectId: true, exam: { select: { id: true, name: true, yearLevel: true, semesterId: true } } } } },
    });
    // One labeler per distinct exam, reused for supervision blocks + paper-checking ranges.
    const labelers = new Map<string, Awaited<ReturnType<typeof blockLabeler>>>();
    for (const ex of [...supervision.map((s) => s.schedule.exam), ...paperChecking.map((p) => p.schedule.exam)]) {
      if (!labelers.has(ex.id)) labelers.set(ex.id, await blockLabeler({ id: ex.id, yearLevel: ex.yearLevel, semesterId: ex.semesterId }));
    }
    const standby = await prisma.standbyFaculty.findMany({
      where: { facultyId, schedule: { exam: { status: "PUBLISHED", universityId } } },
      include: { schedule: { select: { date: true, startTime: true, subjectId: true, exam: { select: { name: true } } } } },
      orderBy: { schedule: { date: "asc" } },
    });
    const subjIds = [...new Set([...supervision.map((s) => s.schedule.subjectId), ...paperChecking.map((p) => p.schedule.subjectId), ...standby.map((s) => s.schedule.subjectId)])];
    const subs = subjIds.length ? await prisma.subject.findMany({ where: { id: { in: subjIds } }, select: { id: true, code: true } }) : [];
    const subCode = new Map(subs.map((s) => [s.id, s.code]));
    const today = dateStr(new Date());
    return {
      supervision: supervision.map((s) => ({ exam: s.schedule.exam.name, subject: subCode.get(s.schedule.subjectId) ?? "?", date: dateStr(s.schedule.date), time: `${s.schedule.startTime}-${s.schedule.endTime}`, block: labelers.get(s.schedule.exam.id)!.label(s.block.ownerHodId, s.block.blockNumber), room: s.block.room, isToday: dateStr(s.schedule.date) === today })),
      paperChecking: paperChecking.map((p) => ({ exam: p.schedule.exam.name, subject: subCode.get(p.schedule.subjectId) ?? "?", range: labelers.get(p.schedule.exam.id)!.rangeOf(p.blockIds), blocks: p.blockIds.length })),
      standby: standby.map((s) => ({ exam: s.schedule.exam.name, subject: subCode.get(s.schedule.subjectId) ?? "?", date: dateStr(s.schedule.date), time: s.schedule.startTime, slot: s.slot, isToday: dateStr(s.schedule.date) === today })),
    };
  },
};
