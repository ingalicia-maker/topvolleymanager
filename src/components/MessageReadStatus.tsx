import { Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageReadStatusProps {
  isRead: boolean;
  className?: string;
}

export function MessageReadStatus({ isRead, className }: MessageReadStatusProps) {
  return (
    <span className={cn('inline-flex items-center', className)}>
      {isRead ? (
        <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
      ) : (
        <Check className="h-3.5 w-3.5 opacity-70" />
      )}
    </span>
  );
}
