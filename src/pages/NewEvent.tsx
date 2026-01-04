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
import { Switch } from '@/components/ui/switch';

import { usePlayers } from '@/hooks/usePlayers';
import { useTeams } from '@/hooks/useTeams';
import { useEvents } from '@/hooks/useEvents';
import { useStops } from '@/hooks/useStops';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bus, MapPin, Clock, Users, Plus, X, ArrowLeft } from 'lucide-react';

type EventType = 'training' | 'match' | 'displacement';

export default function NewEvent() {
  const navigate = useNavigate();
  const { players } = usePlayers();
  const { teams, loading: teamsLoading } = useTeams();
  const { addEvent } = useEvents();
  const { stops: availableStops, loading: stopsLoading } = useStops();
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
  const [playerReturns, setPlayerReturns] = useState<Record<string, boolean>>({}); // true = vuelve, false = no vuelve
  const [totalCoaches, setTotalCoaches] = useState('1');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  const nativeSelectClassName =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  // Generate time options in 15-minute increments (5:00 - 23:45)
  const timeOptions: string[] = [];
  for (let h = 5; h <= 23; h++) {
    for (const m of [0, 15, 30, 45]) {
      const hour = h.toString().padStart(2, '0');
      const minute = m.toString().padStart(2, '0');
      timeOptions.push(`${hour}:${minute}`);
    }
  }

  // For standard events
  const selectedTeam = teams.find(t => t.id === teamId);
  const teamPlayers = players.filter(p => p.teams?.includes(teamId));
  const otherPlayers = players.filter(p => !p.teams?.includes(teamId));

  // For displacement events - get players from selected teams
  const displacementPlayers = players.filter(p => 
    p.teams?.some(t => selectedTeams.includes(t))
  );

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
      setPlayerReturns(prev => {
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

  const togglePlayerReturn = (playerId: string, returns: boolean) => {
    setPlayerReturns(prev => ({
      ...prev,
      [playerId]: returns,
    }));
  };

  const toggleTeamForDisplacement = (teamId: string) => {
    setSelectedTeams(prev => {
      if (prev.includes(teamId)) {
        // Remove team and its players
        const teamPlayerIds = players.filter(p => p.teams?.includes(teamId)).map(p => p.id);
        setInvitedPlayers(current => current.filter(id => !teamPlayerIds.includes(id)));
        return prev.filter(t => t !== teamId);
      } else {
        return [...prev, teamId];
      }
    });
  };

  const addAllPlayersFromTeam = (teamId: string) => {
    const teamPlayerIds = players.filter(p => p.teams?.includes(teamId)).map(p => p.id);
    setInvitedPlayers(prev => {
      const existing = new Set(prev);
      teamPlayerIds.forEach(id => existing.add(id));
      return Array.from(existing);
    });
  };

  const removeAllPlayersFromTeam = (teamId: string) => {
    const teamPlayerIds = players.filter(p => p.teams?.includes(teamId)).map(p => p.id);
    setInvitedPlayers(prev => prev.filter(id => !teamPlayerIds.includes(id)));
    // Also clean up stops and returns
    setPlayerStops(prev => {
      const filtered: Record<string, string> = {};
      Object.entries(prev).forEach(([pid, s]) => {
        if (!teamPlayerIds.includes(pid)) filtered[pid] = s;
      });
      return filtered;
    });
    setPlayerReturns(prev => {
      const filtered: Record<string, boolean> = {};
      Object.entries(prev).forEach(([pid, r]) => {
        if (!teamPlayerIds.includes(pid)) filtered[pid] = r;
      });
      return filtered;
    });
  };

  const selectAllTeam = () => {
    const teamPlayerIds = teamPlayers.map(p => p.id);
    setInvitedPlayers(prev => {
      const withoutTeam = prev.filter(id => !teamPlayerIds.includes(id));
      return [...withoutTeam, ...teamPlayerIds];
    });
  };

  const deselectAllTeam = () => {
    const teamPlayerIds = teamPlayers.map(p => p.id);
    setInvitedPlayers(prev => prev.filter(id => !teamPlayerIds.includes(id)));
  };

  const selectAllOther = () => {
    const otherPlayerIds = otherPlayers.map(p => p.id);
    setInvitedPlayers(prev => {
      const withoutOther = prev.filter(id => !otherPlayerIds.includes(id));
      return [...withoutOther, ...otherPlayerIds];
    });
  };

  const deselectAllOther = () => {
    const otherPlayerIds = otherPlayers.map(p => p.id);
    setInvitedPlayers(prev => prev.filter(id => !otherPlayerIds.includes(id)));
  };

  const allTeamSelected = teamPlayers.length > 0 && teamPlayers.every(p => invitedPlayers.includes(p.id));
  const allOtherSelected = otherPlayers.length > 0 && otherPlayers.every(p => invitedPlayers.includes(p.id));

  // Calculate total passengers (only those returning)
  const returningPlayers = invitedPlayers.filter(id => playerReturns[id] !== false);
  const totalPassengers = returningPlayers.length + (parseInt(totalCoaches) || 0);

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

    if (type !== 'displacement' && !teamId) {
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
      if (selectedTeams.length === 0) {
        toast.error('Selecciona al menos un equipo');
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
      team_id: type === 'displacement' ? selectedTeams[0] : teamId,
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
      player_returns: type === 'displacement' ? playerReturns : {},
      total_passengers: type === 'displacement' ? totalPassengers : null,
      selected_teams: type === 'displacement' ? selectedTeams : [],
    });

    if (result) {
      // Notify coaches of players from other teams
      const mainTeam = type === 'displacement' ? selectedTeams[0] : teamId;
      const otherTeamPlayers = players.filter(
        p => invitedPlayers.includes(p.id) && !p.teams?.includes(mainTeam)
      );

      if (otherTeamPlayers.length > 0) {
        const affectedTeamIds = new Set<string>();
        otherTeamPlayers.forEach(p => {
          p.teams?.forEach(t => {
            if (t !== mainTeam) affectedTeamIds.add(t);
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
            onChange={(e) => {
              setType(e.target.value as EventType);
              // Reset displacement-specific state when changing type
              if (e.target.value !== 'displacement') {
                setSelectedTeams([]);
                setPlayerStops({});
                setPlayerReturns({});
              }
            }}
            disabled={loading}
          >
            <option value="training">Entrenamiento</option>
            <option value="match">Partido</option>
            <option value="displacement">Desplazamiento</option>
          </select>
        </div>

        {type === 'displacement' ? (
          <>
            {/* DISPLACEMENT FLOW: 1. Destino y hora */}
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
              <Label htmlFor="date">Fecha *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
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

            {/* DISPLACEMENT FLOW: 2. Paradas */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bus className="h-4 w-4" />
                  Paradas del bus *
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stopsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : availableStops.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay paradas configuradas. Configúralas en Ajustes del Club.
                  </p>
                ) : (
                  availableStops.map(stop => (
                    <label
                      key={stop.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedStops.includes(stop.name) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        checked={selectedStops.includes(stop.name)}
                        onCheckedChange={() => toggleStop(stop.name)}
                        disabled={loading}
                      />
                      <span className="font-medium">{stop.name}</span>
                    </label>
                  ))
                )}
              </CardContent>
            </Card>

            {/* DISPLACEMENT FLOW: 3. Equipos que van */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Equipos que viajan *
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {teamsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <>
                    {teams.map(team => (
                      <label
                        key={team.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedTeams.includes(team.id) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        <Checkbox
                          checked={selectedTeams.includes(team.id)}
                          onCheckedChange={() => toggleTeamForDisplacement(team.id)}
                          disabled={loading}
                        />
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: team.color }}
                        />
                        <div className="flex-1">
                          <span className="font-medium">{team.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({players.filter(p => p.teams?.includes(team.id)).length} jugadoras)
                          </span>
                        </div>
                      </label>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>

            {/* DISPLACEMENT FLOW: 4. Jugadoras por equipo con parada y flag "no vuelve" */}
            {selectedTeams.length > 0 && selectedStops.length > 0 && (
              <div className="space-y-4">
                {selectedTeams.map(teamId => {
                  const team = teams.find(t => t.id === teamId);
                  const teamPlayersList = players.filter(p => p.teams?.includes(teamId));
                  const selectedFromTeam = teamPlayersList.filter(p => invitedPlayers.includes(p.id));
                  const allSelected = teamPlayersList.length > 0 && teamPlayersList.every(p => invitedPlayers.includes(p.id));

                  return (
                    <Card key={teamId}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: team?.color }}
                            />
                            {team?.name}
                            <Badge variant="secondary" className="ml-2">
                              {selectedFromTeam.length}/{teamPlayersList.length}
                            </Badge>
                          </CardTitle>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => allSelected ? removeAllPlayersFromTeam(teamId) : addAllPlayersFromTeam(teamId)}
                            disabled={loading}
                          >
                            {allSelected ? 'Quitar todas' : 'Añadir todas'}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {teamPlayersList.map(player => {
                          const isSelected = invitedPlayers.includes(player.id);
                          const returns = playerReturns[player.id] !== false;
                          
                          return (
                            <div key={player.id} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => togglePlayer(player.id)}
                                  disabled={loading}
                                />
                                <span className="font-medium flex-1">
                                  {[player.name, player.surname1].filter(Boolean).join(' ')}
                                  {player.number && <span className="text-xs text-primary ml-1">#{player.number}</span>}
                                </span>
                              </div>
                              
                              {isSelected && (
                                <div className="ml-6 flex flex-wrap items-center gap-3 text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">Parada:</span>
                                    <select
                                      className="text-sm border rounded px-2 py-1 bg-background"
                                      value={playerStops[player.id] || ''}
                                      onChange={(e) => assignPlayerToStop(player.id, e.target.value)}
                                    >
                                      <option value="">Sin asignar</option>
                                      {selectedStops.map(stop => (
                                        <option key={stop} value={stop}>{stop}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={!returns}
                                      onCheckedChange={(checked) => togglePlayerReturn(player.id, !checked)}
                                    />
                                    <span className={`text-xs ${!returns ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                                      No vuelve en bus
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Coaches and total */}
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
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total pasajeros (vuelta):</span>
                    <Badge variant="default" className="text-lg px-4 py-1">
                      {totalPassengers}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {returningPlayers.length} jugadoras que vuelven + {parseInt(totalCoaches) || 0} entrenadores
                  </p>
                  {invitedPlayers.length !== returningPlayers.length && (
                    <p className="text-xs text-amber-600">
                      ⚠️ {invitedPlayers.length - returningPlayers.length} jugadora(s) no vuelven en bus
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <>
            {/* STANDARD EVENT FLOW */}
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

        {/* Player selection for standard events */}
        {type !== 'displacement' && teamId && (
          <div className="space-y-3">
            <Label>Convocar jugadoras ({invitedPlayers.length})</Label>

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
                        <PlayerCard
                          key={player.id}
                          player={player}
                          selectable
                          selected={invitedPlayers.includes(player.id)}
                          onSelect={togglePlayer}
                          showTeams={false}
                          clickable={false}
                        />
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
                        <PlayerCard
                          key={player.id}
                          player={player}
                          selectable
                          selected={invitedPlayers.includes(player.id)}
                          onSelect={togglePlayer}
                          clickable={false}
                        />
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
