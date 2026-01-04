import { Calendar, MapPin, Users, Trophy, Dumbbell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTeams } from '@/hooks/useTeams';
import { DbEvent } from '@/hooks/useEvents';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';

interface EventCardProps {
  event: DbEvent;
}

export function EventCard({ event }: EventCardProps) {
  const { teams } = useTeams();
  const team = teams.find(t => t.id === event.team_id);
  const confirmedCount = event.confirmed_players?.length || 0;
  const invitedCount = event.invited_players?.length || 0;
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <Link to={`/events/${event.id}`}>
      <Card className="overflow-hidden transition-all hover:shadow-lg active:scale-[0.98]">
        <div 
          className="h-1.5" 
          style={{ backgroundColor: team?.color }}
        />
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {event.type === 'match' ? (
                  <Trophy className="h-4 w-4 text-amber-500" />
                ) : (
                  <Dumbbell className="h-4 w-4 text-primary" />
                )}
                <Badge variant={event.type === 'match' ? 'default' : 'secondary'} className="text-xs">
                  {event.type === 'match' ? 'Partido' : 'Entrenamiento'}
                </Badge>
              </div>
              <h3 className="font-bold text-foreground truncate">{event.title}</h3>
              <p className="text-sm text-muted-foreground">{team?.name}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(event.date)}
              </div>
              <div className="text-sm text-muted-foreground">{event.time}</div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate max-w-[150px]">{event.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium text-green-600">{confirmedCount}</span>
              <span className="text-muted-foreground">/ {invitedCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
