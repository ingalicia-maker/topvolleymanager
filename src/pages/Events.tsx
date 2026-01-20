import { useMemo, useState } from 'react';
import { Plus, Filter, Bus, Calendar as CalendarIcon, List } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { EventCard } from '@/components/EventCard';
import { EventCalendar } from '@/components/EventCalendar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEvents } from '@/hooks/useEvents';
import { useTeams } from '@/hooks/useTeams';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type ViewMode = 'list' | 'calendar';

export default function Events() {
  const { events, loading } = useEvents();
  const { teams, loading: teamsLoading } = useTeams();
  const [teamFilter, setTeamFilter] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const today = new Date().toISOString().split('T')[0];

  // Same visibility for coaches and directors: show all club events.
  const filteredEvents = useMemo(() => {
    if (teamFilter.length === 0) return events;

    return events.filter(e => {
      // For displacement events, allow filtering by any selected team.
      if (e.type === 'displacement' && e.selected_teams?.length) {
        return e.selected_teams.some(t => teamFilter.includes(t));
      }

      // For standard events, filter by team_id.
      return teamFilter.includes(e.team_id);
    });
  }, [events, teamFilter]);

  const upcomingEvents = filteredEvents
    .filter(e => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const pastEvents = filteredEvents
    .filter(e => e.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));

  const toggleTeamFilter = (teamId: string) => {
    setTeamFilter(prev =>
      prev.includes(teamId) ? prev.filter(t => t !== teamId) : [...prev, teamId]
    );
  };

  if (loading || teamsLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Eventos" />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header
        title="Eventos"
        rightAction={
          <div className="flex gap-2">
            {/* View Mode Toggle */}
            <div className="flex border rounded-md overflow-hidden">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none h-8 px-2"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none h-8 px-2"
                onClick={() => setViewMode('calendar')}
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/displacements">
                  <Button variant="ghost" size="sm">
                    <Bus className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                Calendario desplazamientos
              </TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <Filter className="h-4 w-4" />
                  {teamFilter.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                      {teamFilter.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {TEAMS.map(team => (
                  <DropdownMenuCheckboxItem
                    key={team.id}
                    checked={teamFilter.includes(team.id)}
                    onCheckedChange={() => toggleTeamFilter(team.id)}
                  >
                    <span
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: team.color }}
                    />
                    {team.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/events/new">
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        }
      />
      <div className="p-4">
        {viewMode === 'calendar' ? (
          <EventCalendar events={filteredEvents} />
        ) : (
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="upcoming" className="flex-1">
                Próximos ({upcomingEvents.length})
              </TabsTrigger>
              <TabsTrigger value="past" className="flex-1">
                Pasados ({pastEvents.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="mt-4 space-y-3">
              {upcomingEvents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay eventos próximos
                </p>
              ) : (
                upcomingEvents.map(event => (
                  <EventCard key={event.id} event={event} />
                ))
              )}
            </TabsContent>
            <TabsContent value="past" className="mt-4 space-y-3">
              {pastEvents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay eventos pasados
                </p>
              ) : (
                pastEvents.map(event => (
                  <EventCard key={event.id} event={event} />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
      <BottomNav />
    </div>
  );
}