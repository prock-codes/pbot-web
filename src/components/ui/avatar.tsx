import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src: string | null;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
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

export function Avatar({ src, alt, size = 'md', className }: AvatarProps) {
  const pixelSize = sizeMap[size];
  const defaultAvatar = 'https://cdn.discordapp.com/embed/avatars/0.png';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-full bg-discord-lighter',
        sizeClasses[size],
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
    </div>
  );
}
