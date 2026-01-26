import { AchievementDefinition, AchievementCategory } from '@/types';

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Milestone achievements
  { id: 'first_words', name: 'First Words', description: 'Send your first message', category: 'milestone', xp: 50 },
  { id: 'chatterbox', name: 'Chatterbox', description: 'Send 1,000 messages', category: 'milestone', xp: 500 },
  { id: 'novelist', name: 'Novelist', description: 'Send 10,000 messages', category: 'milestone', xp: 2000 },
  { id: 'voice_debut', name: 'Voice Debut', description: 'Spend your first minute in voice', category: 'milestone', xp: 50 },
  { id: 'hang_time', name: 'Hang Time', description: 'Spend 10 hours in voice', category: 'milestone', xp: 500 },
  { id: 'resident_dj', name: 'Resident DJ', description: 'Spend 100 hours in voice', category: 'milestone', xp: 2000 },
  { id: 'level_10_club', name: 'Level 10 Club', description: 'Reach level 10', category: 'milestone', xp: 300 },
  { id: 'level_25_club', name: 'Level 25 Club', description: 'Reach level 25', category: 'milestone', xp: 750 },
  { id: 'the_prestige', name: 'The Prestige', description: 'Reach level 50', category: 'milestone', xp: 2500 },

  // Streak achievements
  { id: 'on_a_roll', name: 'On a Roll', description: 'Be active 7 days in a row', category: 'streak', xp: 200 },
  { id: 'dedicated', name: 'Dedicated', description: 'Be active 30 days in a row', category: 'streak', xp: 1000 },
  { id: 'no_life', name: 'No Life', description: 'Be active 100 days in a row', category: 'streak', xp: 5000 },
  { id: 'weekly_warrior', name: 'Weekly Warrior', description: 'Be active every week for a month', category: 'streak', xp: 400 },

  // Time achievements
  { id: 'night_owl', name: 'Night Owl', description: 'Send a message between 2-5 AM', category: 'time', xp: 100 },
  { id: 'early_bird', name: 'Early Bird', description: 'Send a message between 5-7 AM', category: 'time', xp: 100 },
  { id: 'weekend_warrior', name: 'Weekend Warrior', description: 'Be active on both Saturday and Sunday', category: 'time', xp: 75 },
  { id: 'server_anniversary', name: 'Server Anniversary', description: 'Be a member for 1 year', category: 'time', xp: 1000 },
  { id: 'og_member', name: 'OG Member', description: 'Be one of the first 100 members', category: 'time', xp: 500 },

  // Social achievements
  { id: 'party_starter', name: 'Party Starter', description: 'Be first to join a voice channel that later has 5+ people', category: 'social', xp: 150 },
  { id: 'social_butterfly', name: 'Social Butterfly', description: 'Chat in 5 different channels in one day', category: 'social', xp: 100 },
  { id: 'full_house', name: 'Full House', description: 'Be in a voice channel with 10+ people', category: 'social', xp: 200 },
  { id: 'conversation_starter', name: 'Conversation Starter', description: 'Have 3 different people reply to your message', category: 'social', xp: 75 },
  { id: 'welcome_wagon', name: 'Welcome Wagon', description: 'Be the first to greet a new member', category: 'social', xp: 50 },

  // Activity achievements
  { id: 'stream_star', name: 'Stream Star', description: 'Stream for 1 hour', category: 'activity', xp: 200 },
  { id: 'camera_shy_no_more', name: 'Camera Shy No More', description: 'Turn on camera in voice', category: 'activity', xp: 50 },
  { id: 'marathon_session', name: 'Marathon Session', description: 'Stay in voice for 4+ hours straight', category: 'activity', xp: 300 },
  { id: 'speed_typer', name: 'Speed Typer', description: 'Send 50 messages in one day', category: 'activity', xp: 100 },
  { id: 'quiet_day', name: 'Quiet Day', description: 'Spend 2+ hours in voice without sending a message', category: 'activity', xp: 75 },

  // Fun achievements
  { id: 'afk_champion', name: 'AFK Champion', description: 'Get moved to AFK channel 10 times', category: 'fun', xp: 50 },
  { id: 'ghost', name: 'Ghost', description: 'Join and leave voice within 10 seconds', category: 'fun', xp: 25 },
  { id: 'lone_wolf', name: 'Lone Wolf', description: 'Spend 1 hour alone in voice', category: 'fun', xp: 100 },
  { id: 'echo_chamber', name: 'Echo Chamber', description: 'Send 5 messages with no replies', category: 'fun', xp: 25 },
  { id: 'plot_armor', name: 'Plot Armor', description: 'Be the last one to leave voice', category: 'fun', xp: 50 },
  { id: 'nice_xp', name: '69 Nice', description: 'Have exactly 69, 420, or 1337 XP at any point', category: 'fun', xp: 69 },
  { id: 'midnight_message', name: 'Midnight Message', description: 'Send a message at exactly 00:00', category: 'fun', xp: 100 },

  // Reaction achievements
  { id: 'crowd_pleaser', name: 'Crowd Pleaser', description: 'Get 10 reactions on a single message', category: 'reaction', xp: 150 },
  { id: 'viral', name: 'Viral', description: 'Get 25 reactions on a single message', category: 'reaction', xp: 500 },
  { id: 'generous', name: 'Generous', description: "Add 100 reactions to others' messages", category: 'reaction', xp: 100 },
  { id: 'thread_starter', name: 'Thread Starter', description: 'Create a thread that gets 20+ messages', category: 'reaction', xp: 200 },
];

export const TOTAL_ACHIEVEMENTS = ACHIEVEMENT_DEFINITIONS.length;

// Create a map for quick lookups by ID
export const ACHIEVEMENT_MAP = new Map<string, AchievementDefinition>(
  ACHIEVEMENT_DEFINITIONS.map((a) => [a.id, a])
);

// Category display info
export const CATEGORY_INFO: Record<AchievementCategory, { name: string; color: string }> = {
  milestone: { name: 'Milestones', color: 'text-yellow-400' },
  streak: { name: 'Streaks', color: 'text-orange-400' },
  time: { name: 'Time-based', color: 'text-blue-400' },
  social: { name: 'Social', color: 'text-pink-400' },
  activity: { name: 'Activity', color: 'text-green-400' },
  fun: { name: 'Fun', color: 'text-purple-400' },
  reaction: { name: 'Reactions', color: 'text-red-400' },
};

// Get achievement definition by ID
export function getAchievementById(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENT_MAP.get(id);
}

// Get achievements by category
export function getAchievementsByCategory(category: AchievementCategory): AchievementDefinition[] {
  return ACHIEVEMENT_DEFINITIONS.filter((a) => a.category === category);
}
