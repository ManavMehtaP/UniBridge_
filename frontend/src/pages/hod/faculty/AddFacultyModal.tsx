import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Copy } from 'lucide-react'
import { hodApi } from '@/api/hod'
import { errorMessage } from '@/api/client'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

const YEAR_OPTIONS = [
  { value: 'FY', label: '1st Year (FY)' },
  { value: 'SY', label: '2nd Year (SY)' },
  { value: 'TY', label: '3rd Year (TY)' },
  { value: 'FINAL', label: 'Final Year' },
]

export function AddFacultyModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState({ employeeId: '', name: '', email: '', year: 'FY', phone: '', isHod: false })
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: () => hodApi.faculty.create(form) as Promise<{ temporaryPassword?: string }>,
    onSuccess: (res) => { toast.success('Faculty created'); setTempPassword(res.temporaryPassword ?? null); onCreated() },
    onError: (e) => toast.error(errorMessage(e)),
  })

  function close() {
    setTempPassword(null)
    setForm({ employeeId: '', name: '', email: '', year: 'FY', phone: '', isHod: false })
    onClose()
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add Faculty"
      footer={
        tempPassword ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!form.employeeId || !form.name || !form.email}>Create</Button>
          </>
        )
      }
    >
      {tempPassword ? (
        <div className="space-y-3 text-center">
          <p className="text-sm text-text-secondary">Faculty created. Temporary password:</p>
          <div className="flex items-center justify-center gap-2 rounded-sm bg-surface-2 px-4 py-3">
            <code className="text-base font-bold text-primary">{tempPassword}</code>
            <button onClick={() => { navigator.clipboard.writeText(tempPassword); toast.success('Copied') }} className="text-text-muted hover:text-primary">
              <Copy size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Labeled label="Employee ID *"><Input value={form.employeeId} onChange={set('employeeId')} /></Labeled>
          <Labeled label="Full Name *"><Input value={form.name} onChange={set('name')} /></Labeled>
          <Labeled label="Email *"><Input type="email" value={form.email} onChange={set('email')} /></Labeled>
          <Labeled label="Phone"><Input value={form.phone} onChange={set('phone')} /></Labeled>
          <Labeled label="Year">
            <Select value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} options={YEAR_OPTIONS} />
          </Labeled>
          <label className="flex items-end gap-2 pb-2.5 text-sm text-text-secondary">
            <input type="checkbox" checked={form.isHod} onChange={(e) => setForm((f) => ({ ...f, isHod: e.target.checked }))} className="h-4 w-4 accent-primary" />
            Is HOD
          </label>
        </div>
      )}
    </Modal>
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
