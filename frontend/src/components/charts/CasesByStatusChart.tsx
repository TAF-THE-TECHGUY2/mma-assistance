import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import type { CaseStatus } from '../../types';

export interface CasesByStatusDatum {
  status: CaseStatus | string;
  count: number;
}

interface CasesByStatusChartProps {
  data: CasesByStatusDatum[];
}

const STATUS_LABELS: Record<string, string> = {
  booked: 'Booked',
  in_progress: 'In Progress',
  admin_review: 'Admin Review',
  billing: 'Billing',
  closed: 'Closed',
};

const STATUS_COLORS: Record<string, string> = {
  booked: '#0ea5e9',
  in_progress: '#0d9488',
  admin_review: '#f59e0b',
  billing: '#8b5cf6',
  closed: '#64748b',
};

const FALLBACK_COLOR = '#0d9488';

export default function CasesByStatusChart({ data }: CasesByStatusChartProps) {
  const chartData = (data ?? []).map((d) => ({
    ...d,
    label: STATUS_LABELS[String(d.status)] ?? String(d.status),
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        No case status data available.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#475569' }}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: '#475569' }}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(13, 148, 136, 0.06)' }}
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              fontSize: 12,
            }}
          />
          <Bar dataKey="count" name="Cases" radius={[6, 6, 0, 0]} maxBarSize={64}>
            {chartData.map((entry) => (
              <Cell
                key={String(entry.status)}
                fill={STATUS_COLORS[String(entry.status)] ?? FALLBACK_COLOR}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
