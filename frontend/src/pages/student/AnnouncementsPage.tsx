import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CheckCheck, Megaphone } from 'lucide-react'
import { studentApi } from '@/api/student'
import { errorMessage } from '@/api/client'
import { PageShell } from '@/components/shared/PageShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { formatDistanceToNow } from 'date-fns'

export default function StudentAnnouncementsPage() {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['student', 'announcements'], queryFn: () => studentApi.announcements({ page: 1, limit: 50 }) })
  const unread = useQuery({ queryKey: ['student', 'announcements-unread'], queryFn: studentApi.announcementUnreadCount })

  const markOne = useMutation({
    mutationFn: (id: string) => studentApi.markAnnouncementRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student', 'announcements'] }),
    onError: (e) => toast.error(errorMessage(e)),
  })
  const markAll = useMutation({
    mutationFn: () => studentApi.markAllAnnouncementsRead(),
    onSuccess: () => { toast.success('All marked read'); qc.invalidateQueries({ queryKey: ['student'] }) },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <PageShell
      title="Announcements"
      subtitle={unread.data?.count ? `${unread.data.count} unread` : 'All caught up'}
      action={unread.data?.count ? <Button variant="outline" leftIcon={<CheckCheck size={15} />} onClick={() => markAll.mutate()} loading={markAll.isPending}>Mark all read</Button> : undefined}
    >
      {list.isLoading ? <CardSkeleton height={200} /> : list.data && list.data.data.length === 0 ? (
        <EmptyState icon={<Megaphone size={22} />} title="No announcements" description="Announcements from your faculty and HOD will appear here." />
      ) : (
        <div className="space-y-3">
          {list.data?.data.map((a) => (
            <Card key={a.id} className={`p-4 ${!a.isRead ? 'border-primary' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-text-primary">{a.title}</h3>
                    {!a.isRead && <Badge tone="primary">New</Badge>}
                    <Badge tone={a.senderRole === 'HOD' ? 'purple' : 'teal'}>{a.senderRole}</Badge>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-text-secondary">{a.body}</p>
                  <div className="mt-2 text-[11px] text-text-muted">
                    {a.senderName} · {new Date(a.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                  </div>
                </div>
                {!a.isRead && (
                  <button onClick={() => markOne.mutate(a.id)} className="text-xs font-semibold text-primary hover:underline">Mark read</button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  )
}
