import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export interface MonthlyTrendDatum {
  month: string;
  opened: number;
  closed: number;
}

interface MonthlyTrendsChartProps {
  data: MonthlyTrendDatum[];
}

export default function MonthlyTrendsChart({ data }: MonthlyTrendsChartProps) {
  const chartData = data ?? [];

  if (chartData.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-slate-400">
        No monthly trend data available.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
        >
          <defs>
            <linearGradient id="openedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="closedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="month"
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
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              fontSize: 12,
            }}
          />
          <Legend
            verticalAlign="top"
            height={28}
            iconType="circle"
            wrapperStyle={{ fontSize: 12, color: '#475569' }}
          />
          <Area
            type="monotone"
            dataKey="opened"
            name="Opened"
            stroke="#0d9488"
            strokeWidth={2}
            fill="url(#openedGradient)"
          />
          <Area
            type="monotone"
            dataKey="closed"
            name="Closed"
            stroke="#0ea5e9"
            strokeWidth={2}
            fill="url(#closedGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
