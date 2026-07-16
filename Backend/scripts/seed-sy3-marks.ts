// Seed attendance + results (through phase T3) for the ACTIVE Semester 3 (SY-3 HOD) students.
// Mirrors scripts/seed.ts patterns but targets the existing onboarded SY-3 cohort, which was
// created via onboarding + CSV upload and had no attendance/marks. Idempotent + chunked.
import prisma from "../src/config/prisma.js";

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const gradeFor = (m: number) => (m >= 90 ? "A+" : m >= 80 ? "A" : m >= 70 ? "B" : m >= 60 ? "C" : m >= 50 ? "D" : "F");
const LECTURES = 15;      // lectures per subject spanning the T1–T3 window
const PHASES_UP_TO = 3;   // publish T1, T2, T3

async function chunkedCreate<T>(model: { createMany: (a: { data: T[]; skipDuplicates?: boolean }) => Promise<{ count: number }> }, rows: T[], size = 2000) {
  let n = 0;
  for (let i = 0; i < rows.length; i += size) n += (await model.createMany({ data: rows.slice(i, i + size), skipDuplicates: true })).count;
  return n;
}

async function main() {
  // The SY-3 HOD's live semester = the ACTIVE Semester 3.
  const sem = await prisma.semester.findFirst({ where: { number: 3, status: "ACTIVE" } });
  if (!sem) throw new Error("No ACTIVE Semester 3 found.");
  const hodScope = await prisma.hodBatchScope.findFirst({ where: { semesterId: sem.id }, include: { faculty: true } });
  if (!hodScope) throw new Error("No HOD scope on the active Sem 3.");
  const hodId = hodScope.facultyId;
  console.log(`Sem 3 (${sem.id}) — HOD ${hodScope.faculty.name}`);

  const enrollments = await prisma.studentEnrollment.findMany({ where: { semesterId: sem.id, isCurrent: true }, select: { id: true, batchId: true } });
  const subjects = await prisma.subject.findMany({ where: { universityId: sem.universityId, semesterNumber: 3, deletedAt: null }, select: { id: true, code: true } });
  const phases = await prisma.phase.findMany({ where: { semesterId: sem.id, number: { in: Array.from({ length: PHASES_UP_TO }, (_, i) => i + 1) } } });
  const fba = await prisma.facultyBatchAssignment.findMany({ where: { semesterId: sem.id }, select: { subjectId: true, facultyId: true, batchId: true } });
  console.log(`  ${enrollments.length} students · ${subjects.length} subjects · phases ${phases.map((p) => p.label).join(",")} · ${fba.length} faculty assignments`);

  // Faculty to attribute a (batch, subject) to: exact assignment → any faculty for the subject → HOD.
  const byBatchSubj = new Map(fba.map((a) => [`${a.batchId}|${a.subjectId}`, a.facultyId]));
  const anyForSubj = new Map<string, string>();
  for (const a of fba) if (!anyForSubj.has(a.subjectId)) anyForSubj.set(a.subjectId, a.facultyId);
  const facultyFor = (batchId: string, subjectId: string) => byBatchSubj.get(`${batchId}|${subjectId}`) ?? anyForSubj.get(subjectId) ?? hodId;

  // ── Attendance ──
  if (await prisma.attendanceRecord.count({ where: { enrollment: { semesterId: sem.id } } }) > 0) {
    console.log("  ⏭  attendance already present — skipping");
  } else {
    const rows: any[] = [];
    for (const subj of subjects) {
      for (let day = 0; day < LECTURES; day++) {
        const lectureDate = new Date(2026, 5, 1 + day * 2); // June 2026, every other day
        for (const enr of enrollments) {
          const targetPct = rand(70, 95);
          rows.push({ enrollmentId: enr.id, subjectId: subj.id, facultyId: facultyFor(enr.batchId, subj.id), lectureDate, isPresent: rand(1, 100) <= targetPct, isLocked: day < 8 });
        }
      }
    }
    console.log(`  ✓ ${await chunkedCreate(prisma.attendanceRecord, rows)} attendance records`);
  }

  // ── Results (T1–T3, published) ──
  if (await prisma.result.count({ where: { enrollment: { semesterId: sem.id } } }) > 0) {
    console.log("  ⏭  results already present — skipping");
  } else {
    const rows: any[] = [];
    for (const ph of phases) {
      for (const subj of subjects) {
        for (const enr of enrollments) {
          const marks = rand(35, 95);
          rows.push({ enrollmentId: enr.id, phaseId: ph.id, subjectId: subj.id, marksObtained: marks, maxMarks: 100, grade: gradeFor(marks), isPublished: true, publishedAt: new Date(), uploadedById: hodId });
        }
      }
    }
    console.log(`  ✓ ${await chunkedCreate(prisma.result, rows)} results (T1–T3 published)`);
  }

  console.log("✓ SY-3 seed complete.");
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
