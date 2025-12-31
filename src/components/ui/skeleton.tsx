import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded bg-discord-lighter',
        className
      )}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-discord-light rounded-lg border border-discord-lighter/20 p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-discord-light rounded-lg border border-discord-lighter/20 p-4">
      <Skeleton className="h-4 w-20 mb-2" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}
