import { useMemo, useState } from 'react'

export type SortDir = 'asc' | 'desc'

// Read a value by dot-path so headers can sort on nested fields like "subject.code".
function getVal(row: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((o, k) => (o == null ? o : (o as Record<string, unknown>)[k]), row)
}

/**
 * Client-side sort for the rows currently on screen. Click a header to sort asc,
 * click again for desc. Numbers sort numerically, text naturally (case/number-aware),
 * and empty values always sink to the bottom.
 *
 * Note: for server-paginated tables this sorts the visible page only.
 */
export function useTableSort<T>(rows: T[], initial?: { key: string; dir?: SortDir }) {
  const [sortKey, setSortKey] = useState<string | null>(initial?.key ?? null)
  const [sortDir, setSortDir] = useState<SortDir>(initial?.dir ?? 'asc')

  function onSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return rows
    const copy = [...rows]
    copy.sort((a, b) => {
      const av = getVal(a as Record<string, unknown>, sortKey)
      const bv = getVal(b as Record<string, unknown>, sortKey)
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [rows, sortKey, sortDir])

  return { rows: sorted, sortKey, sortDir, onSort }
}
