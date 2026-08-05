import { useQuery } from '@tanstack/react-query'
import { facultyApi } from '@/api/faculty'

/** Faculty scope: active semester, assignments, mentor code. Every faculty page needs this. */
export function useFacultyScope(semesterId?: string) {
  return useQuery({
    queryKey: ['faculty', 'scope', semesterId ?? 'active'],
    queryFn: () => facultyApi.scope(semesterId),
    staleTime: 5 * 60 * 1000,
  })
}
