import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, subDays, differenceInDays } from 'date-fns';
import { es, enUS, it } from 'date-fns/locale';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  UserCheck, 
  UserX, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  Activity,
  Users,
  Zap,
} from 'lucide-react';

interface UserRegistration {
  id: string;
  user_id: string | null;
  email: string;
  name: string | null;
  profile_type: 'director' | 'coach';
  registered_at: string;
  last_activity_at: string | null;
}

interface RetentionMetricsProps {
  registrations: UserRegistration[];
}

export function RetentionMetrics({ registrations }: RetentionMetricsProps) {
  const { i18n } = useTranslation();

  const getLocale = () => {
    switch (i18n.language) {
      case 'es': return es;
      case 'it': return it;
      default: return enUS;
    }
  };

  const metrics = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);
    const fourteenDaysAgo = subDays(now, 14);
    const thirtyDaysAgo = subDays(now, 30);

    // Users active in the last 7 days
    const activeUsers = registrations.filter(r => {
      if (!r.last_activity_at) return false;
      return new Date(r.last_activity_at) >= sevenDaysAgo;
    });

    // Users inactive for more than 7 days
    const inactiveUsers = registrations.filter(r => {
      if (!r.last_activity_at) {
        // No activity recorded, check if registered more than 7 days ago
        return new Date(r.registered_at) < sevenDaysAgo;
      }
      return new Date(r.last_activity_at) < sevenDaysAgo;
    });

    // At-risk users: inactive for 7-14 days
    const atRiskUsers = registrations.filter(r => {
      const lastActivity = r.last_activity_at 
        ? new Date(r.last_activity_at) 
        : new Date(r.registered_at);
      return lastActivity < sevenDaysAgo && lastActivity >= fourteenDaysAgo;
    });

    // Churned users: inactive for more than 14 days
    const churnedUsers = registrations.filter(r => {
      const lastActivity = r.last_activity_at 
        ? new Date(r.last_activity_at) 
        : new Date(r.registered_at);
      return lastActivity < fourteenDaysAgo;
    });

    // New users (registered in the last 7 days)
    const newUsers = registrations.filter(r => 
      new Date(r.registered_at) >= sevenDaysAgo
    );

    // Engagement rate: users with activity / total users
    const usersWithActivity = registrations.filter(r => r.last_activity_at !== null);
    const engagementRate = registrations.length > 0 
      ? (usersWithActivity.length / registrations.length) * 100 
      : 0;

    // Retention rate: active users / users registered more than 7 days ago
    const oldUsers = registrations.filter(r => new Date(r.registered_at) < sevenDaysAgo);
    const retentionRate = oldUsers.length > 0
      ? (activeUsers.filter(a => oldUsers.some(o => o.id === a.id)).length / oldUsers.length) * 100
      : 100;

    // Weekly retention cohort
    const weeklyRetention = [];
    for (let i = 1; i <= 4; i++) {
      const weekStart = subDays(now, i * 7);
      const weekEnd = subDays(now, (i - 1) * 7);
      const weekUsers = registrations.filter(r => {
        const regDate = new Date(r.registered_at);
        return regDate >= weekStart && regDate < weekEnd;
      });
      const retainedUsers = weekUsers.filter(u => {
        if (!u.last_activity_at) return false;
        return new Date(u.last_activity_at) >= sevenDaysAgo;
      });
      weeklyRetention.push({
        week: `Sem -${i}`,
        total: weekUsers.length,
        retained: retainedUsers.length,
        rate: weekUsers.length > 0 ? (retainedUsers.length / weekUsers.length) * 100 : 0,
      });
    }

    return {
      total: registrations.length,
      activeCount: activeUsers.length,
      inactiveCount: inactiveUsers.length,
      atRiskCount: atRiskUsers.length,
      churnedCount: churnedUsers.length,
      newCount: newUsers.length,
      engagementRate,
      retentionRate,
      weeklyRetention,
      atRiskUsers: atRiskUsers.slice(0, 5), // Top 5 at-risk users
      churnedUsers: churnedUsers.slice(0, 5), // Top 5 churned users
    };
  }, [registrations]);

  const statusData = [
    { name: 'Activos', value: metrics.activeCount, color: 'hsl(142, 76%, 36%)' },
    { name: 'En riesgo', value: metrics.atRiskCount, color: 'hsl(38, 92%, 50%)' },
    { name: 'Inactivos', value: metrics.churnedCount, color: 'hsl(0, 84%, 60%)' },
  ];

  return (
    <div className="space-y-4">
      {/* Main Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Activos (7d)</span>
            </div>
            <p className="text-2xl font-bold">{metrics.activeCount}</p>
            <p className="text-xs text-muted-foreground">
              de {metrics.total} usuarios
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span className="text-sm text-muted-foreground">En riesgo</span>
            </div>
            <p className="text-2xl font-bold">{metrics.atRiskCount}</p>
            <p className="text-xs text-muted-foreground">
              7-14 días sin actividad
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Engagement</span>
            </div>
            <p className="text-2xl font-bold">{metrics.engagementRate.toFixed(0)}%</p>
            <Progress value={metrics.engagementRate} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Retención</span>
            </div>
            <p className="text-2xl font-bold">{metrics.retentionRate.toFixed(0)}%</p>
            <Progress value={metrics.retentionRate} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Distribution Chart + At-Risk Alerts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Distribución de Usuarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Usuarios en Riesgo
            </CardTitle>
            <CardDescription>
              Usuarios sin actividad reciente que necesitan atención
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.atRiskUsers.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Zap className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>¡Excelente! No hay usuarios en riesgo</p>
              </div>
            ) : (
              <div className="space-y-2">
                {metrics.atRiskUsers.map((user) => {
                  const daysSinceActivity = user.last_activity_at
                    ? differenceInDays(new Date(), new Date(user.last_activity_at))
                    : differenceInDays(new Date(), new Date(user.registered_at));
                  
                  return (
                    <div 
                      key={user.id} 
                      className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.name || user.email.split('@')[0]}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-amber-600 border-amber-600">
                        <Clock className="h-3 w-3 mr-1" />
                        {daysSinceActivity}d
                      </Badge>
                    </div>
                  );
                })}
                {metrics.atRiskCount > 5 && (
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    +{metrics.atRiskCount - 5} usuarios más en riesgo
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Retention Cohorts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Retención por Cohorte Semanal
          </CardTitle>
          <CardDescription>
            Usuarios que siguen activos según la semana de registro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            {metrics.weeklyRetention.map((cohort, i) => (
              <div 
                key={i} 
                className="text-center p-3 rounded-lg bg-muted/50"
              >
                <p className="text-xs text-muted-foreground mb-1">{cohort.week}</p>
                <p className="text-lg font-bold">
                  {cohort.rate.toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {cohort.retained}/{cohort.total}
                </p>
                <Progress 
                  value={cohort.rate} 
                  className="h-1 mt-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Churned Users Alert */}
      {metrics.churnedCount > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <UserX className="h-4 w-4" />
              Usuarios Perdidos ({metrics.churnedCount})
            </CardTitle>
            <CardDescription>
              Usuarios sin actividad por más de 14 días
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.churnedUsers.map((user) => {
                const daysSinceActivity = user.last_activity_at
                  ? differenceInDays(new Date(), new Date(user.last_activity_at))
                  : differenceInDays(new Date(), new Date(user.registered_at));
                
                return (
                  <div 
                    key={user.id} 
                    className="flex items-center justify-between p-2 rounded-lg bg-destructive/10 border border-destructive/20"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.name || user.email.split('@')[0]}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                    <Badge variant="destructive" className="shrink-0">
                      <Clock className="h-3 w-3 mr-1" />
                      {daysSinceActivity}d
                    </Badge>
                  </div>
                );
              })}
              {metrics.churnedCount > 5 && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  +{metrics.churnedCount - 5} usuarios más perdidos
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
