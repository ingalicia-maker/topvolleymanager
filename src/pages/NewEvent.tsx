import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { PlayerCard } from '@/components/PlayerCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Event, Player, TEAMS } from '@/types/volleyball';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function NewEvent() {
  const navigate = useNavigate();
  const [events, setEvents] = useLocalStorage<Event[]>('volleyball-events', []);
  const [players] = useLocalStorage<Player[]>('volleyball-players', []);

  const [type, setType] = useState<'training' | 'match'>('training');
  const [teamId, setTeamId] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [invitedPlayers, setInvitedPlayers] = useState<string[]>([]);
  const [playerTab, setPlayerTab] = useState('team');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!teamId) {
      toast.error('Selecciona un equipo');
      return;
    }
    if (!title.trim()) {
      toast.error('El título es obligatorio');
      return;
    }
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

    const newEvent: Event = {
      id: crypto.randomUUID(),
      type,
      teamId,
      title: title.trim(),
      date,
      time,
      location: location.trim(),
      invitedPlayers,
      confirmedPlayers: [],
      declinedPlayers: [],
      notes: notes.trim() || undefined,
    };

    setEvents([...events, newEvent]);
    toast.success('Evento creado');
    navigate(`/events/${newEvent.id}`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Nuevo Evento" showBack />
      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        <div className="space-y-3">
          <Label>Tipo de evento</Label>
          <RadioGroup
            value={type}
            onValueChange={(v) => setType(v as 'training' | 'match')}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="training" id="training" />
              <Label htmlFor="training" className="cursor-pointer">Entrenamiento</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="match" id="match" />
              <Label htmlFor="match" className="cursor-pointer">Partido</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label>Equipo *</Label>
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona equipo" />
            </SelectTrigger>
            <SelectContent>
              {TEAMS.map(team => (
                <SelectItem key={team.id} value={team.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: team.color }}
                    />
                    {team.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Título *</Label>
          <Input
            id="title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={type === 'match' ? 'Ej: vs Club Rival' : 'Ej: Entrenamiento semanal'}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">Fecha *</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Hora *</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Ubicación *</Label>
          <Input
            id="location"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Pabellón, dirección..."
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
          />
        </div>

        {teamId && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Convocar jugadoras ({invitedPlayers.length})</Label>
              {teamPlayers.length > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={selectAllTeam}>
                  Seleccionar equipo
                </Button>
              )}
            </div>
            <Tabs value={playerTab} onValueChange={setPlayerTab}>
              <TabsList className="w-full">
                <TabsTrigger value="team" className="flex-1">
                  {selectedTeam?.name} ({teamPlayers.length})
                </TabsTrigger>
                <TabsTrigger value="other" className="flex-1">
                  Otras ({otherPlayers.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="team" className="mt-3 space-y-2">
                {teamPlayers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    No hay jugadoras en este equipo
                  </p>
                ) : (
                  teamPlayers.map(player => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      selectable
                      selected={invitedPlayers.includes(player.id)}
                      onSelect={togglePlayer}
                      showTeams={false}
                    />
                  ))
                )}
              </TabsContent>
              <TabsContent value="other" className="mt-3 space-y-2">
                {otherPlayers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    No hay otras jugadoras
                  </p>
                ) : (
                  otherPlayers.map(player => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      selectable
                      selected={invitedPlayers.includes(player.id)}
                      onSelect={togglePlayer}
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        <Button type="submit" className="w-full">
          Crear Evento
        </Button>
      </form>
      <BottomNav />
    </div>
  );
}
