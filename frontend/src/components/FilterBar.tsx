import { ReactNode } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterSelect {
  /** Stable key used in the values map. */
  key: string;
  label: string;
  options: FilterOption[];
}

interface FilterBarProps {
  /** Current free-text search value (controlled). */
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  /** Declarative dropdown filters. */
  filters?: FilterSelect[];
  /** Current selected value per filter key ('' = "All"). */
  values?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;

  /** Optional extra controls rendered on the right (e.g. action buttons). */
  children?: ReactNode;

  /** Shows a "Clear" button when any filter/search is active. */
  onClear?: () => void;
  className?: string;
}

/**
 * Reusable toolbar combining a search box with any number of select filters.
 * Fully controlled: the parent owns `search` and `values` state and reacts to
 * the change callbacks. Pages typically feed this into a DataTable.
 */
export default function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  values = {},
  onFilterChange,
  children,
  onClear,
  className = '',
}: FilterBarProps) {
  const hasActive =
    (search && search.length > 0) ||
    Object.values(values).some((v) => v && v.length > 0);

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center ${className}`}
    >
      {/* Search */}
      {onSearchChange && (
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
          />
        </div>
      )}

      {/* Selects */}
      {filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.length > 0 && (
            <SlidersHorizontal className="hidden h-4 w-4 text-slate-400 sm:block" />
          )}
          {filters.map((f) => (
            <select
              key={f.key}
              value={values[f.key] ?? ''}
              onChange={(e) => onFilterChange?.(f.key, e.target.value)}
              className="rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              aria-label={f.label}
            >
              <option value="">{f.label}: All</option>
              {f.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ))}
        </div>
      )}

      {/* Clear */}
      {onClear && hasActive && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
          Clear
        </button>
      )}

      {children && <div className="flex items-center gap-2 sm:ml-auto">{children}</div>}
    </div>
  );
}
