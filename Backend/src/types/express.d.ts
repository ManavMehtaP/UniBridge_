import type { RequestUser } from "./domain.js";

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
      hodBatchIds?: string[];
      hodBatchCodes?: string[];
      hodSemesterIds?: string[];
      assignedBatchIds?: string[];
      assignedSubjectIds?: string[];
      mentorStudentIds?: string[];
      facultySemesterId?: string;
      studentRecord?: import("./domain.js").Student;
      currentEnrollment?: import("./domain.js").StudentEnrollment;
      batchId?: string;
      semesterId?: string;
    }
  }
}

export {};
