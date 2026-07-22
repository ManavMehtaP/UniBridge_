export const env = {
  API_URL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000',
  DJANGO_AI_URL: import.meta.env.VITE_DJANGO_AI_URL ?? 'http://localhost:8000/api/v1/student-ai',
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL ?? 'ws://localhost:4000',
  APP_NAME: import.meta.env.VITE_APP_NAME ?? 'UniPortal',
  API_BASE: (import.meta.env.VITE_API_URL ?? 'http://localhost:4000') + '/api/v1',
} as const
