import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, X, AlertTriangle, History, BarChart3, CheckCircle } from 'lucide-react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { AbsenceChart } from '@/components/AbsenceChart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { usePlayers } from '@/hooks/usePlayers';
import { useTeams } from '@/hooks/useTeams';
import { useAusencias, AbsenceType } from '@/hooks/useAusencias';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';

export default function Ausencias() {
  const { players } = usePlayers();
  const { teams, loading: teamsLoading } = useTeams();
  const { ausencias, addAusencia, updateAusencia, deleteAusencia, isPlayerAbsent, getPlayerTeamAbsenceCount, getAbsencesByMonth } = useAusencias();
  const { user } = useAuth();
  const { isDirector, assignedTeams } = useUserRole();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'registrar' | 'historial' | 'estadisticas'>('registrar');
  const [reasonInputs, setReasonInputs] = useState<Record<string, string>>({});
  const [absenceTypeInputs, setAbsenceTypeInputs] = useState<Record<string, AbsenceType>>({});

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const formattedDate = format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: es });

  // Filter teams based on role - coaches only see their assigned teams
  const availableTeams = useMemo(() => 
    isDirector ? teams : teams.filter(t => assignedTeams.includes(t.id)),
    [isDirector, teams, assignedTeams]
  );

  // Set initial team when available teams are loaded
  useEffect(() => {
    if (availableTeams.length > 0 && (!selectedTeamId || !availableTeams.find(t => t.id === selectedTeamId))) {
      setSelectedTeamId(availableTeams[0].id);
    }
  }, [availableTeams, selectedTeamId]);

  const selectedTeam = availableTeams.find(t => t.id === selectedTeamId);

  // Players that belong to the selected team
  const teamPlayers = useMemo(() => 
    players.filter(p => p.teams?.includes(selectedTeamId)),
    [players, selectedTeamId]
  );

  // Absences for the selected team and date
  const ausenciasForTeamDate = useMemo(() => 
    ausencias.filter(a => a.team_id === selectedTeamId && a.date === dateStr),
    [ausencias, selectedTeamId, dateStr]
  );

  const toggleAusencia = async (playerId: string) => {
    const existing = isPlayerAbsent(playerId, selectedTeamId, dateStr);
    if (existing) {
      await deleteAusencia(existing.id);
    } else {
      const reason = reasonInputs[playerId]?.trim();
      const absenceType = absenceTypeInputs[playerId] || 'unjustified';
      await addAusencia({
        player_id: playerId,
        team_id: selectedTeamId,
        date: dateStr,
        reason: reason || null,
        absence_type: absenceType,
        created_by: user?.id || null,
      });
      setReasonInputs(prev => ({ ...prev, [playerId]: '' }));
      setAbsenceTypeInputs(prev => ({ ...prev, [playerId]: 'unjustified' }));
    }
  };

  const handleUpdateReason = async (ausenciaId: string, reason: string) => {
    await updateAusencia(ausenciaId, { reason: reason.trim() || null });
  };

  const handleUpdateAbsenceType = async (ausenciaId: string, absenceType: AbsenceType) => {
    await updateAusencia(ausenciaId, { absence_type: absenceType });
  };

  // Get absences grouped by month for history
  const absencesByMonth = useMemo(() => 
    getAbsencesByMonth(selectedTeamId),
    [ausencias, selectedTeamId]
  );

  const sortedMonths = Object.keys(absencesByMonth).sort((a, b) => b.localeCompare(a));

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player?.name || 'Jugadora desconocida';
  };

  // Statistics: total absences per player for this team
  const playerStats = useMemo(() => {
    return teamPlayers.map(player => {
      const playerAusencias = ausencias.filter(a => a.player_id === player.id && a.team_id === selectedTeamId);
      return {
        player,
        totalAbsences: playerAusencias.length,
        justified: playerAusencias.filter(a => a.absence_type === 'justified').length,
        unjustified: playerAusencias.filter(a => a.absence_type === 'unjustified').length,
      };
    }).sort((a, b) => b.totalAbsences - a.totalAbsences);
  }, [teamPlayers, ausencias, selectedTeamId]);

  const totalTeamAbsences = useMemo(() => 
    ausencias.filter(a => a.team_id === selectedTeamId).length,
    [ausencias, selectedTeamId]
  );

  const tabButtonClass = (tab: string) =>
    cn(
      "flex-1 inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      activeTab === tab
        ? "bg-background text-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground"
    );

  const nativeSelectClassName =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Ausencias" />

      <div className="p-4 space-y-4">
        {/* Team Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Equipo</label>
          <select
            className={nativeSelectClassName}
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
          >
            {availableTeams.map(team => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          {!isDirector && assignedTeams.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No tienes equipos asignados. Puedes asignarte equipos desde tu perfil.
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="w-full">
          <div className="inline-flex h-10 w-full items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
            <button
              type="button"
              className={tabButtonClass('registrar')}
              onClick={() => setActiveTab('registrar')}
            >
              <AlertTriangle className="h-3 w-3" />
              Registrar
            </button>
            <button
              type="button"
              className={tabButtonClass('historial')}
              onClick={() => setActiveTab('historial')}
            >
              <History className="h-3 w-3" />
              Historial
            </button>
            <button
              type="button"
              className={tabButtonClass('estadisticas')}
              onClick={() => setActiveTab('estadisticas')}
            >
              <BarChart3 className="h-3 w-3" />
              Totales
            </button>
          </div>

          {/* Registrar Tab */}
          {activeTab === 'registrar' && (
            <div className="mt-4 space-y-4">
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
                  {teamPlayers.length} jugadoras en {selectedTeam?.name}
                </span>
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {ausenciasForTeamDate.length} ausencias
                </Badge>
              </div>

              {/* Player List */}
              {teamPlayers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay jugadoras en este equipo
                </p>
              ) : (
                <div className="space-y-2">
                  {teamPlayers.map(player => {
                    const ausencia = ausenciasForTeamDate.find(a => a.player_id === player.id);
                    const isAbsent = !!ausencia;
                    const totalAbsences = getPlayerTeamAbsenceCount(player.id, selectedTeamId);

                    return (
                      <Card
                        key={player.id}
                        className={cn(
                          "transition-all",
                          isAbsent 
                            ? ausencia.absence_type === 'justified' 
                              ? "border-amber-500/50 bg-amber-500/5" 
                              : "border-destructive/50 bg-destructive/5" 
                            : "border-green-500/30 bg-green-500/5"
                        )}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                              isAbsent 
                                ? ausencia.absence_type === 'justified'
                                  ? "bg-amber-500/20"
                                  : "bg-destructive/20" 
                                : "bg-green-500/20"
                            )}>
                              {isAbsent ? (
                                ausencia.absence_type === 'justified' ? (
                                  <CheckCircle className="h-5 w-5 text-amber-600" />
                                ) : (
                                  <X className="h-5 w-5 text-destructive" />
                                )
                              ) : (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{player.name}</span>
                                {player.number && (
                                  <span className="text-xs text-primary">#{player.number}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={cn(
                                  "text-xs font-medium",
                                  isAbsent 
                                    ? ausencia.absence_type === 'justified'
                                      ? "text-amber-600"
                                      : "text-destructive" 
                                    : "text-green-600"
                                )}>
                                  {isAbsent 
                                    ? ausencia.absence_type === 'justified' 
                                      ? 'Ausente (Justificada)' 
                                      : 'Ausente (No justificada)' 
                                    : 'Presente'}
                                </span>
                                {totalAbsences > 0 && !isAbsent && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    {totalAbsences} ausencias
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {/* Absence type buttons or Present status */}
                            <div className="flex gap-1 shrink-0">
                              {isAbsent ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteAusencia(ausencia.id)}
                                  className="text-green-600 border-green-600/50 hover:bg-green-500/10"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Presente
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      addAusencia({
                                        player_id: player.id,
                                        team_id: selectedTeamId,
                                        date: dateStr,
                                        reason: null,
                                        absence_type: 'justified',
                                        created_by: user?.id || null,
                                      });
                                    }}
                                    className="text-amber-600 border-amber-600/50 hover:bg-amber-500/10 text-xs px-2"
                                  >
                                    Justificada
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                      addAusencia({
                                        player_id: player.id,
                                        team_id: selectedTeamId,
                                        date: dateStr,
                                        reason: null,
                                        absence_type: 'unjustified',
                                        created_by: user?.id || null,
                                      });
                                    }}
                                    className="text-xs px-2"
                                  >
                                    No justificada
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          {/* Show reason input if marked as absent */}
                          {isAbsent && (
                            <div className="mt-3 pt-3 border-t border-muted space-y-2">
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant={ausencia.absence_type === 'justified' ? 'default' : 'outline'}
                                  size="sm"
                                  className={cn(
                                    "h-7 text-xs flex-1",
                                    ausencia.absence_type === 'justified' && "bg-amber-500 hover:bg-amber-600"
                                  )}
                                  onClick={() => handleUpdateAbsenceType(ausencia.id, 'justified')}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Justificada
                                </Button>
                                <Button
                                  type="button"
                                  variant={ausencia.absence_type === 'unjustified' ? 'destructive' : 'outline'}
                                  size="sm"
                                  className="h-7 text-xs flex-1"
                                  onClick={() => handleUpdateAbsenceType(ausencia.id, 'unjustified')}
                                >
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  No justificada
                                </Button>
                              </div>
                              <Input
                                placeholder="Motivo (opcional)..."
                                value={ausencia.reason || ''}
                                onChange={(e) => handleUpdateReason(ausencia.id, e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Historial Tab */}
          {activeTab === 'historial' && (
            <div className="mt-4 space-y-4">
              {sortedMonths.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay ausencias registradas para {selectedTeam?.name}
                </p>
              ) : (
                sortedMonths.map(month => {
                  const monthAusencias = absencesByMonth[month];
                  const [year, monthNum] = month.split('-');
                  const monthDate = new Date(parseInt(year), parseInt(monthNum) - 1);
                  const monthFormatted = format(monthDate, "MMMM yyyy", { locale: es });

                  // Group by date within month
                  const byDate: Record<string, typeof monthAusencias> = {};
                  monthAusencias.forEach(a => {
                    if (!byDate[a.date]) byDate[a.date] = [];
                    byDate[a.date].push(a);
                  });
                  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

                  return (
                    <Card key={month}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold capitalize">{monthFormatted}</h3>
                          <Badge variant="secondary">{monthAusencias.length} ausencias</Badge>
                        </div>
                        <div className="space-y-3">
                          {sortedDates.map(date => {
                            const dateAusencias = byDate[date];
                            const dateFormatted = format(new Date(date), "EEEE d", { locale: es });

                            return (
                              <div key={date} className="border-l-2 border-muted pl-3">
                                <p className="text-xs text-muted-foreground capitalize mb-1">{dateFormatted}</p>
                                <div className="space-y-1">
                                  {dateAusencias.map(ausencia => (
                                    <div
                                      key={ausencia.id}
                                      className={cn(
                                        "flex items-center justify-between p-2 rounded-lg",
                                        ausencia.absence_type === 'justified' ? "bg-primary/10" : "bg-amber-500/10"
                                      )}
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-sm">
                                            {getPlayerName(ausencia.player_id)}
                                          </span>
                                          <Badge 
                                            variant={ausencia.absence_type === 'justified' ? 'default' : 'destructive'}
                                            className="text-[10px] h-4"
                                          >
                                            {ausencia.absence_type === 'justified' ? 'Justificada' : 'No justificada'}
                                          </Badge>
                                        </div>
                                        {ausencia.reason && (
                                          <p className="text-xs text-muted-foreground">
                                            {ausencia.reason}
                                          </p>
                                        )}
                                      </div>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
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
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* Estadísticas Tab */}
          {activeTab === 'estadisticas' && (
            <div className="mt-4 space-y-4">
              {/* Chart */}
              <AbsenceChart 
                ausencias={ausencias} 
                teamId={selectedTeamId} 
                teamName={selectedTeam?.name || ''} 
              />

              <Card>
                <CardContent className="p-4">
                  <div className="text-center mb-4">
                    <p className="text-3xl font-bold text-primary">{totalTeamAbsences}</p>
                    <p className="text-sm text-muted-foreground">
                      ausencias totales en {selectedTeam?.name}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {playerStats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay jugadoras en este equipo
                </p>
              ) : (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3">Ausencias por jugadora</h3>
                    <div className="space-y-2">
                      {playerStats.map(({ player, totalAbsences, justified, unjustified }) => (
                        <div
                          key={player.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{player.name}</span>
                            {player.number && (
                              <span className="text-xs text-primary">#{player.number}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {justified > 0 && (
                              <Badge variant="default" className="text-[10px]">
                                {justified} J
                              </Badge>
                            )}
                            {unjustified > 0 && (
                              <Badge variant="destructive" className="text-[10px]">
                                {unjustified} NJ
                              </Badge>
                            )}
                            <Badge
                              variant="secondary"
                              className="min-w-[40px] justify-center"
                            >
                              {totalAbsences}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
