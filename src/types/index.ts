export interface Guild {
  id: string;
  name: string;
  icon_url: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: number;
  guild_id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemberLevel {
  id: number;
  guild_id: string;
  user_id: string;
  xp: number;
  level: number;
  message_count: number;
  voice_minutes: number;
  last_xp_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemberWithLevel extends MemberLevel {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface DailyMemberStats {
  id: number;
  guild_id: string;
  user_id: string;
  date: string;
  message_count: number;
  reaction_count: number;
  voice_minutes: number;
  xp_earned: number;
}

export interface EmojiUsage {
  emoji: string;
  emoji_id: string | null;
  is_custom: boolean;
  total: number;
}

export interface ServerStats {
  totalMessages: number;
  totalVoiceHours: number;
  totalXp: number;
  totalMembers: number;
  mostActiveDay: string | null;
  peakHour: number | null;
}

export interface LevelProgress {
  currentLevel: number;
  currentXp: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
}

export interface ActiveVoiceSession {
  id: number;
  guild_id: string;
  user_id: string;
  channel_id: string;
  joined_at: string;
  // Member info (joined separately)
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  // Channel info (joined separately)
  channel_name: string | null;
}

export interface Channel {
  id: string;
  guild_id: string;
  name: string;
  type: string;
  parent_id: string | null;
  position: number;
  is_deleted: boolean;
}

export type VoiceConnectionTimeRange = '30d' | '90d' | 'all';

export interface VoiceConnection {
  user_id_1: string;
  user_id_2: string;
  shared_seconds: number;
  session_count: number;
  username_1: string | null;
  display_name_1: string | null;
  avatar_url_1: string | null;
  username_2: string | null;
  display_name_2: string | null;
  avatar_url_2: string | null;
}

export interface VoiceGraphNode {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  totalConnections: number;
  totalSharedTime: number;
}

export interface VoiceGraphEdge {
  source: string;
  target: string;
  sharedSeconds: number;
  sessionCount: number;
}

export interface LevelRole {
  id: number;
  guild_id: string;
  level: number;
  role_id: string;
  role_name: string | null;
  role_color: string | null;
  created_at: string;
}

export interface TopFriend {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  shared_seconds: number;
  session_count: number;
}

export interface VoiceSession {
  id: number;
  guild_id: string;
  user_id: string;
  channel_id: string;
  joined_at: string;
  left_at: string | null;
  duration_seconds: number | null;
  was_streaming: boolean;
  was_video: boolean;
  channel_name: string | null;
}

export type VoiceStateEventType =
  | 'mute'
  | 'unmute'
  | 'deafen'
  | 'undeafen'
  | 'stream_start'
  | 'stream_end'
  | 'video_start'
  | 'video_end';

export interface VoiceStateChange {
  id: number;
  guild_id: string;
  user_id: string;
  channel_id: string | null;
  event_type: VoiceStateEventType;
  created_at: string;
}

// Text Connection Types
export type ConnectionTimeRange = '30d' | '90d' | 'all';

export interface TextConnection {
  user_id_1: string;
  user_id_2: string;
  shared_channel_count: number; // Number of channels both users are active in
  interaction_score: number; // Weighted score based on temporal proximity
  message_count: number; // Total messages in shared channels
  username_1: string | null;
  display_name_1: string | null;
  avatar_url_1: string | null;
  username_2: string | null;
  display_name_2: string | null;
  avatar_url_2: string | null;
}

export interface TextGraphNode {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  totalConnections: number;
  totalInteractionScore: number;
}

export interface TextGraphEdge {
  source: string;
  target: string;
  interactionScore: number;
  sharedChannelCount: number;
}

// Server Activity Weight (for balancing voice vs text in combined metrics)
export interface ServerActivityWeight {
  voiceWeight: number; // 0-1, how voice-heavy the server is
  textWeight: number; // 0-1, how text-heavy the server is
  totalVoiceMinutes: number;
  totalMessages: number;
}

// Combined Friend (includes both voice and text connections)
export interface CombinedFriend {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  voice_seconds: number;
  voice_sessions: number;
  text_interaction_score: number;
  text_shared_channels: number;
  combined_score: number; // Weighted combination of voice and text
}
