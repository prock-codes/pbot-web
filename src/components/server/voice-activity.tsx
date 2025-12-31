'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getActiveVoiceSessions } from '@/lib/queries/server';
import { supabase } from '@/lib/supabase';
import { ActiveVoiceSession } from '@/types';
import { Mic, Radio } from 'lucide-react';

interface VoiceActivityProps {
  serverId: string;
}

function formatDuration(joinedAt: string): string {
  const start = new Date(joinedAt).getTime();
  const now = Date.now();
  const diffMs = now - start;

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function VoiceActivity({ serverId }: VoiceActivityProps) {
  const [sessions, setSessions] = useState<ActiveVoiceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  const loadSessions = useCallback(async () => {
    try {
      const data = await getActiveVoiceSessions(serverId);
      setSessions(data);
    } catch (err) {
      console.error('Failed to load active voice sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    // Initial load
    loadSessions();

    // Subscribe to realtime changes on voice_sessions table
    const channel = supabase
      .channel(`voice-activity-${serverId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'voice_sessions',
          filter: `guild_id=eq.${serverId}`,
        },
        () => {
          // New voice session started - reload to get member/channel info
          loadSessions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'voice_sessions',
          filter: `guild_id=eq.${serverId}`,
        },
        () => {
          // Voice session updated (likely left_at was set) - reload
          loadSessions();
        }
      )
      .subscribe();

    // Update durations every minute
    const tickInterval = setInterval(() => setTick((t) => t + 1), 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(tickInterval);
    };
  }, [serverId, loadSessions]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-green-400" />
            Voice Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group sessions by channel
  const sessionsByChannel = sessions.reduce((acc, session) => {
    if (!acc[session.channel_id]) {
      acc[session.channel_id] = [];
    }
    acc[session.channel_id].push(session);
    return acc;
  }, {} as Record<string, ActiveVoiceSession[]>);

  const channelIds = Object.keys(sessionsByChannel);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-green-400" />
          Voice Activity
          {sessions.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({sessions.length} {sessions.length === 1 ? 'user' : 'users'} in voice)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-gray-400 text-center py-2 text-sm">
            No one is currently in voice
          </p>
        ) : (
          <div className="space-y-2">
            {channelIds.map((channelId) => {
              const channelName = sessionsByChannel[channelId][0]?.channel_name;
              const channelSessions = sessionsByChannel[channelId];
              return (
              <div key={channelId} className="flex items-center gap-2 py-1">
                <div className="flex items-center gap-1.5 text-gray-400 text-xs shrink-0">
                  <Radio className="w-3 h-3" />
                  <span className="max-w-[100px] truncate">{channelName || 'Voice'}</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {channelSessions.map((session) => (
                    <Link
                      key={session.id}
                      href={`/${serverId}/${session.user_id}`}
                      className="relative group"
                      title={`${session.display_name || session.username || 'Unknown'} - ${formatDuration(session.joined_at)}`}
                    >
                      <Avatar
                        src={session.avatar_url}
                        alt={session.username || 'User'}
                        size="xs"
                        className="group-hover:ring-2 ring-green-400 transition-all"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-discord-light" />
                    </Link>
                  ))}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
