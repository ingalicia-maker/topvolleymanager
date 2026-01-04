import { Home, Calendar, UserCircle, AlertTriangle, Star } from 'lucide-react';
import { NavLink } from './NavLink';

const navItems = [
  { to: '/', icon: Home, label: 'Inicio' },
  { to: '/events', icon: Calendar, label: 'Eventos' },
  { to: '/ratings', icon: Star, label: 'Notas' },
  { to: '/players', icon: UserCircle, label: 'Jugadoras' },
  { to: '/ausencias', icon: AlertTriangle, label: 'Ausencias' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center justify-around py-2 px-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className="flex flex-col items-center gap-0.5 px-1 py-1.5 text-muted-foreground transition-colors min-w-0"
            activeClassName="text-primary"
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="text-[10px] font-medium truncate max-w-[56px]">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
