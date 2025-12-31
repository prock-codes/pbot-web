import { supabase } from '../supabase';
import { MemberWithLevel, LevelRole } from '@/types';

export type SortField = 'xp' | 'level' | 'message_count' | 'voice_minutes';
export type SortOrder = 'asc' | 'desc';

interface GetMembersOptions {
  guildId: string;
  page?: number;
  limit?: number;
  sortBy?: SortField;
  sortOrder?: SortOrder;
  search?: string;
}

interface GetMembersResult {
  members: MemberWithLevel[];
  totalCount: number;
  page: number;
  totalPages: number;
}

export async function getMembers({
  guildId,
  page = 1,
  limit = 20,
  sortBy = 'xp',
  sortOrder = 'desc',
  search = '',
}: GetMembersOptions): Promise<GetMembersResult> {
  const offset = (page - 1) * limit;

  // First get member levels
  const { data: levelsData, error: levelsError, count } = await supabase
    .from('member_levels')
    .select('*', { count: 'exact' })
    .eq('guild_id', guildId)
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  if (levelsError) throw levelsError;

  if (!levelsData || levelsData.length === 0) {
    return {
      members: [],
      totalCount: 0,
      page,
      totalPages: 0,
    };
  }

  // Get user IDs to fetch member info
  const userIds = levelsData.map((l) => l.user_id);

  // Fetch member info for these users
  const { data: membersData, error: membersError } = await supabase
    .from('members')
    .select('user_id, username, display_name, avatar_url')
    .eq('guild_id', guildId)
    .in('user_id', userIds);

  if (membersError) throw membersError;

  // Create a map for quick lookup
  const memberMap = new Map(
    (membersData || []).map((m) => [m.user_id, m])
  );

  // Combine the data
  let members: MemberWithLevel[] = levelsData.map((level) => {
    const member = memberMap.get(level.user_id);
    return {
      id: level.id,
      guild_id: level.guild_id,
      user_id: level.user_id,
      xp: level.xp,
      level: level.level,
      message_count: level.message_count,
      voice_minutes: level.voice_minutes,
      last_xp_at: level.last_xp_at,
      created_at: level.created_at,
      updated_at: level.updated_at,
      username: member?.username || null,
      display_name: member?.display_name || null,
      avatar_url: member?.avatar_url || null,
    };
  });

  // Filter by search if provided (client-side since we already have the data)
  if (search) {
    const searchLower = search.toLowerCase();
    members = members.filter(
      (m) =>
        m.username?.toLowerCase().includes(searchLower) ||
        m.display_name?.toLowerCase().includes(searchLower)
    );
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return {
    members,
    totalCount,
    page,
    totalPages,
  };
}

export async function getMemberRank(guildId: string, userId: string): Promise<number> {
  // Get the user's XP first
  const { data: userData, error: userError } = await supabase
    .from('member_levels')
    .select('xp')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .single();

  if (userError) {
    if (userError.code === 'PGRST116') return 0;
    throw userError;
  }

  // Count how many users have more XP
  const { count, error } = await supabase
    .from('member_levels')
    .select('*', { count: 'exact', head: true })
    .eq('guild_id', guildId)
    .gt('xp', userData.xp);

  if (error) throw error;

  return (count || 0) + 1;
}

export async function getLevelRoles(guildId: string): Promise<LevelRole[]> {
  const { data, error } = await supabase
    .from('level_roles')
    .select('*')
    .eq('guild_id', guildId)
    .order('level', { ascending: true });

  if (error) throw error;

  return data || [];
}
