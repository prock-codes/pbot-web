'use client';

import { useCallback } from 'react';
import { ActivityChart } from './activity-chart';
import { getServerDailyActivity } from '@/lib/queries/server';

interface ServerActivityChartProps {
  serverId: string;
}

export function ServerActivityChart({ serverId }: ServerActivityChartProps) {
  const fetchData = useCallback(
    async (days: number) => {
      return getServerDailyActivity(serverId, days);
    },
    [serverId]
  );

  return <ActivityChart title="Server Activity" fetchData={fetchData} />;
}
