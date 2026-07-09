export type UserRole = 'FACULTY' | 'STUDENT' | 'SUPER_ADMIN'
export type LoginRole = 'HOD' | 'FACULTY' | 'STUDENT' | 'SUPER_ADMIN'

/**
 * Mirrors the `user` object returned by the backend `POST /auth/login`.
 * Faculty/HOD and Student share this shape; role-specific fields are optional.
 */
export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  isHod: boolean
  universityId: string
  // Faculty / HOD only
  year?: string | null
  mentorCode?: string | null
  employeeId?: string | null
  // Student only
  enrollmentNo?: string | null
  branch?: string | null
  admissionYear?: number | null
  isFirstLogin?: boolean
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: AuthUser
}

export interface RefreshResponse {
  accessToken: string
  expiresIn: number
}

export interface University {
  id: string
  slug: string
  name: string
  [key: string]: unknown
}
