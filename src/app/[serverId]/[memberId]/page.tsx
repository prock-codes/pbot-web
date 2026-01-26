'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton, CardSkeleton, StatCardSkeleton } from '@/components/ui/skeleton';
import { MemberActivityChart } from '@/components/charts/member-activity-chart';
import { VoiceTimeline } from '@/components/profile/voice-timeline';
import { AchievementsSection } from '@/components/profile/achievements';
import {
  formatNumber,
  formatVoiceTime,
  formatDuration,
  getXpProgress,
  getCustomEmojiUrl,
} from '@/lib/utils';
import {
  getMemberProfile,
  getMemberTopEmojis,
} from '@/lib/queries/profile';
import { getMemberRank } from '@/lib/queries/members';
import { getServer } from '@/lib/queries/server';
import { getCombinedTopFriends, getServerActivityWeight } from '@/lib/queries/text-connections';
import { getMemberAchievements } from '@/lib/queries/achievements';
import { MemberWithLevel, EmojiUsage, Guild, CombinedFriend, ServerActivityWeight, EarnedAchievement } from '@/types';
import {
  MessageSquare,
  Mic,
  Trophy,
  Hash,
  ChevronLeft,
  Users,
} from 'lucide-react';

export default function MemberProfilePage() {
  const params = useParams();
  const serverId = params.serverId as string;
  const memberId = params.memberId as string;

  const [server, setServer] = useState<Guild | null>(null);
  const [member, setMember] = useState<MemberWithLevel | null>(null);
  const [rank, setRank] = useState<number>(0);
  const [topEmojis, setTopEmojis] = useState<EmojiUsage[]>([]);
  const [topFriends, setTopFriends] = useState<CombinedFriend[]>([]);
  const [activityWeight, setActivityWeight] = useState<ServerActivityWeight | null>(null);
  const [achievements, setAchievements] = useState<EarnedAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [serverData, memberData, rankData, emojisData, friendsData, weightData, achievementsData] = await Promise.all([
          getServer(serverId),
          getMemberProfile(serverId, memberId),
          getMemberRank(serverId, memberId),
          getMemberTopEmojis(serverId, memberId, 10),
          getCombinedTopFriends(serverId, memberId, 5),
          getServerActivityWeight(serverId),
          getMemberAchievements(serverId, memberId),
        ]);

        setServer(serverData);
        setMember(memberData);
        setRank(rankData);
        setTopEmojis(emojisData);
        setTopFriends(friendsData);
        setActivityWeight(weightData);
        setAchievements(achievementsData);
      } catch (err) {
        setError('Failed to load member profile');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [serverId, memberId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-32 w-32 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <CardSkeleton />
      </div>
    );
  }

  if (error || !member || !server) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-gray-400">{error || 'Member not found'}</p>
        <Link
          href={`/${serverId}`}
          className="text-discord-blurple hover:underline mt-4 inline-block"
        >
          Back to server
        </Link>
      </div>
    );
  }

  const progress = getXpProgress(member.xp);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <Link
        href={`/${serverId}`}
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>{server.name}</span>
      </Link>

      {/* Member Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
        <Avatar
          src={member.avatar_url}
          alt={member.username || 'User'}
          size="xl"
        />
        <div className="text-center sm:text-left flex-1">
          <h1 className="text-3xl font-bold text-white mb-1">
            {member.display_name || member.username || 'Unknown User'}
          </h1>
          {member.display_name && member.username && (
            <p className="text-gray-400 mb-2">@{member.username}</p>
          )}
          <div className="flex items-center justify-center sm:justify-start gap-4 text-gray-400">
            <span className="flex items-center gap-1">
              <Trophy className="w-4 h-4 text-yellow-400" />
              Rank #{rank}
            </span>
            <span>Level {member.level}</span>
          </div>
        </div>
      </div>

      {/* Level Progress */}
      <Card className="mb-8">
        <CardContent className="pt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">Level {progress.currentLevel}</span>
            <span className="text-gray-400">Level {progress.currentLevel + 1}</span>
          </div>
          <Progress value={progress.progressPercent} className="h-4" />
          <p className="text-center text-sm text-gray-400 mt-2">
            {formatNumber(progress.xpForCurrentLevel)} / {formatNumber(progress.xpForNextLevel)} XP
          </p>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
        <Card>
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <Trophy className="w-4 h-4" />
            <span className="text-xs uppercase">Total XP</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatNumber(member.xp)}
          </p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs uppercase">Messages</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatNumber(member.message_count)}
          </p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <Mic className="w-4 h-4" />
            <span className="text-xs uppercase">Voice Time</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatVoiceTime(member.voice_minutes)}
          </p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <Hash className="w-4 h-4" />
            <span className="text-xs uppercase">Rank</span>
          </div>
          <p className="text-2xl font-bold text-white">#{rank}</p>
        </Card>
      </div>

      {/* Activity Chart */}
      <div className="mb-8">
        <MemberActivityChart serverId={serverId} memberId={memberId} />
      </div>

      {/* Voice Timeline */}
      <div className="mb-8">
        <VoiceTimeline serverId={serverId} memberId={memberId} />
      </div>

      {/* Achievements */}
      <div className="mb-8">
        <AchievementsSection
          achievements={achievements}
          totalXp={achievements.reduce((sum, a) => sum + a.xp_awarded, 0)}
        />
      </div>

      {/* Top Friends and Top Emojis */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Friends */}
        {topFriends.length > 0 && (() => {
          const hasAnyVoice = topFriends.some(f => f.voice_seconds > 0);
          const hasAnyText = topFriends.some(f => f.text_interaction_score > 0);

          return (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Best Friends
                </CardTitle>
                {activityWeight && hasAnyVoice && hasAnyText && (
                  <p className="text-xs text-gray-500 mt-1">
                    Server is {Math.round(activityWeight.voiceWeight * 100)}% voice, {Math.round(activityWeight.textWeight * 100)}% text
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topFriends.map((friend) => (
                    <Link
                      key={friend.user_id}
                      href={`/${serverId}/${friend.user_id}`}
                    >
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-discord-lighter/50 transition-colors">
                        <Avatar
                          src={friend.avatar_url}
                          alt={friend.username || 'User'}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {friend.display_name || friend.username || 'Unknown'}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            {hasAnyVoice && friend.voice_seconds > 0 && (
                              <span className="flex items-center gap-1">
                                <Mic className="w-3 h-3" />
                                {formatDuration(friend.voice_seconds)}
                              </span>
                            )}
                            {hasAnyText && friend.text_interaction_score > 0 && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                {friend.text_shared_channels} channel{friend.text_shared_channels !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Top Emojis */}
        {topEmojis.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Most Used Emojis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {topEmojis.map((emoji) => (
                  <div
                    key={emoji.emoji_id || emoji.emoji}
                    className="flex items-center gap-2 bg-discord-darker px-3 py-2 rounded-lg"
                  >
                    {emoji.is_custom && emoji.emoji_id ? (
                      <Image
                        src={getCustomEmojiUrl(emoji.emoji_id)}
                        alt={emoji.emoji}
                        width={28}
                        height={28}
                        className="object-contain"
                        unoptimized
                      />
                    ) : (
                      <span className="text-2xl">{emoji.emoji}</span>
                    )}
                    <span className="text-gray-400 text-sm">
                      {formatNumber(emoji.total)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
