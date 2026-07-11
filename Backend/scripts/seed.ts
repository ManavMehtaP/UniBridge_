// ponytail: multi-cohort seed for full-website demo. Idempotent-ish — reruns skip existing named rows.
// Cohorts (as-of academic year 2026-27):
//   2022-2026 → FINAL year, Sem 8 (graduating)
//   2023-2027 → FINAL year, Sem 7
//   2024-2028 → TY,         Sem 5   (user typed "8th" — treated as typo for 5th)
//   2025-2029 → FY,         Sem 2
// Each cohort has: 1 HOD, 2 batches × 15 students, 5 subjects, 5 faculty, attendance + published results.
import prisma from "../src/config/prisma.js";

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const FIRST_NAMES = ["Aarav","Vivaan","Aditya","Vihaan","Arjun","Rohan","Ishan","Kabir","Reyansh","Krishna","Ananya","Diya","Aanya","Aadhya","Saanvi","Pari","Kiara","Myra","Anika","Sara","Kavy","Meera","Priya","Rhea","Yash","Dhruv","Arya","Riya","Neel","Ishaan"];
const LAST_NAMES  = ["Patel","Shah","Mehta","Joshi","Trivedi","Desai","Kapadia","Amin","Bhatt","Raval","Vyas","Modi","Thakkar","Parekh","Doshi","Panchal"];

type YL = "FY" | "SY" | "TY" | "FINAL";
interface Cohort {
  admissionYear: number;         // 2022, 2023, ...
  gradYear: number;              // 2026, 2027, ...
  yearLevel: YL;
  semNumber: number;             // 2 | 5 | 7 | 8
  hodEmp: string;
  hodName: string;
  batchInitial: string;          // "A" → A1, A2
  batchCount: number;
  studentsPerBatch: number;
  branch: string;                // "IT" or "CE"
}

const COHORTS: Cohort[] = [
  { admissionYear: 2022, gradYear: 2026, yearLevel: "FINAL", semNumber: 8, hodEmp: "EMP-F1", hodName: "Dr. Nirav Modi",       batchInitial: "F", batchCount: 2, studentsPerBatch: 15, branch: "IT" },
  { admissionYear: 2023, gradYear: 2027, yearLevel: "FINAL", semNumber: 7, hodEmp: "EMP-F2", hodName: "Dr. Meera Bhatt",       batchInitial: "E", batchCount: 2, studentsPerBatch: 15, branch: "IT" },
  { admissionYear: 2024, gradYear: 2028, yearLevel: "TY",    semNumber: 5, hodEmp: "EMP-T1", hodName: "Dr. Rakesh Iyer",       batchInitial: "T", batchCount: 2, studentsPerBatch: 15, branch: "IT" },
  { admissionYear: 2025, gradYear: 2029, yearLevel: "FY",    semNumber: 2, hodEmp: "EMP-Y1", hodName: "Dr. Priya Deshmukh",    batchInitial: "A", batchCount: 2, studentsPerBatch: 15, branch: "IT" },
];

const SUBJECTS_BY_SEM: Record<number, { code: string; name: string; credits: number; type: "THEORY" | "PRACTICAL" }[]> = {
  2: [
    { code: "PPS",  name: "Programming for Problem Solving", credits: 4, type: "THEORY" },
    { code: "EM-2", name: "Engineering Mathematics 2",       credits: 4, type: "THEORY" },
    { code: "ECE",  name: "Electronics & Communication",     credits: 3, type: "THEORY" },
    { code: "PPS-P",name: "PPS Practical",                   credits: 2, type: "PRACTICAL" },
    { code: "ES",   name: "Environmental Studies",           credits: 2, type: "THEORY" },
  ],
  5: [
    { code: "OS",   name: "Operating Systems",               credits: 4, type: "THEORY" },
    { code: "DBMS", name: "Database Management Systems",     credits: 4, type: "THEORY" },
    { code: "CN",   name: "Computer Networks",               credits: 3, type: "THEORY" },
    { code: "OS-P", name: "OS Practical",                    credits: 2, type: "PRACTICAL" },
    { code: "SE",   name: "Software Engineering",            credits: 3, type: "THEORY" },
  ],
  7: [
    { code: "AI",    name: "Artificial Intelligence",        credits: 4, type: "THEORY" },
    { code: "CC",    name: "Cloud Computing",                credits: 3, type: "THEORY" },
    { code: "CYSEC", name: "Cyber Security",                 credits: 3, type: "THEORY" },
    { code: "PROJ",  name: "Major Project — Phase 1",        credits: 4, type: "PRACTICAL" },
    { code: "ELE-1", name: "Elective 1 — Big Data",          credits: 3, type: "THEORY" },
  ],
  8: [
    { code: "ML",    name: "Machine Learning",               credits: 4, type: "THEORY" },
    { code: "DEVOPS",name: "DevOps & CI/CD",                 credits: 3, type: "THEORY" },
    { code: "IOT",   name: "Internet of Things",             credits: 3, type: "THEORY" },
    { code: "PROJ2", name: "Major Project — Phase 2",        credits: 6, type: "PRACTICAL" },
    { code: "ELE-2", name: "Elective 2 — Blockchain",        credits: 3, type: "THEORY" },
  ],
};

const FACULTY_POOL: Record<number, { emp: string; name: string; mentor: string }[]> = {
  2: [
    { emp: "EMP-Y-1", name: "Prof. Divya Mehta",   mentor: "DYM" },
    { emp: "EMP-Y-2", name: "Prof. Nikhil Amin",   mentor: "NKA" },
    { emp: "EMP-Y-3", name: "Prof. Ritu Vyas",     mentor: "RTV" },
    { emp: "EMP-Y-4", name: "Prof. Sanket Doshi",  mentor: "SND" },
    { emp: "EMP-Y-5", name: "Prof. Kavita Raval",  mentor: "KVR" },
  ],
  5: [
    { emp: "EMP-T-1", name: "Dr. Sameer Kapadia",  mentor: "SMK" },
    { emp: "EMP-T-2", name: "Dr. Anushka Panchal", mentor: "ANP" },
    { emp: "EMP-T-3", name: "Prof. Karan Trivedi", mentor: "KRT" },
    { emp: "EMP-T-4", name: "Prof. Neha Joshi",    mentor: "NHJ" },
    { emp: "EMP-T-5", name: "Prof. Rajat Shah",    mentor: "RJS" },
  ],
  7: [
    { emp: "EMP-E-1", name: "Dr. Ashok Parekh",    mentor: "ASP" },
    { emp: "EMP-E-2", name: "Dr. Riya Modi",       mentor: "RYM" },
    { emp: "EMP-E-3", name: "Prof. Deepak Desai",  mentor: "DPD" },
    { emp: "EMP-E-4", name: "Prof. Sneha Patel",   mentor: "SNP" },
    { emp: "EMP-E-5", name: "Prof. Manav Thakkar", mentor: "MVT" },
  ],
  8: [
    { emp: "EMP-F-1", name: "Dr. Bhavesh Raval",   mentor: "BHR" },
    { emp: "EMP-F-2", name: "Dr. Payal Amin",      mentor: "PYA" },
    { emp: "EMP-F-3", name: "Prof. Chirag Vyas",   mentor: "CGV" },
    { emp: "EMP-F-4", name: "Prof. Ishita Joshi",  mentor: "ISJ" },
    { emp: "EMP-F-5", name: "Prof. Yash Bhatt",    mentor: "YSB" },
  ],
};

async function ensureAcademicYear(uniId: string, label: string, active: boolean) {
  const [startYear] = label.split("-").map(Number);
  let y = await prisma.academicYear.findFirst({ where: { universityId: uniId, label } });
  if (!y) {
    y = await prisma.academicYear.create({
      data: { universityId: uniId, label, status: active ? "ACTIVE" : "ARCHIVED",
              startDate: new Date(`${startYear}-07-01`), endDate: new Date(`${startYear + 1}-04-30`) },
    });
    console.log(`  + AY ${label}`);
  } else if (active && y.status !== "ACTIVE") {
    await prisma.academicYear.update({ where: { id: y.id }, data: { status: "ACTIVE" } });
  }
  return y;
}

async function ensureAllSemesters(uniId: string, yearId: string, yearLabel: string, activeSemNumbers: Set<number>) {
  const [startYear] = yearLabel.split("-").map(Number);
  const YL_BY_SEM: YL[] = ["FY","FY","SY","SY","TY","TY","FINAL","FINAL"];
  const created: { number: number; id: string }[] = [];
  for (let n = 1; n <= 8; n++) {
    let s = await prisma.semester.findFirst({ where: { academicYearId: yearId, number: n } });
    if (!s) {
      const monthOffset = ((n - 1) % 2) * 6; // even sem starts 6mo after odd
      const start = new Date(startYear, 6 + monthOffset, 15);
      const end   = new Date(startYear, 6 + monthOffset + 5, 15);
      s = await prisma.semester.create({
        data: { universityId: uniId, academicYearId: yearId, number: n,
                label: `Semester ${n}`, yearLevel: YL_BY_SEM[n - 1],
                status: activeSemNumbers.has(n) ? "ACTIVE" : "UPCOMING",
                startDate: start, endDate: end, phaseCount: 4 },
      });
    } else {
      const desired = activeSemNumbers.has(n) ? "ACTIVE" : (s.status === "ACTIVE" ? "COMPLETE" : s.status);
      if (s.status !== desired) await prisma.semester.update({ where: { id: s.id }, data: { status: desired } });
    }
    created.push({ number: n, id: s.id });
    // Phases per semester (T1..T4)
    const semStart = new Date(s.startDate).getTime();
    const span = (new Date(s.endDate).getTime() - semStart) / 4;
    for (let p = 1; p <= 4; p++) {
      const exists = await prisma.phase.findUnique({ where: { semesterId_number: { semesterId: s.id, number: p } } });
      if (!exists) {
        const pStart = new Date(semStart + span * (p - 1));
        const pEnd   = new Date(semStart + span * p);
        await prisma.phase.create({
          data: { semesterId: s.id, number: p, label: `T${p}`,
                  startDate: pStart, endDate: pEnd, examDate: new Date(pEnd.getTime() + 3 * 86400_000),
                  isComplete: activeSemNumbers.has(n) && p <= 2 },
        });
      }
    }
  }
  return created;
}

async function ensureBranch(uniId: string, code: string, name: string) {
  const existing = await prisma.universityBranch.findFirst({ where: { universityId: uniId, code } });
  if (existing) return existing;
  return prisma.universityBranch.create({ data: { universityId: uniId, code, name } });
}

async function ensureHod(uniId: string, cohort: Cohort) {
  const existing = await prisma.faculty.findFirst({ where: { employeeId: cohort.hodEmp, deletedAt: null } });
  if (existing) {
    if (!existing.isHod || existing.year !== cohort.yearLevel) {
      await prisma.faculty.update({ where: { id: existing.id }, data: { isHod: true, year: cohort.yearLevel, isActive: true } });
    }
    return existing;
  }
  const nameSlug = cohort.hodName.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.+|\.+$/g, "");
  return prisma.faculty.create({
    data: {
      universityId: uniId, employeeId: cohort.hodEmp, name: cohort.hodName,
      email: `${nameSlug}@mail.ljku.edu.in`, passwordHash: `${cohort.hodEmp}@123`,
      year: cohort.yearLevel, isHod: true, isActive: true,
    },
  });
}

async function ensureFacultyPool(uniId: string, semNumber: number, yearLevel: YL) {
  const pool = FACULTY_POOL[semNumber];
  const out: { id: string; emp: string; mentor: string }[] = [];
  for (const f of pool) {
    let fac = await prisma.faculty.findFirst({ where: { employeeId: f.emp, deletedAt: null } });
    if (!fac) {
      const slug = f.name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.+|\.+$/g, "");
      fac = await prisma.faculty.create({
        data: {
          universityId: uniId, employeeId: f.emp, name: f.name,
          email: `${slug}@mail.ljku.edu.in`, passwordHash: `${f.emp}@123`,
          year: yearLevel, isHod: false, isActive: true, mentorCode: f.mentor,
        },
      });
    } else if (fac.year !== yearLevel) {
      await prisma.faculty.update({ where: { id: fac.id }, data: { year: yearLevel } });
    }
    out.push({ id: fac.id, emp: f.emp, mentor: f.mentor });
  }
  return out;
}

async function ensureSubjects(uniId: string, semId: string, semNumber: number) {
  const specs = SUBJECTS_BY_SEM[semNumber] || [];
  const map: Record<string, string> = {};
  for (const s of specs) {
    let subj = await prisma.subject.findFirst({ where: { semesterId: semId, code: s.code, deletedAt: null } });
    if (!subj) {
      subj = await prisma.subject.create({
        data: { universityId: uniId, semesterId: semId, code: s.code, name: s.name, credits: s.credits, type: s.type },
      });
    }
    map[s.code] = subj.id;
  }
  return map;
}

async function ensureBatch(uniId: string, yearId: string, code: string, yearLevel: YL) {
  let b = await prisma.batch.findFirst({ where: { academicYearId: yearId, code } });
  if (!b) {
    b = await prisma.batch.create({ data: { universityId: uniId, academicYearId: yearId, code, yearLevel } });
  }
  return b;
}

async function ensureHodScope(hodId: string, batchId: string, semId: string, yearId: string) {
  await prisma.hodBatchScope.upsert({
    where: { batchId }, update: { facultyId: hodId, semesterId: semId, academicYearId: yearId },
    create: { facultyId: hodId, batchId, semesterId: semId, academicYearId: yearId },
  });
}

async function seedCohort(uniId: string, activeYearId: string, cohort: Cohort, allSemesters: { number: number; id: string }[]) {
  console.log(`\n── Cohort ${cohort.admissionYear}-${cohort.gradYear} (${cohort.yearLevel} · Sem ${cohort.semNumber}) ──`);
  const currentSem = allSemesters.find((s) => s.number === cohort.semNumber)!;

  const hod = await ensureHod(uniId, cohort);
  console.log(`  ✓ HOD: ${cohort.hodName} (${cohort.hodEmp})`);

  const faculty = await ensureFacultyPool(uniId, cohort.semNumber, cohort.yearLevel);
  const subjects = await ensureSubjects(uniId, currentSem.id, cohort.semNumber);
  console.log(`  ✓ ${faculty.length} faculty · ${Object.keys(subjects).length} subjects`);

  // Batches + HOD scope
  const batches: { id: string; code: string }[] = [];
  for (let i = 1; i <= cohort.batchCount; i++) {
    const code = `${cohort.batchInitial}${i}`;
    const b = await ensureBatch(uniId, activeYearId, code, cohort.yearLevel);
    await ensureHodScope(hod.id, b.id, currentSem.id, activeYearId);
    batches.push({ id: b.id, code });
  }
  console.log(`  ✓ ${batches.length} batches → ${batches.map((b) => b.code).join(", ")}`);

  // Faculty-subject-batch assignments (round-robin)
  const subjEntries = Object.entries(subjects);
  for (let si = 0; si < subjEntries.length; si++) {
    const [_code, subjId] = subjEntries[si];
    const facId = faculty[si % faculty.length].id;
    for (const b of batches) {
      const exists = await prisma.facultyBatchAssignment.findFirst({
        where: { facultyId: facId, batchId: b.id, subjectId: subjId, semesterId: currentSem.id },
      });
      if (!exists) {
        await prisma.facultyBatchAssignment.create({
          data: { facultyId: facId, batchId: b.id, subjectId: subjId, semesterId: currentSem.id },
        });
      }
    }
  }

  // Students + current enrollments
  const branchTwoDigit = cohort.branch === "IT" ? "021" : "007";
  const existingCount = await prisma.studentEnrollment.count({ where: { semesterId: currentSem.id, batchId: { in: batches.map((b) => b.id) } } });
  const target = batches.length * cohort.studentsPerBatch;
  if (existingCount >= target) {
    console.log(`  ⏭  ${existingCount} students already in Sem ${cohort.semNumber}`);
  } else {
    const yr2 = String(cohort.admissionYear).slice(-2);
    for (let bi = 0; bi < batches.length; bi++) {
      const b = batches[bi];
      for (let i = 1; i <= cohort.studentsPerBatch; i++) {
        const idx = bi * cohort.studentsPerBatch + i;
        const first = pick(FIRST_NAMES); const last = pick(LAST_NAMES);
        const enrollmentNo = `${yr2}002170${branchTwoDigit}${String(idx).padStart(4, "0")}`;
        const rollNo = `${cohort.branch}-${yr2}-${String(idx).padStart(3, "0")}`;
        let stu = await prisma.student.findFirst({ where: { enrollmentNo, deletedAt: null } });
        if (!stu) {
          stu = await prisma.student.create({
            data: {
              universityId: uniId, enrollmentNo, name: `${first} ${last}`,
              email: `${enrollmentNo.toLowerCase()}@lju.edu.in`,
              branch: cohort.branch, admissionYear: cohort.admissionYear, isActive: true,
              passwordHash: `${enrollmentNo}@123`,
            },
          });
        }
        const exists = await prisma.studentEnrollment.findFirst({ where: { studentId: stu.id, semesterId: currentSem.id } });
        if (!exists) {
          await prisma.studentEnrollment.create({
            data: { studentId: stu.id, semesterId: currentSem.id, batchId: b.id, rollNo, yearLevel: cohort.yearLevel, isCurrent: true },
          });
        }
      }
    }
    console.log(`  ✓ ${target} students enrolled in Sem ${cohort.semNumber}`);
  }

  // Enrollments — mentor assignments
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { semesterId: currentSem.id, batchId: { in: batches.map((b) => b.id) } },
  });
  const mentorCount = await prisma.mentorAssignment.count({ where: { semesterId: currentSem.id, studentId: { in: enrollments.map((e) => e.studentId) } } });
  if (mentorCount < enrollments.length - 2) {
    for (let i = 0; i < enrollments.length; i++) {
      const enr = enrollments[i];
      if (i >= enrollments.length - 2) break; // leave 2 unassigned per cohort
      const mentor = faculty[i % faculty.length];
      const exists = await prisma.mentorAssignment.findFirst({ where: { studentId: enr.studentId, semesterId: currentSem.id } });
      if (!exists) {
        await prisma.mentorAssignment.create({
          data: { facultyId: mentor.id, studentId: enr.studentId, semesterId: currentSem.id, mentorCode: mentor.mentor },
        });
      }
    }
    console.log(`  ✓ mentors assigned (2 left free)`);
  }

  // Attendance — 12 lectures per subject per batch
  const attendKey = { facultyId: faculty[0].id, subjectId: Object.values(subjects)[0] };
  const anyAttend = await prisma.attendanceRecord.findFirst({ where: attendKey });
  if (!anyAttend) {
    let recCount = 0;
    for (const b of batches) {
      const batchEnrs = enrollments.filter((e) => e.batchId === b.id);
      const subjEntriesLocal = Object.entries(subjects);
      for (let si = 0; si < subjEntriesLocal.length; si++) {
        const [_c, subjId] = subjEntriesLocal[si];
        const facId = faculty[si % faculty.length].id;
        for (let day = 0; day < 12; day++) {
          const lectureDate = new Date(2026, 6, 15 + day * 2); // starting mid-July 2026, every other day
          for (const enr of batchEnrs) {
            const targetPct = rand(70, 95);
            const isPresent = rand(1, 100) <= targetPct;
            await prisma.attendanceRecord.create({
              data: { enrollmentId: enr.id, subjectId: subjId, facultyId: facId, lectureDate, isPresent, isLocked: day < 6 },
            });
            recCount++;
          }
        }
      }
    }
    console.log(`  ✓ ${recCount} attendance records`);
  }

  // Results — publish T1 + T2
  const phases = await prisma.phase.findMany({ where: { semesterId: currentSem.id, number: { in: [1, 2] } } });
  const anyResult = await prisma.result.findFirst({ where: { enrollmentId: { in: enrollments.slice(0, 1).map((e) => e.id) } } });
  if (!anyResult) {
    let rCount = 0;
    for (const ph of phases) {
      for (const [_c, subjId] of Object.entries(subjects)) {
        for (const enr of enrollments) {
          const marks = rand(35, 95);
          const grade = marks >= 90 ? "A+" : marks >= 80 ? "A" : marks >= 70 ? "B" : marks >= 60 ? "C" : marks >= 50 ? "D" : "F";
          await prisma.result.create({
            data: { enrollmentId: enr.id, phaseId: ph.id, subjectId: subjId,
                    marksObtained: marks, maxMarks: 100, grade, isPublished: true,
                    publishedAt: new Date(), uploadedById: hod.id },
          });
          rCount++;
        }
      }
    }
    console.log(`  ✓ ${rCount} results (T1 + T2 published)`);
  }
}

async function main() {
  const uni = await prisma.university.findFirst();
  if (!uni) throw new Error("No university — bootstrap first.");
  console.log(`Seeding for ${uni.slug}`);

  await ensureBranch(uni.id, "IT",  "Information Technology");
  await ensureBranch(uni.id, "CE",  "Computer Engineering");
  await ensureBranch(uni.id, "EC",  "Electronics & Communication");

  // Archived prior years (thin — just the AY row for history in Dean's Years page)
  await ensureAcademicYear(uni.id, "2022-23", false);
  await ensureAcademicYear(uni.id, "2023-24", false);
  await ensureAcademicYear(uni.id, "2024-25", false);
  await ensureAcademicYear(uni.id, "2025-26", false);

  // Active year — all 4 cohorts live inside 2026-27 with concurrent active sems
  const activeYear = await ensureAcademicYear(uni.id, "2026-27", true);
  // Ensure only 2026-27 is ACTIVE
  await prisma.academicYear.updateMany({ where: { universityId: uni.id, id: { not: activeYear.id }, status: "ACTIVE" }, data: { status: "ARCHIVED" } });

  const activeSemNums = new Set(COHORTS.map((c) => c.semNumber));
  const allSems = await ensureAllSemesters(uni.id, activeYear.id, activeYear.label, activeSemNums);
  console.log(`  ✓ 8 semesters (active: ${[...activeSemNums].sort().join(", ")})`);

  for (const c of COHORTS) {
    await seedCohort(uni.id, activeYear.id, c, allSems);
  }

  // Attendance rules (once per uni)
  await prisma.attendanceRules.upsert({
    where: { universityId: uni.id }, update: {},
    create: { universityId: uni.id, minThresholdPct: 75, warningThresholdPct: 80, autoNotifyMentor: true, autoLockAfterDays: 7 },
  });

  console.log("\n✓ Seed complete.");
  console.log("HODs → login with employeeId@123 as password (e.g. EMP-F1@123)");
  console.log("Students → login with enrollmentNo@123");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
