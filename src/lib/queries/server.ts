import { supabase } from '../supabase';
import { Guild, ServerStats, ActiveVoiceSession } from '@/types';
import { getDayName, getUTCDateString } from '../utils';

export async function getAllServers(): Promise<Guild[]> {
  const { data, error } = await supabase
    .from('guilds')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getServer(guildId: string): Promise<Guild | null> {
  const { data, error } = await supabase
    .from('guilds')
    .select('*')
    .eq('id', guildId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function getServerStats(guildId: string): Promise<ServerStats> {
  // Run all queries in parallel
  const [messagesResult, voiceResult, xpResult, membersResult, activeDayResult, peakHourResult] = await Promise.all([
    // Total messages
    supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('guild_id', guildId),

    // Total voice hours
    supabase
      .from('voice_sessions')
      .select('duration_seconds')
      .eq('guild_id', guildId)
      .not('duration_seconds', 'is', null),

    // Total XP
    supabase
      .from('member_levels')
      .select('xp')
      .eq('guild_id', guildId),

    // Total members with XP
    supabase
      .from('member_levels')
      .select('*', { count: 'exact', head: true })
      .eq('guild_id', guildId),

    // Most active day (from daily stats)
    supabase
      .from('daily_member_stats')
      .select('date, message_count')
      .eq('guild_id', guildId),

    // Peak hour (from messages)
    supabase
      .from('messages')
      .select('created_at')
      .eq('guild_id', guildId)
      .limit(1000),
  ]);

  // Calculate totals
  const totalMessages = messagesResult.count || 0;

  const totalVoiceSeconds = voiceResult.data?.reduce(
    (sum, s) => sum + (s.duration_seconds || 0),
    0
  ) || 0;
  const totalVoiceHours = Math.round(totalVoiceSeconds / 3600);

  const totalXp = xpResult.data?.reduce((sum, m) => sum + (m.xp || 0), 0) || 0;

  const totalMembers = membersResult.count || 0;

  // Calculate most active day
  let mostActiveDay: string | null = null;
  if (activeDayResult.data && activeDayResult.data.length > 0) {
    const dayTotals: Record<number, number> = {};
    activeDayResult.data.forEach((stat) => {
      // Parse date string directly to avoid timezone issues
      // stat.date is in format "YYYY-MM-DD"
      const [year, month, day] = stat.date.split('-').map(Number);
      const date = new Date(year, month - 1, day); // Creates date in local timezone
      const dayOfWeek = date.getDay();
      dayTotals[dayOfWeek] = (dayTotals[dayOfWeek] || 0) + stat.message_count;
    });

    let maxDay = 0;
    let maxCount = 0;
    Object.entries(dayTotals).forEach(([day, count]) => {
      if (count > maxCount) {
        maxDay = parseInt(day);
        maxCount = count;
      }
    });

    if (maxCount > 0) {
      mostActiveDay = getDayName(maxDay);
    }
  }

  // Calculate peak hour (in UTC for consistent server-side calculation)
  let peakHour: number | null = null;
  if (peakHourResult.data && peakHourResult.data.length > 0) {
    const hourCounts: Record<number, number> = {};
    peakHourResult.data.forEach((msg) => {
      // Use UTC hours for consistent calculation regardless of server timezone
      const hour = new Date(msg.created_at).getUTCHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    let maxHour = 0;
    let maxCount = 0;
    Object.entries(hourCounts).forEach(([hour, count]) => {
      if (count > maxCount) {
        maxHour = parseInt(hour);
        maxCount = count;
      }
    });

    if (maxCount > 0) {
      peakHour = maxHour;
    }
  }

  return {
    totalMessages,
    totalVoiceHours,
    totalXp,
    totalMembers,
    mostActiveDay,
    peakHour,
  };
}

export async function getServerMemberCount(guildId: string): Promise<number> {
  const { count, error } = await supabase
    .from('member_levels')
    .select('*', { count: 'exact', head: true })
    .eq('guild_id', guildId);

  if (error) throw error;
  return count || 0;
}

export interface DailyActivityStats {
  date: string;
  messages: number;
  voiceMinutes: number;
}

export async function getServerDailyActivity(
  guildId: string,
  days: number
): Promise<DailyActivityStats[]> {
  // Use UTC dates since daily_member_stats stores dates in UTC
  const startDate = new Date();
  startDate.setUTCDate(startDate.getUTCDate() - days);
  const startDateStr = getUTCDateString(startDate);

  // Fetch daily member stats aggregated by date
  const { data, error } = await supabase
    .from('daily_member_stats')
    .select('date, message_count, voice_minutes')
    .eq('guild_id', guildId)
    .gte('date', startDateStr)
    .order('date', { ascending: true });

  if (error) throw error;

  // Aggregate by date (sum all members for each day)
  const dateMap = new Map<string, { messages: number; voiceMinutes: number }>();

  (data || []).forEach((row) => {
    const existing = dateMap.get(row.date);
    if (existing) {
      existing.messages += row.message_count || 0;
      existing.voiceMinutes += row.voice_minutes || 0;
    } else {
      dateMap.set(row.date, {
        messages: row.message_count || 0,
        voiceMinutes: row.voice_minutes || 0,
      });
    }
  });

  // Convert to array and fill in missing dates (using UTC dates)
  const result: DailyActivityStats[] = [];
  const currentDate = new Date(startDate);
  const today = new Date();

  while (currentDate <= today) {
    const dateStr = getUTCDateString(currentDate);
    const stats = dateMap.get(dateStr);
    result.push({
      date: dateStr,
      messages: stats?.messages || 0,
      voiceMinutes: stats?.voiceMinutes || 0,
    });
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return result;
}

export async function getActiveVoiceSessions(
  guildId: string
): Promise<ActiveVoiceSession[]> {
  // Get active sessions (where left_at is null)
  const { data: sessionsData, error: sessionsError } = await supabase
    .from('voice_sessions')
    .select('id, guild_id, user_id, channel_id, joined_at')
    .eq('guild_id', guildId)
    .is('left_at', null)
    .order('joined_at', { ascending: true });

  if (sessionsError) throw sessionsError;
  if (!sessionsData || sessionsData.length === 0) return [];

  // Get unique user IDs and channel IDs
  const userIds = Array.from(new Set(sessionsData.map((s) => s.user_id)));
  const channelIds = Array.from(new Set(sessionsData.map((s) => s.channel_id)));

  // Fetch member info and channel info in parallel
  const [membersResult, channelsResult] = await Promise.all([
    supabase
      .from('members')
      .select('user_id, username, display_name, avatar_url')
      .eq('guild_id', guildId)
      .in('user_id', userIds),
    supabase
      .from('channels')
      .select('id, name')
      .in('id', channelIds),
  ]);

  if (membersResult.error) throw membersResult.error;
  if (channelsResult.error) throw channelsResult.error;

  // Create maps for quick lookup
  const memberMap = new Map(
    (membersResult.data || []).map((m) => [m.user_id, m])
  );
  const channelMap = new Map(
    (channelsResult.data || []).map((c) => [c.id, c])
  );

  // Combine data
  return sessionsData.map((session) => {
    const member = memberMap.get(session.user_id);
    const channel = channelMap.get(session.channel_id);
    return {
      ...session,
      username: member?.username || null,
      display_name: member?.display_name || null,
      avatar_url: member?.avatar_url || null,
      channel_name: channel?.name || null,
    };
  });
}
