import prisma from "../src/config/prisma.js";

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

const gradeFor = (m: number) =>
  m >= 90
    ? "A+"
    : m >= 80
    ? "A"
    : m >= 70
    ? "B"
    : m >= 60
    ? "C"
    : m >= 50
    ? "D"
    : m >= 40
    ? "E"
    : "F";

// Semester 3 subjects (must already exist in DB)
const SUBJECTS = [
  { code: "COA", lectures: 60 },
  { code: "DM", lectures: 42 },
  { code: "TOC", lectures: 45 },
  { code: "IMM", lectures: 40 },
  { code: "FCSP-II", lectures: 64 },
  { code: "FSD-2", lectures: 68 },
];

// Overall attendance distribution
function studentBase(): number {
  const r = Math.random();

  if (r < 0.1) return rand(25, 55);
  if (r < 0.3) return rand(55, 72);
  if (r < 0.85) return rand(72, 92);

  return rand(90, 100);
}

async function chunked<T>(
  model: {
    createMany: (args: {
      data: T[];
      skipDuplicates?: boolean;
    }) => Promise<{ count: number }>;
  },
  rows: T[],
  size = 5000
) {
  let inserted = 0;

  for (let i = 0; i < rows.length; i += size) {
    inserted += (
      await model.createMany({
        data: rows.slice(i, i + size),
        skipDuplicates: true,
      })
    ).count;
  }

  return inserted;
}

function lectureDates(total: number) {
  return Array.from({ length: total }, (_, i) => {
    return new Date(
      2026,
      2 + Math.floor(i / 22),
      2 + (i % 22)
    );
  });
}

async function main() {
  console.log("Finding HOD...");

  const hod = await prisma.faculty.findFirst({
    where: {
      employeeId: {
        equals: "EMP004",
        mode: "insensitive",
      },
    },
  });

  if (!hod) throw new Error("EMP015 not found.");

  const semester = await prisma.semester.findFirst({
    where: {
      universityId: hod.universityId,
      number: 3,
      status: "ACTIVE",
    },
  });

  if (!semester)
    throw new Error("Active Semester 3 not found.");

  console.log("Loading batches...");

  const scopes = await prisma.hodBatchScope.findMany({
    where: {
      facultyId: hod.id,
      semesterId: semester.id,
    },
    include: {
      batch: true,
    },
  });

  if (!scopes.length)
    throw new Error("No HOD batch scope found.");

  const batches = scopes.map((s) => s.batch);

  console.log(`Batches: ${batches.map((b) => b.code).join(", ")}`);

  console.log("Loading subjects...");

  const subjectRows = await prisma.subject.findMany({
    where: {
      universityId: hod.universityId,
      semesterNumber: 3,
      deletedAt: null,
    },
    select: {
      id: true,
      code: true,
      type: true,
    },
  });

  const subjectMap = new Map(subjectRows.map((s) => [s.code, s]));

  for (const s of SUBJECTS) {
    if (!subjectMap.has(s.code)) {
      throw new Error(`Subject ${s.code} not found.`);
    }
  }

  console.log("Loading timetable...");

  const timetable = await prisma.timetableSlot.findMany({
    where: {
      semesterId: semester.id,
    },
    select: {
      batchId: true,
      subjectId: true,
      facultyId: true,
    },
  });

  const facultyMap = new Map<string, string>();

  for (const t of timetable) {
    facultyMap.set(
      `${t.batchId}_${t.subjectId}`,
      t.facultyId
    );
  }

  console.log("Loading enrollments...");

  const enrollments =
    await prisma.studentEnrollment.findMany({
      where: {
        semesterId: semester.id,
        isCurrent: true,
      },
      select: {
        id: true,
        batchId: true,
      },
    });

  console.log(
    `Students Found : ${enrollments.length}`
  );

  // ---------------- Attendance ----------------

  console.log("Deleting old attendance...");

  const enrollmentIds = enrollments.map((e) => e.id);

  for (let i = 0; i < enrollmentIds.length; i += 500) {
    await prisma.attendanceRecord.deleteMany({
      where: {
        enrollmentId: {
          in: enrollmentIds.slice(i, i + 500),
        },
      },
    });
  }

  console.log("Generating attendance...");

  const attendanceRows: any[] = [];

  for (const enrollment of enrollments) {
    const base = studentBase();

    for (const s of SUBJECTS) {
      const subject = subjectMap.get(s.code)!;

      const facultyId = facultyMap.get(
        `${enrollment.batchId}_${subject.id}`
      );

      if (!facultyId) continue;

      const percentage = clamp(
        base + rand(-12, 12),
        5,
        100
      );

      const dates = lectureDates(s.lectures);

      dates.forEach((date, index) => {
        attendanceRows.push({
          enrollmentId: enrollment.id,
          subjectId: subject.id,
          facultyId,
          lectureDate: date,
          isPresent:
            rand(1, 100) <= percentage,
          isLocked:
            index <
            Math.floor(dates.length * 0.7),
        });
      });
    }
  }

  const attendanceInserted = await chunked(
    prisma.attendanceRecord,
    attendanceRows
  );

  console.log(
    `Attendance Inserted : ${attendanceInserted}`
  );

  // ---------------- Results ----------------

  console.log("Deleting old results...");

  await prisma.result.deleteMany({
    where: {
      enrollment: {
        semesterId: semester.id,
      },
    },
  });

  const phases = await prisma.phase.findMany({
    where: {
      semesterId: semester.id,
      number: {
        in: [1, 2, 3],
      },
    },
    select: {
      id: true,
    },
  });

  if (!phases.length)
    throw new Error("T1/T2/T3 phases not found.");

  console.log("Generating marks...");

  const resultRows: any[] = [];

  for (const phase of phases) {
    for (const s of SUBJECTS) {
      const subject = subjectMap.get(s.code)!;

      for (const enrollment of enrollments) {
        const marks = rand(4, 25);

        resultRows.push({
          enrollmentId: enrollment.id,
          phaseId: phase.id,
          subjectId: subject.id,
          marksObtained: marks,
          maxMarks: 25,
          grade: gradeFor(
            Math.round((marks / 25) * 100)
          ),
          isPublished: true,
          publishedAt: new Date(),
          uploadedById: hod.id,
        });
      }
    }
  }

  const resultsInserted = await chunked(
    prisma.result,
    resultRows
  );

  console.log(
    `Results Inserted : ${resultsInserted}`
  );

  console.log("================================");
  console.log("Attendance & Marks Seed Complete");
  console.log("================================");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });