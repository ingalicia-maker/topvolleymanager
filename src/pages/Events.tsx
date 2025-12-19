import { useState } from 'react';
import { Plus, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { EventCard } from '@/components/EventCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Event, TEAMS } from '@/types/volleyball';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Events() {
  const [events] = useLocalStorage<Event[]>('volleyball-events', []);
  const [teamFilter, setTeamFilter] = useState<string[]>([]);

  const today = new Date().toISOString().split('T')[0];

  const filteredEvents = events.filter(e =>
    teamFilter.length === 0 || teamFilter.includes(e.teamId)
  );

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

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header
        title="Eventos"
        rightAction={
          <div className="flex gap-2">
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
      </div>
      <BottomNav />
    </div>
  );
}
