import { useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, Clock } from 'lucide-react';
import { DbEvent } from '@/hooks/useEvents';
import { useTeams } from '@/hooks/useTeams';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface WeeklyScheduleProps {
  events: DbEvent[];
}

export function WeeklySchedule({ events }: WeeklyScheduleProps) {
  const { t } = useTranslation();
  const { teams } = useTeams();

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Group events by day
  const eventsByDay = useMemo(() => {
    const grouped: Record<string, DbEvent[]> = {};
    
    daysOfWeek.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      grouped[dateKey] = events
        .filter(e => e.date === dateKey)
        .sort((a, b) => a.time.localeCompare(b.time));
    });
    
    return grouped;
  }, [events, daysOfWeek]);

  const getTeamName = (teamId: string): string => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Equipo';
  };

  const getTeamColor = (teamId: string): string => {
    const team = teams.find(t => t.id === teamId);
    return team?.color || '#6b7280';
  };

  const getEventTypeColor = (type: string): string => {
    switch (type) {
      case 'training': return 'bg-blue-500';
      case 'match': return 'bg-green-500';
      case 'displacement': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getEventTypeLabel = (type: string): string => {
    switch (type) {
      case 'training': return t('events.training');
      case 'match': return t('events.match');
      case 'displacement': return t('events.displacement');
      default: return type;
    }
  };

  // Check if there are any events this week
  const hasEvents = Object.values(eventsByDay).some(dayEvents => dayEvents.length > 0);

  if (!hasEvents) {
    return null;
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-5 w-5 text-primary" />
          {t('events.thisWeek')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {daysOfWeek.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDay[dateKey] || [];
            const isDayToday = isToday(day);
            const isPast = day < today && !isDayToday;

            if (dayEvents.length === 0) return null;

            return (
              <div key={dateKey} className={`${isPast ? 'opacity-50' : ''}`}>
                {/* Day Header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                    isDayToday 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {format(day, 'EEE', { locale: es })}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(day, 'd MMM', { locale: es })}
                  </span>
                </div>

                {/* Events for this day */}
                <div className="space-y-2 pl-2 border-l-2 border-muted ml-2">
                  {dayEvents.map(event => (
                    <Link
                      key={event.id}
                      to={`/events/${event.id}`}
                      className="block"
                    >
                      <div 
                        className="p-3 rounded-lg border hover:shadow-md transition-all relative overflow-hidden"
                        style={{ borderLeftColor: getTeamColor(event.team_id), borderLeftWidth: '4px' }}
                      >
                        {/* Event Type Badge */}
                        <div className="absolute top-2 right-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded text-white ${getEventTypeColor(event.type)}`}>
                            {getEventTypeLabel(event.type)}
                          </span>
                        </div>

                        {/* Team Name - Large */}
                        <h4 className="font-bold text-foreground text-lg leading-tight mb-1 pr-20">
                          {getTeamName(event.team_id)}
                        </h4>

                        {/* Time */}
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-0.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="font-medium">{event.time.slice(0, 5)}</span>
                        </div>

                        {/* Location/Court */}
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{event.location}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
