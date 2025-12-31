'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDuration } from '@/lib/utils';
import { getMemberVoiceSessions, getMemberVoiceStateChanges } from '@/lib/queries/profile';
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
} from 'lucide-react';

interface VoiceTimelineProps {
  serverId: string;
  memberId: string;
}

interface SessionWithChanges extends VoiceSession {
  stateChanges: VoiceStateChange[];
}

// Colors for different states
const STATE_COLORS = {
  normal: '#3ba55c', // Green - normal voice
  muted: '#faa61a', // Yellow/Orange - muted
  deafened: '#ed4245', // Red - deafened
  streaming: '#5865f2', // Blurple - streaming
  video: '#9b59b6', // Purple - video
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

function formatDate(dateString: string): string {
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
  // For active sessions, use current time as end
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

  // Process each state change
  for (const change of stateChanges) {
    const changeTime = new Date(change.created_at).getTime();

    // Add segment for time before this change
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

    // Update state
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

  // Add final segment
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

  // If no state changes, just one segment
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

export function VoiceTimeline({ serverId, memberId }: VoiceTimelineProps) {
  const [sessions, setSessions] = useState<SessionWithChanges[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  const loadData = useCallback(async (isInitialLoad = false) => {
    try {
      const voiceSessions = await getMemberVoiceSessions(serverId, memberId, 10);

      // Load state changes for each session
      const sessionsWithChanges: SessionWithChanges[] = await Promise.all(
        voiceSessions.map(async (session) => {
          // For active sessions, use current time as end time for state changes query
          const endTime = session.left_at || new Date().toISOString();
          const stateChanges = await getMemberVoiceStateChanges(
            serverId,
            memberId,
            session.joined_at,
            endTime
          );
          return { ...session, stateChanges };
        })
      );

      setSessions(sessionsWithChanges);
    } catch (err) {
      console.error('Failed to load voice sessions:', err);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, [serverId, memberId]);

  // Initial load
  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Auto-refresh every 15 seconds when there's an active session
  useEffect(() => {
    const hasActiveSession = sessions.some((s) => !s.left_at);
    if (!hasActiveSession) return;

    const interval = setInterval(() => {
      loadData(false);
    }, 15000);

    return () => clearInterval(interval);
  }, [sessions, loadData]);

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
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Recent Voice Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-center py-4">
            No voice sessions recorded yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5" />
          Recent Voice Sessions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: STATE_COLORS.normal }} />
            <span className="text-gray-400">Voice</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: STATE_COLORS.muted }} />
            <span className="text-gray-400">Muted</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: STATE_COLORS.deafened }} />
            <span className="text-gray-400">Deafened</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: STATE_COLORS.streaming }} />
            <span className="text-gray-400">Streaming</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: STATE_COLORS.video }} />
            <span className="text-gray-400">Video</span>
          </div>
        </div>

        <div className="space-y-3">
          {sessions.map((session) => {
            const segments = calculateTimelineSegments(session, session.stateChanges);
            const isExpanded = expanded === session.id;
            const isActive = !session.left_at;
            // Calculate live duration for active sessions
            const displayDuration = isActive
              ? Math.floor((Date.now() - new Date(session.joined_at).getTime()) / 1000)
              : (session.duration_seconds || 0);

            return (
              <div
                key={session.id}
                className={`bg-discord-darker rounded-lg p-3 cursor-pointer hover:bg-discord-lighter/30 transition-colors ${isActive ? 'ring-2 ring-green-500/50' : ''}`}
                onClick={() => setExpanded(isExpanded ? null : session.id)}
              >
                {/* Session header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Hash className="w-4 h-4 text-gray-500" />
                    <span className="text-white font-medium">
                      {session.channel_name || 'Unknown Channel'}
                    </span>
                    {isActive && (
                      <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full animate-pulse">
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                        LIVE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{formatDate(session.joined_at)}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(displayDuration)}
                    </span>
                  </div>
                </div>

                {/* Timeline bar */}
                <div className="relative h-4 bg-discord-dark rounded-full overflow-hidden">
                  {segments.map((segment, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 transition-all"
                      style={{
                        left: `${segment.startPercent}%`,
                        width: `${segment.widthPercent}%`,
                        backgroundColor: segment.color,
                      }}
                      title={segment.label}
                    />
                  ))}
                </div>

                {/* Time labels */}
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{formatTime(session.joined_at)}</span>
                  <span>{isActive ? 'Now' : formatTime(session.left_at!)}</span>
                </div>

                {/* Expanded state changes */}
                {isExpanded && session.stateChanges.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-discord-dark">
                    <p className="text-xs text-gray-500 mb-2">State changes:</p>
                    <div className="flex flex-wrap gap-2">
                      {session.stateChanges.map((change) => (
                        <div
                          key={change.id}
                          className="flex items-center gap-1 bg-discord-dark px-2 py-1 rounded text-xs"
                        >
                          {getEventIcon(change.event_type)}
                          <span className="text-gray-300">{getEventLabel(change.event_type)}</span>
                          <span className="text-gray-500">{formatTime(change.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Badges for streaming/video */}
                {(session.was_streaming || session.was_video) && (
                  <div className="flex gap-2 mt-2">
                    {session.was_streaming && (
                      <span className="flex items-center gap-1 text-xs bg-discord-blurple/20 text-discord-blurple px-2 py-0.5 rounded">
                        <MonitorPlay className="w-3 h-3" />
                        Streamed
                      </span>
                    )}
                    {session.was_video && (
                      <span className="flex items-center gap-1 text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                        <Video className="w-3 h-3" />
                        Video
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
