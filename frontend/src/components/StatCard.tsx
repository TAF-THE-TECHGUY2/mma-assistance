import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';

type Accent = 'teal' | 'sky' | 'violet' | 'amber' | 'emerald' | 'rose' | 'slate';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  accent?: Accent;
  /**
   * Optional period-over-period change, as a number (percentage). Positive
   * renders an up arrow in green, negative a down arrow in red.
   */
  delta?: number;
  /** Small caption under the value (e.g. "vs. last month"). */
  hint?: string;
  className?: string;
}

const ACCENTS: Record<Accent, { bg: string; text: string }> = {
  teal: { bg: 'bg-teal-50', text: 'text-teal-600' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-600' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-600' },
};

/**
 * Compact KPI card for the dashboard and report pages. Shows a label, a large
 * value, an optional accent icon, and an optional trend delta.
 */
export default function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'teal',
  delta,
  hint,
  className = '',
}: StatCardProps) {
  const tone = ACCENTS[accent];
  const hasDelta = typeof delta === 'number' && Number.isFinite(delta);
  const positive = (delta ?? 0) >= 0;

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {Icon && (
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone.bg} ${tone.text}`}
          >
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>

      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>

      {(hasDelta || hint) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {hasDelta && (
            <span
              className={`inline-flex items-center gap-1 font-medium ${
                positive ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {positive ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {Math.abs(delta as number)}%
            </span>
          )}
          {hint && <span className="text-slate-400">{hint}</span>}
        </div>
      )}
    </div>
  );
}
