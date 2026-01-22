import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, Users, Download, Trophy, Dumbbell, Copy, Send, Bus, ArrowLeftRight, CheckCircle, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { PlayerCard } from '@/components/PlayerCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { EditEventDialog } from '@/components/EditEventDialog';
import { usePlayers } from '@/hooks/usePlayers';
import { useTeams } from '@/hooks/useTeams';
import { useEvents, CoachSubmission } from '@/hooks/useEvents';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { events, updateEvent, deleteEvent, refetch } = useEvents();
  const { players } = usePlayers();
  const { teams } = useTeams();
  const { user } = useAuth();
  const { isDirector, profile } = useUserRole();

  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const event = events.find(e => e.id === eventId);
  const team = event ? teams.find(t => t.id === event.team_id) : null;

  // Local state for coach editing
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [localPlayerStops, setLocalPlayerStops] = useState<Record<string, string>>({});
  const [localPlayerReturns, setLocalPlayerReturns] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Get coach's teams
  const coachTeams = profile?.assigned_teams || [];
  const eventTeams = event?.selected_teams || [];
  const myTeamsInEvent = eventTeams.filter(t => coachTeams.includes(t) || isDirector);

  // Initialize local state when event loads
  useEffect(() => {
    if (event && event.type === 'displacement') {
      // Get players already added by this coach's teams
      const myTeamPlayers = players.filter(p => 
        p.teams?.some(t => myTeamsInEvent.includes(t)) && 
        event.invited_players?.includes(p.id)
      );
      setSelectedPlayers(myTeamPlayers.map(p => p.id));
      
      // Initialize stops and returns
      const stops: Record<string, string> = {};
      const returns: Record<string, boolean> = {};
      myTeamPlayers.forEach(p => {
        if (event.player_stops?.[p.id]) {
          stops[p.id] = event.player_stops[p.id];
        }
        if (event.player_returns?.[p.id] !== undefined) {
          returns[p.id] = event.player_returns[p.id];
        }
      });
      setLocalPlayerStops(stops);
      setLocalPlayerReturns(returns);
    }
  }, [event?.id, event?.invited_players, myTeamsInEvent.join(',')]);

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

  // For displacement: check submission status
  const coachSubmissions = event.coach_submissions || {};
  const allTeamsSubmitted = eventTeams.every(t => coachSubmissions[t]?.submitted);
  const pendingTeams = eventTeams.filter(t => !coachSubmissions[t]?.submitted);

  // Players available for selection (from coach's teams in this event)
  const availablePlayersForCoach = players.filter(p => 
    p.teams?.some(t => myTeamsInEvent.includes(t))
  );

  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) {
        // Remove player
        setLocalPlayerStops(stops => {
          const { [playerId]: _, ...rest } = stops;
          return rest;
        });
        setLocalPlayerReturns(returns => {
          const { [playerId]: _, ...rest } = returns;
          return rest;
        });
        return prev.filter(id => id !== playerId);
      } else {
        return [...prev, playerId];
      }
    });
    setHasChanges(true);
  };

  const setPlayerStop = (playerId: string, stop: string) => {
    setLocalPlayerStops(prev => ({
      ...prev,
      [playerId]: stop,
    }));
    setHasChanges(true);
  };

  const setPlayerReturn = (playerId: string, returns: boolean) => {
    setLocalPlayerReturns(prev => ({
      ...prev,
      [playerId]: returns,
    }));
    setHasChanges(true);
  };

  const handleSaveAndSubmit = async (submit: boolean) => {
    if (!user || myTeamsInEvent.length === 0) return;
    
    setSaving(true);
    
    // Merge with existing data
    const newInvitedPlayers = new Set(event.invited_players || []);
    const newPlayerStops = { ...event.player_stops };
    const newPlayerReturns = { ...event.player_returns };
    
    // Remove old players from my teams
    const oldMyPlayers = players.filter(p => 
      p.teams?.some(t => myTeamsInEvent.includes(t)) && 
      event.invited_players?.includes(p.id)
    );
    oldMyPlayers.forEach(p => {
      newInvitedPlayers.delete(p.id);
      delete newPlayerStops[p.id];
      delete newPlayerReturns[p.id];
    });
    
    // Add new selected players
    selectedPlayers.forEach(pid => {
      newInvitedPlayers.add(pid);
      if (localPlayerStops[pid]) {
        newPlayerStops[pid] = localPlayerStops[pid];
      }
      if (localPlayerReturns[pid] !== undefined) {
        newPlayerReturns[pid] = localPlayerReturns[pid];
      }
    });
    
    // Calculate total passengers (players who return + coaches)
    const allPlayersArray = Array.from(newInvitedPlayers);
    const returningPlayers = allPlayersArray.filter(pid => newPlayerReturns[pid] !== false);
    const coachCount = event.total_passengers ? 
      event.total_passengers - (event.invited_players?.length || 0) + 
      (event.invited_players?.filter(pid => event.player_returns?.[pid] !== false).length || 0) : 1;
    const newTotalPassengers = returningPlayers.length + Math.max(0, coachCount);
    
    // Update coach submissions
    const newCoachSubmissions = { ...coachSubmissions };
    myTeamsInEvent.forEach(teamId => {
      newCoachSubmissions[teamId] = {
        coach_id: user.id,
        coach_name: profile?.name || 'Entrenador',
        submitted: submit,
        submitted_at: submit ? new Date().toISOString() : null,
      };
    });
    
    const success = await updateEvent(event.id, {
      invited_players: Array.from(newInvitedPlayers),
      player_stops: newPlayerStops,
      player_returns: newPlayerReturns,
      total_passengers: newTotalPassengers,
      coach_submissions: newCoachSubmissions,
    });
    
    if (success) {
      setHasChanges(false);
      toast.success(submit ? 'Lista enviada correctamente' : 'Cambios guardados');
      refetch();
    }
    setSaving(false);
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
        const playersAtStop = invitedPlayersList.filter(p => 
          event.player_stops?.[p.id] === stop && event.player_returns?.[p.id] !== false
        );
        const playerNames = playersAtStop.map(p => `  - ${getPlayerName(p)}`).join('\n');
        return `📍 *${stop}* (${playersAtStop.length})\n${playerNames || '  Ninguna'}`;
      }).join('\n\n');

      const notReturning = invitedPlayersList.filter(p => event.player_returns?.[p.id] === false);
      const notReturningInfo = notReturning.length > 0 
        ? `\n\n🚶 *No vuelven en bus:*\n${notReturning.map(p => `  - ${getPlayerName(p)}`).join('\n')}`
        : '';

      return `🚌 *${event.title}*\n📅 ${formatDate(event.date)}\n⏰ Salida: ${event.time}\n📍 Destino: ${event.destination}\n\n👥 *Total pasajeros (vuelta): ${event.total_passengers}*\n\n*Paradas:*\n${stopsInfo}${notReturningInfo}`;
    }

    // Simple list for training/match events
    const playerNames = invitedPlayersList.map(p => `  - ${getPlayerName(p)}`).join('\n');
    return `*${event.title}*\n📅 ${formatDate(event.date)}\n⏰ ${event.time}\n📍 ${event.location}\n\n*Convocadas (${invitedPlayersList.length}):*\n${playerNames || 'Ninguna'}`;
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
    const content = generateMessage().replace(/\*/g, '').replace(/📍|📅|⏰|👥|🚌|✅|⏳|❌|🚶/g, '');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/\s+/g, '_')}_${event.date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Lista descargada');
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


  // Check if coach has pending action on displacement
  const myTeamsNotSubmitted = myTeamsInEvent.filter(t => !coachSubmissions[t]?.submitted);
  const hasPendingAction = isDisplacement && !isDirector && myTeamsNotSubmitted.length > 0;

  const handleDeleteEvent = async () => {
    const success = await deleteEvent(event.id);
    if (success) {
      navigate('/events');
    }
  };

  const handleUpdateEvent = async (updates: Partial<typeof event>) => {
    return await updateEvent(event.id, updates);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title={event.title} showBack />
      
      <div className="p-4 space-y-4">
        {/* Edit and Delete buttons */}
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditDialogOpen(true)}
            className="gap-1"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-1">
                <Trash2 className="h-4 w-4" />
                Eliminar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar evento?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Se eliminará permanentemente este evento y toda su información.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        {/* Banner for coaches with pending action */}
        {hasPendingAction && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Acción requerida</p>
              <p className="text-sm text-amber-700">
                Debes añadir las jugadoras de tu equipo a este desplazamiento e indicar la parada donde suben.
              </p>
            </div>
          </div>
        )}
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
            {isDisplacement ? (
              eventTeams.map(t => {
                const tm = teams.find(x => x.id === t);
                return tm ? (
                  <Badge key={t} variant="outline" style={{ borderColor: tm.color, color: tm.color }}>
                    {tm.name}
                  </Badge>
                ) : null;
              })
            ) : team && (
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
            {/* Show opponent for matches */}
            {event.type === 'match' && event.opponent && (
              <div className="flex items-center gap-2 text-foreground">
                <Trophy className="h-4 w-4 text-muted-foreground" />
                <span>vs</span>
                <span className="font-medium">{event.opponent}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-foreground">
              <Users className="h-4 w-4 text-muted-foreground" />
              {isDisplacement ? (
                <>
                  <span className="text-blue-600 font-medium">{event.total_passengers || 0}</span>
                  <span className="text-muted-foreground">pasajeros (vuelta)</span>
                </>
              ) : (
                <>
                  <span className="text-green-600 font-medium">{invitedPlayersList.length}</span>
                  <span className="text-muted-foreground">convocadas</span>
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

        {/* Director view: Team submission status */}
        {isDisplacement && isDirector && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Estado de equipos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {eventTeams.map(teamId => {
                const tm = teams.find(t => t.id === teamId);
                const submission = coachSubmissions[teamId];
                const isSubmitted = submission?.submitted;
                const teamPlayerCount = invitedPlayersList.filter(p => p.teams?.includes(teamId)).length;
                
                return (
                  <div 
                    key={teamId} 
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isSubmitted ? 'border-green-500/50 bg-green-500/5' : 'border-amber-500/50 bg-amber-500/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tm?.color }}
                      />
                      <span className="font-medium">{tm?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSubmitted ? (
                        <>
                          <Badge variant="default" className="bg-green-600">
                            {teamPlayerCount} jugadoras
                          </Badge>
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </>
                      ) : (
                        <>
                          <Badge variant="secondary">Pendiente</Badge>
                          <AlertCircle className="h-5 w-5 text-amber-500" />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {allTeamsSubmitted ? (
                <p className="text-sm text-green-600 text-center py-2 font-medium">
                  ✅ Todos los equipos han enviado su lista
                </p>
              ) : (
                <p className="text-sm text-amber-600 text-center py-2">
                  ⏳ Faltan {pendingTeams.length} equipo(s) por enviar
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Coach view: Add players from my teams */}
        {isDisplacement && myTeamsInEvent.length > 0 && !isDirector && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Mis jugadoras para este desplazamiento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {myTeamsInEvent.map(teamId => {
                const tm = teams.find(t => t.id === teamId);
                const teamPlayersList = availablePlayersForCoach.filter(p => p.teams?.includes(teamId));
                const submission = coachSubmissions[teamId];
                
                return (
                  <div key={teamId} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tm?.color }}
                        />
                        <span className="font-medium">{tm?.name}</span>
                        {submission?.submitted && (
                          <Badge variant="default" className="bg-green-600 text-xs">
                            Enviado
                          </Badge>
                        )}
                      </div>
                      <Badge variant="secondary">
                        {selectedPlayers.filter(pid => teamPlayersList.some(p => p.id === pid)).length}/{teamPlayersList.length}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      {teamPlayersList.map(player => {
                        const isSelected = selectedPlayers.includes(player.id);
                        const playerReturn = localPlayerReturns[player.id] !== false;
                        
                        return (
                          <div key={player.id} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => togglePlayerSelection(player.id)}
                              />
                              <span className="font-medium flex-1">
                                {getPlayerName(player)}
                                {player.number && <span className="text-xs text-primary ml-1">#{player.number}</span>}
                              </span>
                            </div>
                            
                            {isSelected && (
                              <div className="ml-6 flex flex-wrap items-center gap-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground text-xs">Parada:</span>
                                  <select
                                    className="text-sm border rounded px-2 py-1 bg-background"
                                    value={localPlayerStops[player.id] || ''}
                                    onChange={(e) => setPlayerStop(player.id, e.target.value)}
                                  >
                                    <option value="">Sin asignar</option>
                                    {(event.stops || []).map(stop => (
                                      <option key={stop} value={stop}>{stop}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={!playerReturn}
                                    onCheckedChange={(checked) => setPlayerReturn(player.id, !checked)}
                                  />
                                  <span className={`text-xs ${!playerReturn ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                                    No vuelve en bus
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleSaveAndSubmit(false)}
                  disabled={saving}
                >
                  Guardar borrador
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleSaveAndSubmit(true)}
                  disabled={saving}
                >
                  {saving ? 'Enviando...' : 'Enviar lista'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
        {isDisplacement && invitedPlayersList.length > 0 && (
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
                  {playersNotReturning.length > 0 && (
                    <TableRow className="text-amber-600">
                      <TableCell className="font-medium">No vuelven en bus</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{playersNotReturning.length}</Badge>
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow className="font-bold bg-primary/10">
                    <TableCell>TOTAL PASAJEROS (VUELTA)</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="default" className="text-lg px-3">
                        {event.total_passengers || 0}
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Displacement: Players by Stop (view only) */}
        {isDisplacement && invitedPlayersList.length > 0 && (
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
                              <PlayerCard player={player} showTeams={true} clickable={false} />
                            </div>
                            {!returns && (
                              <Badge variant="secondary" className="text-amber-600 text-xs">
                                No vuelve
                              </Badge>
                            )}
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              );
            })}

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
                    <PlayerCard key={player.id} player={player} showTeams={true} clickable={false} />
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Standard Event: Simple player list (no confirmation needed) */}
        {!isDisplacement && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Jugadoras convocadas ({invitedPlayersList.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {invitedPlayersList.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">
                  No hay jugadoras convocadas
                </p>
              ) : (
                invitedPlayersList.map(player => (
                  <PlayerCard key={player.id} player={player} showTeams={true} clickable={false} />
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Event Dialog */}
      <EditEventDialog
        event={event}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleUpdateEvent}
      />

      <BottomNav />
    </div>
  );
}
