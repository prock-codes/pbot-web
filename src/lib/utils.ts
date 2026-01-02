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

// Get local date string in YYYY-MM-DD format (respects user's timezone)
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get UTC date string in YYYY-MM-DD format
// Use this for querying database tables that store dates in UTC
export function getUTCDateString(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format a UTC ISO timestamp to local time string
export function formatLocalTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Format a UTC ISO timestamp to local date string
export function formatLocalDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// Format a UTC ISO timestamp to full local date and time
export function formatLocalDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Convert a UTC hour (0-23) to local hour and format it
export function formatUtcHourToLocal(utcHour: number): string {
  // Create a date with the UTC hour
  const now = new Date();
  const utcDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    utcHour,
    0,
    0
  ));
  // Get the local hour
  const localHour = utcDate.getHours();
  return formatHour(localHour);
}

// Get the user's timezone offset as a string (e.g., "UTC-5", "UTC+2")
export function getTimezoneOffsetString(): string {
  const offset = new Date().getTimezoneOffset();
  const hours = Math.floor(Math.abs(offset) / 60);
  const sign = offset <= 0 ? '+' : '-';
  return `UTC${sign}${hours}`;
}

// Convert a UTC date string (YYYY-MM-DD) to local date string for display
// This accounts for timezone differences when showing activity data
// Activity stored under "2026-01-03" UTC may have occurred on "2026-01-02" local time
export function formatUtcDateToLocal(utcDateStr: string): string {
  // Parse the UTC date string and create a Date at noon UTC
  // Using noon avoids edge cases with DST transitions
  const [year, month, day] = utcDateStr.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  return utcDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// Get local date string from a UTC date string (YYYY-MM-DD format)
// Returns the local equivalent date in YYYY-MM-DD format
export function getLocalDateFromUtc(utcDateStr: string): string {
  const [year, month, day] = utcDateStr.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  const localYear = utcDate.getFullYear();
  const localMonth = String(utcDate.getMonth() + 1).padStart(2, '0');
  const localDay = String(utcDate.getDate()).padStart(2, '0');
  return `${localYear}-${localMonth}-${localDay}`;
}
