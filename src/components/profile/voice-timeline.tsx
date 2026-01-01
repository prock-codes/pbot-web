'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDuration, formatVoiceTime, getLocalDateString } from '@/lib/utils';
import {
  getMemberVoiceSessions,
  getMemberVoiceStateChanges,
  getMemberYearlyVoiceStats,
  YearlyVoiceDay,
} from '@/lib/queries/profile';
import { VoiceSession, VoiceStateChange, VoiceStateEventType } from '@/types';
import {
  Mic,
  MicOff,
  Headphones,
  HeadphoneOff,
  MonitorPlay,
  Video,
  Clock,
  Hash,
  Flame,
  Calendar,
} from 'lucide-react';

interface VoiceTimelineProps {
  serverId: string;
  memberId: string;
}

interface SessionWithChanges extends VoiceSession {
  stateChanges: VoiceStateChange[];
}

// Colors for different states in live session bar
const STATE_COLORS = {
  normal: '#3ba55c',
  muted: '#faa61a',
  deafened: '#ed4245',
  streaming: '#5865f2',
  video: '#9b59b6',
};

// Green color scale for contribution graph (GitHub-style)
const GRAPH_COLORS = {
  empty: '#161b22',
  level1: '#0e4429',
  level2: '#006d32',
  level3: '#26a641',
  level4: '#39d353',
};

function getEventIcon(eventType: VoiceStateEventType) {
  switch (eventType) {
    case 'mute':
      return <MicOff className="w-3 h-3 text-yellow-500" />;
    case 'unmute':
      return <Mic className="w-3 h-3 text-green-500" />;
    case 'deafen':
      return <HeadphoneOff className="w-3 h-3 text-red-500" />;
    case 'undeafen':
      return <Headphones className="w-3 h-3 text-green-500" />;
    case 'stream_start':
      return <MonitorPlay className="w-3 h-3 text-discord-blurple" />;
    case 'stream_end':
      return <MonitorPlay className="w-3 h-3 text-gray-500" />;
    case 'video_start':
      return <Video className="w-3 h-3 text-purple-500" />;
    case 'video_end':
      return <Video className="w-3 h-3 text-gray-500" />;
    default:
      return null;
  }
}

function getEventLabel(eventType: VoiceStateEventType): string {
  switch (eventType) {
    case 'mute':
      return 'Muted';
    case 'unmute':
      return 'Unmuted';
    case 'deafen':
      return 'Deafened';
    case 'undeafen':
      return 'Undeafened';
    case 'stream_start':
      return 'Started streaming';
    case 'stream_end':
      return 'Stopped streaming';
    case 'video_start':
      return 'Turned on camera';
    case 'video_end':
      return 'Turned off camera';
    default:
      return eventType;
  }
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

interface TimelineSegment {
  startPercent: number;
  widthPercent: number;
  color: string;
  label: string;
}

function calculateTimelineSegments(
  session: VoiceSession,
  stateChanges: VoiceStateChange[]
): TimelineSegment[] {
  const sessionStart = new Date(session.joined_at).getTime();
  const sessionEnd = session.left_at ? new Date(session.left_at).getTime() : Date.now();
  const duration = sessionEnd - sessionStart;

  if (duration <= 0) return [];

  const segments: TimelineSegment[] = [];
  let currentState = {
    muted: false,
    deafened: false,
    streaming: false,
    video: false,
  };
  let lastTime = sessionStart;

  const getColor = () => {
    if (currentState.deafened) return STATE_COLORS.deafened;
    if (currentState.streaming) return STATE_COLORS.streaming;
    if (currentState.video) return STATE_COLORS.video;
    if (currentState.muted) return STATE_COLORS.muted;
    return STATE_COLORS.normal;
  };

  const getLabel = () => {
    const states: string[] = [];
    if (currentState.deafened) states.push('Deafened');
    else if (currentState.muted) states.push('Muted');
    if (currentState.streaming) states.push('Streaming');
    if (currentState.video) states.push('Video');
    return states.length > 0 ? states.join(', ') : 'Voice';
  };

  for (const change of stateChanges) {
    const changeTime = new Date(change.created_at).getTime();

    if (changeTime > lastTime) {
      const startPercent = ((lastTime - sessionStart) / duration) * 100;
      const widthPercent = ((changeTime - lastTime) / duration) * 100;
      segments.push({
        startPercent,
        widthPercent,
        color: getColor(),
        label: getLabel(),
      });
    }

    switch (change.event_type) {
      case 'mute':
        currentState.muted = true;
        break;
      case 'unmute':
        currentState.muted = false;
        break;
      case 'deafen':
        currentState.deafened = true;
        break;
      case 'undeafen':
        currentState.deafened = false;
        break;
      case 'stream_start':
        currentState.streaming = true;
        break;
      case 'stream_end':
        currentState.streaming = false;
        break;
      case 'video_start':
        currentState.video = true;
        break;
      case 'video_end':
        currentState.video = false;
        break;
    }

    lastTime = changeTime;
  }

  if (lastTime < sessionEnd) {
    const startPercent = ((lastTime - sessionStart) / duration) * 100;
    const widthPercent = ((sessionEnd - lastTime) / duration) * 100;
    segments.push({
      startPercent,
      widthPercent,
      color: getColor(),
      label: getLabel(),
    });
  }

  if (segments.length === 0) {
    segments.push({
      startPercent: 0,
      widthPercent: 100,
      color: STATE_COLORS.normal,
      label: 'Voice',
    });
  }

  return segments;
}

// Get color for a day based on voice minutes relative to user's max
function getDayColor(minutes: number, maxMinutes: number): string {
  if (minutes === 0) return GRAPH_COLORS.empty;
  if (maxMinutes === 0) return GRAPH_COLORS.empty;

  const ratio = minutes / maxMinutes;
  if (ratio <= 0.25) return GRAPH_COLORS.level1;
  if (ratio <= 0.5) return GRAPH_COLORS.level2;
  if (ratio <= 0.75) return GRAPH_COLORS.level3;
  return GRAPH_COLORS.level4;
}

// Build contribution graph data structure
function buildGraphData(yearlyStats: YearlyVoiceDay[]) {
  const year = new Date().getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const today = new Date();
  const todayStr = getLocalDateString(today);

  // Create a map for quick lookup
  const statsMap = new Map<string, number>();
  yearlyStats.forEach((day) => {
    statsMap.set(day.date, day.voice_minutes);
  });

  // Find max minutes for color scaling
  const maxMinutes = Math.max(...yearlyStats.map((d) => d.voice_minutes), 1);

  // Calculate stats
  let totalMinutes = 0;
  let daysActive = 0;
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Build weeks array (53 weeks x 7 days)
  const weeks: { date: Date; dateStr: string; minutes: number; isFuture: boolean; isToday: boolean }[][] = [];

  // Start from the first day of the year
  const currentDate = new Date(startOfYear);

  // Pad to start on Sunday
  const startDayOfWeek = currentDate.getDay();
  let currentWeek: typeof weeks[0] = [];

  // Add empty days before Jan 1 if needed
  for (let i = 0; i < startDayOfWeek; i++) {
    const padDate = new Date(year - 1, 11, 31 - (startDayOfWeek - 1 - i));
    currentWeek.push({
      date: padDate,
      dateStr: '',
      minutes: 0,
      isFuture: false,
      isToday: false,
    });
  }

  // Fill in all days of the year
  while (currentDate.getFullYear() === year) {
    const dateStr = getLocalDateString(currentDate);
    const minutes = statsMap.get(dateStr) || 0;
    const isFuture = currentDate > today;
    const isToday = dateStr === todayStr;

    currentWeek.push({
      date: new Date(currentDate),
      dateStr,
      minutes,
      isFuture,
      isToday,
    });

    // Track stats (only for past/today)
    if (!isFuture) {
      totalMinutes += minutes;
      if (minutes > 0) {
        daysActive++;
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    // Start new week on Sunday
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Add remaining days of last week
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({
        date: new Date(currentDate),
        dateStr: '',
        minutes: 0,
        isFuture: true,
        isToday: false,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeks.push(currentWeek);
  }

  // Calculate current streak (counting back from today)
  currentStreak = 0;
  const checkDate = new Date(today);
  while (true) {
    const checkStr = getLocalDateString(checkDate);
    const mins = statsMap.get(checkStr) || 0;
    if (mins > 0) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    weeks,
    maxMinutes,
    totalMinutes,
    daysActive,
    currentStreak,
    longestStreak,
  };
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function VoiceTimeline({ serverId, memberId }: VoiceTimelineProps) {
  const [activeSession, setActiveSession] = useState<SessionWithChanges | null>(null);
  const [yearlyStats, setYearlyStats] = useState<YearlyVoiceDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<{ date: string; minutes: number; x: number; y: number } | null>(null);

  const loadData = useCallback(async (isInitialLoad = false) => {
    try {
      const [voiceSessions, yearly] = await Promise.all([
        getMemberVoiceSessions(serverId, memberId, 1, true),
        getMemberYearlyVoiceStats(serverId, memberId),
      ]);

      // Check for active session
      const active = voiceSessions.find((s) => !s.left_at);
      if (active) {
        const endTime = new Date().toISOString();
        const stateChanges = await getMemberVoiceStateChanges(
          serverId,
          memberId,
          active.joined_at,
          endTime
        );
        setActiveSession({ ...active, stateChanges });
      } else {
        setActiveSession(null);
      }

      setYearlyStats(yearly);
    } catch (err) {
      console.error('Failed to load voice data:', err);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, [serverId, memberId]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Auto-refresh when there's an active session
  useEffect(() => {
    if (!activeSession) return;

    const interval = setInterval(() => {
      loadData(false);
    }, 15000);

    return () => clearInterval(interval);
  }, [activeSession, loadData]);

  const graphData = useMemo(() => buildGraphData(yearlyStats), [yearlyStats]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Voice Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const year = new Date().getFullYear();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5" />
          Voice Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Active Session Bar */}
        {activeSession && (
          <div className="mb-6">
            <div className="bg-discord-darker rounded-lg p-3 ring-2 ring-green-500/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="w-4 h-4 text-gray-500" />
                  <span className="text-white font-medium">
                    {activeSession.channel_name || 'Unknown Channel'}
                  </span>
                  <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full animate-pulse">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    LIVE
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  {formatDuration(Math.floor((Date.now() - new Date(activeSession.joined_at).getTime()) / 1000))}
                </div>
              </div>

              {/* Timeline bar */}
              <div className="relative h-4 bg-discord-dark rounded-full overflow-hidden">
                {calculateTimelineSegments(activeSession, activeSession.stateChanges).map((segment, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0"
                    style={{
                      left: `${segment.startPercent}%`,
                      width: `${segment.widthPercent}%`,
                      backgroundColor: segment.color,
                    }}
                    title={segment.label}
                  />
                ))}
              </div>

              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{formatTime(activeSession.joined_at)}</span>
                <span>Now</span>
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-discord-darker rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-white">{formatVoiceTime(graphData.totalMinutes)}</div>
            <div className="text-xs text-gray-400">Total Time</div>
          </div>
          <div className="bg-discord-darker rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-white">{graphData.daysActive}</div>
            <div className="text-xs text-gray-400">Days Active</div>
          </div>
          <div className="bg-discord-darker rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-lg font-bold text-white">{graphData.currentStreak}</span>
            </div>
            <div className="text-xs text-gray-400">Current Streak</div>
          </div>
          <div className="bg-discord-darker rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-white">{graphData.longestStreak}</div>
            <div className="text-xs text-gray-400">Longest Streak</div>
          </div>
        </div>

        {/* Contribution Graph */}
        <div className="relative">
          {/* Month labels */}
          <div className="flex mb-1 ml-8 text-xs text-gray-500">
            {MONTH_LABELS.map((month, i) => (
              <div key={month} style={{ width: `${100 / 12}%` }} className="text-left">
                {month}
              </div>
            ))}
          </div>

          <div className="flex">
            {/* Day labels */}
            <div className="flex flex-col justify-around text-xs text-gray-500 pr-2 w-8">
              {DAY_LABELS.filter((_, i) => i % 2 === 1).map((day) => (
                <div key={day} className="h-3 leading-3">{day}</div>
              ))}
            </div>

            {/* Graph grid */}
            <div className="flex-1 overflow-x-auto">
              <div className="flex gap-[3px]" style={{ minWidth: 'max-content' }}>
                {graphData.weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[3px]">
                    {week.map((day, dayIndex) => {
                      if (!day.dateStr) {
                        return <div key={dayIndex} className="w-3 h-3" />;
                      }

                      const color = day.isFuture
                        ? GRAPH_COLORS.empty
                        : getDayColor(day.minutes, graphData.maxMinutes);

                      return (
                        <div
                          key={dayIndex}
                          className={`w-3 h-3 rounded-sm cursor-pointer transition-all hover:ring-1 hover:ring-white/50 ${
                            day.isToday ? 'ring-2 ring-white/70' : ''
                          }`}
                          style={{ backgroundColor: color, opacity: day.isFuture ? 0.3 : 1 }}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredDay({
                              date: day.dateStr,
                              minutes: day.minutes,
                              x: rect.left + rect.width / 2,
                              y: rect.top,
                            });
                          }}
                          onMouseLeave={() => setHoveredDay(null)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-3 text-xs text-gray-500">
            <span>Less</span>
            <div className="flex gap-1">
              {Object.values(GRAPH_COLORS).map((color, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <span>More</span>
          </div>

          {/* Tooltip */}
          {hoveredDay && (
            <div
              className="fixed z-50 bg-discord-darker border border-discord-lighter rounded-lg px-3 py-2 text-sm shadow-lg pointer-events-none"
              style={{
                left: hoveredDay.x,
                top: hoveredDay.y - 50,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="font-medium text-white">
                {formatVoiceTime(hoveredDay.minutes)} voice time
              </div>
              <div className="text-gray-400 text-xs">
                {new Date(hoveredDay.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>
          )}
        </div>

        {/* Year label */}
        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-400">
          <Calendar className="w-4 h-4" />
          <span>{year} Voice Activity</span>
        </div>
      </CardContent>
    </Card>
  );
}
