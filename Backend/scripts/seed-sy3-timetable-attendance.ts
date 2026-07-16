// Rebuild SY-3 (active Semester 3) so it looks like the real compiled sheet:
//  1. Assign faculty to every batch × subject (fba).
//  2. Give all 9 batches a complete, consistent weekly timetable (faculty attached).
//  3. Reseed attendance realistically — per-student tendency + real per-subject lecture
//     counts (COA 60, DM 42, TOC 45, FCSP-2 64, FSD-2 68 = 279), so %s vary like real students.
import prisma from "../src/config/prisma.js";

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Real per-subject lecture totals (from the compiled sheet, sum 279).
const LECTURES: Record<string, number> = { COA: 60, DM: 42, TOC: 45, "FCSP-2": 64, "FSD-2": 68 };

// Weekly timetable template: 08:45→01:30 with a 10:45–11:30 break, Mon–Sat.
const T = ["08:45-09:45", "09:45-10:45", "11:30-12:30", "12:30-01:30"];
const GRID: { day: number; slot: number; sub: string }[] = [
  { day: 1, slot: 0, sub: "COA" }, { day: 1, slot: 1, sub: "DM" }, { day: 1, slot: 2, sub: "TOC" }, { day: 1, slot: 3, sub: "FCSP-2" },
  { day: 2, slot: 0, sub: "FCSP-2" }, { day: 2, slot: 1, sub: "COA" }, { day: 2, slot: 2, sub: "DM" }, { day: 2, slot: 3, sub: "TOC" },
  { day: 3, slot: 0, sub: "FSD-2" }, { day: 3, slot: 1, sub: "FSD-2" }, { day: 3, slot: 2, sub: "COA" }, { day: 3, slot: 3, sub: "DM" },
  { day: 4, slot: 0, sub: "TOC" }, { day: 4, slot: 1, sub: "COA" }, { day: 4, slot: 2, sub: "DM" }, { day: 4, slot: 3, sub: "FSD-2" },
  { day: 5, slot: 0, sub: "FSD-2" }, { day: 5, slot: 1, sub: "TOC" }, { day: 5, slot: 2, sub: "COA" }, { day: 5, slot: 3, sub: "FCSP-2" },
  { day: 6, slot: 0, sub: "FCSP-2" }, { day: 6, slot: 1, sub: "DM" }, { day: 6, slot: 2, sub: "TOC" },
];

// A student's overall attendance disposition — a realistic spread, not a uniform ~85%.
function studentBase(): number {
  const r = Math.random();
  if (r < 0.10) return rand(30, 58);   // chronic absentees
  if (r < 0.30) return rand(58, 74);   // borderline
  if (r < 0.85) return rand(74, 92);   // regular
  return rand(90, 100);                // toppers
}

async function chunked<T>(model: { createMany: (a: { data: T[]; skipDuplicates?: boolean }) => Promise<{ count: number }> }, rows: T[], size = 5000) {
  let n = 0;
  for (let i = 0; i < rows.length; i += size) n += (await model.createMany({ data: rows.slice(i, i + size), skipDuplicates: true })).count;
  return n;
}

async function main() {
  const sem = await prisma.semester.findFirst({ where: { number: 3, status: "ACTIVE" } });
  if (!sem) throw new Error("No ACTIVE Semester 3.");
  const scopes = await prisma.hodBatchScope.findMany({ where: { semesterId: sem.id }, include: { batch: { select: { id: true, code: true } } }, orderBy: { batch: { code: "asc" } } });
  const batches = scopes.map((s) => s.batch);
  const subjects = await prisma.subject.findMany({ where: { universityId: sem.universityId, semesterNumber: 3, deletedAt: null }, select: { id: true, code: true, type: true } });
  const subByCode = new Map(subjects.map((s) => [s.code, s]));
  const pool = await prisma.faculty.findMany({ where: { universityId: sem.universityId, year: "SY", isHod: false, deletedAt: null, isActive: true }, select: { id: true } });
  console.log(`Sem 3 · ${batches.length} batches · ${subjects.length} subjects · ${pool.length} faculty`);

  // ── 1. Faculty per (batch, subject): spread across the pool, consistent per subject ──
  const facultyFor = (batchIdx: number, subIdx: number) => pool[(subIdx * batches.length + batchIdx) % pool.length].id;
  const fbaRows = batches.flatMap((b, bi) => subjects.map((s, si) => ({ facultyId: facultyFor(bi, si), batchId: b.id, subjectId: s.id, semesterId: sem.id })));
  await prisma.facultyBatchAssignment.deleteMany({ where: { semesterId: sem.id } });
  console.log(`  ✓ ${await chunked(prisma.facultyBatchAssignment, fbaRows)} faculty–batch–subject assignments (all batches)`);

  // ── 2. Timetable for every batch (faculty attached) ──
  await prisma.timetableSlot.deleteMany({ where: { semesterId: sem.id } });
  const slotRows = batches.flatMap((b, bi) =>
    GRID.map((g) => {
      const subj = subByCode.get(g.sub)!;
      const [slotStart, slotEnd] = T[g.slot].split("-");
      const isLab = subj.type === "PRACTICAL";
      return { semesterId: sem.id, batchId: b.id, subjectId: subj.id, facultyId: facultyFor(bi, subjects.findIndex((s) => s.code === g.sub)),
        dayOfWeek: g.day, slotStart, slotEnd, room: isLab ? `Lab-${(bi % 4) + 1}` : `${300 + bi + 1}` };
    }),
  );
  console.log(`  ✓ ${await chunked(prisma.timetableSlot, slotRows)} timetable slots across ${batches.length} batches`);

  // ── 3. Realistic attendance ──
  const enrollments = await prisma.studentEnrollment.findMany({ where: { semesterId: sem.id, isCurrent: true }, select: { id: true, batchId: true } });
  const enrIds = enrollments.map((e) => e.id);
  for (let i = 0; i < enrIds.length; i += 500) await prisma.attendanceRecord.deleteMany({ where: { enrollmentId: { in: enrIds.slice(i, i + 500) } } });

  // Distinct lecture dates per subject (spread over the term).
  const datesFor = (code: string) => Array.from({ length: LECTURES[code] }, (_, d) => new Date(2026, 2 + Math.floor(d / 22), 1 + (d % 22) * 1 + 1));
  const attRows: any[] = [];
  for (const enr of enrollments) {
    const base = studentBase();
    const bi = batches.findIndex((b) => b.id === enr.batchId);
    for (const s of subjects) {
      const subjPct = clamp(base + rand(-8, 8), 8, 100);
      const dates = datesFor(s.code);
      const fac = facultyFor(bi < 0 ? 0 : bi, subjects.indexOf(s));
      dates.forEach((lectureDate, idx) => {
        attRows.push({ enrollmentId: enr.id, subjectId: s.id, facultyId: fac, lectureDate, isPresent: rand(1, 100) <= subjPct, isLocked: idx < Math.floor(dates.length * 0.7) });
      });
    }
  }
  console.log(`  ✓ ${await chunked(prisma.attendanceRecord, attRows)} attendance records (realistic spread)`);
  console.log("✓ SY-3 timetable + faculty + attendance rebuilt.");
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
