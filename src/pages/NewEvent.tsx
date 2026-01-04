import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { PlayerCard } from '@/components/PlayerCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { usePlayers } from '@/hooks/usePlayers';
import { useTeams } from '@/hooks/useTeams';
import { useEvents, AVAILABLE_STOPS } from '@/hooks/useEvents';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bus, MapPin, Clock, Users } from 'lucide-react';

type EventType = 'training' | 'match' | 'displacement';

export default function NewEvent() {
  const navigate = useNavigate();
  const { players } = usePlayers();
  const { teams, loading: teamsLoading } = useTeams();
  const { addEvent } = useEvents();
  const { user } = useAuth();
  const { profile } = useUserRole();
  const { notifyPlayerSummoned } = useNotifications();

  const [type, setType] = useState<EventType>('training');
  const [teamId, setTeamId] = useState('');
  
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [invitedPlayers, setInvitedPlayers] = useState<string[]>([]);
  const [playerTab, setPlayerTab] = useState('team');
  const [loading, setLoading] = useState(false);

  // Displacement-specific state
  const [destination, setDestination] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [selectedStops, setSelectedStops] = useState<string[]>([]);
  const [playerStops, setPlayerStops] = useState<Record<string, string>>({});
  const [totalCoaches, setTotalCoaches] = useState('1');

  const nativeSelectClassName =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  // Generate time options in 15-minute increments (7:00 - 23:45)
  const timeOptions: string[] = [];
  for (let h = 5; h <= 23; h++) {
    for (const m of [0, 15, 30, 45]) {
      const hour = h.toString().padStart(2, '0');
      const minute = m.toString().padStart(2, '0');
      timeOptions.push(`${hour}:${minute}`);
    }
  }

  const selectedTeam = teams.find(t => t.id === teamId);
  const teamPlayers = players.filter(p => p.teams?.includes(teamId));
  const otherPlayers = players.filter(p => !p.teams?.includes(teamId));

  const togglePlayer = (playerId: string) => {
    setInvitedPlayers(prev =>
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
    // Remove from player stops if removed
    if (invitedPlayers.includes(playerId)) {
      setPlayerStops(prev => {
        const { [playerId]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const toggleStop = (stop: string) => {
    setSelectedStops(prev =>
      prev.includes(stop) ? prev.filter(s => s !== stop) : [...prev, stop]
    );
    // Remove players from this stop if stop is deselected
    if (selectedStops.includes(stop)) {
      setPlayerStops(prev => {
        const filtered: Record<string, string> = {};
        Object.entries(prev).forEach(([pid, s]) => {
          if (s !== stop) filtered[pid] = s;
        });
        return filtered;
      });
    }
  };

  const assignPlayerToStop = (playerId: string, stop: string) => {
    setPlayerStops(prev => ({
      ...prev,
      [playerId]: stop,
    }));
  };

  const selectAllTeam = () => {
    const teamPlayerIds = teamPlayers.map(p => p.id);
    setInvitedPlayers(prev => {
      const withoutTeam = prev.filter(id => !teamPlayerIds.includes(id));
      return [...withoutTeam, ...teamPlayerIds];
    });
  };

  const selectAllOther = () => {
    const otherPlayerIds = otherPlayers.map(p => p.id);
    setInvitedPlayers(prev => {
      const withoutOther = prev.filter(id => !otherPlayerIds.includes(id));
      return [...withoutOther, ...otherPlayerIds];
    });
  };

  const deselectAllTeam = () => {
    const teamPlayerIds = teamPlayers.map(p => p.id);
    setInvitedPlayers(prev => prev.filter(id => !teamPlayerIds.includes(id)));
  };

  const deselectAllOther = () => {
    const otherPlayerIds = otherPlayers.map(p => p.id);
    setInvitedPlayers(prev => prev.filter(id => !otherPlayerIds.includes(id)));
  };

  const allTeamSelected = teamPlayers.length > 0 && teamPlayers.every(p => invitedPlayers.includes(p.id));
  const allOtherSelected = otherPlayers.length > 0 && otherPlayers.every(p => invitedPlayers.includes(p.id));

  // Calculate total passengers
  const totalPassengers = invitedPlayers.length + (parseInt(totalCoaches) || 0);

  const getEventTitle = () => {
    switch (type) {
      case 'training': return 'Entrenamiento';
      case 'match': return 'Partido';
      case 'displacement': return 'Desplazamiento';
      default: return 'Evento';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teamId) {
      toast.error('Selecciona un equipo');
      return;
    }
    if (!date) {
      toast.error('La fecha es obligatoria');
      return;
    }

    if (type === 'displacement') {
      if (!destination.trim()) {
        toast.error('El destino es obligatorio');
        return;
      }
      if (!departureTime) {
        toast.error('La hora de salida es obligatoria');
        return;
      }
      if (selectedStops.length === 0) {
        toast.error('Selecciona al menos una parada');
        return;
      }
    } else {
      if (!time) {
        toast.error('La hora es obligatoria');
        return;
      }
      if (!location.trim()) {
        toast.error('La ubicación es obligatoria');
        return;
      }
    }

    setLoading(true);
    const result = await addEvent({
      type,
      team_id: teamId,
      title: getEventTitle(),
      date,
      time: type === 'displacement' ? departureTime : time,
      location: type === 'displacement' ? destination.trim() : location.trim(),
      invited_players: invitedPlayers,
      confirmed_players: [],
      declined_players: [],
      notes: notes.trim() || null,
      created_by: user?.id || null,
      destination: type === 'displacement' ? destination.trim() : null,
      departure_time: type === 'displacement' ? departureTime : null,
      stops: type === 'displacement' ? selectedStops : [],
      player_stops: type === 'displacement' ? playerStops : {},
      total_passengers: type === 'displacement' ? totalPassengers : null,
    });

    if (result) {
      // Notify coaches of players from other teams
      const otherTeamPlayers = players.filter(
        p => invitedPlayers.includes(p.id) && !p.teams?.includes(teamId)
      );

      if (otherTeamPlayers.length > 0) {
        const affectedTeamIds = new Set<string>();
        otherTeamPlayers.forEach(p => {
          p.teams?.forEach(t => {
            if (t !== teamId) affectedTeamIds.add(t);
          });
        });

        const { data: coaches } = await supabase
          .from('profiles')
          .select('id, assigned_teams');

        if (coaches) {
          const senderName = profile?.name || 'Un entrenador';
          
          for (const coach of coaches) {
            if (coach.id === user?.id) continue;
            
            const coachTeams = coach.assigned_teams || [];
            const matchingTeams = coachTeams.filter((t: string) => affectedTeamIds.has(t));
            
            if (matchingTeams.length > 0) {
              const summonedFromCoach = otherTeamPlayers.filter(p =>
                p.teams?.some(t => matchingTeams.includes(t))
              );

              for (const player of summonedFromCoach) {
                await notifyPlayerSummoned(
                  coach.id,
                  senderName,
                  player.name,
                  result.title,
                  player.id,
                  result.id
                );
              }
            }
          }
        }
      }

      navigate(`/events/${result.id}`);
    }
    setLoading(false);
  };

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return 'Jugadora';
    return [player.name, player.surname1].filter(Boolean).join(' ');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Nuevo Evento" showBack />
      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="type">Tipo de evento</Label>
          <select
            id="type"
            className={nativeSelectClassName}
            value={type}
            onChange={(e) => setType(e.target.value as EventType)}
            disabled={loading}
          >
            <option value="training">Entrenamiento</option>
            <option value="match">Partido</option>
            <option value="displacement">Desplazamiento</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="teamId">Equipo *</Label>
          {teamsLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <select
              id="teamId"
              className={nativeSelectClassName}
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              disabled={loading}
            >
              <option value="" disabled>
                Selecciona equipo
              </option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Fecha *</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            disabled={loading}
          />
        </div>

        {type === 'displacement' ? (
          <>
            {/* Displacement-specific fields */}
            <div className="space-y-2">
              <Label htmlFor="destination" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Destino *
              </Label>
              <Input
                id="destination"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                placeholder="Ciudad o pabellón de destino"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="departureTime" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Hora de salida *
              </Label>
              <select
                id="departureTime"
                className={nativeSelectClassName}
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                disabled={loading}
              >
                <option value="" disabled>
                  Selecciona hora
                </option>
                {timeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bus className="h-4 w-4" />
                  Paradas del bus *
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {AVAILABLE_STOPS.map(stop => (
                  <label
                    key={stop}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedStops.includes(stop) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <Checkbox
                      checked={selectedStops.includes(stop)}
                      onCheckedChange={() => toggleStop(stop)}
                      disabled={loading}
                    />
                    <span className="font-medium">{stop}</span>
                  </label>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="totalCoaches" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Número de entrenadores/acompañantes
              </Label>
              <Input
                id="totalCoaches"
                type="number"
                min="0"
                value={totalCoaches}
                onChange={e => setTotalCoaches(e.target.value)}
                disabled={loading}
              />
            </div>

            {invitedPlayers.length > 0 && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total pasajeros:</span>
                    <Badge variant="default" className="text-lg px-4 py-1">
                      {totalPassengers}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {invitedPlayers.length} jugadoras + {parseInt(totalCoaches) || 0} entrenadores
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="time">Hora *</Label>
              <select
                id="time"
                className={nativeSelectClassName}
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={loading}
              >
                <option value="" disabled>
                  Selecciona hora
                </option>
                {timeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Ubicación *</Label>
              <Input
                id="location"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Pabellón, dirección..."
                disabled={loading}
              />
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="notes">Notas</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Información adicional..."
            rows={3}
            disabled={loading}
          />
        </div>

        {teamId && (
          <div className="space-y-3">
            <Label>
              {type === 'displacement' ? 'Jugadoras en el bus' : 'Convocar jugadoras'} ({invitedPlayers.length})
            </Label>

            <div className="w-full">
              <div className="inline-flex h-10 w-full items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                <button
                  type="button"
                  className={
                    "inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
                    (playerTab === 'team'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'hover:text-foreground')
                  }
                  onClick={() => setPlayerTab('team')}
                  disabled={loading}
                >
                  {selectedTeam?.name} ({teamPlayers.length})
                </button>
                <button
                  type="button"
                  className={
                    "inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
                    (playerTab === 'other'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'hover:text-foreground')
                  }
                  onClick={() => setPlayerTab('other')}
                  disabled={loading}
                >
                  Otras ({otherPlayers.length})
                </button>
              </div>

              {playerTab === 'team' ? (
                <div className="mt-3 space-y-2">
                  {teamPlayers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">
                      No hay jugadoras en este equipo
                    </p>
                  ) : (
                    <>
                      <div className="flex justify-end mb-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={allTeamSelected ? deselectAllTeam : selectAllTeam}
                          disabled={loading}
                        >
                          {allTeamSelected ? 'Quitar todas' : 'Seleccionar todas'}
                        </Button>
                      </div>
                      {teamPlayers.map((player) => (
                        <div key={player.id} className="space-y-2">
                          <PlayerCard
                            player={player}
                            selectable
                            selected={invitedPlayers.includes(player.id)}
                            onSelect={togglePlayer}
                            showTeams={false}
                            clickable={false}
                          />
                          {type === 'displacement' && invitedPlayers.includes(player.id) && selectedStops.length > 0 && (
                            <div className="ml-6 flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Parada:</span>
                              <select
                                className="text-xs border rounded px-2 py-1 bg-background"
                                value={playerStops[player.id] || ''}
                                onChange={(e) => assignPlayerToStop(player.id, e.target.value)}
                              >
                                <option value="">Sin asignar</option>
                                {selectedStops.map(stop => (
                                  <option key={stop} value={stop}>{stop}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {otherPlayers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">
                      No hay otras jugadoras
                    </p>
                  ) : (
                    <>
                      <div className="flex justify-end mb-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={allOtherSelected ? deselectAllOther : selectAllOther}
                          disabled={loading}
                        >
                          {allOtherSelected ? 'Quitar todas' : 'Seleccionar todas'}
                        </Button>
                      </div>
                      {otherPlayers.map((player) => (
                        <div key={player.id} className="space-y-2">
                          <PlayerCard
                            player={player}
                            selectable
                            selected={invitedPlayers.includes(player.id)}
                            onSelect={togglePlayer}
                            clickable={false}
                          />
                          {type === 'displacement' && invitedPlayers.includes(player.id) && selectedStops.length > 0 && (
                            <div className="ml-6 flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Parada:</span>
                              <select
                                className="text-xs border rounded px-2 py-1 bg-background"
                                value={playerStops[player.id] || ''}
                                onChange={(e) => assignPlayerToStop(player.id, e.target.value)}
                              >
                                <option value="">Sin asignar</option>
                                {selectedStops.map(stop => (
                                  <option key={stop} value={stop}>{stop}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creando...' : 'Crear Evento'}
        </Button>
      </form>
      <BottomNav />
    </div>
  );
}
