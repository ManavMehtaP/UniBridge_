import { api } from '@/api/client'

export type ExportFormat = 'csv' | 'pdf'
type Params = Record<string, string | number | boolean | undefined>

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// A failed export still returns a Blob (the JSON error body). Read it so callers
// surface a real message instead of silently saving a broken file.
async function blobError(e: unknown): Promise<never> {
  const data = (e as { response?: { data?: unknown } })?.response?.data
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text())
      throw new Error(parsed?.error?.message ?? 'Export failed')
    } catch (inner) {
      if (inner instanceof Error && inner.message !== 'Export failed') throw inner
    }
  }
  throw new Error('Export failed')
}

/** Download an endpoint that supports ?format=csv|pdf. Extension follows the format. */
export async function downloadExport(path: string, baseName: string, format: ExportFormat, params?: Params) {
  try {
    const res = await api.get(path, { params: { ...params, format }, responseType: 'blob' })
    saveBlob(res.data as Blob, `${baseName}.${format}`)
  } catch (e) {
    await blobError(e)
  }
}

/** Download a fixed-format file (e.g. a CSV template). */
export async function downloadFile(path: string, filename: string, params?: Params) {
  try {
    const res = await api.get(path, { params, responseType: 'blob' })
    saveBlob(res.data as Blob, filename)
  } catch (e) {
    await blobError(e)
  }
}
