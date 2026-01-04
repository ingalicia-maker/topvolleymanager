import { useParams } from 'react-router-dom';
import { Calendar, MapPin, Clock, Users, Download, Check, X, Trophy, Dumbbell, Copy, Send } from 'lucide-react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { PlayerCard } from '@/components/PlayerCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePlayers } from '@/hooks/usePlayers';
import { useTeams } from '@/hooks/useTeams';
import { useEvents } from '@/hooks/useEvents';
import { toast } from 'sonner';

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const { events, updateEvent } = useEvents();
  const { players } = usePlayers();
  const { teams } = useTeams();

  const event = events.find(e => e.id === eventId);
  const team = event ? teams.find(t => t.id === event.team_id) : null;

  if (!event) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Evento no encontrado" showBack />
        <BottomNav />
      </div>
    );
  }

  const invitedPlayersList = players.filter(p => event.invited_players?.includes(p.id));
  const confirmedPlayersList = players.filter(p => event.confirmed_players?.includes(p.id));
  const declinedPlayersList = players.filter(p => event.declined_players?.includes(p.id));
  const pendingPlayersList = invitedPlayersList.filter(
    p => !event.confirmed_players?.includes(p.id) && !event.declined_players?.includes(p.id)
  );

  const toggleConfirm = async (playerId: string) => {
    const isConfirmed = event.confirmed_players?.includes(playerId);
    const newConfirmed = isConfirmed
      ? event.confirmed_players.filter(id => id !== playerId)
      : [...(event.confirmed_players || []), playerId];
    const newDeclined = (event.declined_players || []).filter(id => id !== playerId);
    
    await updateEvent(event.id, {
      confirmed_players: newConfirmed,
      declined_players: newDeclined,
    });
  };

  const toggleDecline = async (playerId: string) => {
    const isDeclined = event.declined_players?.includes(playerId);
    const newDeclined = isDeclined
      ? event.declined_players.filter(id => id !== playerId)
      : [...(event.declined_players || []), playerId];
    const newConfirmed = (event.confirmed_players || []).filter(id => id !== playerId);
    
    await updateEvent(event.id, {
      confirmed_players: newConfirmed,
      declined_players: newDeclined,
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const generateMessage = () => {
    const confirmedNames = confirmedPlayersList.map(p => `✅ ${p.name}`).join('\n');
    const pendingNames = pendingPlayersList.map(p => `⏳ ${p.name}`).join('\n');
    const declinedNames = declinedPlayersList.map(p => `❌ ${p.name}`).join('\n');
    
    return `*${event.title}*\n📅 ${formatDate(event.date)}\n⏰ ${event.time}\n📍 ${event.location}\n\n*Confirmadas (${confirmedPlayersList.length}):*\n${confirmedNames || 'Ninguna'}\n\n*Pendientes (${pendingPlayersList.length}):*\n${pendingNames || 'Ninguna'}\n\n*No pueden (${declinedPlayersList.length}):*\n${declinedNames || 'Ninguna'}`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateMessage());
    toast.success('Lista copiada al portapapeles');
  };

  const shareWhatsApp = () => {
    const message = encodeURIComponent(generateMessage());
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const downloadList = () => {
    const content = `${event.title}\nFecha: ${formatDate(event.date)}\nHora: ${event.time}\nUbicación: ${event.location}\n\nConfirmadas (${confirmedPlayersList.length}):\n${confirmedPlayersList.map(p => `- ${p.name}`).join('\n') || 'Ninguna'}\n\nPendientes (${pendingPlayersList.length}):\n${pendingPlayersList.map(p => `- ${p.name}`).join('\n') || 'Ninguna'}\n\nNo pueden (${declinedPlayersList.length}):\n${declinedPlayersList.map(p => `- ${p.name}`).join('\n') || 'Ninguna'}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/\s+/g, '_')}_${event.date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Lista descargada');
  };

  const PlayerWithActions = ({ player, status }: { player: typeof players[0]; status: 'confirmed' | 'declined' | 'pending' }) => (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <PlayerCard player={player} showTeams={false} />
      </div>
      <div className="flex gap-1">
        <Button
          variant={status === 'confirmed' ? 'default' : 'outline'}
          size="icon"
          className={`h-8 w-8 ${status === 'confirmed' ? 'bg-green-600 hover:bg-green-700' : ''}`}
          onClick={() => toggleConfirm(player.id)}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          variant={status === 'declined' ? 'default' : 'outline'}
          size="icon"
          className={`h-8 w-8 ${status === 'declined' ? 'bg-red-600 hover:bg-red-700' : ''}`}
          onClick={() => toggleDecline(player.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title={event.title} showBack />
      
      <div className="p-4 space-y-4">
        {/* Event Info Card */}
        <div 
          className="rounded-xl p-4 space-y-3"
          style={{ backgroundColor: team ? `${team.color}10` : 'hsl(var(--muted))' }}
        >
          <div className="flex items-center gap-2">
            {event.type === 'match' ? (
              <Trophy className="h-5 w-5 text-amber-500" />
            ) : (
              <Dumbbell className="h-5 w-5 text-primary" />
            )}
            <Badge variant={event.type === 'match' ? 'default' : 'secondary'}>
              {event.type === 'match' ? 'Partido' : 'Entrenamiento'}
            </Badge>
            {team && (
              <Badge variant="outline" style={{ borderColor: team.color, color: team.color }}>
                {team.name}
              </Badge>
            )}
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-foreground">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {formatDate(event.date)}
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {event.time}
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {event.location}
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-green-600 font-medium">{confirmedPlayersList.length}</span>
              <span className="text-muted-foreground">/ {invitedPlayersList.length} convocadas</span>
            </div>
          </div>

          {event.notes && (
            <p className="text-sm text-muted-foreground border-t border-border/50 pt-3 mt-3">
              {event.notes}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button 
            className="flex-1 gap-1 bg-green-600 hover:bg-green-700 text-white" 
            onClick={shareWhatsApp}
          >
            <Send className="h-4 w-4" />
            <span className="text-xs">WhatsApp</span>
          </Button>
          <Button variant="outline" className="flex-1 gap-1" onClick={copyToClipboard}>
            <Copy className="h-4 w-4" />
            <span className="text-xs">Copiar</span>
          </Button>
          <Button variant="outline" className="flex-1 gap-1" onClick={downloadList}>
            <Download className="h-4 w-4" />
            <span className="text-xs">Descargar</span>
          </Button>
        </div>

        {/* Players Tabs */}
        <Tabs defaultValue="confirmed" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="confirmed" className="flex-1">
              ✅ {confirmedPlayersList.length}
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex-1">
              ⏳ {pendingPlayersList.length}
            </TabsTrigger>
            <TabsTrigger value="declined" className="flex-1">
              ❌ {declinedPlayersList.length}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="confirmed" className="mt-3 space-y-2">
            {confirmedPlayersList.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">
                Ninguna jugadora confirmada
              </p>
            ) : (
              confirmedPlayersList.map(player => (
                <PlayerWithActions key={player.id} player={player} status="confirmed" />
              ))
            )}
          </TabsContent>
          
          <TabsContent value="pending" className="mt-3 space-y-2">
            {pendingPlayersList.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">
                Todas las jugadoras han respondido
              </p>
            ) : (
              pendingPlayersList.map(player => (
                <PlayerWithActions key={player.id} player={player} status="pending" />
              ))
            )}
          </TabsContent>
          
          <TabsContent value="declined" className="mt-3 space-y-2">
            {declinedPlayersList.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">
                Ninguna jugadora ha declinado
              </p>
            ) : (
              declinedPlayersList.map(player => (
                <PlayerWithActions key={player.id} player={player} status="declined" />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </div>
  );
}
