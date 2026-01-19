import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { es, enUS, it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Clock, Dumbbell, Trophy, Bus, AlertTriangle, CalendarOff, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DbEvent } from '@/hooks/useEvents';
import { useTeams } from '@/hooks/useTeams';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

type EventType = 'training' | 'match' | 'displacement' | 'incident' | 'holiday' | 'communication';

interface EventCalendarProps {
  events: DbEvent[];
}

export function EventCalendar({ events }: EventCalendarProps) {
  const { t, i18n } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { teams } = useTeams();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeFilters, setActiveFilters] = useState<EventType[]>(['training', 'match', 'displacement', 'incident', 'holiday', 'communication']);

  const getLocale = () => {
    switch (i18n.language) {
      case 'es': return es;
      case 'it': return it;
      default: return enUS;
    }
  };

  const toggleFilter = (type: EventType) => {
    setActiveFilters(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Filter events by active type filters
  const filteredEvents = useMemo(() => {
    return events.filter(event => activeFilters.includes(event.type as EventType));
  }, [events, activeFilters]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  // Get the start of the calendar grid (might be in previous month)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const daysInCalendar = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, DbEvent[]> = {};
    filteredEvents.forEach(event => {
      const dateKey = event.date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [filteredEvents]);

  const getEventsForDate = (date: Date): DbEvent[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return eventsByDate[dateKey] || [];
  };

  const getTeamColor = (teamId: string): string => {
    const team = teams.find(t => t.id === teamId);
    return team?.color || '#6b7280';
  };

  const getTeamName = (teamId: string): string => {
    if (teamId === 'all') return t('common.all');
    const team = teams.find(t => t.id === teamId);
    return team?.name || t('teams.team');
  };

  const getEventTypeConfig = (type: string) => {
    switch (type) {
      case 'training': 
        return { 
          color: 'bg-blue-500', 
          icon: Dumbbell, 
          label: t('events.training'),
          dotColor: 'bg-blue-500'
        };
      case 'match': 
        return { 
          color: 'bg-green-500', 
          icon: Trophy, 
          label: t('events.match'),
          dotColor: 'bg-green-500'
        };
      case 'displacement': 
        return { 
          color: 'bg-purple-500', 
          icon: Bus, 
          label: t('events.displacement'),
          dotColor: 'bg-purple-500'
        };
      case 'incident': 
        return { 
          color: 'bg-orange-500', 
          icon: AlertTriangle, 
          label: t('events.incident'),
          dotColor: 'bg-orange-500'
        };
      case 'holiday': 
        return { 
          color: 'bg-emerald-500', 
          icon: CalendarOff, 
          label: t('events.holiday'),
          dotColor: 'bg-emerald-500'
        };
      case 'communication': 
        return { 
          color: 'bg-sky-500', 
          icon: Megaphone, 
          label: t('events.communication'),
          dotColor: 'bg-sky-500'
        };
      default: 
        return { 
          color: 'bg-gray-500', 
          icon: CalendarIcon, 
          label: type,
          dotColor: 'bg-gray-500'
        };
    }
  };

  const weekDays = useMemo(() => {
    const locale = getLocale();
    const days = [];
    const baseDate = startOfWeek(new Date(), { weekStartsOn: 1 });
    for (let i = 0; i < 7; i++) {
      const day = new Date(baseDate);
      day.setDate(baseDate.getDate() + i);
      days.push(format(day, 'EEEEE', { locale }));
    }
    return days;
  }, [i18n.language]);

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  return (
    <div className="space-y-3">
      {/* Calendar Header - More compact for mobile */}
      <div className="flex items-center justify-between px-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: getLocale() })}
          </h2>
          {!isToday(currentMonth) && (
            <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={goToToday}>
              {t('common.today')}
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Calendar Grid - Optimized for mobile */}
      <Card className="overflow-hidden">
        {/* Week day headers */}
        <div className="grid grid-cols-7 bg-muted/50 border-b">
          {weekDays.map((day, i) => (
            <div key={i} className="py-2 text-center text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days - Larger touch targets */}
        <div className="grid grid-cols-7">
          {daysInCalendar.map((day, index) => {
            const dayEvents = getEventsForDate(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);
            const isCurrentMonth = format(day, 'M') === format(currentMonth, 'M');

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(isSelected ? null : day)}
                className={cn(
                  "relative min-h-[52px] p-1 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset border-b border-r last:border-r-0",
                  "[&:nth-child(7n)]:border-r-0",
                  !isCurrentMonth && "bg-muted/30",
                  isSelected && "bg-primary/10 ring-2 ring-primary ring-inset",
                  "active:bg-muted/50"
                )}
              >
                <div className={cn(
                  "text-xs font-medium mb-0.5 w-6 h-6 flex items-center justify-center mx-auto",
                  isTodayDate && "bg-primary text-primary-foreground rounded-full",
                  !isCurrentMonth && "text-muted-foreground/50",
                  isCurrentMonth && !isTodayDate && "text-foreground"
                )}>
                  {format(day, 'd')}
                </div>
                
                {/* Event indicators - dots for mobile */}
                {dayEvents.length > 0 && (
                  <div className="flex justify-center gap-0.5 flex-wrap max-w-full px-0.5">
                    {dayEvents.slice(0, 4).map((event, i) => {
                      const config = getEventTypeConfig(event.type);
                      return (
                        <div
                          key={event.id}
                          className={cn("w-1.5 h-1.5 rounded-full", config.dotColor)}
                        />
                      );
                    })}
                    {dayEvents.length > 4 && (
                      <span className="text-[8px] text-muted-foreground">+{dayEvents.length - 4}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Filter Buttons - Scrollable horizontally on mobile */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {(['training', 'match', 'displacement', 'incident', 'holiday', 'communication'] as EventType[]).map(type => {
          const config = getEventTypeConfig(type);
          const isActive = activeFilters.includes(type);
          return (
            <button
              key={type}
              onClick={() => toggleFilter(type)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0",
                isActive
                  ? `${config.color} text-white shadow-sm`
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                isActive ? "bg-white" : config.dotColor
              )} />
              <span className="whitespace-nowrap">{config.label}</span>
            </button>
          );
        })}
      </div>

      {/* Selected Date Events - Better mobile layout */}
      {selectedDate && (
        <Card>
          <CardContent className="p-3">
            <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
              <CalendarIcon className="h-4 w-4 text-primary" />
              {format(selectedDate, "EEEE, d MMMM", { locale: getLocale() })}
            </h3>
            {selectedDateEvents.length === 0 ? (
              <div className="text-center py-4">
                <CalendarIcon className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">{t('events.noEvents')}</p>
                <Link to={`/events/new?date=${format(selectedDate, 'yyyy-MM-dd')}`}>
                  <Button variant="link" size="sm" className="mt-1">
                    {t('events.create')}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDateEvents.map(event => {
                  const config = getEventTypeConfig(event.type);
                  const IconComponent = config.icon;
                  return (
                    <Link
                      key={event.id}
                      to={`/events/${event.id}`}
                      className="block p-2.5 rounded-lg border hover:bg-muted/50 transition-colors active:bg-muted"
                    >
                      <div className="flex items-start gap-2">
                        <div className={cn("mt-0.5 p-1.5 rounded-md text-white", config.color)}>
                          <IconComponent className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{event.title}</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {event.time.slice(0, 5)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: getTeamColor(event.team_id) }}
                              />
                              {getTeamName(event.team_id)}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate">{event.location}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
