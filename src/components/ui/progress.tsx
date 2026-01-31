import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  showGlow?: boolean;
}

export function Progress({ value, max = 100, className, barClassName, showGlow = true }: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      className={cn(
        'h-4 w-full overflow-hidden rounded-full bg-discord-darker/80 relative',
        className
      )}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="w-full h-full bg-[repeating-linear-gradient(90deg,transparent,transparent_10px,rgba(255,255,255,0.03)_10px,rgba(255,255,255,0.03)_20px)]" />
      </div>
      
      {/* Progress bar */}
      <div
        className={cn(
          'h-full rounded-full relative transition-all duration-500 ease-out',
          'bg-gradient-to-r from-discord-blurple via-purple-500 to-discord-blurple bg-[length:200%_100%]',
          barClassName
        )}
        style={{ width: `${percentage}%` }}
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 animate-shimmer rounded-full" />
        
        {/* Glow effect */}
        {showGlow && percentage > 0 && (
          <div 
            className="absolute -inset-1 bg-discord-blurple/30 blur-md rounded-full animate-pulse-glow"
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
      
      {/* End cap glow */}
      {percentage > 5 && (
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full blur-sm opacity-60"
          style={{ left: `calc(${percentage}% - 6px)` }}
        />
      )}
    </div>
  );
}
