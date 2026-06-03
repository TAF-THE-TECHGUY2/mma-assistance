import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import type { CaseType } from '../../types';

export interface CasesByTypeDatum {
  type: CaseType | string;
  count: number;
}

interface CasesByTypeChartProps {
  data: CasesByTypeDatum[];
}

const TYPE_LABELS: Record<string, string> = {
  inpatient: 'Inpatient',
  outpatient: 'Outpatient',
  laboratory: 'Laboratory',
};

const TYPE_COLORS: Record<string, string> = {
  inpatient: '#0d9488',
  outpatient: '#0ea5e9',
  laboratory: '#8b5cf6',
};

const FALLBACK_COLORS = ['#0d9488', '#0ea5e9', '#8b5cf6', '#f59e0b', '#64748b'];

export default function CasesByTypeChart({ data }: CasesByTypeChartProps) {
  const chartData = (data ?? []).map((d) => ({
    ...d,
    label: TYPE_LABELS[String(d.type)] ?? String(d.type),
  }));

  const total = chartData.reduce((sum, d) => sum + (d.count ?? 0), 0);

  if (chartData.length === 0 || total === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        No case type data available.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={85}
            paddingAngle={2}
            stroke="#ffffff"
            strokeWidth={2}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={String(entry.type)}
                fill={
                  TYPE_COLORS[String(entry.type)] ??
                  FALLBACK_COLORS[index % FALLBACK_COLORS.length]
                }
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              fontSize: 12,
            }}
            formatter={(value, name) => {
              const count = typeof value === 'number' ? value : Number(value) || 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return [`${count} (${pct}%)`, name];
            }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            wrapperStyle={{ fontSize: 12, color: '#475569' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
