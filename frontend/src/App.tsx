import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { router } from '@/router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      // Retry only transient failures (network / 5xx) once. A 401/403/404/422 won't
      // succeed on retry — retrying just doubles the load and delays the error.
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } })?.response?.status
        if (status && status >= 400 && status < 500) return false
        return failureCount < 1
      },
      retryDelay: 500,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: { fontSize: '13px', borderRadius: '10px' },
          success: { iconTheme: { primary: '#16A34A', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  )
}
