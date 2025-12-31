import { supabase } from '../supabase';
import { MemberWithLevel, DailyMemberStats, EmojiUsage, VoiceSession, VoiceStateChange } from '@/types';

export async function getMemberProfile(
  guildId: string,
  userId: string
): Promise<MemberWithLevel | null> {
  // Fetch member levels
  const { data: levelData, error: levelError } = await supabase
    .from('member_levels')
    .select('*')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .single();

  if (levelError) {
    if (levelError.code === 'PGRST116') return null;
    throw levelError;
  }

  // Fetch member info separately
  const { data: memberData } = await supabase
    .from('members')
    .select('username, display_name, avatar_url')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .single();

  return {
    id: levelData.id,
    guild_id: levelData.guild_id,
    user_id: levelData.user_id,
    xp: levelData.xp,
    level: levelData.level,
    message_count: levelData.message_count,
    voice_minutes: levelData.voice_minutes,
    last_xp_at: levelData.last_xp_at,
    created_at: levelData.created_at,
    updated_at: levelData.updated_at,
    username: memberData?.username || null,
    display_name: memberData?.display_name || null,
    avatar_url: memberData?.avatar_url || null,
  };
}

export async function getMemberDailyStats(
  guildId: string,
  userId: string,
  days = 30
): Promise<DailyMemberStats[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('daily_member_stats')
    .select('*')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getMemberTopEmojis(
  guildId: string,
  userId: string,
  limit = 10
): Promise<EmojiUsage[]> {
  const { data, error } = await supabase
    .from('emoji_usage')
    .select('emoji, emoji_id, is_custom, count')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .order('count', { ascending: false })
    .limit(limit);

  if (error) throw error;

  // Aggregate by emoji (in case there are multiple rows per emoji)
  const emojiMap = new Map<string, EmojiUsage>();
  (data || []).forEach((row) => {
    const key = row.emoji;
    const existing = emojiMap.get(key);
    if (existing) {
      existing.total += row.count;
    } else {
      emojiMap.set(key, {
        emoji: row.emoji,
        emoji_id: row.emoji_id,
        is_custom: row.is_custom,
        total: row.count,
      });
    }
  });

  return Array.from(emojiMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export async function getMemberTopChannels(
  guildId: string,
  userId: string,
  limit = 5
): Promise<{ channelId: string; messageCount: number }[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('channel_id')
    .eq('guild_id', guildId)
    .eq('user_id', userId);

  if (error) throw error;

  // Count messages per channel
  const channelCounts = new Map<string, number>();
  (data || []).forEach((msg) => {
    channelCounts.set(msg.channel_id, (channelCounts.get(msg.channel_id) || 0) + 1);
  });

  return Array.from(channelCounts.entries())
    .map(([channelId, messageCount]) => ({ channelId, messageCount }))
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, limit);
}

export async function getMemberJoinDate(
  guildId: string,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('members')
    .select('joined_at')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data?.joined_at || null;
}

export async function getMemberVoiceSessions(
  guildId: string,
  userId: string,
  limit = 10,
  includeActive = true
): Promise<VoiceSession[]> {
  // Get completed sessions
  const { data: completedSessions, error: completedError } = await supabase
    .from('voice_sessions')
    .select('*')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .not('left_at', 'is', null)
    .order('joined_at', { ascending: false })
    .limit(limit);

  if (completedError) throw completedError;

  // Get active session (if any)
  let activeSession = null;
  if (includeActive) {
    const { data: active, error: activeError } = await supabase
      .from('voice_sessions')
      .select('*')
      .eq('guild_id', guildId)
      .eq('user_id', userId)
      .is('left_at', null)
      .order('joined_at', { ascending: false })
      .limit(1)
      .single();

    if (!activeError && active) {
      activeSession = active;
    }
  }

  const sessions = activeSession
    ? [activeSession, ...(completedSessions || [])]
    : completedSessions || [];

  if (sessions.length === 0) return [];

  // Get channel names
  const channelIds = [...new Set(sessions.map((s) => s.channel_id))];
  const { data: channels } = await supabase
    .from('channels')
    .select('id, name')
    .in('id', channelIds);

  const channelMap = new Map((channels || []).map((c) => [c.id, c.name]));

  return sessions.map((s) => ({
    id: s.id,
    guild_id: s.guild_id,
    user_id: s.user_id,
    channel_id: s.channel_id,
    joined_at: s.joined_at,
    left_at: s.left_at,
    duration_seconds: s.duration_seconds,
    was_streaming: s.was_streaming || false,
    was_video: s.was_video || false,
    channel_name: channelMap.get(s.channel_id) || null,
  }));
}

export async function getMemberVoiceStateChanges(
  guildId: string,
  userId: string,
  startTime: string,
  endTime: string
): Promise<VoiceStateChange[]> {
  const { data, error } = await supabase
    .from('voice_state_changes')
    .select('*')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .gte('created_at', startTime)
    .lte('created_at', endTime)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}
