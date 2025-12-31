import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { LevelProgress } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// XP required to reach a specific level (same formula as bot)
// Formula: 5 * (level ^ 2) + 50 * level + 100
export function xpForLevel(level: number): number {
  return 5 * (level * level) + 50 * level + 100;
}

// Total XP required to reach a level from 0
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i <= level; i++) {
    total += xpForLevel(i);
  }
  return total;
}

// Calculate level from total XP
export function calculateLevel(totalXp: number): number {
  let level = 0;
  let xpRequired = 0;
  while (xpRequired <= totalXp) {
    level++;
    xpRequired += xpForLevel(level);
  }
  return level - 1;
}

// Get XP progress for current level
export function getXpProgress(totalXp: number): LevelProgress {
  const currentLevel = calculateLevel(totalXp);
  const xpForCurrentLevel = totalXpForLevel(currentLevel);
  const xpForNextLevel = xpForLevel(currentLevel + 1);
  const xpIntoCurrentLevel = totalXp - xpForCurrentLevel;
  const progressPercent = Math.floor((xpIntoCurrentLevel / xpForNextLevel) * 100);

  return {
    currentLevel,
    currentXp: totalXp,
    xpForCurrentLevel: xpIntoCurrentLevel,
    xpForNextLevel,
    progressPercent: Math.min(100, Math.max(0, progressPercent)),
  };
}

// Format numbers with commas
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

// Format voice minutes to hours and minutes
export function formatVoiceTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

// Format seconds to a friendly time string
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

// Get Discord custom emoji URL
export function getCustomEmojiUrl(emojiId: string, animated: boolean = false): string {
  const ext = animated ? 'gif' : 'png';
  return `https://cdn.discordapp.com/emojis/${emojiId}.${ext}?size=48`;
}

// Get day name from day of week number (0 = Sunday)
export function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek] || 'Unknown';
}

// Format hour to 12-hour format
export function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

// Get Discord avatar URL
export function getAvatarUrl(userId: string, avatarHash: string | null, size = 128): string {
  if (!avatarHash) {
    // Default avatar based on user ID
    const defaultIndex = Number(BigInt(userId) % BigInt(5));
    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
  }
  const ext = avatarHash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=${size}`;
}

// Get Discord guild icon URL
export function getGuildIconUrl(guildId: string, iconHash: string | null, size = 128): string {
  if (!iconHash) {
    return `https://cdn.discordapp.com/embed/avatars/0.png`;
  }
  const ext = iconHash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.${ext}?size=${size}`;
}
