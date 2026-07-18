import prisma from "../config/prisma.js";

type RankedSubject = {
  id: string;
  code: string;
  name: string;
  averagePct: number;
  weakTopics: string[];
  syllabusUnits: string[];
};

type PhaseWindow = {
  number: number;
  startDate: Date;
  endDate: Date;
  examDate: Date | null;
};

function startOfDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function priorityFromPct(averagePct: number) {
  if (averagePct < 45) return "high";
  if (averagePct < 60) return "medium";
  return "low";
}

function uniq(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
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
    .filter((examDate): examDate is Date => {
      if (!examDate) return false;
      return startOfDay(examDate) >= today;
    })
    .sort((a, b) => a.getTime() - b.getTime());
  if (future[0]) return startOfDay(future[0]);
  const semesterEnd = startOfDay(semester.endDate);
  return semesterEnd >= today ? semesterEnd : addDays(today, 14);
}

function taskDuration(priority: string, isWeekend: boolean, isRevision = false) {
  if (isRevision) return isWeekend ? 40 : 30;
  if (priority === "high") return isWeekend ? 60 : 45;
  if (priority === "low") return isWeekend ? 35 : 25;
  return isWeekend ? 45 : 35;
}

async function rankedSubjectsForStudent(studentId: string, universityId: string) {
  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId, isCurrent: true },
    include: { semester: true, student: true },
  });
  if (!enrollment) {
    throw new Error("Current enrollment not found.");
  }

  const subjects = await prisma.subject.findMany({
    where: { universityId, semesterNumber: enrollment.semester.number, deletedAt: null, isActive: true },
    orderBy: { code: "asc" },
  });
  const subjectIds = subjects.map((subject) => subject.id);

  const [results, pyqAnalyses, pyqInsights, syllabi, phases] = await Promise.all([
    prisma.result.findMany({
      where: { enrollmentId: enrollment.id, isPublished: true, subjectId: { in: subjectIds } },
      include: { phase: true },
      orderBy: [{ subjectId: "asc" }, { phase: { number: "asc" } }],
    }),
    prisma.pYQAnalysis.findMany({
      where: { semesterId: enrollment.semesterId, subjectId: { in: subjectIds } },
    }),
    prisma.pYQInsight.findMany({
      where: { semesterId: enrollment.semesterId, subjectId: { in: subjectIds } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.subjectSyllabus.findMany({
      where: { semesterId: enrollment.semesterId, subjectId: { in: subjectIds } },
      orderBy: [{ subjectId: "asc" }, { unitOrder: "asc" }],
    }),
    prisma.phase.findMany({
      where: { semesterId: enrollment.semesterId },
      select: { number: true, startDate: true, endDate: true, examDate: true },
      orderBy: { number: "asc" },
    }),
  ]);

  const resultsBySubject = new Map<string, { got: number; max: number }>();
  for (const result of results) {
    const current = resultsBySubject.get(result.subjectId) ?? { got: 0, max: 0 };
    current.got += result.marksObtained;
    current.max += result.maxMarks;
    resultsBySubject.set(result.subjectId, current);
  }

  const pyqTopics = new Map<string, string[]>();
  for (const insight of pyqInsights) {
    const current = pyqTopics.get(insight.subjectId) ?? [];
    pyqTopics.set(insight.subjectId, uniq([...current, ...((insight.topics as string[]) ?? []), ...((insight.keywords as string[]) ?? [])]));
  }
  for (const analysis of pyqAnalyses) {
    const topicFreq = (analysis.topicFrequencies as Record<string, number>) ?? {};
    const rankedTopics = Object.entries(topicFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([topic]) => topic);
    const current = pyqTopics.get(analysis.subjectId) ?? [];
    pyqTopics.set(analysis.subjectId, uniq([...current, ...rankedTopics]));
  }

  const activePhase = activePhaseForToday(phases);
  const syllabusRowsBySubject = new Map<string, typeof syllabi>();
  for (const item of syllabi) {
    const current = syllabusRowsBySubject.get(item.subjectId) ?? [];
    current.push(item);
    syllabusRowsBySubject.set(item.subjectId, current);
  }

  const syllabusBySubject = new Map<string, string[]>();
  for (const [subjectId, items] of syllabusRowsBySubject.entries()) {
    const limit = Math.max(1, Math.ceil(items.length * Math.min(activePhase.number, 4) / 4));
    for (const item of items.slice(0, limit)) {
      const topics = ((item.topics as string[]) ?? []).slice(0, 2);
      const current = syllabusBySubject.get(subjectId) ?? [];
      syllabusBySubject.set(subjectId, uniq([...current, item.unitTitle, ...topics]));
    }
  }

  const ranked = subjects.map<RankedSubject>((subject) => {
    const marks = resultsBySubject.get(subject.id);
    const averagePct = marks && marks.max > 0 ? Number(((marks.got / marks.max) * 100).toFixed(1)) : 55;
    const phaseAwareUnits = (syllabusBySubject.get(subject.id) ?? []).slice(-4);
    return {
      id: subject.id,
      code: subject.code,
      name: subject.name,
      averagePct,
      weakTopics: uniq([...(pyqTopics.get(subject.id) ?? []).slice(0, 3), ...phaseAwareUnits]).slice(0, 5),
      syllabusUnits: phaseAwareUnits,
    };
  }).sort((a, b) => a.averagePct - b.averagePct);

  return { enrollment, ranked, phases };
}

function buildTasks(days: Date[], ranked: RankedSubject[]) {
  const tasks: Array<{
    taskDate: Date;
    subjectId: string | null;
    description: string;
    estimatedDurationMinutes: number;
    priority: string;
  }> = [];
  if (ranked.length === 0) return tasks;

  days.forEach((day, index) => {
    const subject = ranked[index % ranked.length];
    const nextTopic = subject.weakTopics[index % Math.max(subject.weakTopics.length, 1)] ?? subject.syllabusUnits[index % Math.max(subject.syllabusUnits.length, 1)] ?? `Revise ${subject.code}`;
    const isWeekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;
    const daysLeft = days.length - index - 1;
    const primaryPriority = priorityFromPct(subject.averagePct);

    tasks.push({
      taskDate: day,
      subjectId: subject.id,
      description: `Focus on ${subject.code}: revise ${nextTopic} and finish one short recall check.`,
      estimatedDurationMinutes: taskDuration(primaryPriority, isWeekend),
      priority: primaryPriority,
    });

    if (daysLeft <= 2) {
      tasks.push({
        taskDate: day,
        subjectId: subject.id,
        description: `Exam finish for ${subject.code}: solve a timed PYQ set and review errors.`,
        estimatedDurationMinutes: taskDuration("high", isWeekend, true),
        priority: "high",
      });
      return;
    }

    const secondary = ranked[(index + 1) % ranked.length];
    const secondaryPriority = priorityFromPct(secondary.averagePct);
    const secondaryTopic = secondary.weakTopics[0] ?? secondary.syllabusUnits[0] ?? `important questions in ${secondary.code}`;
    tasks.push({
      taskDate: day,
      subjectId: secondary.id,
      description: `Practice ${secondary.code}: attempt PYQ questions on ${secondaryTopic}.`,
      estimatedDurationMinutes: taskDuration(secondaryPriority, isWeekend, true),
      priority: secondaryPriority,
    });

    if (isWeekend) {
      tasks.push({
        taskDate: day,
        subjectId: null,
        description: "Weekly review: close pending checklist items, formulas, and definitions.",
        estimatedDurationMinutes: 25,
        priority: "medium",
      });
    }
  });

  return tasks;
}

export async function generateStudyPlanForStudent(studentId: string, universityId: string) {
  const { enrollment, ranked, phases } = await rankedSubjectsForStudent(studentId, universityId);
  const startDate = startOfDay(new Date());
  const endDate = nearestExamDate(enrollment.semester, phases);
  const dayCount = Math.max(1, Math.min(60, Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1));
  const days = Array.from({ length: dayCount }, (_value, index) => addDays(startDate, index));

  await prisma.studyPlanTask.deleteMany({
    where: { studyPlan: { studentId, semesterId: enrollment.semesterId } },
  });
  await prisma.studyPlan.deleteMany({
    where: { studentId, semesterId: enrollment.semesterId },
  });

  const plan = await prisma.studyPlan.create({
    data: {
      studentId,
      enrollmentId: enrollment.id,
      semesterId: enrollment.semesterId,
      weakSubjectIds: ranked.slice(0, 4).map((subject) => subject.id),
      weakTopics: uniq(ranked.flatMap((subject) => subject.weakTopics).slice(0, 12)),
      startDate,
      endDate,
      status: "active",
    },
  });

  const tasks = buildTasks(days, ranked.slice(0, Math.max(1, Math.min(ranked.length, 4))));
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
