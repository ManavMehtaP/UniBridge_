import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  AlertOctagon, Bell, Building2, CalendarRange, KeyRound, ShieldCheck, SlidersHorizontal, User,
} from 'lucide-react'
import { hodApi } from '@/api/hod'
import { errorMessage } from '@/api/client'
import { cn } from '@/lib/utils'
import type { NotificationPref } from '@/types/hod'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

const SECTIONS = [
  { key: 'profile', label: 'My Profile', icon: User },
  { key: 'university', label: 'University', icon: Building2 },
  { key: 'academic-years', label: 'Semesters & Years', icon: CalendarRange },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'security', label: 'Security', icon: KeyRound },
  { key: 'attendance-rules', label: 'Attendance Rules', icon: SlidersHorizontal },
  { key: 'danger', label: 'Danger Zone', icon: AlertOctagon },
]

export default function SettingsPage() {
  const { section = 'profile' } = useParams()
  const navigate = useNavigate()

  return (
    <PageShell title="Settings" subtitle="Manage your profile and university configuration">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
        {/* Horizontal scrollable tabs on narrow screens, sticky vertical rail on desktop */}
        <nav className="scrollbar-thin -mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:sticky lg:top-4 lg:mx-0 lg:flex-col lg:gap-0.5 lg:self-start lg:overflow-visible lg:px-0 lg:pb-0">
          {SECTIONS.map((s) => {
            const Icon = s.icon
            const active = s.key === section
            return (
              <button
                key={s.key}
                onClick={() => navigate(`/hod/settings/${s.key}`)}
                className={cn('flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-sm px-3 py-2 text-[13px] font-medium transition-colors lg:w-full',
                  active ? 'bg-primary-light text-primary' : 'text-text-secondary hover:bg-surface-2',
                  s.key === 'danger' && 'lg:mt-1 lg:border-t lg:border-border-light lg:pt-3')}
              >
                <Icon size={16} className={cn(s.key === 'danger' && !active && 'text-danger')} />
                {s.label}
              </button>
            )
          })}
        </nav>

        <div>
          {section === 'profile' && <ProfileSection />}
          {section === 'university' && <UniversitySection />}
          {section === 'academic-years' && <YearsSection />}
          {section === 'notifications' && <NotificationsSection />}
          {section === 'security' && <SecuritySection />}
          {section === 'attendance-rules' && <AttendanceRulesSection />}
          {section === 'danger' && <DangerSection />}
        </div>
      </div>
    </PageShell>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card><CardHeader title={title} /><CardBody className="pt-0">{children}</CardBody></Card>
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</label>{children}</div>
}

function ProfileSection() {
  const q = useQuery({ queryKey: ['hod', 'settings', 'profile'], queryFn: () => hodApi.settings.profile() })
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  useEffect(() => { if (q.data) setForm({ name: q.data.name, email: q.data.email, phone: q.data.phone ?? '' }) }, [q.data])
  const save = useMutation({
    mutationFn: () => hodApi.settings.updateProfile(form),
    onSuccess: () => toast.success('Profile updated'),
    onError: (e) => toast.error(errorMessage(e)),
  })
  if (q.isLoading) return <Spinner />
  return (
    <SectionCard title="My Profile">
      <div className="grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full Name"><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
        <Field label="Email"><Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></Field>
        <Field label="Employee ID"><Input value={q.data?.employeeId ?? ''} disabled /></Field>
        <Field label="Year"><Input value={q.data?.year ?? ''} disabled /></Field>
      </div>
      <div className="mt-5"><Button onClick={() => save.mutate()} loading={save.isPending}>Save Changes</Button></div>
    </SectionCard>
  )
}

function UniversitySection() {
  const q = useQuery({ queryKey: ['hod', 'settings', 'university'], queryFn: () => hodApi.settings.university() as Promise<Record<string, unknown>> })
  const [form, setForm] = useState<Record<string, string>>({})
  useEffect(() => { if (q.data) setForm({ name: String(q.data.name ?? ''), website: String(q.data.website ?? ''), contactEmail: String(q.data.contactEmail ?? ''), address: String(q.data.address ?? '') }) }, [q.data])
  const save = useMutation({ mutationFn: () => hodApi.settings.updateUniversity(form), onSuccess: () => toast.success('University updated'), onError: (e) => toast.error(errorMessage(e)) })
  if (q.isLoading) return <Spinner />
  const branches = (q.data?.branches as string[]) ?? []
  return (
    <SectionCard title="University Configuration">
      <div className="grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name"><Input value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
        <Field label="Website"><Input value={form.website ?? ''} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} /></Field>
        <Field label="Contact Email"><Input value={form.contactEmail ?? ''} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} /></Field>
        <Field label="Address"><Input value={form.address ?? ''} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></Field>
      </div>
      <div className="mt-4">
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">Branches</div>
        <div className="flex flex-wrap gap-2">{branches.map((b) => <Badge key={b} tone="primary">{b}</Badge>)}</div>
      </div>
      <div className="mt-5"><Button onClick={() => save.mutate()} loading={save.isPending}>Save Changes</Button></div>
    </SectionCard>
  )
}

function YearsSection() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['hod', 'settings', 'years'], queryFn: () => hodApi.settings.academicYears() })
  const activate = useMutation({
    mutationFn: (id: string) => hodApi.settings.activateYear(id),
    onSuccess: () => { toast.success('Year activated'); qc.invalidateQueries({ queryKey: ['hod', 'settings', 'years'] }) },
    onError: (e) => toast.error(errorMessage(e)),
  })
  if (q.isLoading) return <Spinner />
  return (
    <SectionCard title="Semesters & Years">
      <div className="space-y-4">
        {q.data?.data.map((y) => (
          <div key={y.id} className="rounded-sm border border-border p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm font-bold">{y.label}</span>
              <Badge tone={y.status === 'ACTIVE' ? 'success' : 'neutral'}>{y.status}</Badge>
              {y.status !== 'ACTIVE' && (
                <Button size="sm" variant="outline" className="ml-auto" loading={activate.isPending} onClick={() => activate.mutate(y.id)}>Set Active</Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {y.semesters.map((s) => (
                <div key={s.id} className="flex items-center gap-2 rounded-sm bg-surface-2 px-3 py-1.5 text-xs">
                  <span className="font-semibold">{s.label}</span>
                  <Badge tone={s.status === 'ACTIVE' ? 'success' : 'neutral'}>{s.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function NotificationsSection() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['hod', 'settings', 'notifications'], queryFn: () => hodApi.settings.notifications() })
  const [prefs, setPrefs] = useState<NotificationPref[]>([])
  useEffect(() => { if (q.data) setPrefs(q.data.preferences) }, [q.data])
  const save = useMutation({
    mutationFn: () => hodApi.settings.updateNotifications(prefs.map((p) => ({ key: p.key, enabled: p.enabled }))),
    onSuccess: () => { toast.success('Preferences saved'); qc.invalidateQueries({ queryKey: ['hod', 'settings', 'notifications'] }) },
    onError: (e) => toast.error(errorMessage(e)),
  })
  if (q.isLoading) return <Spinner />
  return (
    <SectionCard title="Notification Preferences">
      <div className="space-y-1">
        {prefs.map((p, i) => (
          <label key={p.key} className="flex cursor-pointer items-center justify-between rounded-sm px-2 py-2.5 hover:bg-surface-2">
            <span className="text-sm text-text-primary">{p.label}</span>
            <input type="checkbox" checked={p.enabled} onChange={(e) => setPrefs((arr) => arr.map((x, j) => j === i ? { ...x, enabled: e.target.checked } : x))} className="h-4 w-4 accent-primary" />
          </label>
        ))}
      </div>
      <div className="mt-4"><Button onClick={() => save.mutate()} loading={save.isPending}>Save Preferences</Button></div>
    </SectionCard>
  )
}

function SecuritySection() {
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const sessions = useQuery({ queryKey: ['hod', 'settings', 'sessions'], queryFn: () => hodApi.settings.sessions() as Promise<{ data: { id: string; device: string; ip: string; location?: string; isCurrent: boolean; lastActive: string }[] }> })
  const qc = useQueryClient()
  const change = useMutation({
    mutationFn: () => hodApi.settings.changePassword(pw.currentPassword, pw.newPassword),
    onSuccess: () => { toast.success('Password updated'); setPw({ currentPassword: '', newPassword: '', confirm: '' }) },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const revoke = useMutation({
    mutationFn: (id: string) => hodApi.settings.revokeSession(id),
    onSuccess: () => { toast.success('Session revoked'); qc.invalidateQueries({ queryKey: ['hod', 'settings', 'sessions'] }) },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const mismatch = pw.newPassword !== pw.confirm && pw.confirm.length > 0
  return (
    <div className="space-y-4">
      <SectionCard title="Change Password">
        <div className="grid max-w-md grid-cols-1 gap-4">
          <Field label="Current Password"><Input type="password" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} /></Field>
          <Field label="New Password"><Input type="password" value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} /></Field>
          <Field label="Confirm New Password"><Input type="password" invalid={mismatch} value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} /></Field>
          {mismatch && <p className="text-xs text-danger">Passwords do not match.</p>}
        </div>
        <div className="mt-4">
          <Button leftIcon={<ShieldCheck size={15} />} disabled={!pw.currentPassword || !pw.newPassword || mismatch} loading={change.isPending} onClick={() => change.mutate()}>Update Password</Button>
        </div>
      </SectionCard>
      <SectionCard title="Active Sessions">
        <div className="space-y-2">
          {sessions.data?.data.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-sm border border-border px-3 py-2.5">
              <div>
                <div className="text-sm font-medium">{s.device} {s.isCurrent && <Badge tone="success">This device</Badge>}</div>
                <div className="text-xs text-text-muted">{s.ip}{s.location ? ` · ${s.location}` : ''} · {new Date(s.lastActive).toLocaleString()}</div>
              </div>
              {!s.isCurrent && <Button size="sm" variant="outline" loading={revoke.isPending} onClick={() => revoke.mutate(s.id)}>Revoke</Button>}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

function AttendanceRulesSection() {
  const q = useQuery({ queryKey: ['hod', 'settings', 'att-rules'], queryFn: () => hodApi.settings.attendanceRules() as Promise<{ minThresholdPct: number; warningThresholdPct: number; autoNotifyMentor: boolean; autoLockAfterDays: number }> })
  const [form, setForm] = useState({ minThresholdPct: 75, warningThresholdPct: 80, autoNotifyMentor: true, autoLockAfterDays: 7 })
  useEffect(() => { if (q.data) setForm(q.data) }, [q.data])
  const save = useMutation({ mutationFn: () => hodApi.settings.updateAttendanceRules(form), onSuccess: () => toast.success('Rules updated'), onError: (e) => toast.error(errorMessage(e)) })
  if (q.isLoading) return <Spinner />
  return (
    <SectionCard title="Attendance Rules">
      <div className="grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Min Threshold %"><Input type="number" value={form.minThresholdPct} onChange={(e) => setForm((f) => ({ ...f, minThresholdPct: Number(e.target.value) }))} /></Field>
        <Field label="Warning Threshold %"><Input type="number" value={form.warningThresholdPct} onChange={(e) => setForm((f) => ({ ...f, warningThresholdPct: Number(e.target.value) }))} /></Field>
        <Field label="Auto-lock After (days)"><Input type="number" value={form.autoLockAfterDays} onChange={(e) => setForm((f) => ({ ...f, autoLockAfterDays: Number(e.target.value) }))} /></Field>
        <label className="flex items-end gap-2 pb-2.5 text-sm text-text-secondary">
          <input type="checkbox" checked={form.autoNotifyMentor} onChange={(e) => setForm((f) => ({ ...f, autoNotifyMentor: e.target.checked }))} className="h-4 w-4 accent-primary" />
          Auto-notify mentor on at-risk
        </label>
      </div>
      <div className="mt-5"><Button onClick={() => save.mutate()} loading={save.isPending}>Save Rules</Button></div>
    </SectionCard>
  )
}

function DangerSection() {
  const qc = useQueryClient()
  const scope = useQuery({ queryKey: ['hod', 'scope', 'active'], queryFn: () => hodApi.scope() })
  const [confirm, setConfirm] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const reset = useMutation({
    mutationFn: () => hodApi.settings.resetMentorAssignments(scope.data!.activeSemester.id),
    onSuccess: (r: { clearedCount?: number }) => { toast.success(`Cleared ${r.clearedCount ?? 0} assignments`); setConfirm(false) },
    onError: (e) => { toast.error(errorMessage(e)); setConfirm(false) },
  })
  const resetSemester = useMutation({
    mutationFn: () => hodApi.resetSemester(),
    onSuccess: (r: { batchesRemoved: number; studentsRemoved: number }) => {
      toast.success(`Reset done — removed ${r.batchesRemoved} batches, ${r.studentsRemoved} students`)
      setConfirmReset(false)
      // refresh everything so onboarding reappears immediately
      qc.invalidateQueries({ queryKey: ['hod'] })
    },
    onError: (e) => { toast.error(errorMessage(e)); setConfirmReset(false) },
  })
  return (
    <Card className="border-danger/30">
      <CardHeader title="Danger Zone" />
      <CardBody className="space-y-3 pt-0">
        <div className="flex items-center justify-between rounded-sm border border-danger/30 bg-danger-light/30 p-4">
          <div>
            <div className="text-sm font-semibold text-text-primary">Reset Mentor Assignments</div>
            <div className="text-xs text-text-muted">Clears all mentor-student links for the active semester.</div>
          </div>
          <Button variant="danger" onClick={() => setConfirm(true)} disabled={!scope.data}>Reset</Button>
        </div>
        <div className="flex items-center justify-between rounded-sm border border-danger/30 bg-danger-light/30 p-4">
          <div>
            <div className="text-sm font-semibold text-text-primary">Reset Semester Data</div>
            <div className="text-xs text-text-muted">Deletes your batches, students, timetable & assignments — the onboarding wizard reappears so you can start fresh.</div>
          </div>
          <Button variant="danger" onClick={() => setConfirmReset(true)} disabled={!scope.data || scope.data.batches.length === 0}>Reset & Re-onboard</Button>
        </div>
      </CardBody>
      <ConfirmDialog
        open={confirm}
        title="Reset all mentor assignments?"
        message="This unlinks every student from their mentor for the active semester. This cannot be undone."
        destructive
        confirmLabel="Reset All"
        loading={reset.isPending}
        onConfirm={() => reset.mutate()}
        onCancel={() => setConfirm(false)}
      />
      <ConfirmDialog
        open={confirmReset}
        title="Reset all semester data?"
        message={<>This permanently deletes <b>all your batches, their students, timetable and faculty assignments</b>. You'll be taken back through onboarding. This cannot be undone.</>}
        destructive
        confirmLabel="Yes, reset everything"
        loading={resetSemester.isPending}
        onConfirm={() => resetSemester.mutate()}
        onCancel={() => setConfirmReset(false)}
      />
    </Card>
  )
}
