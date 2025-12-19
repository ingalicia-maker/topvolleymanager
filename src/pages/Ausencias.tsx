import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Filter, X, AlertTriangle, History } from 'lucide-react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { TEAMS } from '@/types/volleyball';
import { usePlayers } from '@/hooks/usePlayers';
import { useAusencias } from '@/hooks/useAusencias';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export default function Ausencias() {
  const { players } = usePlayers();
  const { ausencias, addAusencia, updateAusencia, deleteAusencia } = useAusencias();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [teamFilter, setTeamFilter] = useState<string[]>([]);
  const [reasonInputs, setReasonInputs] = useState<Record<string, string>>({});

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const formattedDate = format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: es });

  const filteredPlayers = players.filter(p =>
    teamFilter.length === 0 || p.teams.some(t => teamFilter.includes(t))
  );

  const ausenciasForDate = ausencias.filter(a => a.date === dateStr);
  const absentPlayerIds = ausenciasForDate.map(a => a.player_id);

  const toggleAusencia = async (playerId: string) => {
    const existing = ausencias.find(a => a.player_id === playerId && a.date === dateStr);
    if (existing) {
      await deleteAusencia(existing.id);
    } else {
      const reason = reasonInputs[playerId]?.trim();
      await addAusencia({
        player_id: playerId,
        date: dateStr,
        reason: reason || null,
        created_by: user?.id || null,
      });
      setReasonInputs(prev => ({ ...prev, [playerId]: '' }));
    }
  };

  const handleUpdateReason = async (ausenciaId: string, reason: string) => {
    await updateAusencia(ausenciaId, { reason: reason.trim() || null });
  };

  // Group ausencias by date for history
  const ausenciasByDate = ausencias.reduce((acc, a) => {
    if (!acc[a.date]) acc[a.date] = [];
    acc[a.date].push(a);
    return acc;
  }, {} as Record<string, typeof ausencias>);

  const sortedDates = Object.keys(ausenciasByDate).sort((a, b) => b.localeCompare(a));

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player?.name || 'Jugadora desconocida';
  };

  const getPlayerTeams = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player?.teams || [];
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header
        title="Ausencias"
        rightAction={
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
                  onCheckedChange={() => setTeamFilter(prev =>
                    prev.includes(team.id) ? prev.filter(t => t !== team.id) : [...prev, team.id]
                  )}
                >
                  <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: team.color }} />
                  {team.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="p-4">
        <Tabs defaultValue="registrar" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="registrar" className="flex-1 gap-1">
              <AlertTriangle className="h-3 w-3" />
              Registrar
            </TabsTrigger>
            <TabsTrigger value="historial" className="flex-1 gap-1">
              <History className="h-3 w-3" />
              Historial
            </TabsTrigger>
          </TabsList>

          <TabsContent value="registrar" className="mt-4 space-y-4">
            {/* Date Picker */}
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formattedDate}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
              >
                Hoy
              </Button>
            </div>

            {/* Summary */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {filteredPlayers.length} jugadoras
              </span>
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {ausenciasForDate.length} ausencias
              </Badge>
            </div>

            {/* Player List */}
            <div className="space-y-2">
              {filteredPlayers.map(player => {
                const ausencia = ausenciasForDate.find(a => a.player_id === player.id);
                const isAbsent = !!ausencia;
                const playerTeams = TEAMS.filter(t => player.teams.includes(t.id));

                return (
                  <Card
                    key={player.id}
                    className={cn(
                      "transition-all",
                      isAbsent && "border-amber-500/50 bg-amber-500/5"
                    )}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{player.name}</span>
                            {player.number && (
                              <span className="text-xs text-primary">#{player.number}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {playerTeams.map(team => (
                              <Badge
                                key={team.id}
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0"
                                style={{ backgroundColor: `${team.color}20`, color: team.color }}
                              >
                                {team.name}
                              </Badge>
                            ))}
                          </div>

                          {isAbsent ? (
                            <div className="mt-2 flex items-center gap-2">
                              <Input
                                placeholder="Motivo (opcional)..."
                                value={ausencia.reason || ''}
                                onChange={(e) => handleUpdateReason(ausencia.id, e.target.value)}
                                className="h-8 text-sm flex-1"
                              />
                            </div>
                          ) : (
                            <div className="mt-2">
                              <Input
                                placeholder="Motivo (opcional)..."
                                value={reasonInputs[player.id] || ''}
                                onChange={(e) => setReasonInputs(prev => ({
                                  ...prev,
                                  [player.id]: e.target.value
                                }))}
                                className="h-8 text-sm"
                              />
                            </div>
                          )}
                        </div>

                        <Button
                          variant={isAbsent ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => toggleAusencia(player.id)}
                          className="shrink-0"
                        >
                          {isAbsent ? (
                            <>
                              <X className="h-3 w-3 mr-1" />
                              Quitar
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Ausente
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="historial" className="mt-4 space-y-4">
            {sortedDates.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay ausencias registradas
              </p>
            ) : (
              sortedDates.map(date => {
                const dateAusencias = ausenciasByDate[date];
                const dateFormatted = format(new Date(date), "EEEE, d 'de' MMMM yyyy", { locale: es });

                return (
                  <Card key={date}>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm mb-3 capitalize">{dateFormatted}</h3>
                      <div className="space-y-2">
                        {dateAusencias.map(ausencia => {
                          const playerTeams = getPlayerTeams(ausencia.player_id);
                          return (
                            <div
                              key={ausencia.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">
                                    {getPlayerName(ausencia.player_id)}
                                  </span>
                                  <div className="flex gap-1">
                                    {playerTeams.map(teamId => {
                                      const team = TEAMS.find(t => t.id === teamId);
                                      return team ? (
                                        <span
                                          key={teamId}
                                          className="w-2 h-2 rounded-full"
                                          style={{ backgroundColor: team.color }}
                                        />
                                      ) : null;
                                    })}
                                  </div>
                                </div>
                                {ausencia.reason && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {ausencia.reason}
                                  </p>
                                )}
                              </div>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600">
                                    <X className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar ausencia?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Se eliminará la ausencia de {getPlayerName(ausencia.player_id)}.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteAusencia(ausencia.id)}>
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </div>
  );
}