import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServer, getServerStats } from '@/lib/queries/server';
import { getMembers, getLevelRoles } from '@/lib/queries/members';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ServerActivityChart } from '@/components/charts/server-activity-chart';
import { VoiceConnectionGraph } from '@/components/charts/voice-connection-graph';
import { VoiceActivity } from '@/components/server/voice-activity';
import {
  formatNumber,
  formatVoiceTime,
  formatHour,
  getXpProgress,
} from '@/lib/utils';
import {
  MessageSquare,
  Mic,
  Trophy,
  Users,
  Calendar,
  Clock,
  ChevronLeft,
  Award,
} from 'lucide-react';

export const revalidate = 60;

interface ServerPageProps {
  params: Promise<{ serverId: string }>;
}

export default async function ServerPage({ params }: ServerPageProps) {
  const { serverId } = await params;

  const [server, stats, membersResult, levelRoles] = await Promise.all([
    getServer(serverId),
    getServerStats(serverId),
    getMembers({ guildId: serverId, limit: 50 }),
    getLevelRoles(serverId),
  ]);

  if (!server) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>All Servers</span>
      </Link>

      {/* Server Header */}
      <div className="flex items-center gap-4 mb-8">
        <Avatar src={server.icon_url} alt={server.name} size="xl" />
        <div>
          <h1 className="text-3xl font-bold text-white">{server.name}</h1>
          <p className="text-gray-400">
            {formatNumber(stats.totalMembers)} members with XP
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-8">
        <Card>
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs uppercase">Messages</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatNumber(stats.totalMessages)}
          </p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <Mic className="w-4 h-4" />
            <span className="text-xs uppercase">Voice Hours</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatNumber(stats.totalVoiceHours)}
          </p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <Trophy className="w-4 h-4" />
            <span className="text-xs uppercase">Total XP</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatNumber(stats.totalXp)}
          </p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs uppercase">Members</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatNumber(stats.totalMembers)}
          </p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs uppercase">Most Active</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {stats.mostActiveDay || 'N/A'}
          </p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs uppercase">Peak Hour</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {stats.peakHour !== null ? formatHour(stats.peakHour) : 'N/A'}
          </p>
        </Card>
      </div>

      {/* Current Voice Activity */}
      <div className="mb-8">
        <VoiceActivity serverId={serverId} />
      </div>

      {/* Activity Chart */}
      <div className="mb-8">
        <ServerActivityChart serverId={serverId} />
      </div>

      {/* Voice Connection Graph */}
      <div className="mb-8">
        <VoiceConnectionGraph serverId={serverId} />
      </div>

      {/* Member Leaderboard with Level Roles */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Member Leaderboard */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Member Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            {membersResult.members.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                No members with XP yet.
              </p>
            ) : (
              <div className="space-y-3">
                {membersResult.members.map((member, index) => {
                  const progress = getXpProgress(member.xp);
                  // Find the highest level role the member has achieved
                  const currentRole = levelRoles
                    .filter((lr) => lr.level <= member.level)
                    .sort((a, b) => b.level - a.level)[0];
                  const roleColor = currentRole?.role_color || null;
                  return (
                    <Link
                      key={member.user_id}
                      href={`/${serverId}/${member.user_id}`}
                      className="block"
                    >
                      <div
                        className="flex items-center gap-4 p-3 rounded-lg transition-colors group"
                        style={{
                          backgroundColor: roleColor ? `${roleColor}15` : 'rgba(255,255,255,0.03)',
                        }}
                      >
                        {/* Rank */}
                        <div className="w-8 text-center">
                          <span
                            className={`font-bold ${
                              index === 0
                                ? 'text-yellow-400'
                                : index === 1
                                ? 'text-gray-300'
                                : index === 2
                                ? 'text-amber-600'
                                : 'text-gray-500'
                            }`}
                          >
                            #{index + 1}
                          </span>
                        </div>

                        {/* Avatar */}
                        <Avatar
                          src={member.avatar_url}
                          alt={member.username || 'User'}
                          size="md"
                          className="group-hover:ring-2 ring-discord-blurple transition-all"
                        />

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-white truncate group-hover:text-discord-blurple transition-colors">
                              {member.display_name || member.username || 'Unknown User'}
                            </p>
                            {currentRole && (
                              <span
                                className="hidden sm:inline-flex text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                                style={{
                                  backgroundColor: `${roleColor}20`,
                                  color: roleColor || undefined,
                                }}
                              >
                                {currentRole.role_name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span className="w-16">Level <span className="tabular-nums">{member.level}</span></span>
                            <span className="tabular-nums">{formatNumber(member.xp)} XP</span>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="hidden sm:flex items-center text-sm text-gray-400">
                          <div className="flex items-center gap-1 w-24 justify-end">
                            <MessageSquare className="w-4 h-4 flex-shrink-0" />
                            <span className="tabular-nums">{formatNumber(member.message_count)}</span>
                          </div>
                          <div className="flex items-center gap-1 w-20 justify-end">
                            <Mic className="w-4 h-4 flex-shrink-0" />
                            <span className="tabular-nums">{formatVoiceTime(member.voice_minutes)}</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="hidden md:block w-32">
                          <Progress value={progress.progressPercent} />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Level Roles Sidebar */}
        {levelRoles.length > 0 && (
          <Card className="lg:w-64 shrink-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-400" />
                Level Roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {levelRoles.map((lr) => {
                  const roleColor = lr.role_color || '#5865F2';
                  return (
                    <div
                      key={lr.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-discord-darker"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${roleColor}20` }}
                      >
                        <span
                          className="text-sm font-bold"
                          style={{ color: roleColor }}
                        >
                          {lr.level}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: roleColor }}
                        >
                          {lr.role_name || 'Unknown Role'}
                        </p>
                        <p className="text-xs text-gray-400">
                          Level {lr.level}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
