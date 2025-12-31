'use client';

import { useCallback } from 'react';
import { ActivityChart } from './activity-chart';
import { getMemberDailyStats } from '@/lib/queries/profile';

interface MemberActivityChartProps {
  serverId: string;
  memberId: string;
}

export function MemberActivityChart({ serverId, memberId }: MemberActivityChartProps) {
  const fetchData = useCallback(
    async (days: number) => {
      const stats = await getMemberDailyStats(serverId, memberId, days);
      return stats.map((s) => ({
        date: s.date,
        messages: s.message_count,
        voiceMinutes: s.voice_minutes,
      }));
    },
    [serverId, memberId]
  );

  return <ActivityChart title="Activity" fetchData={fetchData} />;
}
