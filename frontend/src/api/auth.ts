import { api } from './client'
import type { LoginResponse, AuthUser } from '@/types/auth'

export const authApi = {
  // The account's role is resolved server-side; the client never sends one.
  login(email: string, password: string) {
    return api
      .post<LoginResponse>('/auth/login', { email, password })
      .then((r) => r.data)
  },

  refresh(refreshToken: string) {
    return api
      .post<{ accessToken: string; expiresIn: number }>('/auth/refresh', { refreshToken })
      .then((r) => r.data)
  },

  logout(refreshToken: string) {
    return api.post('/auth/logout', { refreshToken }).then((r) => r.data)
  },

  me() {
    return api.get<AuthUser & Record<string, unknown>>('/auth/me').then((r) => r.data)
  },

  forgotPassword(email: string) {
    return api
      .post<{ message: string }>('/auth/forgot-password', { email })
      .then((r) => r.data)
  },
}
