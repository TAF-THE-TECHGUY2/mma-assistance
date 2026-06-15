import type {
  CaseStatus,
  WorkflowStage,
  Priority,
  InvoiceStatus,
  DocumentStatus,
  BillingStatus,
} from '../types';

/**
 * Any of the canonical enum string values the badge knows how to colour.
 * Falls back to a neutral grey style for unknown values.
 */
export type BadgeStatus =
  | CaseStatus
  | WorkflowStage
  | Priority
  | InvoiceStatus
  | DocumentStatus
  | BillingStatus
  | (string & {});

interface StatusBadgeProps {
  status: BadgeStatus | null | undefined;
  /** Optional override label; defaults to a humanized version of `status`. */
  label?: string;
  /**
   * Optional hint describing what the value represents (e.g. 'case',
   * 'priority', 'document'). Purely informational — colours are derived from
   * the `status` value itself, so this is accepted but not required.
   */
  kind?: string;
  className?: string;
}

type Tone = {
  bg: string;
  text: string;
  dot: string;
};

const NEUTRAL: Tone = { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' };

/**
 * Maps every canonical enum value across CaseStatus, WorkflowStage, Priority,
 * InvoiceStatus, DocumentStatus and BillingStatus to a colour tone.
 */
const TONES: Record<string, Tone> = {
  // CaseStatus
  booked: { bg: 'bg-sky-100', text: 'text-sky-700', dot: 'bg-sky-500' },
  in_progress: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  admin_review: { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
  billing: { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  closed: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  cancelled: { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },

  // WorkflowStage (operations + the shared admin_review/billing/closed above)
  operations: { bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500' },

  // Priority
  low: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  medium: { bg: 'bg-sky-100', text: 'text-sky-700', dot: 'bg-sky-500' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  urgent: { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },

  // InvoiceStatus
  pending: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  invoiced: { bg: 'bg-sky-100', text: 'text-sky-700', dot: 'bg-sky-500' },
  paid: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },

  // DocumentStatus
  approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  rejected: { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },

  // BillingStatus
  submitted: { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
};

function humanize(value: string): string {
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Pill-style badge that colours itself based on a canonical status/priority
 * enum value. Used across tables, cards and detail pages.
 */
export default function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  const key = (status ?? '').toString();
  const tone = TONES[key] ?? NEUTRAL;
  const text = label ?? (key ? humanize(key) : '—');

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${tone.bg} ${tone.text} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden="true" />
      {text}
    </span>
  );
}
