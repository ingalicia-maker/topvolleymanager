import { useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, eachHourOfInterval, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';
import { DbEvent } from '@/hooks/useEvents';
import { useTeams } from '@/hooks/useTeams';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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

  // Generate hours from 7:00 to 22:00
  const startHour = 7;
  const endHour = 22;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  // Group events by day and calculate position
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

  // Calculate event position and height based on time
  const getEventStyle = (event: DbEvent) => {
    const [hours, minutes] = event.time.split(':').map(Number);
    const startMinutes = (hours - startHour) * 60 + minutes;
    const top = (startMinutes / 60) * 48; // 48px per hour
    
    // Default duration: 1.5 hours for training, 2 hours for match
    const durationMinutes = event.type === 'match' ? 120 : 90;
    const height = Math.max((durationMinutes / 60) * 48, 40);
    
    return { top: `${top}px`, height: `${height}px` };
  };

  // Check if there are any events this week
  const hasEvents = Object.values(eventsByDay).some(dayEvents => dayEvents.length > 0);

  if (!hasEvents) {
    return null;
  }

  const totalHeight = (endHour - startHour + 1) * 48; // 48px per hour

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-5 w-5 text-primary" />
          {t('events.thisWeek')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-2">
        <ScrollArea className="w-full">
          <div className="min-w-[600px]">
            {/* Header with days */}
            <div className="flex border-b">
              {/* Hour column header */}
              <div className="w-12 shrink-0" />
              
              {/* Day headers */}
              {daysOfWeek.map(day => {
                const isDayToday = isToday(day);
                return (
                  <div 
                    key={day.toISOString()} 
                    className={`flex-1 text-center py-2 border-l ${isDayToday ? 'bg-primary/10' : ''}`}
                  >
                    <div className={`text-xs font-medium uppercase ${isDayToday ? 'text-primary' : 'text-muted-foreground'}`}>
                      {format(day, 'EEE', { locale: es })}
                    </div>
                    <div className={`text-lg font-bold ${isDayToday ? 'text-primary' : 'text-foreground'}`}>
                      {format(day, 'd')}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Grid body */}
            <div className="flex" style={{ height: `${totalHeight}px` }}>
              {/* Hours column */}
              <div className="w-12 shrink-0 relative">
                {hours.map(hour => (
                  <div 
                    key={hour} 
                    className="absolute right-2 text-[10px] text-muted-foreground"
                    style={{ top: `${(hour - startHour) * 48 - 6}px` }}
                  >
                    {hour}:00
                  </div>
                ))}
              </div>

              {/* Days columns with events */}
              {daysOfWeek.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayEvents = eventsByDay[dateKey] || [];
                const isDayToday = isToday(day);

                return (
                  <div 
                    key={day.toISOString()} 
                    className={`flex-1 border-l relative ${isDayToday ? 'bg-primary/5' : ''}`}
                  >
                    {/* Hour grid lines */}
                    {hours.map(hour => (
                      <div 
                        key={hour}
                        className="absolute left-0 right-0 border-t border-muted/30"
                        style={{ top: `${(hour - startHour) * 48}px` }}
                      />
                    ))}

                    {/* Events */}
                    {dayEvents.map(event => {
                      const style = getEventStyle(event);
                      const teamColor = getTeamColor(event.team_id);
                      
                      return (
                        <Link
                          key={event.id}
                          to={`/events/${event.id}`}
                          className="absolute left-0.5 right-0.5 rounded overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all z-10"
                          style={{
                            ...style,
                            backgroundColor: teamColor,
                          }}
                        >
                          <div className="p-1 text-white h-full flex flex-col">
                            <span className="font-bold text-xs leading-tight truncate">
                              {getTeamName(event.team_id)}
                            </span>
                            <span className="text-[10px] opacity-90">
                              {event.time.slice(0, 5)}
                            </span>
                            <span className="text-[10px] opacity-80 truncate">
                              {event.location}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
