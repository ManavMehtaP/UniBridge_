// ponytail: DESTRUCTIVE clean start. Wipes ALL academic + student data, keeps the people.
//   KEEPS  → universities, university_branches, faculties (dean/HODs/faculty), attendance_rules, notification_configs, refresh_tokens
//   WIPES  → every academic year, semester, subject, phase, batch, student, enrollment,
//            attendance, result, mentor/faculty assignment, quiz/note/announcement/notification, etc.
// Then regenerates ONE clean academic year "2026-27" with 8 semesters (1/3/5/7 ACTIVE) + phases.
// HODs then onboard (initial + branches + count) and upload student CSVs.
import prisma from "../src/config/prisma.js";

const WIPE_TABLES = [
  "academic_years", "semesters", "subjects", "phases", "batches",
  "student_enrollments", "students", "results", "attendance_records",
  "mentor_assignments", "hod_batch_scopes", "faculty_batch_assignments",
  "promotion_drafts", "promotion_mappings",
  "notes", "flashcards", "self_notes", "pyq_files", "pyq_analyses",
  "quizzes", "questions", "quiz_attempts",
  "timetable_slots", "calendar_events", "announcements", "announcement_reads",
  "exam_coordinators", "paper_check_assignments",
  "notifications", "chat_messages", "ai_conversations", "activity_logs",
];

async function main() {
  const uni = await prisma.university.findFirst();
  if (!uni) throw new Error("No university — bootstrap first.");

  const before = {
    years: await prisma.academicYear.count(),
    students: await prisma.student.count(),
    batches: await prisma.batch.count(),
    faculty: await prisma.faculty.count(),
  };
  console.log("Before:", before);

  console.log("Wiping academic + student data (CASCADE)…");
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${WIPE_TABLES.map((t) => `"${t}"`).join(", ")} CASCADE;`,
  );
  console.log(`  ✓ truncated ${WIPE_TABLES.length} tables`);

  // ── Regenerate 4 concurrent BATCHES (one academic year each) ──
  // Each is a 4-year batch with 8 semesters; exactly one semester ACTIVE (its current year level).
  const YL_BY_SEM = ["FY", "FY", "SY", "SY", "TY", "TY", "FINAL", "FINAL"] as const;
  const COHORTS = [
    { label: "2025-2029", activeNum: 1, yl: "FY" },     // just admitted
    { label: "2024-2028", activeNum: 3, yl: "SY" },     // 2nd year
    { label: "2023-2027", activeNum: 5, yl: "TY" },     // 3rd year
    { label: "2022-2026", activeNum: 7, yl: "FINAL" },  // final year
  ];
  for (const c of COHORTS) {
    const y1 = Number(c.label.split("-")[0]);
    const start = new Date(`${y1}-07-01`);
    const end = new Date(`${y1 + 4}-05-31`);
    const year = await prisma.academicYear.create({
      data: { universityId: uni.id, label: c.label, status: "ACTIVE", startDate: start, endDate: end },
    });
    const perSem = (end.getTime() - start.getTime()) / 8;
    for (let n = 1; n <= 8; n++) {
      const semStart = new Date(start.getTime() + perSem * (n - 1));
      const semEnd = new Date(start.getTime() + perSem * n);
      const status = n === c.activeNum ? "ACTIVE" : n < c.activeNum ? "COMPLETE" : "UPCOMING";
      const sem = await prisma.semester.create({
        data: {
          universityId: uni.id, academicYearId: year.id, number: n,
          label: `Semester ${n}`, yearLevel: YL_BY_SEM[n - 1],
          status: status as any, startDate: semStart, endDate: semEnd, phaseCount: 4,
        },
      });
      const span = (semEnd.getTime() - semStart.getTime()) / 4;
      for (let p = 1; p <= 4; p++) {
        const pStart = new Date(semStart.getTime() + span * (p - 1));
        const pEnd = new Date(semStart.getTime() + span * p);
        await prisma.phase.create({
          data: {
            semesterId: sem.id, number: p, label: `T${p}`,
            startDate: pStart, endDate: pEnd, examDate: new Date(pEnd.getTime() + 3 * 86400_000),
            isComplete: n < c.activeNum,
          },
        });
      }
    }
    console.log(`  + batch ${c.label} → ${c.yl} (Sem ${c.activeNum} active)`);
  }

  // Attendance rules (recreate if the wipe touched nothing — it doesn't, but be safe)
  await prisma.attendanceRules.upsert({
    where: { universityId: uni.id }, update: {},
    create: { universityId: uni.id, minThresholdPct: 75, warningThresholdPct: 80, autoNotifyMentor: true, autoLockAfterDays: 7 },
  });

  const after = {
    years: await prisma.academicYear.count(),
    semesters: await prisma.semester.count(),
    activeSemesters: await prisma.semester.count({ where: { status: "ACTIVE" } }),
    students: await prisma.student.count(),
    batches: await prisma.batch.count(),
    faculty: await prisma.faculty.count(),
    hods: await prisma.faculty.count({ where: { isHod: true } }),
  };
  console.log("After:", after);
  console.log("\n✓ Clean start ready. 4 batches active (FY/SY/TY/FINAL).");
  console.log("  HODs log in → onboard (initial + branches) → upload CSV.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
