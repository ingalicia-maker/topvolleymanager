import { Calendar, MapPin, Users, Trophy, Dumbbell, Bus, CheckCircle, Clock, AlertTriangle, CalendarOff, Megaphone } from 'lucide-react';
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
  const invitedCount = event.invited_players?.length || 0;
  
  // For displacements: get all involved teams
  const isDisplacement = event.type === 'displacement';
  const isNotificationType = ['incident', 'holiday', 'communication'].includes(event.type);
  const selectedTeams = (isDisplacement || isNotificationType) ? (event.selected_teams || []) : [];
  const involvedTeams = selectedTeams.map(id => teams.find(t => t.id === id)).filter(Boolean);
  const affectsAllTeams = event.team_id === 'all' || selectedTeams.length === teams.length;
  
  // Check submission status for displacements
  const coachSubmissions = event.coach_submissions || {};
  const submittedCount = selectedTeams.filter(t => coachSubmissions[t]?.submitted).length;
  const allSubmitted = selectedTeams.length > 0 && submittedCount === selectedTeams.length;
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const getEventIcon = () => {
    switch (event.type) {
      case 'match': return <Trophy className="h-4 w-4 text-amber-500" />;
      case 'displacement': return <Bus className="h-4 w-4 text-blue-500" />;
      case 'incident': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'holiday': return <CalendarOff className="h-4 w-4 text-green-500" />;
      case 'communication': return <Megaphone className="h-4 w-4 text-blue-500" />;
      default: return <Dumbbell className="h-4 w-4 text-primary" />;
    }
  };

  const getEventBadge = () => {
    switch (event.type) {
      case 'match': return { variant: 'default' as const, label: 'Partido' };
      case 'displacement': return { variant: 'outline' as const, label: 'Desplazamiento' };
      case 'incident': return { variant: 'destructive' as const, label: 'Incidencia' };
      case 'holiday': return { variant: 'default' as const, label: 'Festivo', className: 'bg-green-600 hover:bg-green-700' };
      case 'communication': return { variant: 'default' as const, label: 'Comunicación', className: 'bg-blue-600 hover:bg-blue-700' };
      default: return { variant: 'secondary' as const, label: 'Entrenamiento' };
    }
  };

  const getNotificationColor = () => {
    switch (event.type) {
      case 'incident': return '#ea580c';
      case 'holiday': return '#16a34a';
      case 'communication': return '#2563eb';
      default: return undefined;
    }
  };

  const badge = getEventBadge();

  return (
    <Link to={`/events/${event.id}`}>
      <Card className="overflow-hidden transition-all hover:shadow-lg active:scale-[0.98]">
        {/* Color bar - show gradient for multiple teams or notification color */}
        {isNotificationType ? (
          <div className="h-1.5" style={{ backgroundColor: getNotificationColor() }} />
        ) : isDisplacement && involvedTeams.length > 1 ? (
          <div className="h-1.5 flex">
            {involvedTeams.map((tm, idx) => (
              <div 
                key={idx}
                className="flex-1"
                style={{ backgroundColor: tm?.color }}
              />
            ))}
          </div>
        ) : (
          <div 
            className="h-1.5" 
            style={{ backgroundColor: isDisplacement && involvedTeams[0] ? involvedTeams[0].color : team?.color }}
          />
        )}
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {getEventIcon()}
                <Badge variant={badge.variant} className={`text-xs ${(badge as any).className || ''}`}>
                  {badge.label}
                </Badge>
                {/* Show submission status for displacements */}
                {isDisplacement && (
                  allSubmitted ? (
                    <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-700">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completo
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {submittedCount}/{selectedTeams.length}
                    </Badge>
                  )
                )}
              </div>
              <h3 className="font-bold text-foreground truncate">{event.title}</h3>
              {/* Show teams involved */}
              {isNotificationType ? (
                <p className="text-sm text-muted-foreground">
                  {affectsAllTeams ? 'Todos los equipos' : involvedTeams.map(t => t?.name).join(', ')}
                </p>
              ) : isDisplacement && involvedTeams.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {involvedTeams.map(tm => (
                    <span 
                      key={tm?.id} 
                      className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{ 
                        backgroundColor: `${tm?.color}20`,
                        color: tm?.color 
                      }}
                    >
                      {tm?.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{team?.name}</p>
              )}
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
              <span className="truncate max-w-[150px]">
                {event.type === 'displacement' ? event.destination : event.location}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              {event.type === 'displacement' ? (
                <span className="font-medium text-blue-600">{event.total_passengers || invitedCount}</span>
              ) : (
                <span className="font-medium text-primary">{invitedCount}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
