import Link from 'next/link';
import { getAllServers, getServerMemberCount } from '@/lib/queries/server';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Users, Zap } from 'lucide-react';

export const revalidate = 60; // Revalidate every 60 seconds

export default async function HomePage() {
  const servers = await getAllServers();

  // Get member counts for all servers in parallel
  const memberCounts = await Promise.all(
    servers.map((s) => getServerMemberCount(s.id).catch(() => 0))
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Zap className="w-10 h-10 text-discord-blurple" />
          <h1 className="text-4xl font-bold text-white">PBot</h1>
        </div>
        <p className="text-gray-400 text-lg">
          View your Discord server statistics and leaderboards
        </p>
      </div>

      {servers.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-400">No servers found.</p>
          <p className="text-gray-500 text-sm mt-2">
            Add the PBot bot to a server to get started.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {servers.map((server, index) => (
            <Link key={server.id} href={`/${server.id}`}>
              <Card className="hover:bg-discord-lighter/50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <Avatar
                    src={server.icon_url}
                    alt={server.name}
                    size="lg"
                    className="group-hover:ring-2 ring-discord-blurple transition-all"
                  />
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-white truncate group-hover:text-discord-blurple transition-colors">
                      {server.name}
                    </h2>
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <Users className="w-4 h-4" />
                      <span>{memberCounts[index]} members with XP</span>
                    </div>
                  </div>
                  <div className="text-gray-500 group-hover:text-discord-blurple transition-colors">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
