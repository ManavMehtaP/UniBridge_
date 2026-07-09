import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Key, User } from 'lucide-react'
import { facultyApi } from '@/api/faculty'
import { errorMessage } from '@/api/client'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

type Section = 'profile' | 'security'
const SECTIONS: { key: Section; label: string; icon: React.ReactNode }[] = [
  { key: 'profile', label: 'My Profile', icon: <User size={16} /> },
  { key: 'security', label: 'Security', icon: <Key size={16} /> },
]

export default function FacultySettingsPage() {
  const [section, setSection] = useState<Section>('profile')
  return (
    <PageShell title="Settings" subtitle="Manage your profile and account">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
        <Card className="p-2">
          {SECTIONS.map((s) => (
            <button key={s.key} onClick={() => setSection(s.key)} className={cn('flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-left text-[13px] font-medium transition', section === s.key ? 'bg-primary-light text-primary' : 'text-text-secondary hover:bg-surface-2')}>
              {s.icon}
              {s.label}
            </button>
          ))}
        </Card>
        <div>
          {section === 'profile' && <ProfileSection />}
          {section === 'security' && <SecuritySection />}
        </div>
      </div>
    </PageShell>
  )
}

function ProfileSection() {
  const profile = useQuery({ queryKey: ['faculty', 'profile'], queryFn: facultyApi.profile })
  const [form, setForm] = useState({ name: '', email: '', phone: '' })

  useEffect(() => {
    if (profile.data) setForm({ name: profile.data.name ?? '', email: profile.data.email ?? '', phone: profile.data.phone ?? '' })
  }, [profile.data])

  const save = useMutation({
    mutationFn: () => facultyApi.updateProfile(form),
    onSuccess: () => { toast.success('Profile updated'); profile.refetch() },
    onError: (e) => toast.error(errorMessage(e)),
  })

  if (profile.isLoading) return <CardSkeleton height={280} />

  return (
    <Card>
      <CardHeader title="My Profile" />
      <CardBody>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Labeled label="Full Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Labeled>
          <Labeled label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Labeled>
          <Labeled label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Labeled>
          <Labeled label="Employee ID"><Input value={profile.data?.employeeId ?? ''} readOnly className="bg-surface-2" /></Labeled>
          <Labeled label="Year"><Input value={profile.data?.year ?? ''} readOnly className="bg-surface-2" /></Labeled>
          {profile.data?.mentorCode && <Labeled label="Mentor Code"><Input value={profile.data.mentorCode} readOnly className="bg-surface-2" /></Labeled>}
        </div>
        <div className="mt-4">
          <Button onClick={() => save.mutate()} loading={save.isPending}>Save Changes</Button>
        </div>
      </CardBody>
    </Card>
  )
}

function SecuritySection() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const sessions = useQuery({ queryKey: ['faculty', 'sessions'], queryFn: facultyApi.sessions })

  const change = useMutation({
    mutationFn: () => facultyApi.changePassword(current, next),
    onSuccess: () => { toast.success('Password changed'); setCurrent(''); setNext(''); setConfirm('') },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const revoke = useMutation({
    mutationFn: (id: string) => facultyApi.revokeSession(id),
    onSuccess: () => { toast.success('Session revoked'); sessions.refetch() },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const canSubmit = current && next && next === confirm && next.length >= 8

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Change Password" subtitle="Minimum 8 characters" />
        <CardBody>
          <div className="max-w-md space-y-3">
            <Labeled label="Current Password"><Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} /></Labeled>
            <Labeled label="New Password"><Input type="password" value={next} onChange={(e) => setNext(e.target.value)} /></Labeled>
            <Labeled label="Confirm Password"><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} invalid={confirm.length > 0 && next !== confirm} /></Labeled>
            {confirm.length > 0 && next !== confirm && <p className="text-xs text-danger">Passwords don't match.</p>}
          </div>
          <div className="mt-4">
            <Button onClick={() => change.mutate()} loading={change.isPending} disabled={!canSubmit}>Change Password</Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Active Sessions" />
        <CardBody className="pt-0">
          {sessions.isLoading ? <CardSkeleton height={100} /> : (
            <ul className="divide-y divide-border-light">
              {(sessions.data as { data?: { id: string; device?: string; ip?: string; isCurrent?: boolean; lastActive?: string }[] })?.data?.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="text-[13px] font-semibold text-text-primary">{s.device ?? 'Unknown device'}</div>
                    <div className="text-xs text-text-muted">{s.ip ?? '—'} · {s.lastActive ? new Date(s.lastActive).toLocaleString('en-IN') : 'unknown'}</div>
                  </div>
                  {s.isCurrent ? <Badge tone="success">This device</Badge> : (
                    <Button variant="outline" size="sm" onClick={() => revoke.mutate(s.id)}>Revoke</Button>
                  )}
                </li>
              )) ?? <p className="text-xs text-text-muted">No active sessions.</p>}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</label>
      {children}
    </div>
  )
}
