import { Link } from 'react-router-dom';
import { Users, Calendar, UserPlus, CalendarPlus, Trophy, Dumbbell, User } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { EventCard } from '@/components/EventCard';
import { NotificationBell } from '@/components/NotificationBell';
import { PlayerOfTheWeek } from '@/components/PlayerOfTheWeek';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePlayers } from '@/hooks/usePlayers';
import { useTeams } from '@/hooks/useTeams';
import { useEvents } from '@/hooks/useEvents';
import { useUserRole } from '@/hooks/useUserRole';
import { useClubTheme } from '@/components/ClubThemeProvider';

export default function Index() {
  const { players } = usePlayers();
  const { teams, loading: teamsLoading } = useTeams();
  const { events } = useEvents();
  const { profile, isDirector, assignedTeams } = useUserRole();
  const { clubName, logoUrl } = useClubTheme();

  const today = new Date().toISOString().split('T')[0];
  
  // Filter events by assigned teams (unless director)
  const visibleEvents = isDirector || assignedTeams.length === 0
    ? events
    : events.filter(e => assignedTeams.includes(e.team_id));

  const upcomingEvents = visibleEvents
    .filter(e => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  const totalMatches = visibleEvents.filter(e => e.type === 'match').length;
  const totalTrainings = visibleEvents.filter(e => e.type === 'training').length;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground px-4 pt-8 pb-10">
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {logoUrl && (
            <img src={logoUrl} alt="Club logo" className="h-12 w-12 object-contain rounded-lg bg-white/10 p-1" />
          )}
          <div>
            <h1 className="text-2xl font-bold mb-1">{clubName}</h1>
            <p className="text-primary-foreground/80 text-sm">Gestiona tus equipos y convocatorias</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Link to="/profile">
            <Button variant="ghost" size="icon" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
              <User className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>

    <div className="px-4 -mt-6 space-y-6">
      {/* Player of the Week */}
      <PlayerOfTheWeek />
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="shadow-lg">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{players.length}</p>
                <p className="text-xs text-muted-foreground">Jugadoras</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{teams.length}</p>
                <p className="text-xs text-muted-foreground">Equipos</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-4 justify-center">
          <div className="flex items-center gap-2 text-sm">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span className="text-muted-foreground">{totalMatches} partidos</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Dumbbell className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">{totalTrainings} entrenamientos</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/players/new">
            <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
              <UserPlus className="h-5 w-5" />
              <span className="text-sm">Añadir Jugadora</span>
            </Button>
          </Link>
          <Link to="/events/new">
            <Button className="w-full h-auto py-4 flex-col gap-2">
              <CalendarPlus className="h-5 w-5" />
              <span className="text-sm">Crear Evento</span>
            </Button>
          </Link>
        </div>

        {/* Upcoming Events */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-foreground">Próximos Eventos</h2>
            <Link to="/events" className="text-sm text-primary font-medium">
              Ver todos
            </Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Calendar className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground text-sm">No hay eventos próximos</p>
                <Link to="/events/new">
                  <Button variant="link" className="mt-2">
                    Crear primer evento
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>

        {/* Teams Preview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-foreground">Equipos</h2>
            <Link to="/teams" className="text-sm text-primary font-medium">
              Ver todos
            </Link>
          </div>
          {teamsLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {teams.map(team => (
                <Link
                  key={team.id}
                  to={`/teams/${team.id}`}
                  className="shrink-0"
                >
                  <Card className="w-32 overflow-hidden transition-all hover:shadow-md active:scale-[0.98]">
                    <div className="h-1.5" style={{ backgroundColor: team.color }} />
                    <CardContent className="p-3">
                      <p className="font-medium text-sm text-foreground truncate">{team.name}</p>
                      <p className="text-xs text-muted-foreground">{team.coach}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
