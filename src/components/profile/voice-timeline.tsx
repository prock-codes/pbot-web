'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDuration, formatVoiceTime, getUTCDateString, formatNumber } from '@/lib/utils';
import {
  getMemberVoiceSessions,
  getMemberVoiceStateChanges,
  getMemberYearlyActivityStats,
  YearlyActivityDay,
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
  MessageSquare,
  Activity,
} from 'lucide-react';

interface VoiceTimelineProps {
  serverId: string;
  memberId: string;
}

interface SessionWithChanges extends VoiceSession {
  stateChanges: VoiceStateChange[];
}

type ActivityType = 'voice' | 'text' | 'combined';

// Colors for different states in live session bar
const STATE_COLORS = {
  normal: '#3ba55c',
  muted: '#faa61a',
  deafened: '#ed4245',
  streaming: '#5865f2',
  video: '#9b59b6',
};

// Green color scale for voice contribution graph (GitHub-style)
const VOICE_GRAPH_COLORS = {
  empty: '#161b22',
  level1: '#0e4429',
  level2: '#006d32',
  level3: '#26a641',
  level4: '#39d353',
};

// Blue color scale for text contribution graph
const TEXT_GRAPH_COLORS = {
  empty: '#161b22',
  level1: '#0a3069',
  level2: '#0969da',
  level3: '#54aeff',
  level4: '#80ccff',
};

// Purple color scale for combined activity graph
const COMBINED_GRAPH_COLORS = {
  empty: '#161b22',
  level1: '#3d1a5c',
  level2: '#6e40aa',
  level3: '#9b59b6',
  level4: '#c792ea',
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

// Get color for a day based on activity value relative to max
function getDayColor(value: number, maxValue: number, activityType: ActivityType): string {
  const colorSet =
    activityType === 'voice'
      ? VOICE_GRAPH_COLORS
      : activityType === 'text'
        ? TEXT_GRAPH_COLORS
        : COMBINED_GRAPH_COLORS;

  if (value === 0) return colorSet.empty;
  if (maxValue === 0) return colorSet.empty;

  const ratio = value / maxValue;
  if (ratio <= 0.25) return colorSet.level1;
  if (ratio <= 0.5) return colorSet.level2;
  if (ratio <= 0.75) return colorSet.level3;
  return colorSet.level4;
}

// Get graph color set based on activity type
function getGraphColors(activityType: ActivityType) {
  return activityType === 'voice'
    ? VOICE_GRAPH_COLORS
    : activityType === 'text'
      ? TEXT_GRAPH_COLORS
      : COMBINED_GRAPH_COLORS;
}

// Build contribution graph data structure
// Uses UTC dates to match database storage
function buildGraphData(yearlyStats: YearlyActivityDay[], today: Date, activityType: ActivityType) {
  const year = today.getUTCFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const todayStr = getUTCDateString(today);

  // Create a map for quick lookup
  const statsMap = new Map<string, YearlyActivityDay>();
  yearlyStats.forEach((day) => {
    statsMap.set(day.date, day);
  });

  // Calculate value based on activity type
  const getValue = (day: YearlyActivityDay | undefined): number => {
    if (!day) return 0;
    if (activityType === 'voice') return day.voice_minutes;
    if (activityType === 'text') return day.message_count;
    // Combined: normalize both to a score (voice in minutes, messages count)
    // Weight them equally by normalizing to a 0-1 scale relative to their maxes
    return day.voice_minutes + day.message_count;
  };

  // Find max value for color scaling
  const maxValue = Math.max(
    ...yearlyStats.map((d) => getValue(d)),
    1
  );

  // Calculate stats
  let totalVoiceMinutes = 0;
  let totalMessages = 0;
  let voiceDaysActive = 0;
  let textDaysActive = 0;
  let currentVoiceStreak = 0;
  let longestVoiceStreak = 0;
  let tempVoiceStreak = 0;
  let currentTextStreak = 0;
  let longestTextStreak = 0;
  let tempTextStreak = 0;

  // Build weeks array (53 weeks x 7 days)
  const weeks: {
    date: Date;
    dateStr: string;
    voiceMinutes: number;
    messageCount: number;
    value: number;
    isFuture: boolean;
    isToday: boolean;
  }[][] = [];

  // Start from the first day of the year
  const currentDate = new Date(startOfYear);

  // Pad to start on Sunday (using UTC day of week)
  const startDayOfWeek = currentDate.getUTCDay();
  let currentWeek: typeof weeks[0] = [];

  // Add empty days before Jan 1 if needed
  for (let i = 0; i < startDayOfWeek; i++) {
    const padDate = new Date(Date.UTC(year - 1, 11, 31 - (startDayOfWeek - 1 - i)));
    currentWeek.push({
      date: padDate,
      dateStr: '',
      voiceMinutes: 0,
      messageCount: 0,
      value: 0,
      isFuture: false,
      isToday: false,
    });
  }

  // Fill in all days of the year (using UTC dates)
  while (currentDate.getUTCFullYear() === year) {
    const dateStr = getUTCDateString(currentDate);
    const dayStats = statsMap.get(dateStr);
    const voiceMinutes = dayStats?.voice_minutes || 0;
    const messageCount = dayStats?.message_count || 0;
    const value = getValue(dayStats);
    const isToday = dateStr === todayStr;
    const isFuture = dateStr > todayStr;

    currentWeek.push({
      date: new Date(currentDate),
      dateStr,
      voiceMinutes,
      messageCount,
      value,
      isFuture,
      isToday,
    });

    // Track stats (only for past/today)
    if (!isFuture) {
      totalVoiceMinutes += voiceMinutes;
      totalMessages += messageCount;
      if (voiceMinutes > 0) {
        voiceDaysActive++;
        tempVoiceStreak++;
        if (tempVoiceStreak > longestVoiceStreak) longestVoiceStreak = tempVoiceStreak;
      } else {
        tempVoiceStreak = 0;
      }
      if (messageCount > 0) {
        textDaysActive++;
        tempTextStreak++;
        if (tempTextStreak > longestTextStreak) longestTextStreak = tempTextStreak;
      } else {
        tempTextStreak = 0;
      }
    }

    // Start new week on Sunday
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }

    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  // Add remaining days of last week
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({
        date: new Date(currentDate),
        dateStr: '',
        voiceMinutes: 0,
        messageCount: 0,
        value: 0,
        isFuture: true,
        isToday: false,
      });
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
    weeks.push(currentWeek);
  }

  // Calculate current streaks (counting back from today, using UTC dates)
  currentVoiceStreak = 0;
  const checkVoiceDateForStreak = new Date(today);
  while (true) {
    const checkStr = getUTCDateString(checkVoiceDateForStreak);
    const mins = statsMap.get(checkStr)?.voice_minutes || 0;
    if (mins > 0) {
      currentVoiceStreak++;
      checkVoiceDateForStreak.setUTCDate(checkVoiceDateForStreak.getUTCDate() - 1);
    } else {
      break;
    }
  }

  currentTextStreak = 0;
  const checkTextDateForStreak = new Date(today);
  while (true) {
    const checkStr = getUTCDateString(checkTextDateForStreak);
    const msgs = statsMap.get(checkStr)?.message_count || 0;
    if (msgs > 0) {
      currentTextStreak++;
      checkTextDateForStreak.setUTCDate(checkTextDateForStreak.getUTCDate() - 1);
    } else {
      break;
    }
  }

  return {
    weeks,
    maxValue,
    totalVoiceMinutes,
    totalMessages,
    voiceDaysActive,
    textDaysActive,
    currentVoiceStreak,
    longestVoiceStreak,
    currentTextStreak,
    longestTextStreak,
  };
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function VoiceTimeline({ serverId, memberId }: VoiceTimelineProps) {
  const [activeSession, setActiveSession] = useState<SessionWithChanges | null>(null);
  const [yearlyStats, setYearlyStats] = useState<YearlyActivityDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<{
    date: string;
    voiceMinutes: number;
    messageCount: number;
    x: number;
    y: number;
  } | null>(null);
  const [clientDate, setClientDate] = useState<Date | null>(null);
  const [activityType, setActivityType] = useState<ActivityType>('combined');

  // Set the date on client side to avoid hydration mismatch
  useEffect(() => {
    setClientDate(new Date());
  }, []);

  const loadData = useCallback(async (isInitialLoad = false) => {
    try {
      const [voiceSessions, yearly] = await Promise.all([
        getMemberVoiceSessions(serverId, memberId, 1, true),
        getMemberYearlyActivityStats(serverId, memberId),
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
      console.error('Failed to load activity data:', err);
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

  const graphData = useMemo(() => {
    // Use client date if available, otherwise return empty data
    if (!clientDate) {
      return {
        weeks: [],
        maxValue: 0,
        totalVoiceMinutes: 0,
        totalMessages: 0,
        voiceDaysActive: 0,
        textDaysActive: 0,
        currentVoiceStreak: 0,
        longestVoiceStreak: 0,
        currentTextStreak: 0,
        longestTextStreak: 0,
      };
    }
    return buildGraphData(yearlyStats, clientDate, activityType);
  }, [yearlyStats, clientDate, activityType]);

  if (loading || !clientDate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Activity
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

  const year = clientDate.getFullYear();
  const graphColors = getGraphColors(activityType);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Activity
          </CardTitle>
          {/* Activity Type Toggle */}
          <div className="flex items-center gap-1 bg-discord-darker rounded-lg p-1">
            <button
              onClick={() => setActivityType('combined')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activityType === 'combined'
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-gray-400 hover:text-white hover:bg-discord-lighter/50'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              All
            </button>
            <button
              onClick={() => setActivityType('voice')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activityType === 'voice'
                  ? 'bg-green-500/20 text-green-400'
                  : 'text-gray-400 hover:text-white hover:bg-discord-lighter/50'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              Voice
            </button>
            <button
              onClick={() => setActivityType('text')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activityType === 'text'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-discord-lighter/50'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Text
            </button>
          </div>
        </div>
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
          {activityType === 'voice' || activityType === 'combined' ? (
            <>
              <div className="bg-discord-darker rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-white">{formatVoiceTime(graphData.totalVoiceMinutes)}</div>
                <div className="text-xs text-gray-400">Voice Time</div>
              </div>
              <div className="bg-discord-darker rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="text-lg font-bold text-white">{graphData.currentVoiceStreak}</span>
                </div>
                <div className="text-xs text-gray-400">Voice Streak</div>
              </div>
            </>
          ) : null}
          {activityType === 'text' || activityType === 'combined' ? (
            <>
              <div className="bg-discord-darker rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-white">{formatNumber(graphData.totalMessages)}</div>
                <div className="text-xs text-gray-400">Messages</div>
              </div>
              <div className="bg-discord-darker rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Flame className="w-4 h-4 text-blue-500" />
                  <span className="text-lg font-bold text-white">{graphData.currentTextStreak}</span>
                </div>
                <div className="text-xs text-gray-400">Text Streak</div>
              </div>
            </>
          ) : null}
          {activityType === 'voice' && (
            <>
              <div className="bg-discord-darker rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-white">{graphData.voiceDaysActive}</div>
                <div className="text-xs text-gray-400">Days Active</div>
              </div>
              <div className="bg-discord-darker rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-white">{graphData.longestVoiceStreak}</div>
                <div className="text-xs text-gray-400">Longest Streak</div>
              </div>
            </>
          )}
          {activityType === 'text' && (
            <>
              <div className="bg-discord-darker rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-white">{graphData.textDaysActive}</div>
                <div className="text-xs text-gray-400">Days Active</div>
              </div>
              <div className="bg-discord-darker rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-white">{graphData.longestTextStreak}</div>
                <div className="text-xs text-gray-400">Longest Streak</div>
              </div>
            </>
          )}
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
                        ? graphColors.empty
                        : getDayColor(day.value, graphData.maxValue, activityType);

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
                              voiceMinutes: day.voiceMinutes,
                              messageCount: day.messageCount,
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
              {Object.values(graphColors).map((color, i) => (
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
                top: hoveredDay.y - 60,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="font-medium text-white space-y-1">
                {(activityType === 'voice' || activityType === 'combined') && (
                  <div className="flex items-center gap-2">
                    <Mic className="w-3 h-3 text-green-400" />
                    <span>{formatVoiceTime(hoveredDay.voiceMinutes)} voice</span>
                  </div>
                )}
                {(activityType === 'text' || activityType === 'combined') && (
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3 h-3 text-blue-400" />
                    <span>{formatNumber(hoveredDay.messageCount)} messages</span>
                  </div>
                )}
              </div>
              <div className="text-gray-400 text-xs mt-1">
                {(() => {
                  // Convert UTC date to local date for display
                  const [year, month, day] = hoveredDay.date.split('-').map(Number);
                  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
                  return utcDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  });
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Year label */}
        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-400">
          <Calendar className="w-4 h-4" />
          <span>{year} Activity</span>
        </div>
      </CardContent>
    </Card>
  );
}
