'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EarnedAchievement, AchievementCategory } from '@/types';
import { CATEGORY_INFO, TOTAL_ACHIEVEMENTS } from '@/lib/achievements';
import { formatLocalDate } from '@/lib/utils';
import {
  Award,
  Flame,
  Clock,
  Users,
  Zap,
  Sparkles,
  Heart,
  Trophy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// Category icons mapping
const CATEGORY_ICONS: Record<AchievementCategory, React.ElementType> = {
  milestone: Trophy,
  streak: Flame,
  time: Clock,
  social: Users,
  activity: Zap,
  fun: Sparkles,
  reaction: Heart,
};

// Background colors for badge styling by category
const CATEGORY_BG: Record<AchievementCategory, string> = {
  milestone: 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20',
  streak: 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20',
  time: 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20',
  social: 'bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/20',
  activity: 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20',
  fun: 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20',
  reaction: 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20',
};

interface AchievementBadgeProps {
  achievement: EarnedAchievement;
}

function AchievementBadge({ achievement }: AchievementBadgeProps) {
  const Icon = CATEGORY_ICONS[achievement.category];
  const categoryInfo = CATEGORY_INFO[achievement.category];
  const bgClass = CATEGORY_BG[achievement.category];

  return (
    <div
      className={`group relative flex items-center gap-3 p-3 rounded-lg border transition-colors ${bgClass}`}
      title={`${achievement.name}: ${achievement.description}`}
    >
      <div className={`flex-shrink-0 ${categoryInfo.color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{achievement.name}</p>
        <p className="text-xs text-gray-400 truncate">{achievement.description}</p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-xs font-medium text-discord-blurple">+{achievement.xp_awarded} XP</p>
        <p className="text-xs text-gray-500">{formatLocalDate(achievement.earned_at)}</p>
      </div>
    </div>
  );
}

interface AchievementsSectionProps {
  achievements: EarnedAchievement[];
  totalXp: number;
}

export function AchievementsSection({ achievements, totalXp }: AchievementsSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');

  const categories: (AchievementCategory | 'all')[] = [
    'all',
    'milestone',
    'streak',
    'time',
    'social',
    'activity',
    'fun',
    'reaction',
  ];

  // Filter achievements by selected category
  const filteredAchievements =
    selectedCategory === 'all'
      ? achievements
      : achievements.filter((a) => a.category === selectedCategory);

  // Show only first 6 when not expanded
  const displayedAchievements = expanded ? filteredAchievements : filteredAchievements.slice(0, 6);
  const hasMore = filteredAchievements.length > 6;

  if (achievements.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Achievements
          </CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">
              {achievements.length}/{TOTAL_ACHIEVEMENTS}
            </span>
            <span className="text-discord-blurple font-medium">+{totalXp.toLocaleString()} XP</span>
          </div>
        </div>
        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mt-3">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            const count =
              cat === 'all'
                ? achievements.length
                : achievements.filter((a) => a.category === cat).length;

            if (cat !== 'all' && count === 0) return null;

            const Icon = cat === 'all' ? Award : CATEGORY_ICONS[cat];
            const colorClass =
              cat === 'all'
                ? isSelected
                  ? 'text-white'
                  : 'text-gray-400'
                : CATEGORY_INFO[cat].color;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                  isSelected
                    ? 'bg-discord-blurple/20 text-white'
                    : 'bg-discord-darker hover:bg-discord-lighter/50 text-gray-400'
                }`}
              >
                <Icon className={`w-3 h-3 ${colorClass}`} />
                <span>{cat === 'all' ? 'All' : CATEGORY_INFO[cat].name}</span>
                <span className="text-gray-500">({count})</span>
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2">
          {displayedAchievements.map((achievement) => (
            <AchievementBadge key={achievement.id} achievement={achievement} />
          ))}
        </div>

        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-4 flex items-center justify-center gap-1 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show all {filteredAchievements.length} achievements
              </>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
