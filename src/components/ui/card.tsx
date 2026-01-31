import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
  glow?: boolean;
}

export function Card({ children, className, hover = true, glow = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-discord-light/80 backdrop-blur-sm rounded-xl border border-white/5 p-4 transition-all duration-300',
        hover && 'card-hover',
        glow && 'stat-glow',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: Omit<CardProps, 'hover' | 'glow'>) {
  return (
    <div className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-lg font-semibold text-white tracking-tight', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-gray-400 leading-relaxed', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className, ...props }: Omit<CardProps, 'hover' | 'glow'>) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
}

// New: Stat card for displaying metrics
export function StatCard({ 
  icon, 
  label, 
  value, 
  className,
  trend,
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number;
  className?: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <Card className={cn('stat-glow group', className)} glow>
      <div className="flex items-center gap-2 text-gray-400 mb-2 group-hover:text-gray-300 transition-colors">
        {icon}
        <span className="text-xs uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white group-hover:text-discord-blurple transition-colors">
        {value}
      </p>
    </Card>
  );
}
