export type Role = "FACULTY" | "STUDENT" | "SUPER_ADMIN";
export type YearLevel = "FY" | "SY" | "TY" | "FINAL";
export type FacultyStatus = "ACTIVE" | "INACTIVE";
export type StudentStatus = "ACTIVE" | "AT_RISK" | "INACTIVE";
export type AcademicYearStatus = "ACTIVE" | "READY" | "DRAFT" | "ARCHIVED";
export type SemesterStatus = "ACTIVE" | "UPCOMING" | "COMPLETE";

export interface University {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  website?: string | null;
  contactEmail?: string | null;
  address?: string | null;
  branches?: string[];
  branchDetails?: Array<{ code: string; name: string }>;
  academicYearPattern?: string;
  plan: string;
  status?: AcademicYearStatus;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface AcademicYear {
  id: string;
  universityId: string;
  label: string;
  startDate: string;
  endDate: string;
  status: AcademicYearStatus;
}

export interface Faculty {
  id: string;
  universityId: string;
  name: string;
  email: string;
  year?: string | null;
  department?: string;
  employeeId: string;
  isHod: boolean;
  isActive: boolean;
  phone?: string | null;
  mentorCode: string | null;
  profilePhotoUrl: string | null;
  passwordHash: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | null;
}

export interface Semester {
  id: string;
  universityId: string;
  number: number;
  label: string;
  academicYearId: string;
  isActive: boolean;
  yearLevel: YearLevel;
  status: SemesterStatus;
  startDate: string;
  endDate: string;
}

export interface Phase {
  id: string;
  semesterId: string;
  label: string;
  number: number;
  isActive: boolean;
  isComplete: boolean;
  startDate: string;
  endDate: string;
  examDate: string;
}

export interface Batch {
  id: string;
  universityId: string;
  code: string;
  yearLevel: YearLevel;
  academicYearId: string;
  branch: string;
}

export interface Student {
  id: string;
  universityId: string;
  enrollmentNo: string;
  name: string;
  email: string;
  phone?: string | null;
  branch: string;
  admissionYear: number;
  isActive: boolean;
  passwordHash: string;
  profilePhotoUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface StudentEnrollment {
  id: string;
  studentId: string;
  semesterId: string;
  batchId: string;
  rollNo: string;
  yearLevel?: YearLevel;
  isCurrent: boolean;
  attendancePct: number;
  avgMarksPct: number;
  promotedFromId?: string | null;
  promotedFromEnrollmentId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subject {
  id: string;
  universityId?: string;
  semesterId: string;
  code: string;
  name: string;
  credits: number;
  type: string;
  pyqUploaded: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface FacultyBatchAssignment {
  id: string;
  facultyId: string;
  batchId: string;
  semesterId: string;
  subjectId: string;
  createdAt?: string;
}

export interface HodBatchScope {
  id: string;
  facultyId: string;
  batchId: string;
  semesterId: string;
  createdAt: string;
}

export interface ResultRecord {
  id: string;
  enrollmentId: string;
  phaseId: string;
  subjectId: string;
  batchId: string;
  marksObtained: number;
  maxMarks: number;
  grade: string;
  isPublished: boolean;
  publishedAt: string | null;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  enrollmentId: string;
  subjectId: string;
  batchId: string;
  semesterId: string;
  totalLectures: number;
  attendedLectures: number;
  isLocked: boolean;
  updatedAt: string;
}

export interface MentorAssignment {
  id: string;
  facultyId: string;
  studentId: string;
  semesterId: string;
  mentorCode?: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  universityId: string;
  type: string;
  title: string;
  description: string;
  actorName: string;
  batchId: string;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  universityId?: string;
  title: string;
  date: string;
  startDate: string;
  endDate: string;
  type: string;
  visibleTo: string;
  description: string | null;
  semesterId: string | null;
  createdBy: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface NotificationPreference {
  key: string;
  label: string;
  enabled: boolean;
}

export interface SessionInfo {
  id: string;
  userId: string;
  device: string;
  ip: string;
  location?: string;
  isCurrent: boolean;
  lastActive: string;
}

export interface AttendanceRules {
  minThresholdPct: number;
  warningThresholdPct: number;
  autoNotifyMentor: boolean;
  autoLockAfterDays: number;
}

export interface ArchiveJob {
  jobId: string;
  academicYearId: string;
  status: "queued" | "processing" | "complete";
  estimatedTimeSeconds: number;
  downloadUrl?: string;
}

export interface PromotionDraftMapping {
  enrollmentNo: string;
  toBatchId: string;
  toRollNo?: string;
}

export interface PromotionDraft {
  id: string;
  fromAcademicYearId: string;
  toAcademicYearId: string;
  mappings: PromotionDraftMapping[];
}

export interface PromotionHistory {
  id: string;
  fromYear: string;
  toYear: string;
  promotedCount: number;
  executedAt: string;
  executedBy: string;
}

export interface RefreshTokenRecord {
  token: string;
  userId: string;
  role: Role;
  accessRole: "HOD" | "FACULTY" | "STUDENT" | "SUPER_ADMIN";
  expiresAt: string;
  facultyId?: string | null;
  studentId?: string | null;
}

export interface RequestUser {
  id: string;
  role: Role;
  isHod: boolean;
  universityId: string;
}
