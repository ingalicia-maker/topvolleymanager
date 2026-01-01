import { useState } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { TEAMS } from '@/types/volleyball';
import { usePlayers } from '@/hooks/usePlayers';
import { useEvents } from '@/hooks/useEvents';
import { usePlayerRatings } from '@/hooks/usePlayerRatings';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import { Star, User, Calendar, ChevronRight, ChevronLeft, Check } from 'lucide-react';

const RATING_CATEGORIES = [
  { key: 'effort_attitude', label: 'Esfuerzo y actitud', emoji: '💪' },
  { key: 'communication_cooperation', label: 'Comunicación y cooperación', emoji: '🤝' },
  { key: 'technical_execution', label: 'Ejecución técnica', emoji: '🏐' },
  { key: 'decision_making', label: 'Toma de decisiones', emoji: '🧠' },
  { key: 'leadership_initiative', label: 'Liderazgo e iniciativa', emoji: '⭐' },
] as const;

export default function Ratings() {
  const { players } = usePlayers();
  const { events } = useEvents();
  const { addRating } = usePlayerRatings();
  const { assignedTeams, isDirector } = useUserRole();

  const [step, setStep] = useState<'select-event' | 'select-player' | 'rate'>('select-event');
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [ratings, setRatings] = useState({
    effort_attitude: 3,
    communication_cooperation: 3,
    technical_execution: 3,
    decision_making: 3,
    leadership_initiative: 3,
  });
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [ratedPlayers, setRatedPlayers] = useState<string[]>([]);

  // Filter events by assigned teams (unless director)
  const visibleTeams = isDirector ? TEAMS.map(t => t.id) : assignedTeams;
  const today = new Date().toISOString().split('T')[0];
  
  const recentEvents = events
    .filter(e => e.date <= today && visibleTeams.includes(e.team_id))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  const event = events.find(e => e.id === selectedEvent);
  const eventTeam = event ? TEAMS.find(t => t.id === event.team_id) : null;
  
  // Get invited players for the event
  const eventPlayers = event
    ? players.filter(p => event.invited_players?.includes(p.id))
    : [];

  const player = players.find(p => p.id === selectedPlayer);

  const handleSelectEvent = (eventId: string) => {
    setSelectedEvent(eventId);
    setRatedPlayers([]);
    setStep('select-player');
  };

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
    setRatings({
      effort_attitude: 3,
      communication_cooperation: 3,
      technical_execution: 3,
      decision_making: 3,
      leadership_initiative: 3,
    });
    setNotes('');
    setStep('rate');
  };

  const handleSaveRating = async () => {
    if (!selectedPlayer || !selectedEvent || !event) return;

    setSaving(true);
    const success = await addRating({
      player_id: selectedPlayer,
      team_id: event.team_id,
      event_id: selectedEvent,
      ...ratings,
      notes: notes.trim() || null,
    });

    if (success) {
      toast.success('Puntuación guardada');
      setRatedPlayers(prev => [...prev, selectedPlayer]);
      setStep('select-player');
    }
    setSaving(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header
        title="Puntuaciones"
        showBack={step !== 'select-event'}
        onBack={() => {
          if (step === 'rate') setStep('select-player');
          else if (step === 'select-player') setStep('select-event');
        }}
      />

      <div className="p-4">
        {step === 'select-event' && (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Selecciona un evento para puntuar a las jugadoras
            </p>

            {recentEvents.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Calendar className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground text-sm">No hay eventos recientes</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {recentEvents.map(e => {
                  const team = TEAMS.find(t => t.id === e.team_id);
                  return (
                    <Card
                      key={e.id}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => handleSelectEvent(e.id)}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-2 h-10 rounded-full"
                            style={{ backgroundColor: team?.color }}
                          />
                          <div>
                            <p className="font-medium">{e.title}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{formatDate(e.date)}</span>
                              <Badge variant="outline" className="text-xs">
                                {team?.name}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === 'select-player' && event && (
          <div className="space-y-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-3">
                <p className="text-sm font-medium">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(event.date)} • {eventTeam?.name}
                </p>
              </CardContent>
            </Card>

            <p className="text-muted-foreground text-sm">
              Selecciona una jugadora para puntuar
            </p>

            {eventPlayers.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <User className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground text-sm">No hay jugadoras convocadas</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {eventPlayers.map(p => {
                  const isRated = ratedPlayers.includes(p.id);
                  const playerTeams = TEAMS.filter(t => p.teams.includes(t.id));

                  return (
                    <Card
                      key={p.id}
                      className={`cursor-pointer transition-colors ${isRated ? 'bg-green-500/10 border-green-500/30' : 'hover:bg-accent/50'}`}
                      onClick={() => !isRated && handleSelectPlayer(p.id)}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            {p.number ? (
                              <span className="font-bold text-primary">{p.number}</span>
                            ) : (
                              <User className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{p.name}</p>
                            <div className="flex gap-1">
                              {playerTeams.slice(0, 2).map(t => (
                                <div
                                  key={t.id}
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: t.color }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        {isRated ? (
                          <Check className="h-5 w-5 text-green-600" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === 'rate' && player && event && (
          <div className="space-y-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {player.number ? (
                    <span className="font-bold text-primary">{player.number}</span>
                  ) : (
                    <User className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{player.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.title} • {formatDate(event.date)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  Puntuación (1-5)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {RATING_CATEGORIES.map(cat => (
                  <div key={cat.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">
                        {cat.emoji} {cat.label}
                      </Label>
                      <Badge variant="secondary" className="font-bold">
                        {ratings[cat.key]}
                      </Badge>
                    </div>
                    <Slider
                      value={[ratings[cat.key]]}
                      onValueChange={([val]) =>
                        setRatings(prev => ({ ...prev, [cat.key]: val }))
                      }
                      min={1}
                      max={5}
                      step={1}
                      className="w-full"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Observaciones sobre el rendimiento..."
                rows={3}
              />
            </div>

            <Button onClick={handleSaveRating} disabled={saving} className="w-full">
              {saving ? 'Guardando...' : 'Guardar Puntuación'}
            </Button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
