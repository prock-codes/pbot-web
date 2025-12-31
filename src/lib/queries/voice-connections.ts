import { supabase } from '../supabase';
import {
  VoiceConnection,
  VoiceGraphNode,
  VoiceGraphEdge,
  VoiceConnectionTimeRange,
  TopFriend,
} from '@/types';

const TIME_RANGE_DAYS: Record<VoiceConnectionTimeRange, number | null> = {
  '30d': 30,
  '90d': 90,
  'all': null,
};

/**
 * Trigger recalculation of voice connections for a guild.
 * This calls the database function to compute overlapping voice time.
 */
export async function calculateVoiceConnections(
  guildId: string,
  timeRange: VoiceConnectionTimeRange
): Promise<void> {
  const days = TIME_RANGE_DAYS[timeRange];

  const { error } = await supabase.rpc('calculate_voice_connections', {
    p_guild_id: guildId,
    p_time_range: timeRange,
    p_days: days,
  });

  if (error) throw error;
}

/**
 * Get the timestamp of when connections were last calculated.
 */
export async function getConnectionsLastCalculated(
  guildId: string,
  timeRange: VoiceConnectionTimeRange
): Promise<Date | null> {
  const { data, error } = await supabase
    .from('voice_connections')
    .select('calculated_at')
    .eq('guild_id', guildId)
    .eq('time_range', timeRange)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  return data ? new Date(data.calculated_at) : null;
}

/**
 * Get cached voice connections for a guild.
 */
export async function getVoiceConnections(
  guildId: string,
  timeRange: VoiceConnectionTimeRange
): Promise<VoiceConnection[]> {
  const { data, error } = await supabase
    .from('voice_connections_with_members')
    .select('*')
    .eq('guild_id', guildId)
    .eq('time_range', timeRange)
    .order('shared_seconds', { ascending: false });

  if (error) throw error;

  return data || [];
}

/**
 * Transform raw connections into graph-ready format (nodes and edges).
 */
export function transformToGraph(
  connections: VoiceConnection[]
): { nodes: VoiceGraphNode[]; edges: VoiceGraphEdge[] } {
  const nodeMap = new Map<string, VoiceGraphNode>();

  // Build edges and collect node data
  const edges: VoiceGraphEdge[] = connections.map((conn) => {
    // Add/update user 1
    const existing1 = nodeMap.get(conn.user_id_1);
    if (existing1) {
      existing1.totalConnections++;
      existing1.totalSharedTime += conn.shared_seconds;
    } else {
      nodeMap.set(conn.user_id_1, {
        id: conn.user_id_1,
        username: conn.username_1,
        displayName: conn.display_name_1,
        avatarUrl: conn.avatar_url_1,
        totalConnections: 1,
        totalSharedTime: conn.shared_seconds,
      });
    }

    // Add/update user 2
    const existing2 = nodeMap.get(conn.user_id_2);
    if (existing2) {
      existing2.totalConnections++;
      existing2.totalSharedTime += conn.shared_seconds;
    } else {
      nodeMap.set(conn.user_id_2, {
        id: conn.user_id_2,
        username: conn.username_2,
        displayName: conn.display_name_2,
        avatarUrl: conn.avatar_url_2,
        totalConnections: 1,
        totalSharedTime: conn.shared_seconds,
      });
    }

    return {
      source: conn.user_id_1,
      target: conn.user_id_2,
      sharedSeconds: conn.shared_seconds,
      sessionCount: conn.session_count,
    };
  });

  const nodes = Array.from(nodeMap.values());

  return { nodes, edges };
}

/**
 * Get voice connections with automatic cache refresh if stale.
 * Returns graph-ready data (nodes and edges).
 */
export async function getVoiceGraph(
  guildId: string,
  timeRange: VoiceConnectionTimeRange,
  maxAgeHours: number = 24
): Promise<{
  nodes: VoiceGraphNode[];
  edges: VoiceGraphEdge[];
  calculatedAt: Date | null;
  isStale: boolean;
}> {
  // Check cache age
  const lastCalculated = await getConnectionsLastCalculated(guildId, timeRange);
  const now = new Date();

  const isStale =
    !lastCalculated ||
    now.getTime() - lastCalculated.getTime() > maxAgeHours * 60 * 60 * 1000;

  // If stale, recalculate (this may take a few seconds for large servers)
  if (isStale) {
    await calculateVoiceConnections(guildId, timeRange);
  }

  // Fetch the connections
  const connections = await getVoiceConnections(guildId, timeRange);
  const { nodes, edges } = transformToGraph(connections);

  // Get the updated timestamp
  const calculatedAt = isStale
    ? new Date()
    : lastCalculated;

  return {
    nodes,
    edges,
    calculatedAt,
    isStale,
  };
}

/**
 * Check if there are any active voice sessions in a guild.
 */
async function hasActiveVoiceSessions(guildId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('voice_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('guild_id', guildId)
    .is('left_at', null);

  if (error) return false;
  return (count ?? 0) > 0;
}

/**
 * Get top friends for a specific user based on shared voice time.
 * If there are active voice sessions, refresh the cache to include them.
 */
export async function getTopFriends(
  guildId: string,
  userId: string,
  limit: number = 5
): Promise<TopFriend[]> {
  // Check if there are active sessions - if so, refresh the cache to include them
  const hasActiveSessions = await hasActiveVoiceSessions(guildId);
  if (hasActiveSessions) {
    // Refresh the 'all' time range cache to include active sessions
    await calculateVoiceConnections(guildId, 'all');
  }

  // Get connections where this user is involved (using 'all' time range for most complete data)
  const { data, error } = await supabase
    .from('voice_connections_with_members')
    .select('*')
    .eq('guild_id', guildId)
    .eq('time_range', 'all')
    .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
    .order('shared_seconds', { ascending: false })
    .limit(limit);

  if (error) throw error;

  // Transform to TopFriend format (normalize so the friend is always the "other" user)
  return (data || []).map((conn) => {
    const isUser1 = conn.user_id_1 === userId;
    return {
      user_id: isUser1 ? conn.user_id_2 : conn.user_id_1,
      username: isUser1 ? conn.username_2 : conn.username_1,
      display_name: isUser1 ? conn.display_name_2 : conn.display_name_1,
      avatar_url: isUser1 ? conn.avatar_url_2 : conn.avatar_url_1,
      shared_seconds: conn.shared_seconds,
      session_count: conn.session_count,
    };
  });
}
