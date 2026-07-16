import { BarChart3, BookOpen, Binary, Code2, Cpu, FlaskConical, Layers, Monitor, Network, ShieldCheck, Sigma } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Visual = { Icon: LucideIcon; wrap: string }

// Known SY-3 subjects get the exact icon+colour from the design; anything else
// hashes deterministically into the same palette so every subject stays consistent.
const KNOWN: Record<string, Visual> = {
  COA: { Icon: Monitor, wrap: 'bg-primary-light text-primary' },
  DM: { Icon: BarChart3, wrap: 'bg-success-light text-success' },
  TOC: { Icon: Code2, wrap: 'bg-warning-light text-warning' },
  'FCSP-2': { Icon: ShieldCheck, wrap: 'bg-danger-light text-danger' },
  'FSD-2': { Icon: Layers, wrap: 'bg-teal-light text-teal' },
}

const FALLBACK: Visual[] = [
  { Icon: BookOpen, wrap: 'bg-purple-light text-purple' },
  { Icon: Network, wrap: 'bg-teal-light text-teal' },
  { Icon: Cpu, wrap: 'bg-primary-light text-primary' },
  { Icon: Sigma, wrap: 'bg-success-light text-success' },
  { Icon: FlaskConical, wrap: 'bg-danger-light text-danger' },
  { Icon: Binary, wrap: 'bg-warning-light text-warning' },
]

export function subjectVisual(code = ''): Visual {
  const key = code.toUpperCase()
  if (KNOWN[key]) return KNOWN[key]
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return FALLBACK[h % FALLBACK.length]
}

// Slots are stored as "HH:MM"; afternoon periods use 01:30/12:30. Render 12-hour with AM/PM.
export function fmtTime(hhmm?: string): string {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const pm = h === 12 || h < 8 // 08–11 morning, 12 noon, 01–02 afternoon
  return `${String(h).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')} ${pm ? 'PM' : 'AM'}`
}

export function roomTone(room?: string): 'success' | 'danger' | 'neutral' {
  if (!room) return 'neutral'
  return /lab/i.test(room) ? 'danger' : 'success'
}
