'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';
import { formatUtcDateToLocal } from '@/lib/utils';

export type TimeRange = '7d' | '14d' | '30d' | '90d';

interface TimeRangeOption {
  value: TimeRange;
  label: string;
  days: number;
}

export const TIME_RANGES: TimeRangeOption[] = [
  { value: '7d', label: '7 Days', days: 7 },
  { value: '14d', label: '14 Days', days: 14 },
  { value: '30d', label: '30 Days', days: 30 },
  { value: '90d', label: '90 Days', days: 90 },
];

interface ChartDataPoint {
  date: string;
  messages: number;
  voiceMinutes: number;
}

interface ActivityChartProps {
  title?: string;
  fetchData: (days: number) => Promise<ChartDataPoint[]>;
  defaultRange?: TimeRange;
  showXp?: boolean;
}

export function ActivityChart({
  title = 'Activity',
  fetchData,
  defaultRange = '30d',
}: ActivityChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(defaultRange);
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const days = TIME_RANGES.find((r) => r.value === timeRange)?.days || 30;
        const result = await fetchData(days);
        setData(result);
      } catch (err) {
        console.error('Failed to load activity data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [timeRange, fetchData]);

  // Format date for display - converts UTC date to user's local timezone
  const formatDate = (dateStr: string) => {
    return formatUtcDateToLocal(dateStr);
  };

  // Prepare chart data
  const chartData = data.map((d) => ({
    ...d,
    dateFormatted: formatDate(d.date),
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {title}
          </CardTitle>
          <div className="flex gap-1">
            {TIME_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  timeRange === range.value
                    ? 'bg-discord-blurple text-white'
                    : 'bg-discord-darker text-gray-400 hover:text-white'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400">
            No activity data available
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5865f2" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#5865f2" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorVoice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3ba55c" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3ba55c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="dateFormatted"
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) =>
                    value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#2b2d31',
                    border: '1px solid #3b3d44',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'voiceMinutes') {
                      const hours = Math.floor(value / 60);
                      const mins = value % 60;
                      return [hours > 0 ? `${hours}h ${mins}m` : `${mins}m`, 'Voice'];
                    }
                    return [value.toLocaleString(), 'Messages'];
                  }}
                />
                <Legend
                  formatter={(value) =>
                    value === 'messages' ? 'Messages' : 'Voice Time'
                  }
                />
                <Area
                  type="monotone"
                  dataKey="messages"
                  stroke="#5865f2"
                  fillOpacity={1}
                  fill="url(#colorMessages)"
                  name="messages"
                />
                <Area
                  type="monotone"
                  dataKey="voiceMinutes"
                  stroke="#3ba55c"
                  fillOpacity={1}
                  fill="url(#colorVoice)"
                  name="voiceMinutes"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
