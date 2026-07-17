import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import type { ExportFormat } from '@/lib/download'
import { cn } from '@/lib/utils'

interface ExportMenuProps {
  /** Runs the download. Throws to surface an error toast. */
  onExport: (format: ExportFormat) => Promise<void>
  label?: string
  disabled?: boolean
  className?: string
}

/** One button, two formats. Handles the menu, the loading state and failures. */
export function ExportMenu({ onExport, label = 'Export', disabled, className }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  async function run(format: ExportFormat) {
    setOpen(false)
    setBusy(format)
    try {
      await onExport(format)
      toast.success(`${format.toUpperCase()} downloaded`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled || busy !== null}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface px-3.5 py-2 text-sm font-semibold text-text-primary hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        {busy ? `Preparing ${busy.toUpperCase()}…` : label}
        <ChevronDown size={13} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-sm border border-border bg-surface py-1 shadow-lg">
          <button role="menuitem" onClick={() => run('pdf')} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-2">
            <FileText size={15} className="text-danger" />
            <span>Download PDF</span>
          </button>
          <button role="menuitem" onClick={() => run('csv')} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-2">
            <FileSpreadsheet size={15} className="text-success" />
            <span>Download CSV</span>
          </button>
        </div>
      )}
    </div>
  )
}
