import { Skeleton, StatCardSkeleton, CardSkeleton } from '@/components/ui/skeleton';

export default function ServerLoading() {
  return (
    <div className="max-w-6xl mx-auto">
      <Skeleton className="h-6 w-24 mb-6" />

      {/* Server Header */}
      <div className="flex items-center gap-4 mb-8">
        <Skeleton className="h-32 w-32 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-8">
        {[...Array(6)].map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Leaderboard Skeleton */}
      <div className="bg-discord-light rounded-lg border border-discord-lighter/20 p-4">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
