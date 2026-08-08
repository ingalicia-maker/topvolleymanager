import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { getDateFnsLocale } from '@/lib/dateLocale';
import { AlertTriangle, CheckCircle, ChevronRight, Users, X, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAusencias } from '@/hooks/useAusencias';
import { useTeams } from '@/hooks/useTeams';
import { usePlayers } from '@/hooks/usePlayers';
import { useUserRole } from '@/hooks/useUserRole';

export function MonthlyAbsenceSummary() {
  const { t, i18n } = useTranslation();
  const { ausencias } = useAusencias();
  const { teams } = useTeams();
  const { players } = usePlayers();
  const { isDirector, assignedTeams } = useUserRole();
  const [expandedType, setExpandedType] = useState<'justified' | 'unjustified' | null>(null);

  // Get current month key (YYYY-MM)
  const currentMonthKey = format(new Date(), 'yyyy-MM');
  const currentMonthName = format(new Date(), 'MMMM', { locale: getDateFnsLocale(i18n.language) });

  // Filter teams based on role
  const visibleTeams = useMemo(() => 
    isDirector ? teams : teams.filter(t => assignedTeams.includes(t.id)),
    [isDirector, teams, assignedTeams]
  );

  // Get absences for current month for visible teams with player info
  const monthlyStats = useMemo(() => {
    const visibleTeamIds = visibleTeams.map(t => t.id);
    
    const monthAbsences = ausencias.filter(a => 
      a.date.startsWith(currentMonthKey) && 
      visibleTeamIds.includes(a.team_id)
    );

    const justifiedAbsences = monthAbsences.filter(a => a.absence_type === 'justified');
    const unjustifiedAbsences = monthAbsences.filter(a => a.absence_type === 'unjustified');
    const total = monthAbsences.length;

    // Get unique players with absences
    const playersWithAbsences = new Set(monthAbsences.map(a => a.player_id)).size;

    // Get total players in visible teams
    const totalPlayers = players.filter(p => 
      p.teams?.some(tid => visibleTeamIds.includes(tid))
    ).length;

    // Calculate attendance rate
    const today = new Date();
    const daysThisMonth = today.getDate();
    const expectedAttendances = totalPlayers * daysThisMonth;
    const attendanceRate = expectedAttendances > 0 
      ? Math.round(((expectedAttendances - total) / expectedAttendances) * 100) 
      : 100;

    // Group justified absences by player
    const justifiedByPlayer: Record<string, { player: typeof players[0] | undefined, count: number }> = {};
    justifiedAbsences.forEach(a => {
      if (!justifiedByPlayer[a.player_id]) {
        justifiedByPlayer[a.player_id] = { player: players.find(p => p.id === a.player_id), count: 0 };
      }
      justifiedByPlayer[a.player_id].count++;
    });

    // Group unjustified absences by player
    const unjustifiedByPlayer: Record<string, { player: typeof players[0] | undefined, count: number }> = {};
    unjustifiedAbsences.forEach(a => {
      if (!unjustifiedByPlayer[a.player_id]) {
        unjustifiedByPlayer[a.player_id] = { player: players.find(p => p.id === a.player_id), count: 0 };
      }
      unjustifiedByPlayer[a.player_id].count++;
    });

    return {
      total,
      justified: justifiedAbsences.length,
      unjustified: unjustifiedAbsences.length,
      playersWithAbsences,
      totalPlayers,
      attendanceRate,
      justifiedList: Object.values(justifiedByPlayer).sort((a, b) => b.count - a.count),
      unjustifiedList: Object.values(unjustifiedByPlayer).sort((a, b) => b.count - a.count),
    };
  }, [ausencias, visibleTeams, currentMonthKey, players]);

  if (visibleTeams.length === 0) return null;

  const handleToggle = (type: 'justified' | 'unjustified') => {
    setExpandedType(prev => prev === type ? null : type);
  };

  return (
    <Card className="shadow-lg">
      <CardContent className="p-4">
        <Link to="/ausencias" className="block">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground capitalize">
                  {t('absences.title')} - {currentMonthName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {visibleTeams.length} {visibleTeams.length === 1 ? 'equipo' : 'equipos'}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-lg font-bold text-foreground">{monthlyStats.total}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('justified')}
            className={`bg-amber-500/10 rounded-lg p-2 transition-all ${expandedType === 'justified' ? 'ring-2 ring-amber-500' : ''}`}
          >
            <div className="flex items-center justify-center gap-1">
              <CheckCircle className="h-3 w-3 text-amber-600" />
              <p className="text-lg font-bold text-amber-600">{monthlyStats.justified}</p>
            </div>
            <p className="text-[10px] text-muted-foreground">Justificadas</p>
          </button>
          <button
            type="button"
            onClick={() => handleToggle('unjustified')}
            className={`bg-destructive/10 rounded-lg p-2 transition-all ${expandedType === 'unjustified' ? 'ring-2 ring-destructive' : ''}`}
          >
            <div className="flex items-center justify-center gap-1">
              <X className="h-3 w-3 text-destructive" />
              <p className="text-lg font-bold text-destructive">{monthlyStats.unjustified}</p>
            </div>
            <p className="text-[10px] text-muted-foreground">Sin justificar</p>
          </button>
        </div>

        {/* Expanded player list */}
        {expandedType && (
          <div className="mt-3 pt-3 border-t space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {expandedType === 'justified' ? 'Ausencias justificadas:' : 'Ausencias sin justificar:'}
            </p>
            {(expandedType === 'justified' ? monthlyStats.justifiedList : monthlyStats.unjustifiedList).map(({ player, count }) => (
              <div 
                key={player?.id || Math.random()} 
                className="flex items-center justify-between p-1.5 rounded bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{player?.name || 'Desconocida'}</span>
                </div>
                <Badge 
                  className={`text-[10px] h-5 ${expandedType === 'justified' ? 'bg-amber-500' : ''}`}
                  variant={expandedType === 'unjustified' ? 'destructive' : 'default'}
                >
                  {count}
                </Badge>
              </div>
            ))}
            {(expandedType === 'justified' ? monthlyStats.justifiedList : monthlyStats.unjustifiedList).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                No hay ausencias de este tipo
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{monthlyStats.playersWithAbsences} de {monthlyStats.totalPlayers} jugadoras con ausencias</span>
          </div>
          <Badge 
            variant={monthlyStats.attendanceRate >= 90 ? 'default' : monthlyStats.attendanceRate >= 75 ? 'secondary' : 'destructive'}
            className="text-[10px]"
          >
            {monthlyStats.attendanceRate}% asistencia
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}