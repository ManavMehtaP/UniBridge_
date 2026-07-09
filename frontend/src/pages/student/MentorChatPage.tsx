import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { MessageCircle, Send } from 'lucide-react'
import { studentApi } from '@/api/student'
import { errorMessage } from '@/api/client'
import { PageShell } from '@/components/shared/PageShell'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

export default function MentorChatPage() {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const mentor = useQuery({ queryKey: ['student', 'mentor'], queryFn: studentApi.mentor })
  const messages = useQuery({
    queryKey: ['student', 'mentor-messages'],
    queryFn: () => studentApi.mentorMessages({ limit: 50 }),
    refetchInterval: 5000,
  })

  const send = useMutation({
    mutationFn: () => studentApi.sendMentorMessage(text.trim()),
    onSuccess: () => { setText(''); qc.invalidateQueries({ queryKey: ['student', 'mentor-messages'] }) },
    onError: (e) => toast.error(errorMessage(e)),
  })

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.data?.data.length])
  useEffect(() => { studentApi.markMentorRead().catch(() => {}) }, [])

  const mentorData = (mentor.data as { mentor?: { name?: string; mentorCode?: string; year?: string } } | undefined)?.mentor
  const msgs = messages.data?.data ?? []

  return (
    <PageShell title="Mentor Chat" subtitle="One-on-one with your mentor">
      {mentor.isLoading ? <CardSkeleton height={80} /> : !mentorData?.name ? (
        <EmptyState icon={<MessageCircle size={22} />} title="No mentor assigned" description="Ask your HOD to assign a mentor." />
      ) : (
        <Card>
          <div className="flex items-center gap-3 border-b border-border p-4">
            <Avatar name={mentorData.name} size={44} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-text-primary">{mentorData.name}</h3>
                {mentorData.mentorCode && <Badge tone="teal">{mentorData.mentorCode}</Badge>}
              </div>
              <div className="text-xs text-text-muted">{mentorData.year ?? 'Faculty'} · Your mentor</div>
            </div>
          </div>
          <div className="scrollbar-thin h-[440px] overflow-y-auto p-4">
            {msgs.length === 0 ? (
              <p className="mt-20 text-center text-xs text-text-muted">No messages yet — send the first one.</p>
            ) : (
              <div className="space-y-2">
                {msgs.map((m) => {
                  const isMine = m.senderRole === 'STUDENT'
                  return (
                    <div key={m.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[75%] rounded-sm px-3 py-1.5', isMine ? 'bg-primary text-white' : 'bg-surface-2 text-text-primary')}>
                        <div className="text-[13px]">{m.content}</div>
                        <div className={cn('mt-0.5 text-[10px]', isMine ? 'text-white/70' : 'text-text-muted')}>
                          {formatDistanceToNow(new Date(m.sentAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate() }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" />
            <Button type="submit" disabled={!text.trim()} loading={send.isPending} leftIcon={<Send size={14} />}>Send</Button>
          </form>
        </Card>
      )}
    </PageShell>
  )
}
