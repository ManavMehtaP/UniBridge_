import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SortDir } from '@/hooks/shared/useTableSort'

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="scrollbar-thin w-full overflow-x-auto">
      <table className={cn('w-full border-collapse', className)}>{children}</table>
    </div>
  )
}

interface ThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Provide with `activeKey`/`dir`/`onSort` to make this column sortable. */
  sortKey?: string
  activeKey?: string | null
  dir?: SortDir
  onSort?: (key: string) => void
}

export function Th({ className, children, sortKey, activeKey, dir, onSort, ...props }: ThProps) {
  const base =
    'whitespace-nowrap border-b border-border bg-surface-2 px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted'

  if (!sortKey || !onSort) {
    return <th className={cn(base, className)} {...props}>{children}</th>
  }

  const active = activeKey === sortKey
  return (
    <th
      className={cn(base, 'cursor-pointer select-none hover:text-text-secondary', active && 'text-text-secondary', className)}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      onClick={() => onSort(sortKey)}
      {...props}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {active ? (
          dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
        ) : (
          <ChevronsUpDown size={12} className="text-text-muted/40" />
        )}
      </span>
    </th>
  )
}

export function Td({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-3.5 py-3 text-[13px] text-text-primary', className)} {...props}>
      {children}
    </td>
  )
}

export function Tr({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('border-b border-border-light transition-colors hover:bg-surface-2', className)}
      {...props}
    />
  )
}
