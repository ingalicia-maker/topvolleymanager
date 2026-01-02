import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TEAMS } from '@/types/volleyball';
import { usePlayers } from '@/hooks/usePlayers';
import { usePlayerRatings, RATING_CATEGORIES } from '@/hooks/usePlayerRatings';
import { useUserRole } from '@/hooks/useUserRole';
import { PlayerProgressChart } from '@/components/PlayerProgressChart';
import { TeamProgressChart } from '@/components/TeamProgressChart';
import { RatingInput } from '@/components/RatingInput';
import { PlayerRatingsSummary } from '@/components/PlayerRatingsSummary';
import { PlayerRanking } from '@/components/PlayerRanking';
import { toast } from 'sonner';
import { Star, User, Calendar, ChevronRight, Check, TrendingUp, Users, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const RATING_EMOJIS: Record<string, string> = {
  effort_attitude: '💪',
  communication_cooperation: '🤝',
  technical_execution: '🏐',
  decision_making: '🧠',
  leadership_initiative: '⭐',
};

export default function Ratings() {
  const { players } = usePlayers();
  const { addRating, ratings, getMonthlyEvolution, getPlayerTrends, getPositiveAlerts } = usePlayerRatings();
  const { assignedTeams, isDirector } = useUserRole();

  const [activeTab, setActiveTab] = useState<'add' | 'players' | 'team'>('add');
  const [step, setStep] = useState<'select-team' | 'select-player' | 'rate'>('select-team');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [ratingsValues, setRatingsValues] = useState({
    effort_attitude: 5,
    communication_cooperation: 5,
    technical_execution: 5,
    decision_making: 5,
    leadership_initiative: 5,
  });
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [ratedPlayers, setRatedPlayers] = useState<string[]>([]);

  // Filter teams by assigned (unless director)
  const visibleTeams = useMemo(() => {
    if (isDirector) return TEAMS;
    if (assignedTeams.length === 0) return TEAMS;
    return TEAMS.filter(t => assignedTeams.includes(t.id));
  }, [isDirector, assignedTeams]);

  const team = TEAMS.find(t => t.id === selectedTeam);
  
  // Get players for selected team
  const teamPlayers = useMemo(() => {
    if (!selectedTeam) return [];
    return players.filter(p => p.teams.includes(selectedTeam));
  }, [selectedTeam, players]);

  const player = players.find(p => p.id === selectedPlayer);

  // Check if player already rated this month
  const isPlayerRatedThisMonth = (playerId: string, teamId: string) => {
    return ratings.some(r => 
      r.player_id === playerId && 
      r.team_id === teamId &&
      r.rating_date.startsWith(selectedMonth)
    );
  };

  const handleSelectTeam = (teamId: string) => {
    setSelectedTeam(teamId);
    setRatedPlayers([]);
    setStep('select-player');
  };

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
    setRatingsValues({
      effort_attitude: 5,
      communication_cooperation: 5,
      technical_execution: 5,
      decision_making: 5,
      leadership_initiative: 5,
    });
    setNotes('');
    setStep('rate');
  };

  const handleSaveRating = async () => {
    if (!selectedPlayer || !selectedTeam) return;

    setSaving(true);
    // Use the first day of the selected month for the rating date
    const ratingDate = `${selectedMonth}-15`;
    
    const success = await addRating({
      player_id: selectedPlayer,
      team_id: selectedTeam,
      ...ratingsValues,
      notes: notes.trim() || null,
      rating_date: ratingDate,
    });

    if (success) {
      toast.success('Puntuación guardada');
      setRatedPlayers(prev => [...prev, selectedPlayer]);
      setStep('select-player');
    }
    setSaving(false);
  };

  const formatMonthDisplay = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return format(date, 'MMMM yyyy', { locale: es });
  };

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const options: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push(format(date, 'yyyy-MM'));
    }
    return options;
  }, []);

  const nativeSelectClassName =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header
        title="Puntuaciones"
        showBack={activeTab === 'add' && step !== 'select-team'}
        onBack={() => {
          if (step === 'rate') setStep('select-player');
          else if (step === 'select-player') setStep('select-team');
        }}
      />

      <div className="p-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="add" className="flex-1 gap-1">
              <Plus className="h-4 w-4" />
              Añadir
            </TabsTrigger>
            <TabsTrigger value="players" className="flex-1 gap-1">
              <User className="h-4 w-4" />
              Jugadoras
            </TabsTrigger>
            <TabsTrigger value="team" className="flex-1 gap-1">
              <Users className="h-4 w-4" />
              Equipo
            </TabsTrigger>
          </TabsList>

          {/* ADD RATINGS TAB */}
          <TabsContent value="add">
            {step === 'select-team' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Mes de puntuación</Label>
                  <select
                    className={nativeSelectClassName}
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  >
                    {monthOptions.map(month => (
                      <option key={month} value={month}>
                        {formatMonthDisplay(month)}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="text-muted-foreground text-sm">
                  Selecciona un equipo para puntuar jugadoras
                </p>

                {visibleTeams.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-muted-foreground text-sm">No tienes equipos asignados</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {visibleTeams.map(t => {
                      const teamPlayerCount = players.filter(p => p.teams.includes(t.id)).length;
                      return (
                        <Card
                          key={t.id}
                          className="cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => handleSelectTeam(t.id)}
                        >
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-2 h-10 rounded-full"
                                style={{ backgroundColor: t.color }}
                              />
                              <div>
                                <p className="font-medium">{t.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {teamPlayerCount} jugadoras • {t.coach}
                                </p>
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

            {step === 'select-player' && team && (
              <div className="space-y-4">
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div
                      className="w-3 h-10 rounded-full"
                      style={{ backgroundColor: team.color }}
                    />
                    <div>
                      <p className="font-medium">{team.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatMonthDisplay(selectedMonth)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <p className="text-muted-foreground text-sm">
                  Selecciona una jugadora para puntuar
                </p>

                {teamPlayers.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <User className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-muted-foreground text-sm">No hay jugadoras en este equipo</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {teamPlayers.map(p => {
                      const isRated = ratedPlayers.includes(p.id) || isPlayerRatedThisMonth(p.id, team.id);
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
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <Check className="h-3 w-3 mr-1" />
                                Puntuada
                              </Badge>
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

            {step === 'rate' && player && team && (
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
                        {team.name} • {formatMonthDisplay(selectedMonth)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-500" />
                      Puntuación (1-10)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 py-2">
                    {RATING_CATEGORIES.map(cat => (
                      <RatingInput
                        key={cat.key}
                        label={cat.label}
                        emoji={RATING_EMOJIS[cat.key]}
                        value={ratingsValues[cat.key]}
                        onChange={(val) =>
                          setRatingsValues(prev => ({ ...prev, [cat.key]: val }))
                        }
                        min={1}
                        max={10}
                      />
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
          </TabsContent>

          {/* PLAYER PROGRESS TAB */}
          <TabsContent value="players">
            <PlayerProgressView
              players={players}
              visibleTeams={visibleTeams}
              ratings={ratings}
              getMonthlyEvolution={getMonthlyEvolution}
              getPlayerTrends={getPlayerTrends}
              getPositiveAlerts={getPositiveAlerts}
            />
          </TabsContent>

          {/* TEAM PROGRESS TAB */}
          <TabsContent value="team">
            <TeamProgressView
              players={players}
              visibleTeams={visibleTeams}
              ratings={ratings}
            />
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </div>
  );
}

// Player Progress View Component
function PlayerProgressView({
  players,
  visibleTeams,
  ratings,
  getMonthlyEvolution,
  getPlayerTrends,
  getPositiveAlerts,
}: {
  players: Array<{ id: string; name: string; number: number | null; teams: string[] }>;
  visibleTeams: typeof TEAMS;
  ratings: Array<any>;
  getMonthlyEvolution: (playerId: string, teamId?: string) => Array<any>;
  getPlayerTrends: (playerId: string, teamId?: string) => string[];
  getPositiveAlerts: (playerId: string, teamId?: string) => string[];
}) {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [rankingMonth, setRankingMonth] = useState(() => format(new Date(), 'yyyy-MM'));

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const options: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push(format(date, 'yyyy-MM'));
    }
    return options;
  }, []);

  const formatMonthDisplay = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return format(date, 'MMMM yyyy', { locale: es });
  };

  const nativeSelectClassName =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  const teamPlayers = useMemo(() => {
    if (!selectedTeam) return [];
    return players.filter(p => p.teams.includes(selectedTeam));
  }, [selectedTeam, players]);

  const player = players.find(p => p.id === selectedPlayer);
  const team = TEAMS.find(t => t.id === selectedTeam);

  const evolution = useMemo(() => {
    if (!selectedPlayer) return [];
    return getMonthlyEvolution(selectedPlayer, selectedTeam || undefined);
  }, [selectedPlayer, selectedTeam, getMonthlyEvolution]);

  const trends = useMemo(() => {
    if (!selectedPlayer) return [];
    return getPlayerTrends(selectedPlayer, selectedTeam || undefined);
  }, [selectedPlayer, selectedTeam, getPlayerTrends]);

  const alerts = useMemo(() => {
    if (!selectedPlayer) return [];
    return getPositiveAlerts(selectedPlayer, selectedTeam || undefined);
  }, [selectedPlayer, selectedTeam, getPositiveAlerts]);

  return (
    <div className="space-y-4">
      {/* Team and Month selectors */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Equipo</Label>
          <select
            className={nativeSelectClassName}
            value={selectedTeam || ''}
            onChange={(e) => {
              setSelectedTeam(e.target.value || null);
              setSelectedPlayer(null);
            }}
          >
            <option value="">Selecciona equipo</option>
            {visibleTeams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Mes ranking</Label>
          <select
            className={nativeSelectClassName}
            value={rankingMonth}
            onChange={(e) => setRankingMonth(e.target.value)}
          >
            {monthOptions.map(month => (
              <option key={month} value={month}>
                {formatMonthDisplay(month)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Monthly Ranking */}
      {selectedTeam && !selectedPlayer && (
        <PlayerRanking
          players={teamPlayers}
          ratings={ratings}
          teamId={selectedTeam}
          month={rankingMonth}
          onPlayerClick={setSelectedPlayer}
        />
      )}


      {selectedTeam && teamPlayers.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <User className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground text-sm">No hay jugadoras en este equipo</p>
          </CardContent>
        </Card>
      )}

      {/* Player detail view */}
      {selectedPlayer && player && (
        <div className="space-y-4">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedPlayer(null)}
            className="mb-2"
          >
            ← Volver a la lista
          </Button>

          {/* Player Info */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                {player.number ? (
                  <span className="font-bold text-primary text-lg">{player.number}</span>
                ) : (
                  <User className="h-6 w-6 text-primary" />
                )}
              </div>
              <div>
                <p className="font-semibold text-lg">{player.name}</p>
                <p className="text-sm text-muted-foreground">{team?.name}</p>
              </div>
            </CardContent>
          </Card>

          {/* Positive Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <Card key={i} className="bg-amber-500/10 border-amber-500/30">
                  <CardContent className="p-3 flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500 shrink-0" />
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">{alert}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Trends */}
          {trends.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Tendencias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {trends.map((trend, i) => (
                    <Badge key={i} variant="secondary">{trend}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Evolution Chart */}
          {evolution.length > 0 ? (
            <PlayerProgressChart data={evolution} />
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Calendar className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground text-sm">No hay puntuaciones registradas</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!selectedTeam && (
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground text-sm">Selecciona un equipo para ver jugadoras</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Team Progress View Component
function TeamProgressView({
  players,
  visibleTeams,
  ratings,
}: {
  players: Array<{ id: string; name: string; number: number | null; teams: string[] }>;
  visibleTeams: typeof TEAMS;
  ratings: Array<any>;
}) {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const nativeSelectClassName =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  const team = TEAMS.find(t => t.id === selectedTeam);

  // Calculate team monthly averages
  const teamEvolution = useMemo(() => {
    if (!selectedTeam) return [];
    
    const teamRatings = ratings.filter(r => r.team_id === selectedTeam);
    
    // Group by month
    const byMonth: Record<string, typeof teamRatings> = {};
    teamRatings.forEach(r => {
      const monthKey = r.rating_date.substring(0, 7);
      if (!byMonth[monthKey]) byMonth[monthKey] = [];
      byMonth[monthKey].push(r);
    });

    return Object.entries(byMonth)
      .map(([month, monthRatings]) => {
        const effort_attitude = monthRatings.reduce((acc, r) => acc + r.effort_attitude, 0) / monthRatings.length;
        const communication_cooperation = monthRatings.reduce((acc, r) => acc + r.communication_cooperation, 0) / monthRatings.length;
        const technical_execution = monthRatings.reduce((acc, r) => acc + r.technical_execution, 0) / monthRatings.length;
        const decision_making = monthRatings.reduce((acc, r) => acc + r.decision_making, 0) / monthRatings.length;
        const leadership_initiative = monthRatings.reduce((acc, r) => acc + r.leadership_initiative, 0) / monthRatings.length;
        const totalAvg = (effort_attitude + communication_cooperation + technical_execution + decision_making + leadership_initiative) / 5;
        
        return { 
          month, 
          effort_attitude,
          communication_cooperation,
          technical_execution,
          decision_making,
          leadership_initiative,
          totalAvg,
          count: monthRatings.length
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [selectedTeam, ratings]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Equipo</Label>
        <select
          className={nativeSelectClassName}
          value={selectedTeam || ''}
          onChange={(e) => setSelectedTeam(e.target.value || null)}
        >
          <option value="">Selecciona equipo</option>
          {visibleTeams.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {selectedTeam && team && (
        <div className="space-y-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div
                className="w-3 h-12 rounded-full"
                style={{ backgroundColor: team.color }}
              />
              <div>
                <p className="font-semibold text-lg">{team.name}</p>
                <p className="text-sm text-muted-foreground">{team.coach}</p>
              </div>
            </CardContent>
          </Card>

          {teamEvolution.length > 0 ? (
            <TeamProgressChart data={teamEvolution} teamColor={team.color} />
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Calendar className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground text-sm">No hay puntuaciones registradas para este equipo</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!selectedTeam && (
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground text-sm">Selecciona un equipo para ver su evolución</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
