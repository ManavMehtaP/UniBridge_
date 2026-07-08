import { useState } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle2, Download } from 'lucide-react'
import { errorMessage } from '@/api/client'
import type { CsvResult } from '@/types/hod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FileDrop } from './FileDrop'

export function CsvUploadModal({
  open,
  onClose,
  title,
  onUpload,
  onDownloadTemplate,
  extraFields,
  buildForm,
  canSubmit = true,
  requiredColumns,
  optionalColumns,
}: {
  open: boolean
  onClose: () => void
  title: string
  onUpload: (form: FormData) => Promise<CsvResult>
  onDownloadTemplate?: () => void
  extraFields?: React.ReactNode
  /** Attach non-file fields (e.g. semesterId, batchId) to the FormData before send. */
  buildForm?: (form: FormData) => void
  canSubmit?: boolean
  /** Column headers the CSV must contain — shown to the user as a hint. */
  requiredColumns?: string[]
  /** Column headers that are recognised but not mandatory. */
  optionalColumns?: string[]
}) {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<CsvResult | null>(null)

  function reset() {
    setFile(null)
    setResult(null)
    setBusy(false)
  }

  async function submit() {
    if (!file) return
    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      buildForm?.(form)
      const res = await onUpload(form)
      setResult(res)
      const done = res.inserted ?? res.created ?? res.assigned ?? res.mapped ?? 0
      const errs = res.errors?.length ?? 0
      toast.success(`${done} added${res.updated ? `, ${res.updated} updated` : ''}${errs ? ` · ${errs} skipped` : ''}`)
    } catch (err) {
      toast.error(errorMessage(err, 'Upload failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title={title}
      footer={
        <>
          {onDownloadTemplate && (
            <Button variant="ghost" leftIcon={<Download size={15} />} onClick={onDownloadTemplate}>
              Template
            </Button>
          )}
          <Button variant="outline" onClick={() => { reset(); onClose() }}>
            Close
          </Button>
          <Button onClick={submit} loading={busy} disabled={!file || !canSubmit}>
            Upload
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {extraFields}

        {(requiredColumns?.length || optionalColumns?.length) ? (
          <div className="rounded-sm border border-border bg-surface-2 p-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
              Expected CSV columns
            </div>
            <div className="flex flex-wrap gap-1.5">
              {requiredColumns?.map((c) => (
                <span key={c} className="rounded-xs border border-border bg-surface px-2 py-1 font-mono text-[11px] text-text-primary">
                  {c}
                </span>
              ))}
              {optionalColumns?.map((c) => (
                <span key={c} className="rounded-xs border border-dashed border-border px-2 py-1 font-mono text-[11px] text-text-muted">
                  {c}
                  <span className="ml-1 font-sans text-[9px] uppercase tracking-wide">optional</span>
                </span>
              ))}
            </div>
            <div className="mt-2 text-[11px] text-text-muted">
              First row must be the header. Column order doesn’t matter.
            </div>
          </div>
        ) : null}

        <FileDrop accept=".csv" onFile={setFile} selectedName={file?.name} />

        {result && (
          <div className="rounded-sm border border-border bg-surface-2 p-3 text-sm">
            <div className="flex items-center gap-2 font-semibold text-success">
              <CheckCircle2 size={16} />
              {(result.inserted ?? result.created ?? result.assigned ?? result.mapped ?? 0)} added
              {result.updated ? `, ${result.updated} updated` : ''}
            </div>
            {result.errors && result.errors.length > 0 && (
              <div className="mt-2">
                <div className="mb-1 text-xs font-semibold text-danger">
                  {result.errors.length} row error(s):
                </div>
                <ul className="max-h-32 space-y-0.5 overflow-y-auto text-xs text-text-secondary">
                  {result.errors.map((e, i) => (
                    <li key={i}>
                      Row {e.row}
                      {e.enrollmentNo ? ` (${e.enrollmentNo})` : ''}: {e.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
