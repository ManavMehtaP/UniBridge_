import type { NextFunction, Request, Response } from "express";

import prisma from "../config/prisma.js";
import { ApiError } from "../utils/http.js";

export async function hodScope(req: Request, _res: Response, next: NextFunction) {
  if (!req.user?.isHod) {
    return next(new ApiError(403, "FORBIDDEN", "HOD role required."));
  }

  const universityId = req.user.universityId;
  // ponytail: an HOD owns their batches for a whole 4-year batch (academic year), and only one
  // semester of that year is ACTIVE at a time. Resolve the HOD's CURRENT context by academic year,
  // not by a scope.semesterId that drifts after promotion. This keeps batches/students visible
  // even when a promotion has advanced the active semester past where the scope row points.
  const allScopes = await prisma.hodBatchScope.findMany({
    where: { facultyId: req.user.id },
    include: { batch: { select: { id: true, code: true, academicYearId: true } } },
  });

  let batchIds: string[] = [];
  let activeSemesterId: string | undefined = typeof req.query.semesterId === "string" ? req.query.semesterId : undefined;

  if (allScopes.length > 0) {
    const yearIds = [...new Set(allScopes.map((s) => s.batch.academicYearId))];
    const activeSem = await prisma.semester.findFirst({
      where: { universityId, status: "ACTIVE", academicYearId: { in: yearIds } },
      orderBy: { number: "desc" },
      select: { id: true, academicYearId: true },
    });
    // Resolve the HOD's CURRENT semester from THEIR OWN scope rows (promotion advances each
    // HOD's scope independently). Using the globally-ACTIVE semester would strand a co-year
    // HOD who hasn't promoted yet: once one SY HOD advances to the next semester, the others'
    // students would appear to vanish. Pick the most-advanced non-complete scoped semester.
    const scopeSemIds = [...new Set(allScopes.map((s) => s.semesterId).filter(Boolean))];
    const scopeSems = scopeSemIds.length
      ? await prisma.semester.findMany({ where: { id: { in: scopeSemIds } }, select: { id: true, academicYearId: true, number: true, status: true } })
      : [];
    const semById = new Map(scopeSems.map((s) => [s.id, s]));
    const current = allScopes
      .map((s) => semById.get(s.semesterId))
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .sort((a, b) => (a.status === "COMPLETE" ? 1 : 0) - (b.status === "COMPLETE" ? 1 : 0) || b.number - a.number)[0];
    const targetYearId = current?.academicYearId ?? activeSem?.academicYearId ?? yearIds[0];
    const yearScopes = allScopes.filter((s) => s.batch.academicYearId === targetYearId);
    batchIds = yearScopes.map((s) => s.batchId);
    if (!activeSemesterId) activeSemesterId = current?.id ?? activeSem?.id;
    req.hodBatchCodes = yearScopes.map((s) => s.batch.code);
  } else {
    req.hodBatchCodes = [];
  }

  req.hodBatchIds = batchIds;
  req.hodSemesterIds = activeSemesterId ? [activeSemesterId] : [];

  next();
}
