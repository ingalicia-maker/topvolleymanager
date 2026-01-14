import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DbEvent } from '@/hooks/useEvents';
import { useTeams } from '@/hooks/useTeams';
import { Link } from 'react-router-dom';

interface EventCalendarProps {
  events: DbEvent[];
}

export function EventCalendar({ events }: EventCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { teams } = useTeams();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the starting day of the week (0 = Sunday, 1 = Monday, etc.)
  const startDay = monthStart.getDay();
  // Adjust for Monday start (Spanish calendar)
  const adjustedStartDay = startDay === 0 ? 6 : startDay - 1;

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, DbEvent[]> = {};
    events.forEach(event => {
      const dateKey = event.date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [events]);

  const getEventsForDate = (date: Date): DbEvent[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return eventsByDate[dateKey] || [];
  };

  const getTeamColor = (teamId: string): string => {
    const team = teams.find(t => t.id === teamId);
    return team?.color || '#6b7280';
  };

  const getEventTypeLabel = (type: string): string => {
    switch (type) {
      case 'training': return 'Entrenamiento';
      case 'match': return 'Partido';
      case 'displacement': return 'Desplazamiento';
      default: return type;
    }
  };

  const getEventTypeColor = (type: string): string => {
    switch (type) {
      case 'training': return 'bg-blue-500';
      case 'match': return 'bg-green-500';
      case 'displacement': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-card rounded-lg border overflow-hidden">
        {/* Week day headers */}
        <div className="grid grid-cols-7 bg-muted/50">
          {weekDays.map(day => (
            <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {/* Empty cells for days before month start */}
          {Array.from({ length: adjustedStartDay }).map((_, index) => (
            <div key={`empty-${index}`} className="min-h-[60px] p-1 border-t border-l first:border-l-0 bg-muted/20" />
          ))}

          {/* Days of the month */}
          {daysInMonth.map((day, index) => {
            const dayEvents = getEventsForDate(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(isSelected ? null : day)}
                className={`min-h-[60px] p-1 border-t border-l text-left transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset ${
                  (index + adjustedStartDay) % 7 === 0 ? 'border-l-0' : ''
                } ${isSelected ? 'bg-primary/10 ring-2 ring-primary ring-inset' : ''}`}
              >
                <div className={`text-xs font-medium mb-1 ${
                  isTodayDate 
                    ? 'bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center' 
                    : 'text-foreground'
                }`}>
                  {format(day, 'd')}
                </div>
                {dayEvents.length > 0 && (
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map((event, i) => (
                      <div
                        key={event.id}
                        className={`text-[10px] px-1 py-0.5 rounded truncate text-white ${getEventTypeColor(event.type)}`}
                        title={event.title}
                      >
                        {event.time.slice(0, 5)}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-muted-foreground text-center">
                        +{dayEvents.length - 2} más
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>Entrenamiento</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>Partido</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-purple-500" />
          <span>Desplazamiento</span>
        </div>
      </div>

      {/* Selected Date Events */}
      {selectedDate && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
            </h3>
            {selectedDateEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay eventos este día</p>
            ) : (
              <div className="space-y-2">
                {selectedDateEvents.map(event => (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}`}
                    className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getTeamColor(event.team_id) }}
                      />
                      <span className="font-medium text-sm">{event.title}</span>
                      <Badge variant="secondary" className="text-xs">
                        {event.time.slice(0, 5)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {event.location}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
