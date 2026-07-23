// Seed the SY HOD (emp015 · Prof. Ankita Tiwari) cohort — batches C1–C9, ACTIVE Semester 3 —
// to match the real compiled attendance sheet: 6 subjects, a weekly timetable for every batch,
// and VERY random attendance + marks through phase T3 for all ~277 students.
//
// Why Semester 3 (not "Sem-IV"): the app's active SY semester is #3, and emp015's HOD scope +
// all current enrollments live there. Seeding anywhere else would be invisible in the portal.
//
// Idempotent: subjects are upserted; faculty-assignments / timetable / attendance / results for
// this semester are cleared and rebuilt on every run (so "very random" is fresh each time).
import prisma from "../src/config/prisma.js";

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const gradeFor = (m: number) => (m >= 90 ? "A+" : m >= 80 ? "A" : m >= 70 ? "B" : m >= 60 ? "C" : m >= 50 ? "D" : m >= 40 ? "E" : "F");

// The 6 SY Sem-IV subjects from the sheet. Real per-subject lecture totals drive attendance realism.
const SUBJECTS: { code: string; name: string; type: "THEORY" | "PRACTICAL"; credits: number; lectures: number }[] = [
  { code: "COA", name: "Computer Organization & Architecture", type: "THEORY", credits: 4, lectures: 60 },
  { code: "DM", name: "Discrete Mathematics", type: "THEORY", credits: 4, lectures: 42 },
  { code: "TOC", name: "Theory of Computation", type: "THEORY", credits: 3, lectures: 45 },
  { code: "IMM", name: "Interactive Multimedia", type: "THEORY", credits: 3, lectures: 40 },
  { code: "FCSP-II", name: "Full-course Semester Project-II", type: "PRACTICAL", credits: 2, lectures: 64 },
  { code: "FSD-2", name: "Full Stack Development-2", type: "PRACTICAL", credits: 4, lectures: 68 },
];

// Weekly timetable: 08:45→01:30 with a 10:45–11:30 break, Mon–Sat. Every subject appears.
const SLOTS = ["08:45-09:45", "09:45-10:45", "11:30-12:30", "12:30-01:30"];
const GRID: { day: number; slot: number; sub: string }[] = [
  { day: 1, slot: 0, sub: "COA" }, { day: 1, slot: 1, sub: "DM" }, { day: 1, slot: 2, sub: "TOC" }, { day: 1, slot: 3, sub: "FCSP-II" },
  { day: 2, slot: 0, sub: "FCSP-II" }, { day: 2, slot: 1, sub: "COA" }, { day: 2, slot: 2, sub: "DM" }, { day: 2, slot: 3, sub: "IMM" },
  { day: 3, slot: 0, sub: "FSD-2" }, { day: 3, slot: 1, sub: "FSD-2" }, { day: 3, slot: 2, sub: "COA" }, { day: 3, slot: 3, sub: "DM" },
  { day: 4, slot: 0, sub: "TOC" }, { day: 4, slot: 1, sub: "IMM" }, { day: 4, slot: 2, sub: "COA" }, { day: 4, slot: 3, sub: "FSD-2" },
  { day: 5, slot: 0, sub: "FSD-2" }, { day: 5, slot: 1, sub: "TOC" }, { day: 5, slot: 2, sub: "IMM" }, { day: 5, slot: 3, sub: "FCSP-II" },
  { day: 6, slot: 0, sub: "FCSP-II" }, { day: 6, slot: 1, sub: "DM" }, { day: 6, slot: 2, sub: "TOC" },
];

// A student's overall attendance disposition — a realistic spread, not a uniform ~85%.
function studentBase(): number {
  const r = Math.random();
  if (r < 0.10) return rand(25, 55);   // chronic absentees
  if (r < 0.30) return rand(55, 72);   // borderline
  if (r < 0.85) return rand(72, 92);   // regular
  return rand(90, 100);                // toppers
}

async function chunked<T>(model: { createMany: (a: { data: T[]; skipDuplicates?: boolean }) => Promise<{ count: number }> }, rows: T[], size = 5000) {
  let n = 0;
  for (let i = 0; i < rows.length; i += size) n += (await model.createMany({ data: rows.slice(i, i + size), skipDuplicates: true })).count;
  return n;
}

async function main() {
  const hod = await prisma.faculty.findFirst({ where: { employeeId: { equals: "EMP015", mode: "insensitive" } } });
  if (!hod) throw new Error("emp015 (SY HOD) not found.");
  const sem = await prisma.semester.findFirst({ where: { number: 3, status: "ACTIVE", universityId: hod.universityId } });
  if (!sem) throw new Error("No ACTIVE Semester 3 for this university.");
  const uni = hod.universityId;

  // Batches C1–C9 that this HOD owns on the active semester.
  const scopes = await prisma.hodBatchScope.findMany({ where: { semesterId: sem.id, facultyId: hod.id }, include: { batch: { select: { id: true, code: true } } }, orderBy: { batch: { code: "asc" } } });
  const batches = scopes.map((s) => s.batch);
  if (!batches.length) throw new Error("emp015 owns no batches on the active Sem 3.");

  // ── 1. Subjects (upsert the 6 SY subjects at semesterNumber 3) ──
  const subjById = new Map<string, { id: string; code: string; type: string }>();
  for (const s of SUBJECTS) {
    const row = await prisma.subject.upsert({
      where: { universityId_semesterNumber_code: { universityId: uni, semesterNumber: 3, code: s.code } },
      update: { name: s.name, credits: s.credits, type: s.type as any, deletedAt: null },
      create: { universityId: uni, semesterNumber: 3, code: s.code, name: s.name, credits: s.credits, type: s.type as any },
      select: { id: true, code: true, type: true },
    });
    subjById.set(s.code, row);
  }
  console.log(`✓ ${subjById.size} subjects · ${batches.length} batches (${batches.map((b) => b.code).join(",")})`);

  // Faculty pool for assignments: SY non-HOD active faculty, else fall back to the HOD.
  const pool = await prisma.faculty.findMany({ where: { universityId: uni, year: "SY", isHod: false, isActive: true, deletedAt: null }, select: { id: true } });
  const poolIds = pool.length ? pool.map((p) => p.id) : [hod.id];
  const facultyFor = (batchIdx: number, subIdx: number) => poolIds[(subIdx * batches.length + batchIdx) % poolIds.length];

  // ── 2. Faculty per (batch, subject) ──
  await prisma.facultyBatchAssignment.deleteMany({ where: { semesterId: sem.id } });
  const fbaRows = batches.flatMap((b, bi) => SUBJECTS.map((s, si) => ({ facultyId: facultyFor(bi, si), batchId: b.id, subjectId: subjById.get(s.code)!.id, semesterId: sem.id })));
  console.log(`✓ ${await chunked(prisma.facultyBatchAssignment, fbaRows)} faculty–batch–subject assignments`);

  // ── 3. Timetable for every batch (faculty attached) ──
  await prisma.timetableSlot.deleteMany({ where: { semesterId: sem.id } });
  const subIdx = (code: string) => SUBJECTS.findIndex((s) => s.code === code);
  const slotRows = batches.flatMap((b, bi) =>
    GRID.map((g) => {
      const subj = subjById.get(g.sub)!;
      const [slotStart, slotEnd] = SLOTS[g.slot].split("-");
      const isLab = subj.type === "PRACTICAL";
      return { semesterId: sem.id, batchId: b.id, subjectId: subj.id, facultyId: facultyFor(bi, subIdx(g.sub)), dayOfWeek: g.day, slotStart, slotEnd, room: isLab ? `Lab-${(bi % 4) + 1}` : `${300 + bi + 1}` };
    }),
  );
  console.log(`✓ ${await chunked(prisma.timetableSlot, slotRows)} timetable slots`);

  // ── 4. Attendance — very random: per-student disposition ± per-subject noise, real lecture counts ──
  const enrollments = await prisma.studentEnrollment.findMany({ where: { semesterId: sem.id, isCurrent: true }, select: { id: true, batchId: true } });
  const enrIds = enrollments.map((e) => e.id);
  for (let i = 0; i < enrIds.length; i += 500) await prisma.attendanceRecord.deleteMany({ where: { enrollmentId: { in: enrIds.slice(i, i + 500) } } });
  const datesFor = (n: number) => Array.from({ length: n }, (_, d) => new Date(2026, 2 + Math.floor(d / 22), 1 + (d % 22) + 1));
  const attRows: any[] = [];
  for (const enr of enrollments) {
    const base = studentBase();
    const bi = Math.max(0, batches.findIndex((b) => b.id === enr.batchId));
    for (const s of SUBJECTS) {
      const subjPct = clamp(base + rand(-12, 12), 5, 100); // per-subject variation → very random
      const fac = facultyFor(bi, subIdx(s.code));
      const dates = datesFor(s.lectures);
      dates.forEach((lectureDate, idx) => {
        attRows.push({ enrollmentId: enr.id, subjectId: subjById.get(s.code)!.id, facultyId: fac, lectureDate, isPresent: rand(1, 100) <= subjPct, isLocked: idx < Math.floor(dates.length * 0.7) });
      });
    }
  }
  console.log(`✓ ${await chunked(prisma.attendanceRecord, attRows)} attendance records`);

  // ── 5. Marks through T1–T3 — 25-mark exams, very random per phase/subject/student, published ──
  const PHASE_MAX = 25; // T1/T2/T3 are each out of 25
  await prisma.result.deleteMany({ where: { enrollment: { semesterId: sem.id } } });
  const phases = await prisma.phase.findMany({ where: { semesterId: sem.id, number: { in: [1, 2, 3] } }, select: { id: true } });
  const resRows: any[] = [];
  for (const ph of phases) {
    for (const s of SUBJECTS) {
      const subjId = subjById.get(s.code)!.id;
      for (const enr of enrollments) {
        const marks = rand(4, PHASE_MAX); // wide, independent spread out of 25 → very random
        resRows.push({ enrollmentId: enr.id, phaseId: ph.id, subjectId: subjId, marksObtained: marks, maxMarks: PHASE_MAX, grade: gradeFor(Math.round((marks / PHASE_MAX) * 100)), isPublished: true, publishedAt: new Date(), uploadedById: hod.id });
      }
    }
  }
  console.log(`✓ ${await chunked(prisma.result, resRows)} results (T1–T3 published)`);
  console.log("✓ SY-3 C1–C9 seed complete.");
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
