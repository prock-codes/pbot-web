'use client';

import { useState, useEffect } from 'react';
import { formatUtcHourToLocal, formatHour } from '@/lib/utils';

interface LocalHourProps {
  utcHour: number | null;
  fallback?: string;
}

/**
 * Displays a UTC hour converted to the user's local timezone.
 * Renders the UTC value on server, then updates to local time on client.
 */
export function LocalHour({ utcHour, fallback = 'N/A' }: LocalHourProps) {
  const [localTime, setLocalTime] = useState<string | null>(null);

  useEffect(() => {
    if (utcHour !== null) {
      setLocalTime(formatUtcHourToLocal(utcHour));
    }
  }, [utcHour]);

  if (utcHour === null) {
    return <>{fallback}</>;
  }

  // Show UTC format on server, local format on client
  return <>{localTime ?? formatHour(utcHour)}</>;
}

interface LocalDateTimeProps {
  isoString: string;
  format?: 'time' | 'date' | 'datetime';
}

/**
 * Displays a UTC ISO timestamp in the user's local timezone.
 * Handles SSR hydration by showing a placeholder initially.
 */
export function LocalDateTime({ isoString, format = 'datetime' }: LocalDateTimeProps) {
  const [formattedTime, setFormattedTime] = useState<string>('');

  useEffect(() => {
    const date = new Date(isoString);

    if (format === 'time') {
      setFormattedTime(date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }));
    } else if (format === 'date') {
      setFormattedTime(date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }));
    } else {
      setFormattedTime(date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }));
    }
  }, [isoString, format]);

  // Return empty on server to avoid hydration mismatch
  // Client will populate after mount
  return <>{formattedTime}</>;
}
