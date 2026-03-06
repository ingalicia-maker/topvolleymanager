import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Bus, Users, Trophy, MessageSquare, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { useConversations } from '@/hooks/useConversations';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { totalUnread: messageUnread } = useConversations();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  
  const totalBadge = unreadCount + messageUnread;

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
  };

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    markAsRead(notification.id);
    setOpen(false);
    
    if (notification.type === 'monthly_reminder') {
      navigate('/ratings');
    } else if (notification.related_event_id) {
      navigate(`/events/${notification.related_event_id}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'displacement_created':
        return <Bus className="h-4 w-4 text-blue-500" />;
      case 'player_summoned':
        return <Users className="h-4 w-4 text-amber-500" />;
      case 'monthly_reminder':
        return <ClipboardCheck className="h-4 w-4 text-green-500" />;
      default:
        return <Trophy className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
          <Bell className="h-5 w-5" />
          {totalBadge > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
            >
              {totalBadge > 9 ? '9+' : totalBadge}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold">Notificaciones</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
              Marcar todas leídas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No hay notificaciones
            </div>
          ) : (
            <div className="divide-y">
              {notifications.slice(0, 10).map(notification => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 cursor-pointer transition-colors hover:bg-muted/50",
                    !notification.is_read && "bg-primary/5"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), { 
                            addSuffix: true, 
                            locale: es 
                          })}
                        </p>
                        {notification.type === 'monthly_reminder' && (
                          <span className="text-[10px] text-primary font-medium">
                            Ir a puntuaciones →
                          </span>
                        )}
                        {notification.related_event_id && (
                          <span className="text-[10px] text-primary font-medium">
                            Ver evento →
                          </span>
                        )}
                      </div>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
