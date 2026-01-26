import { supabase } from '../supabase';
import { MemberAchievement, EarnedAchievement } from '@/types';
import { getAchievementById, TOTAL_ACHIEVEMENTS } from '../achievements';

export interface AchievementStats {
  earnedCount: number;
  totalCount: number;
  totalXpFromAchievements: number;
}

/**
 * Get all achievements earned by a member
 */
export async function getMemberAchievements(
  guildId: string,
  userId: string
): Promise<EarnedAchievement[]> {
  const { data, error } = await supabase
    .from('member_achievements')
    .select('*')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });

  if (error) throw error;

  // Map database records to EarnedAchievement by joining with definitions
  const achievements: EarnedAchievement[] = [];
  for (const record of data || []) {
    const definition = getAchievementById(record.achievement_id);
    if (definition) {
      achievements.push({
        ...definition,
        earned_at: record.earned_at,
        xp_awarded: record.xp_awarded,
      });
    }
  }

  return achievements;
}

/**
 * Get achievement statistics for a member
 */
export async function getMemberAchievementStats(
  guildId: string,
  userId: string
): Promise<AchievementStats> {
  const { data, error } = await supabase
    .from('member_achievements')
    .select('xp_awarded')
    .eq('guild_id', guildId)
    .eq('user_id', userId);

  if (error) throw error;

  const records = data || [];
  const totalXp = records.reduce((sum, r) => sum + (r.xp_awarded || 0), 0);

  return {
    earnedCount: records.length,
    totalCount: TOTAL_ACHIEVEMENTS,
    totalXpFromAchievements: totalXp,
  };
}

/**
 * Get most recent achievements for a member
 */
export async function getMemberRecentAchievements(
  guildId: string,
  userId: string,
  limit = 5
): Promise<EarnedAchievement[]> {
  const { data, error } = await supabase
    .from('member_achievements')
    .select('*')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .order('earned_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  const achievements: EarnedAchievement[] = [];
  for (const record of data || []) {
    const definition = getAchievementById(record.achievement_id);
    if (definition) {
      achievements.push({
        ...definition,
        earned_at: record.earned_at,
        xp_awarded: record.xp_awarded,
      });
    }
  }

  return achievements;
}
