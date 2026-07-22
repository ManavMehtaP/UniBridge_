import prisma from "../config/prisma.js";

type PhaseWindow = {
  number: number;
  startDate: Date;
  endDate: Date;
  examDate: Date | null;
};

type AcademicSubject = {
  id: string;
  code: string;
  name: string;
  lectureDays: number[];
  lectureCount: number;
  syllabusUnits: string[];
  focusTopics: string[];
};

function startOfDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function uniq(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

function jsonStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function activePhaseForToday(phases: PhaseWindow[]) {
  const today = startOfDay(new Date());
  return phases.find((phase) => startOfDay(phase.startDate) <= today && startOfDay(phase.endDate) >= today)
    ?? phases.find((phase) => startOfDay(phase.endDate) >= today)
    ?? phases[phases.length - 1]
    ?? { number: 4, startDate: today, endDate: today, examDate: null };
}

function nearestExamDate(semester: { endDate: Date }, phases: PhaseWindow[]) {
  const today = startOfDay(new Date());
  const future = phases
    .map((phase) => phase.examDate)
    .filter((examDate): examDate is Date => Boolean(examDate) && startOfDay(examDate) >= today)
    .sort((a, b) => a.getTime() - b.getTime());
  if (future[0]) return startOfDay(future[0]);
  const semesterEnd = startOfDay(semester.endDate);
  return semesterEnd >= today ? semesterEnd : addDays(today, 14);
}

function taskDuration(kind: "lecture" | "syllabus" | "revision", isWeekend: boolean) {
  if (kind === "revision") return isWeekend ? 35 : 25;
  if (kind === "lecture") return isWeekend ? 30 : 20;
  return isWeekend ? 40 : 30;
}

async function academicInputsForStudent(studentId: string, universityId: string) {
  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId, isCurrent: true },
    include: { semester: true },
  });
  if (!enrollment) {
    throw new Error("Current enrollment not found.");
  }

  const subjects = await prisma.subject.findMany({
    where: { universityId, semesterNumber: enrollment.semester.number, deletedAt: null, isActive: true },
    orderBy: { code: "asc" },
  });
  const subjectIds = subjects.map((subject) => subject.id);

  const [syllabi, phases, timetableSlots, events] = await Promise.all([
    prisma.subjectSyllabus.findMany({
      where: { semesterId: enrollment.semesterId, subjectId: { in: subjectIds } },
      orderBy: [{ subjectId: "asc" }, { unitOrder: "asc" }],
    }),
    prisma.phase.findMany({
      where: { semesterId: enrollment.semesterId },
      select: { number: true, startDate: true, endDate: true, examDate: true },
      orderBy: { number: "asc" },
    }),
    prisma.timetableSlot.findMany({
      where: { semesterId: enrollment.semesterId, batchId: enrollment.batchId, subjectId: { in: subjectIds } },
      orderBy: [{ dayOfWeek: "asc" }, { slotStart: "asc" }],
    }),
    prisma.calendarEvent.findMany({
      where: {
        universityId,
        semesterId: enrollment.semesterId,
        deletedAt: null,
        startDate: { gte: startOfDay(new Date()) },
      },
      orderBy: { startDate: "asc" },
      take: 20,
    }),
  ]);

  const activePhase = activePhaseForToday(phases);
  const syllabiBySubject = new Map<string, typeof syllabi>();
  for (const item of syllabi) {
    const current = syllabiBySubject.get(item.subjectId) ?? [];
    current.push(item);
    syllabiBySubject.set(item.subjectId, current);
  }

  const slotsBySubject = new Map<string, typeof timetableSlots>();
  for (const slot of timetableSlots) {
    const current = slotsBySubject.get(slot.subjectId) ?? [];
    current.push(slot);
    slotsBySubject.set(slot.subjectId, current);
  }

  const academicSubjects = subjects.map<AcademicSubject>((subject) => {
    const rows = syllabiBySubject.get(subject.id) ?? [];
    const phaseLimit = Math.max(1, Math.ceil(rows.length * Math.min(activePhase.number, 4) / 4));
    const phaseRows = rows.slice(0, phaseLimit);
    const syllabusUnits = uniq(phaseRows.map((item) => item.unitTitle));
    const focusTopics = uniq(phaseRows.flatMap((item) => [item.unitTitle, ...jsonStrings(item.topics).slice(0, 3)])).slice(0, 10);
    const slots = slotsBySubject.get(subject.id) ?? [];
    return {
      id: subject.id,
      code: subject.code,
      name: subject.name,
      lectureDays: uniq(slots.map((slot) => String(slot.dayOfWeek))).map(Number).filter(Number.isFinite),
      lectureCount: slots.length,
      syllabusUnits,
      focusTopics: focusTopics.length > 0 ? focusTopics : [`Revise ${subject.code} class material`],
    };
  }).sort((a, b) => b.lectureCount - a.lectureCount || a.code.localeCompare(b.code));

  return { enrollment, subjects: academicSubjects, phases, events };
}

function buildTasks(
  days: Date[],
  subjects: AcademicSubject[],
  completedDescriptions: Set<string>,
  eventDates: Set<string>,
) {
  const tasks: Array<{
    taskDate: Date;
    subjectId: string | null;
    description: string;
    estimatedDurationMinutes: number;
    priority: string;
  }> = [];
  if (subjects.length === 0) return tasks;

  days.forEach((day, index) => {
    const jsDay = day.getUTCDay();
    const timetableDay = jsDay === 0 ? 7 : jsDay;
    const isWeekend = jsDay === 0 || jsDay === 6;
    const dateKey = day.toISOString().slice(0, 10);
    const scheduled = subjects.filter((subject) => subject.lectureDays.includes(timetableDay));
    const primary = scheduled[0] ?? subjects[index % subjects.length];
    const secondary = subjects[(subjects.findIndex((subject) => subject.id === primary.id) + 1) % subjects.length];
    const primaryTopic = primary.focusTopics[index % primary.focusTopics.length] ?? `Revise ${primary.code}`;
    const daysLeft = days.length - index - 1;

    const firstDescription = scheduled.length > 0
      ? `After ${primary.code} lecture: consolidate ${primaryTopic} from the syllabus and write 5 recall points.`
      : `Study ${primary.code}: cover ${primaryTopic} from the faculty syllabus.`;
    if (!completedDescriptions.has(firstDescription)) {
      tasks.push({
        taskDate: day,
        subjectId: primary.id,
        description: firstDescription,
        estimatedDurationMinutes: taskDuration(scheduled.length > 0 ? "lecture" : "syllabus", isWeekend),
        priority: daysLeft <= 3 ? "high" : "medium",
      });
    }

    if (daysLeft <= 3) {
      const revisionDescription = `Exam revision: revise formulas, definitions, and unit summaries for ${primary.code}.`;
      if (!completedDescriptions.has(revisionDescription)) {
        tasks.push({
          taskDate: day,
          subjectId: primary.id,
          description: revisionDescription,
          estimatedDurationMinutes: taskDuration("revision", isWeekend),
          priority: "high",
        });
      }
      return;
    }

    if (secondary && secondary.id !== primary.id && !eventDates.has(dateKey)) {
      const secondaryTopic = secondary.focusTopics[index % secondary.focusTopics.length] ?? `Revise ${secondary.code}`;
      const description = `Short practice for ${secondary.code}: solve 3 questions from ${secondaryTopic}.`;
      if (!completedDescriptions.has(description)) {
        tasks.push({
          taskDate: day,
          subjectId: secondary.id,
          description,
          estimatedDurationMinutes: taskDuration("revision", isWeekend),
          priority: "low",
        });
      }
    }

    if (isWeekend) {
      const description = "Weekly syllabus audit: mark completed units, list doubts, and prepare questions for faculty.";
      if (!completedDescriptions.has(description)) {
        tasks.push({
          taskDate: day,
          subjectId: null,
          description,
          estimatedDurationMinutes: 25,
          priority: "medium",
        });
      }
    }
  });

  return tasks;
}

export async function generateStudyPlanForStudent(studentId: string, universityId: string) {
  const { enrollment, subjects, phases, events } = await academicInputsForStudent(studentId, universityId);
  const startDate = startOfDay(new Date());
  const endDate = nearestExamDate(enrollment.semester, phases);
  const dayCount = Math.max(1, Math.min(60, Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1));
  const days = Array.from({ length: dayCount }, (_value, index) => addDays(startDate, index));

  const existing = await prisma.studyPlan.findFirst({
    where: { studentId, semesterId: enrollment.semesterId },
    include: { tasks: true },
    orderBy: { createdAt: "desc" },
  });
  const completedDescriptions = new Set((existing?.tasks ?? []).filter((task) => task.isCompleted).map((task) => task.description));
  const eventDates = new Set(events.map((event) => startOfDay(event.startDate).toISOString().slice(0, 10)));

  let plan = existing;
  if (!plan) {
    plan = await prisma.studyPlan.create({
      data: {
        studentId,
        enrollmentId: enrollment.id,
        semesterId: enrollment.semesterId,
        weakSubjectIds: subjects.slice(0, 4).map((subject) => subject.id),
        weakTopics: uniq(subjects.flatMap((subject) => subject.focusTopics).slice(0, 12)),
        startDate,
        endDate,
        status: "active",
      },
      include: { tasks: true },
    });
  } else {
    await prisma.studyPlan.update({
      where: { id: plan.id },
      data: {
        weakSubjectIds: subjects.slice(0, 4).map((subject) => subject.id),
        weakTopics: uniq(subjects.flatMap((subject) => subject.focusTopics).slice(0, 12)),
        startDate,
        endDate,
        status: "active",
      },
    });
    await prisma.studyPlanTask.deleteMany({
      where: { studyPlanId: plan.id, isCompleted: false, isCustom: false },
    });
  }

  const tasks = buildTasks(days, subjects.slice(0, Math.max(1, Math.min(subjects.length, 5))), completedDescriptions, eventDates);
  if (tasks.length > 0) {
    await prisma.studyPlanTask.createMany({
      data: tasks.map((task) => ({
        studyPlanId: plan.id,
        subjectId: task.subjectId,
        taskDate: task.taskDate,
        description: task.description,
        estimatedDurationMinutes: task.estimatedDurationMinutes,
        priority: task.priority,
      })),
    });
  }

  return { planId: plan.id, startDate, endDate };
}

export async function refreshStudyPlanAfterProgress(studentId: string, universityId: string) {
  return generateStudyPlanForStudent(studentId, universityId);
}

export async function getLatestStudyPlan(studentId: string) {
  return prisma.studyPlan.findFirst({
    where: { studentId },
    include: {
      tasks: {
        include: { subject: { select: { id: true, code: true, name: true } } },
        orderBy: [{ taskDate: "asc" }, { createdAt: "asc" }],
      },
      semester: { select: { id: true, label: true, number: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
