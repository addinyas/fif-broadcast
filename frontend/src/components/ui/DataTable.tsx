import { Pencil, Trash2, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { Skeleton } from './Skeleton';

interface Column<T> {
  key: string;
  header: ReactNode;
  headerRight?: ReactNode;
  render?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  selectedIds?: number[];
  onSelect?: (id: number) => void;
  onSelectAll?: () => void;
  showCheckbox?: boolean;
  allPageSelected?: boolean;
  markedIds?: number[];
  rowClassName?: (item: T) => string;
}

export function DataTable<T extends { id: number }>({
  columns, data, loading, onEdit, onDelete, selectedIds, onSelect, onSelectAll, showCheckbox, allPageSelected, markedIds, rowClassName,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/50">
        <div className="space-y-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              {Array.from({ length: columns.length + (onEdit || onDelete ? 1 : 0) }).map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isMarked = (id: number) => markedIds?.includes(id);

  return (
    <div className="rounded-xl border border-slate-100 bg-white dark:border-slate-700/50 dark:bg-slate-800/50">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-50 bg-slate-50/50 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:border-slate-700/50 dark:bg-slate-800/60 dark:text-slate-400">
                  {showCheckbox && (
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allPageSelected ?? (selectedIds?.length === data.length && data.length > 0)}
                    onChange={onSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-fif-600 focus:ring-fif-500/30"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-3 whitespace-nowrap text-center">
                  <div className="inline-flex items-center justify-center gap-1">
                    {col.header}
                    {col.headerRight}
                  </div>
                </th>
              ))}
              {(onEdit || onDelete) && <th className="px-3 py-3 text-right whitespace-nowrap">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
            {data.map((item) => {
              const marked = isMarked(item.id);
              const customClass = rowClassName?.(item) ?? '';
              return (
                <tr key={item.id} className={`transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${marked ? 'bg-emerald-50 dark:bg-emerald-900/15' : ''} ${customClass}`}>
                  {showCheckbox && (
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds?.includes(item.id)}
                        onChange={() => onSelect?.(item.id)}
                        className="h-4 w-4 rounded border-slate-300 text-fif-600 focus:ring-fif-500/30 dark:border-slate-600"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-3 text-center">
                      {col.render ? col.render(item) : (item as Record<string, unknown>)[col.key] as ReactNode}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(item)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-fif-50 hover:text-fif-600 dark:text-slate-500 dark:hover:bg-fif-900/20 dark:hover:text-fif-400"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(item)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-slate-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {data.length === 0 && !loading && (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-700/50">
            <Inbox className="h-6 w-6 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Belum ada data</p>
        </div>
      )}
    </div>
  );
}
