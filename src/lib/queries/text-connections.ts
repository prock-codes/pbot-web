import { supabase } from '../supabase';
import {
  TextConnection,
  TextGraphNode,
  TextGraphEdge,
  ConnectionTimeRange,
  ServerActivityWeight,
  CombinedFriend,
} from '@/types';
import { calculateVoiceConnections } from './voice-connections';

const TIME_RANGE_DAYS: Record<ConnectionTimeRange, number | null> = {
  '30d': 30,
  '90d': 90,
  'all': null,
};

/**
 * Get the server's activity weight (ratio of voice to text activity).
 * This is used to properly weight voice vs text in combined friend calculations.
 */
export async function getServerActivityWeight(
  guildId: string
): Promise<ServerActivityWeight> {
  // Get total messages and voice minutes
  const [messagesResult, voiceResult] = await Promise.all([
    supabase
      .from('member_levels')
      .select('message_count')
      .eq('guild_id', guildId),
    supabase
      .from('member_levels')
      .select('voice_minutes')
      .eq('guild_id', guildId),
  ]);

  const totalMessages = messagesResult.data?.reduce(
    (sum, m) => sum + (m.message_count || 0),
    0
  ) || 0;

  const totalVoiceMinutes = voiceResult.data?.reduce(
    (sum, m) => sum + (m.voice_minutes || 0),
    0
  ) || 0;

  // Convert voice minutes to a comparable scale with messages
  // Assume ~1 message per minute of active chat is roughly equivalent engagement
  const voiceEquivalent = totalVoiceMinutes;
  const total = totalMessages + voiceEquivalent;

  if (total === 0) {
    return {
      voiceWeight: 0.5,
      textWeight: 0.5,
      totalVoiceMinutes,
      totalMessages,
    };
  }

  const textWeight = totalMessages / total;
  const voiceWeight = voiceEquivalent / total;

  return {
    voiceWeight,
    textWeight,
    totalVoiceMinutes,
    totalMessages,
  };
}

/**
 * Calculate text connections for a guild.
 * This computes interaction scores based on:
 * 1. Shared channel activity (both users message in same channels)
 * 2. Temporal proximity (messages within 5 minutes of each other - suggests conversation)
 */
export async function calculateTextConnections(
  guildId: string,
  timeRange: ConnectionTimeRange
): Promise<void> {
  const days = TIME_RANGE_DAYS[timeRange];

  // Build the date filter
  let dateFilter = '';
  if (days) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    dateFilter = `AND m1.created_at >= '${startDate.toISOString()}'`;
  }

  // First, delete existing cached connections for this time range
  await supabase
    .from('text_connections')
    .delete()
    .eq('guild_id', guildId)
    .eq('time_range', timeRange);

  // Calculate text connections using a SQL query
  // This finds pairs of users who message in the same channels
  // and weights by temporal proximity (messages within 5 minutes of each other)
  const { error } = await supabase.rpc('calculate_text_connections', {
    p_guild_id: guildId,
    p_time_range: timeRange,
    p_days: days,
  });

  if (error) {
    // If the RPC doesn't exist, we'll calculate client-side (fallback)
    console.warn('Text connections RPC not available, using fallback calculation');
    await calculateTextConnectionsClientSide(guildId, timeRange, days);
  }
}

/**
 * Fallback client-side calculation of text connections.
 * This is less efficient but works without a database function.
 */
async function calculateTextConnectionsClientSide(
  guildId: string,
  timeRange: ConnectionTimeRange,
  days: number | null
): Promise<void> {
  // Build date filter
  let query = supabase
    .from('messages')
    .select('user_id, channel_id, created_at')
    .eq('guild_id', guildId)
    .order('created_at', { ascending: true });

  if (days) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    query = query.gte('created_at', startDate.toISOString());
  }

  const { data: messages, error } = await query;
  if (error) throw error;
  if (!messages || messages.length === 0) return;

  // Group messages by channel
  const channelMessages = new Map<string, Array<{ user_id: string; created_at: string }>>();
  messages.forEach((msg) => {
    const existing = channelMessages.get(msg.channel_id) || [];
    existing.push({ user_id: msg.user_id, created_at: msg.created_at });
    channelMessages.set(msg.channel_id, existing);
  });

  // Calculate interaction scores between user pairs
  const connectionScores = new Map<string, {
    user_id_1: string;
    user_id_2: string;
    shared_channel_count: number;
    interaction_score: number;
    channels: Set<string>;
  }>();

  const PROXIMITY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  for (const [channelId, channelMsgs] of Array.from(channelMessages.entries())) {
    // For each pair of messages within the time window, add interaction score
    for (let i = 0; i < channelMsgs.length; i++) {
      for (let j = i + 1; j < channelMsgs.length; j++) {
        const msg1 = channelMsgs[i];
        const msg2 = channelMsgs[j];

        // Skip if same user
        if (msg1.user_id === msg2.user_id) continue;

        const time1 = new Date(msg1.created_at).getTime();
        const time2 = new Date(msg2.created_at).getTime();
        const timeDiff = Math.abs(time2 - time1);

        // Only count if within proximity window
        if (timeDiff > PROXIMITY_WINDOW_MS) continue;

        // Create a consistent key (smaller user_id first)
        const [uid1, uid2] = msg1.user_id < msg2.user_id
          ? [msg1.user_id, msg2.user_id]
          : [msg2.user_id, msg1.user_id];
        const key = `${uid1}:${uid2}`;

        const existing = connectionScores.get(key) || {
          user_id_1: uid1,
          user_id_2: uid2,
          shared_channel_count: 0,
          interaction_score: 0,
          channels: new Set<string>(),
        };

        // Score based on proximity (closer = higher score)
        // Full point for immediate response, decays over 5 minutes
        const proximityScore = 1 - (timeDiff / PROXIMITY_WINDOW_MS);
        existing.interaction_score += proximityScore;
        existing.channels.add(channelId);

        connectionScores.set(key, existing);
      }
    }
  }

  // Update shared channel counts and insert into database
  const connections = Array.from(connectionScores.values()).map((conn) => ({
    guild_id: guildId,
    time_range: timeRange,
    user_id_1: conn.user_id_1,
    user_id_2: conn.user_id_2,
    shared_channel_count: conn.channels.size,
    interaction_score: Math.round(conn.interaction_score * 100) / 100, // Round to 2 decimals
    message_count: 0, // Would need separate query to get this
    calculated_at: new Date().toISOString(),
  }));

  if (connections.length > 0) {
    // Insert in batches
    const BATCH_SIZE = 500;
    for (let i = 0; i < connections.length; i += BATCH_SIZE) {
      const batch = connections.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase
        .from('text_connections')
        .insert(batch);

      if (insertError) {
        console.error('Failed to insert text connections batch:', insertError);
      }
    }
  }
}

/**
 * Get the timestamp of when text connections were last calculated.
 */
export async function getTextConnectionsLastCalculated(
  guildId: string,
  timeRange: ConnectionTimeRange
): Promise<Date | null> {
  const { data, error } = await supabase
    .from('text_connections')
    .select('calculated_at')
    .eq('guild_id', guildId)
    .eq('time_range', timeRange)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  return data ? new Date(data.calculated_at) : null;
}

/**
 * Get cached text connections for a guild.
 */
export async function getTextConnections(
  guildId: string,
  timeRange: ConnectionTimeRange
): Promise<TextConnection[]> {
  const { data, error } = await supabase
    .from('text_connections_with_members')
    .select('*')
    .eq('guild_id', guildId)
    .eq('time_range', timeRange)
    .order('interaction_score', { ascending: false });

  if (error) {
    // View might not exist, try base table with member join
    console.warn('text_connections_with_members view not available, using fallback');
    return getTextConnectionsWithMembersFallback(guildId, timeRange);
  }

  return data || [];
}

/**
 * Fallback to get text connections with member info via join.
 */
async function getTextConnectionsWithMembersFallback(
  guildId: string,
  timeRange: ConnectionTimeRange
): Promise<TextConnection[]> {
  const { data: connections, error } = await supabase
    .from('text_connections')
    .select('*')
    .eq('guild_id', guildId)
    .eq('time_range', timeRange)
    .order('interaction_score', { ascending: false });

  if (error) throw error;
  if (!connections || connections.length === 0) return [];

  // Get unique user IDs
  const userIds = new Set<string>();
  connections.forEach((c) => {
    userIds.add(c.user_id_1);
    userIds.add(c.user_id_2);
  });

  // Fetch member info
  const { data: members } = await supabase
    .from('members')
    .select('user_id, username, display_name, avatar_url')
    .eq('guild_id', guildId)
    .in('user_id', Array.from(userIds));

  const memberMap = new Map(
    (members || []).map((m) => [m.user_id, m])
  );

  return connections.map((conn) => {
    const m1 = memberMap.get(conn.user_id_1);
    const m2 = memberMap.get(conn.user_id_2);
    return {
      user_id_1: conn.user_id_1,
      user_id_2: conn.user_id_2,
      shared_channel_count: conn.shared_channel_count,
      interaction_score: conn.interaction_score,
      message_count: conn.message_count || 0,
      username_1: m1?.username || null,
      display_name_1: m1?.display_name || null,
      avatar_url_1: m1?.avatar_url || null,
      username_2: m2?.username || null,
      display_name_2: m2?.display_name || null,
      avatar_url_2: m2?.avatar_url || null,
    };
  });
}

/**
 * Transform raw text connections into graph-ready format (nodes and edges).
 */
export function transformToTextGraph(
  connections: TextConnection[]
): { nodes: TextGraphNode[]; edges: TextGraphEdge[] } {
  const nodeMap = new Map<string, TextGraphNode>();

  // Build edges and collect node data
  const edges: TextGraphEdge[] = connections.map((conn) => {
    // Add/update user 1
    const existing1 = nodeMap.get(conn.user_id_1);
    if (existing1) {
      existing1.totalConnections++;
      existing1.totalInteractionScore += conn.interaction_score;
    } else {
      nodeMap.set(conn.user_id_1, {
        id: conn.user_id_1,
        username: conn.username_1,
        displayName: conn.display_name_1,
        avatarUrl: conn.avatar_url_1,
        totalConnections: 1,
        totalInteractionScore: conn.interaction_score,
      });
    }

    // Add/update user 2
    const existing2 = nodeMap.get(conn.user_id_2);
    if (existing2) {
      existing2.totalConnections++;
      existing2.totalInteractionScore += conn.interaction_score;
    } else {
      nodeMap.set(conn.user_id_2, {
        id: conn.user_id_2,
        username: conn.username_2,
        displayName: conn.display_name_2,
        avatarUrl: conn.avatar_url_2,
        totalConnections: 1,
        totalInteractionScore: conn.interaction_score,
      });
    }

    return {
      source: conn.user_id_1,
      target: conn.user_id_2,
      interactionScore: conn.interaction_score,
      sharedChannelCount: conn.shared_channel_count,
    };
  });

  const nodes = Array.from(nodeMap.values());

  return { nodes, edges };
}

/**
 * Get text connections with automatic cache refresh if stale.
 * Returns graph-ready data (nodes and edges).
 */
export async function getTextGraph(
  guildId: string,
  timeRange: ConnectionTimeRange,
  maxAgeHours: number = 24
): Promise<{
  nodes: TextGraphNode[];
  edges: TextGraphEdge[];
  calculatedAt: Date | null;
  isStale: boolean;
}> {
  // Check cache age
  const lastCalculated = await getTextConnectionsLastCalculated(guildId, timeRange);
  const now = new Date();

  const isStale =
    !lastCalculated ||
    now.getTime() - lastCalculated.getTime() > maxAgeHours * 60 * 60 * 1000;

  // If stale, recalculate
  if (isStale) {
    await calculateTextConnections(guildId, timeRange);
  }

  // Fetch the connections
  const connections = await getTextConnections(guildId, timeRange);
  const { nodes, edges } = transformToTextGraph(connections);

  const calculatedAt = isStale ? new Date() : lastCalculated;

  return {
    nodes,
    edges,
    calculatedAt,
    isStale,
  };
}

/**
 * Get top text friends for a specific user based on interaction score.
 */
export async function getTopTextFriends(
  guildId: string,
  userId: string,
  limit: number = 5
): Promise<CombinedFriend[]> {
  // Get text connections for this user
  const { data, error } = await supabase
    .from('text_connections')
    .select('*')
    .eq('guild_id', guildId)
    .eq('time_range', 'all')
    .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
    .order('interaction_score', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('Failed to get text friends:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Get friend user IDs
  const friendIds = data.map((conn) =>
    conn.user_id_1 === userId ? conn.user_id_2 : conn.user_id_1
  );

  // Fetch member info
  const { data: members } = await supabase
    .from('members')
    .select('user_id, username, display_name, avatar_url')
    .eq('guild_id', guildId)
    .in('user_id', friendIds);

  const memberMap = new Map(
    (members || []).map((m) => [m.user_id, m])
  );

  return data.map((conn) => {
    const isUser1 = conn.user_id_1 === userId;
    const friendId = isUser1 ? conn.user_id_2 : conn.user_id_1;
    const member = memberMap.get(friendId);

    return {
      user_id: friendId,
      username: member?.username || null,
      display_name: member?.display_name || null,
      avatar_url: member?.avatar_url || null,
      voice_seconds: 0,
      voice_sessions: 0,
      text_interaction_score: conn.interaction_score,
      text_shared_channels: conn.shared_channel_count,
      combined_score: conn.interaction_score, // Will be combined with voice later
    };
  });
}

/**
 * Get combined top friends (voice + text) for a user.
 * Uses server activity weight to balance voice and text contributions.
 */
export async function getCombinedTopFriends(
  guildId: string,
  userId: string,
  limit: number = 5
): Promise<CombinedFriend[]> {
  // Check if voice connections cache is stale and refresh if needed
  const maxAgeHours = 24;
  const { data: cacheCheck } = await supabase
    .from('voice_connections')
    .select('calculated_at')
    .eq('guild_id', guildId)
    .eq('time_range', 'all')
    .limit(1)
    .single();

  const isStale =
    !cacheCheck?.calculated_at ||
    Date.now() - new Date(cacheCheck.calculated_at).getTime() > maxAgeHours * 60 * 60 * 1000;

  if (isStale) {
    await calculateVoiceConnections(guildId, 'all');
  }

  // Get server activity weight
  const weight = await getServerActivityWeight(guildId);

  // Get voice connections
  const { data: voiceData, error: voiceError } = await supabase
    .from('voice_connections')
    .select('*')
    .eq('guild_id', guildId)
    .eq('time_range', 'all')
    .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);

  // Get text connections (gracefully handle if table doesn't exist)
  let textData: Array<{
    user_id_1: string;
    user_id_2: string;
    interaction_score: number;
    shared_channel_count: number;
  }> | null = null;

  try {
    const { data, error } = await supabase
      .from('text_connections')
      .select('*')
      .eq('guild_id', guildId)
      .eq('time_range', 'all')
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);

    if (!error) {
      textData = data;
    }
  } catch {
    // Table might not exist yet, continue without text data
    console.warn('text_connections table not available');
  }

  // Combine connections by friend ID
  const friendMap = new Map<string, CombinedFriend>();

  // Process voice connections
  if (!voiceError && voiceData) {
    voiceData.forEach((conn) => {
      const isUser1 = conn.user_id_1 === userId;
      const friendId = isUser1 ? conn.user_id_2 : conn.user_id_1;

      const existing = friendMap.get(friendId) || {
        user_id: friendId,
        username: null,
        display_name: null,
        avatar_url: null,
        voice_seconds: 0,
        voice_sessions: 0,
        text_interaction_score: 0,
        text_shared_channels: 0,
        combined_score: 0,
      };

      existing.voice_seconds = conn.shared_seconds;
      existing.voice_sessions = conn.session_count;
      friendMap.set(friendId, existing);
    });
  }

  // Process text connections
  if (textData) {
    textData.forEach((conn) => {
      const isUser1 = conn.user_id_1 === userId;
      const friendId = isUser1 ? conn.user_id_2 : conn.user_id_1;

      const existing = friendMap.get(friendId) || {
        user_id: friendId,
        username: null,
        display_name: null,
        avatar_url: null,
        voice_seconds: 0,
        voice_sessions: 0,
        text_interaction_score: 0,
        text_shared_channels: 0,
        combined_score: 0,
      };

      existing.text_interaction_score = conn.interaction_score;
      existing.text_shared_channels = conn.shared_channel_count;
      friendMap.set(friendId, existing);
    });
  }

  // Fetch member info for all friends
  const friendIds = Array.from(friendMap.keys());
  if (friendIds.length === 0) return [];

  const { data: members } = await supabase
    .from('members')
    .select('user_id, username, display_name, avatar_url')
    .eq('guild_id', guildId)
    .in('user_id', friendIds);

  const memberMap = new Map(
    (members || []).map((m) => [m.user_id, m])
  );

  // Calculate combined scores and add member info
  // Use actual values without caps for proper ordering
  const friends = Array.from(friendMap.values()).map((friend) => {
    const member = memberMap.get(friend.user_id);

    // Convert voice seconds to hours for scoring
    const voiceHours = friend.voice_seconds / 3600;

    // Combined score: voice hours + weighted text score
    // Text score is scaled to be comparable to hours (e.g., 100 text score = 1 "equivalent hour")
    const textContribution = (friend.text_interaction_score / 100) * weight.textWeight;
    const voiceContribution = voiceHours * weight.voiceWeight;

    const combinedScore = voiceContribution + textContribution;

    return {
      ...friend,
      username: member?.username || null,
      display_name: member?.display_name || null,
      avatar_url: member?.avatar_url || null,
      combined_score: Math.round(combinedScore * 100) / 100,
    };
  });

  // Sort by combined score (highest first), then by voice_seconds as tiebreaker
  return friends
    .sort((a, b) => {
      if (b.combined_score !== a.combined_score) {
        return b.combined_score - a.combined_score;
      }
      return b.voice_seconds - a.voice_seconds;
    })
    .slice(0, limit);
}
