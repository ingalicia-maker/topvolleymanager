import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, CheckCircle, ChevronRight, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAusencias } from '@/hooks/useAusencias';
import { useTeams } from '@/hooks/useTeams';
import { usePlayers } from '@/hooks/usePlayers';
import { useUserRole } from '@/hooks/useUserRole';

export function MonthlyAbsenceSummary() {
  const { t } = useTranslation();
  const { ausencias } = useAusencias();
  const { teams } = useTeams();
  const { players } = usePlayers();
  const { isDirector, assignedTeams } = useUserRole();

  // Get current month key (YYYY-MM)
  const currentMonthKey = format(new Date(), 'yyyy-MM');
  const currentMonthName = format(new Date(), 'MMMM', { locale: es });

  // Filter teams based on role
  const visibleTeams = useMemo(() => 
    isDirector ? teams : teams.filter(t => assignedTeams.includes(t.id)),
    [isDirector, teams, assignedTeams]
  );

  // Get absences for current month for visible teams
  const monthlyStats = useMemo(() => {
    const visibleTeamIds = visibleTeams.map(t => t.id);
    
    const monthAbsences = ausencias.filter(a => 
      a.date.startsWith(currentMonthKey) && 
      visibleTeamIds.includes(a.team_id)
    );

    const justified = monthAbsences.filter(a => a.absence_type === 'justified').length;
    const unjustified = monthAbsences.filter(a => a.absence_type === 'unjustified').length;
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

    return {
      total,
      justified,
      unjustified,
      playersWithAbsences,
      totalPlayers,
      attendanceRate,
    };
  }, [ausencias, visibleTeams, currentMonthKey, players]);

  if (visibleTeams.length === 0) return null;

  return (
    <Link to="/ausencias">
      <Card className="shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="p-4">
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

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-lg font-bold text-foreground">{monthlyStats.total}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
            <div className="bg-amber-500/10 rounded-lg p-2">
              <div className="flex items-center justify-center gap-1">
                <CheckCircle className="h-3 w-3 text-amber-600" />
                <p className="text-lg font-bold text-amber-600">{monthlyStats.justified}</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Justificadas</p>
            </div>
            <div className="bg-destructive/10 rounded-lg p-2">
              <div className="flex items-center justify-center gap-1">
                <AlertTriangle className="h-3 w-3 text-destructive" />
                <p className="text-lg font-bold text-destructive">{monthlyStats.unjustified}</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Sin justificar</p>
            </div>
          </div>

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
    </Link>
  );
}
