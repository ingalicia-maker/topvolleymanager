import { cn } from '@/lib/utils';

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

export function OnlineIndicator({ 
  isOnline, 
  size = 'sm', 
  className,
  showLabel = false 
}: OnlineIndicatorProps) {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
  };

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'rounded-full',
          sizeClasses[size],
          isOnline 
            ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]' 
            : 'bg-muted-foreground/40'
        )}
        title={isOnline ? 'En línea' : 'Desconectado'}
      />
      {showLabel && (
        <span className={cn(
          'text-xs',
          isOnline ? 'text-green-600' : 'text-muted-foreground'
        )}>
          {isOnline ? 'En línea' : 'Desconectado'}
        </span>
      )}
    </div>
  );
}
