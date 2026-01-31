import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded bg-discord-lighter/50',
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-discord-light/80 backdrop-blur-sm rounded-xl border border-white/5 p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="mt-6 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-discord-light/80 backdrop-blur-sm rounded-xl border border-white/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-discord-light/80 backdrop-blur-sm rounded-xl border border-white/5 p-6">
      <Skeleton className="h-5 w-32 mb-6" />
      <div className="flex items-end gap-2 h-48">
        {[...Array(12)].map((_, i) => (
          <Skeleton 
            key={i} 
            className="flex-1 rounded-t"
            style={{ height: `${Math.random() * 60 + 40}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
      <Skeleton className="h-32 w-32 rounded-full" />
      <div className="text-center sm:text-left flex-1 space-y-3">
        <Skeleton className="h-9 w-48 mx-auto sm:mx-0" />
        <Skeleton className="h-5 w-32 mx-auto sm:mx-0" />
        <div className="flex items-center justify-center sm:justify-start gap-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
    </div>
  );
}
