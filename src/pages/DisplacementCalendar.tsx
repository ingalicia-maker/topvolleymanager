import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEvents } from '@/hooks/useEvents';
import { useTeams } from '@/hooks/useTeams';
import { Bus, MapPin, Clock, ChevronLeft, ChevronRight, Check, AlertCircle, Users } from 'lucide-react';

export default function DisplacementCalendar() {
  const { events, loading } = useEvents();
  const { teams } = useTeams();
  
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const displacements = useMemo(() => {
    return events
      .filter(e => e.type === 'displacement')
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [events]);

  const monthDisplacements = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    return displacements.filter(d => {
      const date = new Date(d.date);
      return date.getFullYear() === year && date.getMonth() === month;
    });
  }, [displacements, currentMonth]);

  const upcomingDisplacements = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return displacements.filter(d => d.date >= today).slice(0, 5);
  }, [displacements]);

  const getTeamSubmissionStatus = (event: typeof displacements[0]) => {
    const selectedTeams = event.selected_teams || [];
    const submissions = event.coach_submissions || {};
    
    const allSubmitted = selectedTeams.length > 0 && 
      selectedTeams.every(teamId => submissions[teamId]?.submitted);
    const pendingTeams = selectedTeams.filter(teamId => !submissions[teamId]?.submitted);
    const submittedCount = selectedTeams.filter(teamId => submissions[teamId]?.submitted).length;
    
    return { allSubmitted, pendingTeams, submittedCount, total: selectedTeams.length };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  const goToPrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const getTeamName = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.name || teamId;
  };

  const getTeamColor = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.color || 'hsl(var(--primary))';
  };

  // Calculate total passengers for a displacement
  const getTotalPassengers = (event: typeof displacements[0]) => {
    const coachCount = event.total_passengers || 0;
    const playerStops = event.player_stops || {};
    const playerReturns = event.player_returns || {};
    
    // Count players that return by bus
    const playersReturning = Object.keys(playerStops).filter(playerId => 
      playerReturns[playerId] !== false
    ).length;
    
    return coachCount + playersReturning;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Calendario Desplazamientos" showBack />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Calendario Desplazamientos" showBack />
      
      <div className="p-4 space-y-6">
        {/* Month Navigation */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-lg font-semibold capitalize">
                {formatMonthYear(currentMonth)}
              </h2>
              <Button variant="ghost" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Month Displacements */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Desplazamientos del mes ({monthDisplacements.length})
          </h3>
          
          {monthDisplacements.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <Bus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No hay desplazamientos este mes</p>
              </CardContent>
            </Card>
          ) : (
            monthDisplacements.map(displacement => {
              const status = getTeamSubmissionStatus(displacement);
              const totalPassengers = getTotalPassengers(displacement);
              
              return (
                <Link key={displacement.id} to={`/events/${displacement.id}`}>
                  <Card className="overflow-hidden transition-all hover:shadow-lg active:scale-[0.98]">
                    <div className="h-1.5 bg-blue-500" />
                    <CardContent className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Bus className="h-5 w-5 text-blue-500" />
                          <div>
                            <h4 className="font-semibold">{displacement.destination}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              {displacement.departure_time || displacement.time}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatDate(displacement.date)}</div>
                          <div className="flex items-center gap-1 text-sm">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium text-blue-600">{totalPassengers} pasajeros</span>
                          </div>
                        </div>
                      </div>

                      {/* Team Status */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Estado de equipos</span>
                          {status.allSubmitted ? (
                            <Badge variant="default" className="bg-green-500">
                              <Check className="h-3 w-3 mr-1" />
                              Todos enviados
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {status.submittedCount}/{status.total} enviados
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {(displacement.selected_teams || []).map(teamId => {
                            const isSubmitted = displacement.coach_submissions?.[teamId]?.submitted;
                            return (
                              <Badge 
                                key={teamId} 
                                variant={isSubmitted ? "default" : "outline"}
                                className={`text-xs ${
                                  isSubmitted 
                                    ? 'bg-green-100 text-green-700 border-green-300' 
                                    : 'bg-amber-50 text-amber-700 border-amber-300'
                                }`}
                              >
                                <div 
                                  className="w-2 h-2 rounded-full mr-1"
                                  style={{ backgroundColor: getTeamColor(teamId) }}
                                />
                                {getTeamName(teamId)}
                                {isSubmitted ? (
                                  <Check className="h-3 w-3 ml-1" />
                                ) : (
                                  <AlertCircle className="h-3 w-3 ml-1" />
                                )}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </div>

        {/* Upcoming Displacements */}
        {upcomingDisplacements.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Próximos desplazamientos
            </h3>
            
            {upcomingDisplacements.map(displacement => {
              const status = getTeamSubmissionStatus(displacement);
              
              return (
                <Link key={displacement.id} to={`/events/${displacement.id}`}>
                  <Card className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-blue-100">
                            <Bus className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{displacement.destination}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(displacement.date)}</p>
                          </div>
                        </div>
                        {status.allSubmitted ? (
                          <Check className="h-5 w-5 text-green-500" />
                        ) : (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                            {status.pendingTeams.length} pendiente{status.pendingTeams.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      
      <BottomNav />
    </div>
  );
}