import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
}

export function Progress({ value, max = 100, className, barClassName }: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      className={cn(
        'h-3 w-full overflow-hidden rounded-full bg-discord-darker',
        className
      )}
    >
      <div
        className={cn(
          'h-full rounded-full bg-discord-blurple transition-all duration-300',
          barClassName
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
