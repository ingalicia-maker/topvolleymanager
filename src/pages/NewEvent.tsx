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
import { useEvents } from '@/hooks/useEvents';
import { useStops } from '@/hooks/useStops';
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
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [totalCoaches, setTotalCoaches] = useState('1');

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

  const togglePlayer = (playerId: string) => {
    setInvitedPlayers(prev =>
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
  };

  const toggleStop = (stop: string) => {
    setSelectedStops(prev =>
      prev.includes(stop) ? prev.filter(s => s !== stop) : [...prev, stop]
    );
  };

  const toggleTeamForDisplacement = (teamId: string) => {
    setSelectedTeams(prev =>
      prev.includes(teamId) ? prev.filter(t => t !== teamId) : [...prev, teamId]
    );
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
    
    // For displacement events, initialize coach_submissions for each team
    const coachSubmissions: Record<string, { coach_id: string; coach_name: string; submitted: boolean; submitted_at: string | null }> = {};
    if (type === 'displacement') {
      for (const tId of selectedTeams) {
        coachSubmissions[tId] = {
          coach_id: '',
          coach_name: '',
          submitted: false,
          submitted_at: null,
        };
      }
    }

    const result = await addEvent({
      type,
      team_id: type === 'displacement' ? selectedTeams[0] : teamId,
      title: getEventTitle(),
      date,
      time: type === 'displacement' ? departureTime : time,
      location: type === 'displacement' ? destination.trim() : location.trim(),
      invited_players: type === 'displacement' ? [] : invitedPlayers, // Empty for displacement - coaches add players later
      confirmed_players: [],
      declined_players: [],
      notes: notes.trim() || null,
      created_by: user?.id || null,
      destination: type === 'displacement' ? destination.trim() : null,
      departure_time: type === 'displacement' ? departureTime : null,
      stops: type === 'displacement' ? selectedStops : [],
      player_stops: {},
      player_returns: {},
      total_passengers: type === 'displacement' ? parseInt(totalCoaches) || 0 : null,
      selected_teams: type === 'displacement' ? selectedTeams : [],
      coach_submissions: coachSubmissions,
    });

    if (result) {
      // Notify coaches of players from other teams (for standard events)
      if (type !== 'displacement') {
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
      }

      navigate(`/events/${result.id}`);
    }
    setLoading(false);
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
              if (e.target.value !== 'displacement') {
                setSelectedTeams([]);
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
            {/* DISPLACEMENT FLOW: Step 1 - Destination and time */}
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

            {/* DISPLACEMENT FLOW: Step 2 - Stops */}
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

            {/* DISPLACEMENT FLOW: Step 3 - Teams */}
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
                    {teams.map(team => {
                      const teamPlayerCount = players.filter(p => p.teams?.includes(team.id)).length;
                      return (
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
                              ({teamPlayerCount} jugadoras)
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Number of coaches */}
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

            {selectedTeams.length > 0 && (
              <Card className="bg-blue-500/10 border-blue-500/30">
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm text-blue-700 font-medium">
                    ℹ️ Tras crear el desplazamiento, cada entrenador podrá añadir las jugadoras de su equipo con la parada donde suben y si no vuelven en bus.
                  </p>
                  <p className="text-xs text-blue-600">
                    Equipos seleccionados: {selectedTeams.map(t => teams.find(tm => tm.id === t)?.name).join(', ')}
                  </p>
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

        {/* Player selection for standard events only */}
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
          {loading ? 'Creando...' : type === 'displacement' ? 'Crear Desplazamiento' : 'Crear Evento'}
        </Button>
      </form>
      <BottomNav />
    </div>
  );
}
