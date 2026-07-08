import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { env } from '@/config/env'
import { useAuthStore } from '@/stores/authStore'
import type { ApiError } from '@/types/common'

export const api = axios.create({
  baseURL: env.API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

// ── Attach the access token to every request ──────────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  // For file uploads, drop the default application/json so the browser sets
  // multipart/form-data with the correct boundary — otherwise multer sees no file.
  if (config.data instanceof FormData) {
    if (typeof config.headers.delete === 'function') config.headers.delete('Content-Type')
    else delete (config.headers as Record<string, unknown>)['Content-Type']
  }
  return config
})

// ── Refresh access token on 401, queueing parallel requests ───
let isRefreshing = false
let queue: Array<(token: string | null) => void> = []

function flushQueue(token: string | null) {
  queue.forEach((cb) => cb(token))
  queue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined

    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    const { refreshToken, setAccessToken, clearAuth } = useAuthStore.getState()
    if (!refreshToken) {
      clearAuth()
      redirectToLogin()
      return Promise.reject(error)
    }

    original._retry = true

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push((token) => {
          if (!token) return reject(error)
          original.headers.Authorization = `Bearer ${token}`
          resolve(api(original))
        })
      })
    }

    isRefreshing = true
    try {
      const { data } = await axios.post<{ accessToken: string; expiresIn: number }>(
        `${env.API_BASE}/auth/refresh`,
        { refreshToken },
      )
      setAccessToken(data.accessToken)
      flushQueue(data.accessToken)
      original.headers.Authorization = `Bearer ${data.accessToken}`
      return api(original)
    } catch (refreshErr) {
      flushQueue(null)
      clearAuth()
      redirectToLogin()
      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
    }
  },
)

function redirectToLogin() {
  if (window.location.pathname !== '/login') {
    window.location.replace('/login')
  }
}

/** Extract a human-readable message from an Axios error. */
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  const ax = err as AxiosError<ApiError>
  return ax?.response?.data?.error?.message ?? ax?.message ?? fallback
}
