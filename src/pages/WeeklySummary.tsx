import { useState } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useTeams } from '@/hooks/useTeams';
import { useEvents } from '@/hooks/useEvents';
import { usePlayers } from '@/hooks/usePlayers';
import { usePlayerRatings } from '@/hooks/usePlayerRatings';
import { useUserRole } from '@/hooks/useUserRole';
import { startOfWeek, endOfWeek, format, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trophy, Dumbbell, Users, Star, TrendingUp, Calendar } from 'lucide-react';

export default function WeeklySummary() {
  const { teams } = useTeams();
  const { events } = useEvents();
  const { players } = usePlayers();
  const { ratings } = usePlayerRatings();
  const { isDirector, assignedTeams } = useUserRole();
  
  const [weeksAgo, setWeeksAgo] = useState('0');
  
  const visibleTeams = isDirector 
    ? teams 
    : teams.filter(t => assignedTeams.includes(t.id));
  
  const selectedDate = subWeeks(new Date(), parseInt(weeksAgo));
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  
  const weekLabel = `${format(weekStart, 'd MMM', { locale: es })} - ${format(weekEnd, 'd MMM yyyy', { locale: es })}`;
  
  const getTeamStats = (teamId: string) => {
    const teamEvents = events.filter(e => {
      const eventDate = new Date(e.date);
      const isInWeek = eventDate >= weekStart && eventDate <= weekEnd;
      if (e.type === 'displacement') {
        return isInWeek && e.selected_teams?.includes(teamId);
      }
      return isInWeek && e.team_id === teamId;
    });
    
    const matches = teamEvents.filter(e => e.type === 'match').length;
    const trainings = teamEvents.filter(e => e.type === 'training').length;
    const displacements = teamEvents.filter(e => e.type === 'displacement').length;
    
    const teamPlayers = players.filter(p => p.teams?.includes(teamId));
    const playerCount = teamPlayers.length;
    
    // Calculate average attendance
    const eventsWithConfirmations = teamEvents.filter(e => e.confirmed_players?.length || e.declined_players?.length);
    const avgAttendance = eventsWithConfirmations.length > 0
      ? eventsWithConfirmations.reduce((sum, e) => {
          const confirmed = e.confirmed_players?.length || 0;
          const declined = e.declined_players?.length || 0;
          const total = confirmed + declined;
          return sum + (total > 0 ? confirmed / total : 0);
        }, 0) / eventsWithConfirmations.length * 100
      : null;
    
    // Get ratings for this week
    const weekRatings = ratings.filter(r => {
      const ratingDate = new Date(r.rating_date);
      return r.team_id === teamId && ratingDate >= weekStart && ratingDate <= weekEnd;
    });
    
    const avgRating = weekRatings.length > 0
      ? weekRatings.reduce((sum, r) => {
          const avg = (r.technical_execution + r.decision_making + r.effort_attitude + 
                       r.communication_cooperation + r.leadership_initiative) / 5;
          return sum + avg;
        }, 0) / weekRatings.length
      : null;
    
    return {
      matches,
      trainings,
      displacements,
      playerCount,
      avgAttendance,
      avgRating,
      totalEvents: matches + trainings + displacements,
      ratingsCount: weekRatings.length
    };
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Resumen Semanal" showBack />
      
      <div className="p-4 space-y-4">
        {/* Week Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <Select value={weeksAgo} onValueChange={setWeeksAgo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Esta semana</SelectItem>
                    <SelectItem value="1">Semana pasada</SelectItem>
                    <SelectItem value="2">Hace 2 semanas</SelectItem>
                    <SelectItem value="3">Hace 3 semanas</SelectItem>
                    <SelectItem value="4">Hace 4 semanas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2 text-center">{weekLabel}</p>
          </CardContent>
        </Card>
        
        {/* Team Stats */}
        {visibleTeams.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">No tienes equipos asignados</p>
            </CardContent>
          </Card>
        ) : (
          visibleTeams.map(team => {
            const stats = getTeamStats(team.id);
            return (
              <Card key={team.id} className="overflow-hidden">
                <div className="h-1.5" style={{ backgroundColor: team.color }} />
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-lg">{team.name}</span>
                    <Badge variant="secondary">{stats.playerCount} jugadoras</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Events Summary */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-amber-500/10 rounded-lg">
                      <Trophy className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                      <p className="text-xl font-bold">{stats.matches}</p>
                      <p className="text-xs text-muted-foreground">Partidos</p>
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <Dumbbell className="h-5 w-5 mx-auto text-primary mb-1" />
                      <p className="text-xl font-bold">{stats.trainings}</p>
                      <p className="text-xs text-muted-foreground">Entrenos</p>
                    </div>
                    <div className="text-center p-3 bg-secondary/50 rounded-lg">
                      <Calendar className="h-5 w-5 mx-auto text-secondary-foreground mb-1" />
                      <p className="text-xl font-bold">{stats.displacements}</p>
                      <p className="text-xs text-muted-foreground">Viajes</p>
                    </div>
                  </div>
                  
                  {/* Performance Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    {stats.avgAttendance !== null && (
                      <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-lg font-bold">{stats.avgAttendance.toFixed(0)}%</p>
                          <p className="text-xs text-muted-foreground">Asistencia</p>
                        </div>
                      </div>
                    )}
                    {stats.avgRating !== null && (
                      <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
                        <Star className="h-5 w-5 text-amber-500" />
                        <div>
                          <p className="text-lg font-bold">{stats.avgRating.toFixed(1)}</p>
                          <p className="text-xs text-muted-foreground">{stats.ratingsCount} valoraciones</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {stats.totalEvents === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Sin actividad esta semana
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      
      <BottomNav />
    </div>
  );
}
