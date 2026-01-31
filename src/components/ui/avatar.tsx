import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src: string | null;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  ring?: boolean;
  ringColor?: 'blurple' | 'green' | 'yellow' | 'red' | 'gradient';
  status?: 'online' | 'idle' | 'dnd' | 'offline';
}

const sizeMap = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 64,
  xl: 128,
};

const sizeClasses = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-32 h-32',
};

const statusSizeClasses = {
  xs: 'w-2 h-2 border',
  sm: 'w-2.5 h-2.5 border-2',
  md: 'w-3 h-3 border-2',
  lg: 'w-4 h-4 border-2',
  xl: 'w-6 h-6 border-4',
};

const statusColors = {
  online: 'bg-discord-green',
  idle: 'bg-discord-yellow',
  dnd: 'bg-discord-red',
  offline: 'bg-gray-500',
};

const ringColors = {
  blurple: 'ring-discord-blurple/50',
  green: 'ring-discord-green/50',
  yellow: 'ring-discord-yellow/50',
  red: 'ring-discord-red/50',
  gradient: 'ring-transparent',
};

export function Avatar({ 
  src, 
  alt, 
  size = 'md', 
  className, 
  ring = false,
  ringColor = 'blurple',
  status,
}: AvatarProps) {
  const pixelSize = sizeMap[size];
  const defaultAvatar = 'https://cdn.discordapp.com/embed/avatars/0.png';

  return (
    <div className="relative inline-block group">
      {/* Gradient ring background */}
      {ring && ringColor === 'gradient' && (
        <div 
          className={cn(
            'absolute -inset-1 rounded-full bg-gradient-to-r from-discord-blurple via-purple-500 to-pink-500 opacity-75 blur-sm group-hover:opacity-100 transition-opacity',
          )}
        />
      )}
      
      <div
        className={cn(
          'relative overflow-hidden rounded-full bg-discord-lighter transition-transform duration-300 group-hover:scale-105',
          sizeClasses[size],
          ring && ringColor !== 'gradient' && `ring-2 ${ringColors[ringColor]}`,
          ring && ringColor === 'gradient' && 'ring-2 ring-white/20',
          className
        )}
      >
        <Image
          src={src || defaultAvatar}
          alt={alt}
          width={pixelSize}
          height={pixelSize}
          className="object-cover"
          unoptimized
        />
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-discord-blurple/0 group-hover:bg-discord-blurple/10 transition-colors duration-300" />
      </div>
      
      {/* Status indicator */}
      {status && (
        <div 
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-discord-dark',
            statusSizeClasses[size],
            statusColors[status]
          )}
        />
      )}
    </div>
  );
}
