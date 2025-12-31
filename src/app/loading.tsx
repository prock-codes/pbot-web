import { Skeleton, CardSkeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <Skeleton className="h-10 w-48 mx-auto mb-4" />
        <Skeleton className="h-6 w-64 mx-auto" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
