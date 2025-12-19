import { Link } from 'react-router-dom';
import { Users, Calendar, UserPlus, CalendarPlus, Trophy, Dumbbell } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { EventCard } from '@/components/EventCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Event, Player, TEAMS } from '@/types/volleyball';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export default function Index() {
  const [events] = useLocalStorage<Event[]>('volleyball-events', []);
  const [players] = useLocalStorage<Player[]>('volleyball-players', []);

  const today = new Date().toISOString().split('T')[0];
  const upcomingEvents = events
    .filter(e => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  const totalMatches = events.filter(e => e.type === 'match').length;
  const totalTrainings = events.filter(e => e.type === 'training').length;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground px-4 pt-8 pb-10">
        <h1 className="text-2xl font-bold mb-1">Voleibol Manager</h1>
        <p className="text-primary-foreground/80 text-sm">Gestiona tus equipos y convocatorias</p>
      </div>

      <div className="px-4 -mt-6 space-y-6">
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
                <p className="text-2xl font-bold text-foreground">{TEAMS.length}</p>
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
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {TEAMS.map(team => (
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
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
