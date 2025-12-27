import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { PlayerCard } from '@/components/PlayerCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { TEAMS } from '@/types/volleyball';
import { usePlayers } from '@/hooks/usePlayers';
import { useEvents } from '@/hooks/useEvents';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function NewEvent() {
  const navigate = useNavigate();
  const { players } = usePlayers();
  const { addEvent } = useEvents();
  const { user } = useAuth();

  const [type, setType] = useState<'training' | 'match'>('training');
  const [teamId, setTeamId] = useState('');
  
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [invitedPlayers, setInvitedPlayers] = useState<string[]>([]);
  const [playerTab, setPlayerTab] = useState('team');
  const [loading, setLoading] = useState(false);

  const nativeSelectClassName =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  // Generate time options in 15-minute increments (7:00 - 23:45)
  const timeOptions: string[] = [];
  for (let h = 7; h <= 23; h++) {
    for (const m of [0, 15, 30, 45]) {
      const hour = h.toString().padStart(2, '0');
      const minute = m.toString().padStart(2, '0');
      timeOptions.push(`${hour}:${minute}`);
    }
  }

  const selectedTeam = TEAMS.find(t => t.id === teamId);
  const teamPlayers = players.filter(p => p.teams.includes(teamId));
  const otherPlayers = players.filter(p => !p.teams.includes(teamId));

  const togglePlayer = (playerId: string) => {
    setInvitedPlayers(prev =>
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teamId) {
      toast.error('Selecciona un equipo');
      return;
    }
    const eventTitle = type === 'training' ? 'Entrenamiento' : 'Partido';
    if (!date) {
      toast.error('La fecha es obligatoria');
      return;
    }
    if (!time) {
      toast.error('La hora es obligatoria');
      return;
    }
    if (!location.trim()) {
      toast.error('La ubicación es obligatoria');
      return;
    }

    setLoading(true);
    const result = await addEvent({
      type,
      team_id: teamId,
      title: eventTitle,
      date,
      time,
      location: location.trim(),
      invited_players: invitedPlayers,
      confirmed_players: [],
      declined_players: [],
      notes: notes.trim() || null,
      created_by: user?.id || null,
    });

    if (result) {
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
            onChange={(e) => setType(e.target.value as 'training' | 'match')}
            disabled={loading}
          >
            <option value="training">Entrenamiento</option>
            <option value="match">Partido</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="teamId">Equipo *</Label>
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
            {TEAMS.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>


        <div className="grid grid-cols-2 gap-4">
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