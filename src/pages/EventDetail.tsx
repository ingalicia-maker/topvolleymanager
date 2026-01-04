import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, MapPin, Clock, Users, Download, Check, X, Trophy, Dumbbell, Copy, Send, Bus, ArrowLeftRight } from 'lucide-react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { PlayerCard } from '@/components/PlayerCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
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

  const [editingStops, setEditingStops] = useState(false);
  const [playerStops, setPlayerStops] = useState<Record<string, string>>({});

  if (!event) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Evento no encontrado" showBack />
        <BottomNav />
      </div>
    );
  }

  const isDisplacement = event.type === 'displacement';
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

  const getPlayerName = (player: typeof players[0]) => {
    return [player.name, player.surname1].filter(Boolean).join(' ');
  };

  const generateMessage = () => {
    if (isDisplacement) {
      const stopsInfo = (event.stops || []).map(stop => {
        const playersAtStop = invitedPlayersList.filter(p => event.player_stops?.[p.id] === stop);
        const playerNames = playersAtStop.map(p => `  - ${getPlayerName(p)}`).join('\n');
        return `📍 *${stop}* (${playersAtStop.length})\n${playerNames || '  Ninguna'}`;
      }).join('\n\n');

      return `🚌 *${event.title}*\n📅 ${formatDate(event.date)}\n⏰ Salida: ${event.time}\n📍 Destino: ${event.destination}\n\n👥 *Total pasajeros: ${event.total_passengers}*\n\n*Paradas:*\n${stopsInfo}`;
    }

    const confirmedNames = confirmedPlayersList.map(p => `✅ ${getPlayerName(p)}`).join('\n');
    const pendingNames = pendingPlayersList.map(p => `⏳ ${getPlayerName(p)}`).join('\n');
    const declinedNames = declinedPlayersList.map(p => `❌ ${getPlayerName(p)}`).join('\n');
    
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
    const content = generateMessage().replace(/\*/g, '').replace(/📍|📅|⏰|👥|🚌|✅|⏳|❌/g, '');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/\s+/g, '_')}_${event.date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Lista descargada');
  };

  const assignPlayerToStop = async (playerId: string, stop: string) => {
    const newPlayerStops = { ...event.player_stops, [playerId]: stop };
    if (!stop) {
      delete newPlayerStops[playerId];
    }
    await updateEvent(event.id, { player_stops: newPlayerStops });
  };

  const togglePlayerReturn = async (playerId: string, returns: boolean) => {
    const newPlayerReturns = { ...(event.player_returns || {}), [playerId]: returns };
    await updateEvent(event.id, { player_returns: newPlayerReturns });
  };

  // Calculate passengers by stop for displacement events (only returning passengers)
  const getPassengersByStop = () => {
    const result: Record<string, { count: number; players: typeof players }> = {};
    const playerReturns = event.player_returns || {};
    
    (event.stops || []).forEach(stop => {
      const playersAtStop = invitedPlayersList.filter(p => 
        event.player_stops?.[p.id] === stop && playerReturns[p.id] !== false
      );
      result[stop] = { count: playersAtStop.length, players: playersAtStop };
    });

    // Also count unassigned players (that return)
    const unassigned = invitedPlayersList.filter(p => 
      !event.player_stops?.[p.id] && playerReturns[p.id] !== false
    );
    if (unassigned.length > 0) {
      result['Sin asignar'] = { count: unassigned.length, players: unassigned };
    }

    return result;
  };

  // Players not returning
  const playersNotReturning = invitedPlayersList.filter(p => 
    (event.player_returns || {})[p.id] === false
  );

  const passengersByStop = isDisplacement ? getPassengersByStop() : {};
  const returningPlayersCount = invitedPlayersList.length - playersNotReturning.length;

  const getEventIcon = () => {
    switch (event.type) {
      case 'match': return <Trophy className="h-5 w-5 text-amber-500" />;
      case 'displacement': return <Bus className="h-5 w-5 text-blue-500" />;
      default: return <Dumbbell className="h-5 w-5 text-primary" />;
    }
  };

  const getEventBadge = () => {
    switch (event.type) {
      case 'match': return { variant: 'default' as const, label: 'Partido' };
      case 'displacement': return { variant: 'outline' as const, label: 'Desplazamiento' };
      default: return { variant: 'secondary' as const, label: 'Entrenamiento' };
    }
  };

  const badge = getEventBadge();

  const PlayerWithActions = ({ player, status }: { player: typeof players[0]; status: 'confirmed' | 'declined' | 'pending' }) => (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <PlayerCard player={player} showTeams={false} clickable={false} />
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
            {getEventIcon()}
            <Badge variant={badge.variant}>
              {badge.label}
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
              {isDisplacement ? `Salida: ${event.time}` : event.time}
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {isDisplacement ? event.destination : event.location}
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <Users className="h-4 w-4 text-muted-foreground" />
              {isDisplacement ? (
                <>
                  <span className="text-blue-600 font-medium">{event.total_passengers}</span>
                  <span className="text-muted-foreground">pasajeros totales</span>
                </>
              ) : (
                <>
                  <span className="text-green-600 font-medium">{confirmedPlayersList.length}</span>
                  <span className="text-muted-foreground">/ {invitedPlayersList.length} convocadas</span>
                </>
              )}
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

        {/* Displacement-specific: Passengers by Stop Table */}
        {isDisplacement && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bus className="h-4 w-4" />
                Pasajeros por parada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parada</TableHead>
                    <TableHead className="text-right">Pasajeros</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(passengersByStop).map(([stop, data]) => (
                    <TableRow key={stop} className={stop === 'Sin asignar' ? 'text-amber-600' : ''}>
                      <TableCell className="font-medium">{stop}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={stop === 'Sin asignar' ? 'secondary' : 'default'}>
                          {data.count}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>Total jugadoras</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="default">{invitedPlayersList.length}</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-bold bg-primary/10">
                    <TableCell>TOTAL PASAJEROS</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="default" className="text-lg px-3">
                        {event.total_passengers}
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Displacement: Players by Stop */}
        {isDisplacement ? (
          <div className="space-y-4">
            {(event.stops || []).map(stop => {
              const playersAtStop = invitedPlayersList.filter(p => event.player_stops?.[p.id] === stop);
              return (
                <Card key={stop}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {stop}
                      </span>
                      <Badge>{playersAtStop.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {playersAtStop.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        Ninguna jugadora asignada
                      </p>
                    ) : (
                      playersAtStop.map(player => {
                        const returns = (event.player_returns || {})[player.id] !== false;
                        return (
                          <div key={player.id} className="flex items-center gap-2">
                            <div className="flex-1">
                              <PlayerCard player={player} showTeams={false} clickable={false} />
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                className="text-xs border rounded px-2 py-1 bg-background"
                                value={event.player_stops?.[player.id] || ''}
                                onChange={(e) => assignPlayerToStop(player.id, e.target.value)}
                              >
                                <option value="">Sin asignar</option>
                                {(event.stops || []).map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                              <div className="flex items-center gap-1">
                                <Switch
                                  checked={!returns}
                                  onCheckedChange={(checked) => togglePlayerReturn(player.id, !checked)}
                                />
                                <span className={`text-[10px] whitespace-nowrap ${!returns ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                                  {!returns ? 'No vuelve' : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/* Unassigned players */}
            {passengersByStop['Sin asignar'] && passengersByStop['Sin asignar'].count > 0 && (
              <Card className="border-amber-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between text-amber-600">
                    <span>⚠️ Sin parada asignada</span>
                    <Badge variant="secondary">{passengersByStop['Sin asignar'].count}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {passengersByStop['Sin asignar'].players.map(player => {
                    const returns = (event.player_returns || {})[player.id] !== false;
                    return (
                      <div key={player.id} className="flex items-center gap-2">
                        <div className="flex-1">
                          <PlayerCard player={player} showTeams={false} clickable={false} />
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            className="text-xs border rounded px-2 py-1 bg-background"
                            value=""
                            onChange={(e) => assignPlayerToStop(player.id, e.target.value)}
                          >
                            <option value="">Sin asignar</option>
                            {(event.stops || []).map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <div className="flex items-center gap-1">
                            <Switch
                              checked={!returns}
                              onCheckedChange={(checked) => togglePlayerReturn(player.id, !checked)}
                            />
                            <span className={`text-[10px] whitespace-nowrap ${!returns ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                              {!returns ? 'No vuelve' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Players not returning */}
            {playersNotReturning.length > 0 && (
              <Card className="border-amber-500/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between text-amber-600">
                    <span className="flex items-center gap-2">
                      <ArrowLeftRight className="h-4 w-4" />
                      No vuelven en bus
                    </span>
                    <Badge variant="secondary">{playersNotReturning.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {playersNotReturning.map(player => (
                    <div key={player.id} className="flex items-center gap-2">
                      <div className="flex-1">
                        <PlayerCard player={player} showTeams={false} clickable={false} />
                      </div>
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={true}
                          onCheckedChange={(checked) => togglePlayerReturn(player.id, !checked)}
                        />
                        <span className="text-[10px] text-amber-600 font-medium whitespace-nowrap">
                          No vuelve
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* Standard Event: Players Tabs */
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
        )}
      </div>
      <BottomNav />
    </div>
  );
}
