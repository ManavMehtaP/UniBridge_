import prisma from "../config/prisma.js";
import type { Faculty, StudentEnrollment, YearLevel } from "../types/domain.js";
import { ApiError, buildPagination } from "../utils/http.js";

interface StudentListParams {
  universityId: string;
  hodBatchIds: string[];
  search?: string;
  yearLevel?: YearLevel;
  batchId?: string;
  page: number;
  limit: number;
}

export class HodService {
  async getMyScope(userId: string, universityId: string, hodBatchIds: string[], hodSemesterIds: string[]) {
    const hod = await this.findHod(userId, universityId);
    const activeSemester =
      (await prisma.semester.findFirst({
        where: { id: { in: hodSemesterIds }, status: "ACTIVE" },
        select: { id: true, label: true, number: true },
      })) ??
      (await prisma.semester.findFirst({
        where: { universityId, status: "ACTIVE" },
        select: { id: true, label: true, number: true },
      }));

    if (!activeSemester) {
      throw new ApiError(404, "ACTIVE_SEMESTER_NOT_FOUND", "No active semester found.");
    }

    const batches = (
      await prisma.batch.findMany({
        where: { id: { in: hodBatchIds } },
        select: { id: true, code: true, yearLevel: true },
      })
    ).map((batch) => ({
      ...batch,
      studentCount: 0,
    }));

    const enrollmentCounts = await prisma.studentEnrollment.groupBy({
      by: ["batchId"],
      where: {
        batchId: { in: hodBatchIds },
        semesterId: activeSemester.id,
        isCurrent: true,
      },
      _count: { batchId: true },
    });

    const counts = new Map(enrollmentCounts.map((item) => [item.batchId, item._count.batchId]));

    const batchRows = batches.map((batch) => ({
      ...batch,
      studentCount: counts.get(batch.id) ?? 0,
    }));

    const totalStudents = batchRows.reduce((sum, batch) => sum + batch.studentCount, 0);
    const facultyAssignments = await prisma.facultyBatchAssignment.findMany({
      where: {
        batchId: { in: hodBatchIds },
        semesterId: { in: hodSemesterIds },
      },
      select: { facultyId: true },
    });
    const totalFaculty = new Set(facultyAssignments.map((item) => item.facultyId)).size;

    return {
      hod: {
        id: hod.id,
        name: hod.name,
        employeeId: hod.employeeId,
      },
      activeSemester: {
        id: activeSemester.id,
        label: activeSemester.label,
        number: activeSemester.number,
      },
      batches: batchRows,
      totalStudents,
      totalFaculty,
    };
  }

  async getDashboardSummary(hodBatchIds: string[], hodSemesterIds: string[]) {
    const scopedEnrollments = await prisma.studentEnrollment.findMany({
      where: {
        batchId: { in: hodBatchIds },
        isCurrent: true,
      },
      select: { id: true },
    });

    const totalStudents = scopedEnrollments.length;
    const enrollmentIds = scopedEnrollments.map((item) => item.id);

    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: { enrollmentId: { in: enrollmentIds } },
      select: { enrollmentId: true, isPresent: true },
    });

    const attendanceByEnrollment = new Map<string, { present: number; total: number }>();
    attendanceRecords.forEach((record) => {
      const current = attendanceByEnrollment.get(record.enrollmentId) ?? { present: 0, total: 0 };
      current.total += 1;
      if (record.isPresent) {
        current.present += 1;
      }
      attendanceByEnrollment.set(record.enrollmentId, current);
    });

    const attendancePctValues = enrollmentIds.map((enrollmentId) => {
      const counts = attendanceByEnrollment.get(enrollmentId);
      return counts && counts.total > 0 ? Number(((counts.present / counts.total) * 100).toFixed(1)) : 0;
    });

    const resultRows = await prisma.result.findMany({
      where: { enrollmentId: { in: enrollmentIds } },
      select: { enrollmentId: true },
    });
    const resultEnrollmentIds = new Set(resultRows.map((item) => item.enrollmentId));
    const facultyAssignments = await prisma.facultyBatchAssignment.findMany({
      where: {
        batchId: { in: hodBatchIds },
        semesterId: { in: hodSemesterIds },
      },
      select: { facultyId: true },
    });
    const totalFaculty = new Set(facultyAssignments.map((item) => item.facultyId)).size;

    const activeBatches = hodBatchIds.length;
    const avgAttendance =
      totalStudents === 0
        ? 0
        : Number(
            (attendancePctValues.reduce((sum, value) => sum + value, 0) / totalStudents).toFixed(1),
          );

    const resultsUploadedPct =
      totalStudents === 0 ? 0 : Math.round((resultEnrollmentIds.size / totalStudents) * 100);

    const batches = await prisma.batch.findMany({
      where: { id: { in: hodBatchIds } },
      select: { code: true },
    });

    return {
      totalStudents: {
        value: totalStudents,
        deltaLabel: `Across ${activeBatches} scoped batches`,
        trend: "neutral",
      },
      totalFaculty: {
        value: totalFaculty,
        deltaLabel: `${totalFaculty} assigned this semester`,
        trend: "neutral",
      },
      activeBatches: {
        value: activeBatches,
        deltaLabel: batches.map((batch) => batch.code).join(", "),
        trend: "neutral",
      },
      avgAttendance: {
        value: avgAttendance,
        deltaLabel: "Current semester average",
        trend: "neutral",
      },
      resultsUploadedPct: {
        value: resultsUploadedPct,
        deltaLabel: "Current seeded records",
        trend: "neutral",
      },
    };
  }

  async getStudents(params: StudentListParams) {
    if (params.batchId && !params.hodBatchIds.includes(params.batchId)) {
      throw new ApiError(403, "BATCH_NOT_IN_SCOPE", "Requested batch is not in this HOD's scope.");
    }

    const currentEnrollments = await prisma.studentEnrollment.findMany({
      where: {
        isCurrent: true,
        batchId: params.batchId ? params.batchId : { in: params.hodBatchIds },
      },
      select: {
        id: true,
        batchId: true,
        studentId: true,
        rollNo: true,
      },
    });

    const enrollmentIds = currentEnrollments.map((item) => item.id);

    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: { enrollmentId: { in: enrollmentIds } },
      select: { enrollmentId: true, isPresent: true },
    });

    const attendanceByEnrollment = new Map<string, { present: number; total: number }>();
    attendanceRecords.forEach((record) => {
      const current = attendanceByEnrollment.get(record.enrollmentId) ?? { present: 0, total: 0 };
      current.total += 1;
      if (record.isPresent) {
        current.present += 1;
      }
      attendanceByEnrollment.set(record.enrollmentId, current);
    });

    const resultRows = await prisma.result.findMany({
      where: { enrollmentId: { in: enrollmentIds } },
      select: { enrollmentId: true, marksObtained: true, maxMarks: true },
    });

    const resultByEnrollment = new Map<string, { totalPct: number; count: number }>();
    resultRows.forEach((row) => {
      const current = resultByEnrollment.get(row.enrollmentId) ?? { totalPct: 0, count: 0 };
      const pct = row.maxMarks > 0 ? (row.marksObtained / row.maxMarks) * 100 : 0;
      current.totalPct += pct;
      current.count += 1;
      resultByEnrollment.set(row.enrollmentId, current);
    });

    const enrollmentByStudentId = new Map<string, { batchId: string; rollNo: string; attendancePct: number; avgMarksPct: number }>();
    currentEnrollments.forEach((item) => {
      const attendance = attendanceByEnrollment.get(item.id);
      const attendancePct = attendance && attendance.total > 0 ? Number(((attendance.present / attendance.total) * 100).toFixed(1)) : 0;
      const resultData = resultByEnrollment.get(item.id);
      const avgMarksPct = resultData && resultData.count > 0 ? Number((resultData.totalPct / resultData.count).toFixed(1)) : 0;
      enrollmentByStudentId.set(item.studentId, {
        batchId: item.batchId,
        rollNo: item.rollNo,
        attendancePct,
        avgMarksPct,
      });
    });

    const normalizedSearch = params.search?.trim().toLowerCase();

    const students = await prisma.student.findMany({
      where: { universityId: params.universityId, isActive: true, id: { in: Array.from(enrollmentByStudentId.keys()) } },
      select: { id: true, enrollmentNo: true, name: true, email: true },
    });

    const batchIds = Array.from(new Set(Array.from(enrollmentByStudentId.values()).map((enrollment) => enrollment.batchId)));
    const batchMap = new Map(
      (await prisma.batch.findMany({
        where: { id: { in: batchIds } },
        select: { id: true, code: true, yearLevel: true },
      })).map((batch) => [batch.id, batch]),
    );

    const rows = students
      .map((student) => {
        const enrollment = enrollmentByStudentId.get(student.id)!;
        const batch = batchMap.get(enrollment.batchId)!;
        return {
          enrollmentNo: student.enrollmentNo,
          name: student.name,
          email: student.email,
          batchId: batch.id,
          batchCode: batch.code,
          yearLevel: batch.yearLevel,
          rollNo: enrollment.rollNo,
          attendancePct: enrollment.attendancePct,
          avgMarksPct: enrollment.avgMarksPct,
        };
      })
      .filter((row) => !params.yearLevel || row.yearLevel === params.yearLevel)
      .filter((row) => {
        if (!normalizedSearch) {
          return true;
        }

        return row.name.toLowerCase().includes(normalizedSearch) || row.enrollmentNo.toLowerCase().includes(normalizedSearch);
      })
      .sort((left, right) => left.name.localeCompare(right.name));

    const total = rows.length;
    const start = (params.page - 1) * params.limit;
    const pagedRows = rows.slice(start, start + params.limit);

    return {
      data: pagedRows,
      ...buildPagination(params.page, params.limit, total),
    };
  }

  private async findHod(userId: string, universityId: string): Promise<Faculty> {
    const hod = await prisma.faculty.findFirst({
      where: { id: userId, universityId, isHod: true },
      select: {
        id: true,
        universityId: true,
        name: true,
        employeeId: true,
        email: true,
        passwordHash: true,
        isHod: true,
        isActive: true,
        phone: true,
        mentorCode: true,
        profilePhotoUrl: true,
        year: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!hod) {
      throw new ApiError(404, "HOD_NOT_FOUND", "HOD faculty profile not found.");
    }

    return hod as unknown as Faculty;
  }
}
