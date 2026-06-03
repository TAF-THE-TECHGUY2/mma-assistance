import { ReactNode, useMemo, useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from 'lucide-react';

/**
 * Column descriptor for {@link DataTable}.
 *
 * @template T The row data shape.
 */
export interface Column<T> {
  /** Stable identifier for the column (used for sort state + React keys). */
  key: string;
  /** Header label. */
  header: ReactNode;
  /**
   * How to render the cell. If omitted and `accessor` is a key of T, the raw
   * value is rendered.
   */
  render?: (row: T) => ReactNode;
  /**
   * Field used for sorting and default rendering. May be a key of T or a
   * function returning a comparable primitive.
   */
  accessor?: keyof T | ((row: T) => string | number | boolean | null | undefined);
  /** Disable sorting for this column. Default: sortable if `accessor` is set. */
  sortable?: boolean;
  /** Extra classes applied to the <td>/<th> (e.g. text alignment, width). */
  className?: string;
  /** Header-only extra classes. */
  headerClassName?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  /** Stable row key. Defaults to a JSON-stringify fallback. */
  rowKey?: (row: T, index: number) => string | number;
  /** Enables the built-in client-side search box. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /**
   * Restrict search to specific columns (by their `accessor`). Defaults to all
   * columns that have an accessor.
   */
  searchKeys?: (keyof T)[];
  /** Rows per page. Set to 0 to disable pagination. Default 10. */
  pageSize?: number;
  /** Row click handler (makes rows interactive). */
  onRowClick?: (row: T) => void;
  /** Shown when there are no rows. */
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
}

type SortState = { key: string; dir: 'asc' | 'desc' } | null;

function getAccessorValue<T>(
  row: T,
  accessor: Column<T>['accessor'],
): string | number | boolean | null | undefined {
  if (accessor === undefined) return undefined;
  if (typeof accessor === 'function') return accessor(row);
  const v = row[accessor];
  return v as string | number | boolean | null | undefined;
}

function compare(
  a: string | number | boolean | null | undefined,
  b: string | number | boolean | null | undefined,
): number {
  // Push null/undefined to the end consistently.
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return a === b ? 0 : a ? 1 : -1;
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Generic, reusable table with client-side search, column sorting and
 * pagination. Strongly typed over the row shape `T`.
 *
 * @example
 * <DataTable<Patient>
 *   data={patients}
 *   columns={[
 *     { key: 'name', header: 'Name', accessor: 'first_name' },
 *     { key: 'file', header: 'File #', accessor: 'mma_file_number' },
 *   ]}
 *   searchable
 *   onRowClick={(p) => navigate(`/patients/${p.id}`)}
 * />
 */
export default function DataTable<T>({
  data,
  columns,
  rowKey,
  searchable = false,
  searchPlaceholder = 'Search...',
  searchKeys,
  pageSize = 10,
  onRowClick,
  emptyMessage = 'No records found.',
  loading = false,
  className = '',
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(0);

  // --- Filtering ---------------------------------------------------------
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data;

    const accessors: Array<Column<T>['accessor']> = searchKeys
      ? searchKeys.map((k) => k)
      : columns.map((c) => c.accessor).filter((a): a is NonNullable<typeof a> => a != null);

    return data.filter((row) =>
      accessors.some((acc) => {
        const v = getAccessorValue(row, acc);
        return v != null && String(v).toLowerCase().includes(term);
      }),
    );
  }, [data, search, searchKeys, columns]);

  // --- Sorting -----------------------------------------------------------
  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.accessor) return filtered;
    const acc = col.accessor;
    const copy = [...filtered];
    copy.sort((ra, rb) => {
      const res = compare(getAccessorValue(ra, acc), getAccessorValue(rb, acc));
      return sort.dir === 'asc' ? res : -res;
    });
    return copy;
  }, [filtered, sort, columns]);

  // --- Pagination --------------------------------------------------------
  const usePaging = pageSize > 0;
  const pageCount = usePaging ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const safePage = Math.min(page, pageCount - 1);
  const paged = useMemo(() => {
    if (!usePaging) return sorted;
    const start = safePage * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, usePaging, safePage, pageSize]);

  const toggleSort = (col: Column<T>) => {
    const sortable = col.sortable ?? col.accessor != null;
    if (!sortable) return;
    setSort((prev) => {
      if (!prev || prev.key !== col.key) return { key: col.key, dir: 'asc' };
      if (prev.dir === 'asc') return { key: col.key, dir: 'desc' };
      return null; // third click clears sorting
    });
    setPage(0);
  };

  const resolveRowKey = (row: T, index: number): string | number => {
    if (rowKey) return rowKey(row, index);
    const maybeId = (row as Record<string, unknown>).id;
    if (typeof maybeId === 'string' || typeof maybeId === 'number') return maybeId;
    return index;
  };

  const rangeStart = sorted.length === 0 ? 0 : safePage * pageSize + 1;
  const rangeEnd = usePaging
    ? Math.min(sorted.length, (safePage + 1) * pageSize)
    : sorted.length;

  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {searchable && (
        <div className="border-b border-slate-100 p-3">
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder={searchPlaceholder}
            className="w-full max-w-xs rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
              {columns.map((col) => {
                const sortable = col.sortable ?? col.accessor != null;
                const isSorted = sort?.key === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${
                      sortable ? 'cursor-pointer select-none hover:text-slate-700' : ''
                    } ${col.headerClassName ?? col.className ?? ''}`}
                    onClick={() => toggleSort(col)}
                    aria-sort={
                      isSorted ? (sort?.dir === 'asc' ? 'ascending' : 'descending') : 'none'
                    }
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {sortable &&
                        (isSorted ? (
                          sort?.dir === 'asc' ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 text-slate-300" />
                        ))}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600" />
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Inbox className="h-8 w-8" />
                    <p className="text-sm">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paged.map((row, i) => (
                <tr
                  key={resolveRowKey(row, i)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 align-middle text-slate-700 ${col.className ?? ''}`}
                    >
                      {col.render
                        ? col.render(row)
                        : ((getAccessorValue(row, col.accessor) ?? '—') as ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {usePaging && !loading && sorted.length > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <p>
            Showing <span className="font-medium text-slate-700">{rangeStart}</span>–
            <span className="font-medium text-slate-700">{rangeEnd}</span> of{' '}
            <span className="font-medium text-slate-700">{sorted.length}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <span className="px-2 text-xs">
              Page {safePage + 1} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
