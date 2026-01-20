import { useMemo, useState } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, addWeeks, subWeeks, isSameWeek } from 'date-fns';
import { es, enUS, it } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Plus, ChevronLeft, ChevronRight, AlertTriangle, CalendarOff, Megaphone } from 'lucide-react';
import { DbEvent } from '@/hooks/useEvents';
import { useTeams } from '@/hooks/useTeams';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';

interface WeeklyScheduleProps {
  events: DbEvent[];
}

export function WeeklySchedule({ events }: WeeklyScheduleProps) {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const { teams } = useTeams();
  const navigate = useNavigate();

  const getLocale = () => {
    switch (i18n.language) {
      case 'es':
        return es;
      case 'it':
        return it;
      default:
        return enUS;
    }
  };
  
  const today = new Date();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(today, { weekStartsOn: 1 })
  );

  const weekStart = currentWeekStart;
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const isCurrentWeek = isSameWeek(currentWeekStart, today, { weekStartsOn: 1 });

  const goToPreviousWeek = () => {
    setCurrentWeekStart(prev => subWeeks(prev, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(prev => addWeeks(prev, 1));
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
  };

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
    if (teamId === 'all') return t('common.all');
    const team = teams.find(t => t.id === teamId);
    return team?.name || t('teams.team');
  };

  const getTeamColor = (teamId: string): string => {
    const team = teams.find(t => t.id === teamId);
    return team?.color || '#6b7280';
  };

  // Get color and icon for notification types
  const getEventTypeStyle = (event: DbEvent) => {
    switch (event.type) {
      case 'incident':
        return { color: '#ea580c', icon: AlertTriangle };
      case 'holiday':
        return { color: '#16a34a', icon: CalendarOff };
      case 'communication':
        return { color: '#2563eb', icon: Megaphone };
      default:
        return { color: getTeamColor(event.team_id), icon: null };
    }
  };

  const isNotificationType = (type: string) => 
    ['incident', 'holiday', 'communication'].includes(type);

  // Group events by time slot for handling overlaps
  const groupEventsByTimeSlot = (dayEvents: DbEvent[]) => {
    const grouped: Record<string, DbEvent[]> = {};
    dayEvents.forEach(event => {
      const hour = parseInt(event.time.split(':')[0]);
      const key = `${hour}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(event);
    });
    return grouped;
  };

  // Calculate event position and height based on time, with overlap handling
  const getEventStyle = (event: DbEvent, index: number, totalInSlot: number) => {
    const [hours, minutes] = event.time.split(':').map(Number);
    const startMinutes = (hours - startHour) * 60 + minutes;
    const top = (startMinutes / 60) * 48; // 48px per hour
    
    // Notification types take full width but are shorter
    const isNotification = isNotificationType(event.type);
    
    // Default duration: 1.5 hours for training, 2 hours for match, 30min for notifications
    const durationMinutes = isNotification ? 30 : event.type === 'match' ? 120 : 90;
    const height = Math.max((durationMinutes / 60) * 48, isNotification ? 24 : 40);
    
    // Calculate width and left position for overlapping events
    const width = totalInSlot > 1 && !isNotification ? `${100 / totalInSlot}%` : '100%';
    const left = totalInSlot > 1 && !isNotification ? `${(index * 100) / totalInSlot}%` : '0';
    
    return { top: `${top}px`, height: `${height}px`, width, left };
  };

  // Handle click on empty cell to create event
  const handleCellClick = (day: Date, hour: number) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    navigate(`/events/new?date=${dateStr}&time=${timeStr}`);
  };

  // Always show the weekly schedule - it's useful for navigation and creating events

  const totalHeight = (endHour - startHour + 1) * 48; // 48px per hour

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5 text-primary" />
            {t('events.thisWeek')}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={goToPreviousWeek}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {!isCurrentWeek && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs px-2"
                onClick={goToToday}
              >
                {t('common.today')}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={goToNextWeek}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {format(weekStart, "d MMM", { locale: es })} - {format(weekEnd, "d MMM yyyy", { locale: es })}
        </p>
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
                    {/* Hour grid cells - clickable to create event */}
                    {hours.map(hour => (
                      <button
                        key={hour}
                        onClick={() => handleCellClick(day, hour)}
                        className="absolute left-0 right-0 border-t border-muted/30 hover:bg-primary/10 transition-colors group cursor-pointer"
                        style={{ 
                          top: `${(hour - startHour) * 48}px`,
                          height: '48px'
                        }}
                        title={`Crear evento a las ${hour}:00`}
                      >
                        <div className="opacity-0 group-hover:opacity-100 absolute inset-0 flex items-center justify-center transition-opacity">
                          <Plus className="h-4 w-4 text-primary" />
                        </div>
                      </button>
                    ))}

                    {/* Events with overlap handling */}
                    {(() => {
                      const timeSlots = groupEventsByTimeSlot(dayEvents);
                      return dayEvents.map(event => {
                        const hour = parseInt(event.time.split(':')[0]);
                        const slotEvents = timeSlots[`${hour}`] || [];
                        const indexInSlot = slotEvents.findIndex(e => e.id === event.id);
                        const totalInSlot = slotEvents.length;
                        
                        const style = getEventStyle(event, indexInSlot, totalInSlot);
                        const typeStyle = getEventTypeStyle(event);
                        const isNotification = isNotificationType(event.type);
                        const IconComponent = typeStyle.icon;
                        
                        return (
                          <Link
                            key={event.id}
                            to={`/events/${event.id}`}
                            className={`absolute rounded overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all z-10 ${
                              isNotification ? 'border-l-4' : ''
                            }`}
                            style={{
                              top: style.top,
                              height: style.height,
                              width: style.width,
                              left: style.left,
                              backgroundColor: typeStyle.color,
                              borderLeftColor: isNotification ? typeStyle.color : undefined,
                              marginLeft: totalInSlot > 1 ? '1px' : '2px',
                              marginRight: totalInSlot > 1 ? '1px' : '2px',
                            }}
                          >
                            <div className="p-1 text-white h-full flex flex-col">
                              {isNotification ? (
                                <div className="flex items-center gap-1">
                                  {IconComponent && <IconComponent className="h-3 w-3 shrink-0" />}
                                  <span className="font-bold text-[10px] leading-tight truncate">
                                    {event.title}
                                  </span>
                                </div>
                              ) : (
                                <>
                                  <span className="font-bold text-xs leading-tight truncate">
                                    {getTeamName(event.team_id)}
                                  </span>
                                  <span className="text-[10px] opacity-90">
                                    {event.time.slice(0, 5)}
                                  </span>
                                  {style.height !== '24px' && (
                                    <span className="text-[10px] opacity-80 truncate">
                                      {event.location}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </Link>
                        );
                      });
                    })()}
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
