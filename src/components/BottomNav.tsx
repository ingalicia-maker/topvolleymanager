import { Home, Calendar, UserCircle, AlertTriangle, Star, MessageSquare, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from './NavLink';
import { useNotifications } from '@/hooks/useNotifications';
import { useUserRole } from '@/hooks/useUserRole';
import { useConversations } from '@/hooks/useConversations';
import { useSubscription } from '@/hooks/useSubscription';

export function BottomNav() {
  const { t } = useTranslation();
  const { unreadCount } = useNotifications();
  const { isDirector } = useUserRole();
  const { totalUnread: messageUnread } = useConversations();
  const { subscription } = useSubscription();

  // Base nav items - Players only shown for directors, Admin only for app admins
  const navItems = [
    { to: '/', icon: Home, labelKey: 'nav.home', tourId: 'home' },
    { to: '/events', icon: Calendar, labelKey: 'nav.events', showBadge: true, badgeCount: unreadCount, tourId: 'events' },
    { to: '/messages', icon: MessageSquare, labelKey: 'nav.messages', showBadge: true, badgeCount: messageUnread, tourId: 'messages' },
    ...(isDirector ? [{ to: '/players', icon: UserCircle, labelKey: 'nav.players', tourId: 'players' }] : []),
    { to: '/ratings', icon: Star, labelKey: 'nav.ratings', tourId: 'ratings' },
    ...(subscription.isAdmin ? [{ to: '/admin', icon: Shield, labelKey: 'nav.admin', tourId: 'admin' }] : []),
    { to: '/ausencias', icon: AlertTriangle, labelKey: 'nav.absences', tourId: 'absences' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center justify-around py-2 px-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className="relative flex flex-col items-center gap-0.5 px-1 py-1.5 text-muted-foreground transition-colors min-w-0"
            activeClassName="text-primary"
            data-tour={item.tourId}
          >
            <div className="relative">
              <item.icon className="h-5 w-5 shrink-0" />
              {item.showBadge && item.badgeCount && item.badgeCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center font-bold">
                  {item.badgeCount > 9 ? '9+' : item.badgeCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium truncate max-w-[56px]">{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
