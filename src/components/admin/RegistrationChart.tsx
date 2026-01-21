import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import { es, enUS, it } from 'date-fns/locale';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UserRegistration {
  id: string;
  registered_at: string;
  profile_type: 'director' | 'coach';
}

interface RegistrationChartProps {
  registrations: UserRegistration[];
}

export function RegistrationChart({ registrations }: RegistrationChartProps) {
  const { i18n } = useTranslation();

  const getLocale = () => {
    switch (i18n.language) {
      case 'es': return es;
      case 'it': return it;
      default: return enUS;
    }
  };

  // Generate daily data for the last 30 days
  const dailyData = useMemo(() => {
    const today = startOfDay(new Date());
    const thirtyDaysAgo = subDays(today, 29);
    
    const days = eachDayOfInterval({ start: thirtyDaysAgo, end: today });
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayRegistrations = registrations.filter(r => 
        format(new Date(r.registered_at), 'yyyy-MM-dd') === dayStr
      );
      
      return {
        date: format(day, 'dd MMM', { locale: getLocale() }),
        fullDate: dayStr,
        total: dayRegistrations.length,
        directors: dayRegistrations.filter(r => r.profile_type === 'director').length,
        coaches: dayRegistrations.filter(r => r.profile_type === 'coach').length,
      };
    });
  }, [registrations, i18n.language]);

  // Generate weekly data for the last 12 weeks
  const weeklyData = useMemo(() => {
    const result: Array<{
      week: string;
      total: number;
      directors: number;
      coaches: number;
    }> = [];

    for (let i = 11; i >= 0; i--) {
      const weekEnd = subDays(new Date(), i * 7);
      const weekStart = subDays(weekEnd, 6);
      
      const weekRegistrations = registrations.filter(r => {
        const regDate = new Date(r.registered_at);
        return regDate >= startOfDay(weekStart) && regDate <= weekEnd;
      });

      result.push({
        week: `${format(weekStart, 'dd/MM', { locale: getLocale() })} - ${format(weekEnd, 'dd/MM', { locale: getLocale() })}`,
        total: weekRegistrations.length,
        directors: weekRegistrations.filter(r => r.profile_type === 'director').length,
        coaches: weekRegistrations.filter(r => r.profile_type === 'coach').length,
      });
    }

    return result;
  }, [registrations, i18n.language]);

  // Calculate cumulative growth
  const cumulativeData = useMemo(() => {
    let cumulative = 0;
    return dailyData.map(day => {
      cumulative += day.total;
      return {
        ...day,
        cumulative,
      };
    });
  }, [dailyData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📊 Analíticas de Registros
        </CardTitle>
        <CardDescription>
          Evolución de registros en los últimos 30 días y 12 semanas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="daily">Diario</TabsTrigger>
            <TabsTrigger value="weekly">Semanal</TabsTrigger>
            <TabsTrigger value="growth">Crecimiento</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }} 
                  interval="preserveStartEnd"
                  className="text-muted-foreground"
                />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} className="text-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Bar dataKey="directors" stackId="a" fill="hsl(var(--primary))" name="Directores" radius={[0, 0, 0, 0]} />
                <Bar dataKey="coaches" stackId="a" fill="hsl(var(--primary) / 0.5)" name="Entrenadores" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="weekly" className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="week" 
                  tick={{ fontSize: 9 }} 
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  className="text-muted-foreground"
                />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} className="text-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Bar dataKey="directors" stackId="a" fill="hsl(var(--primary))" name="Directores" radius={[0, 0, 0, 0]} />
                <Bar dataKey="coaches" stackId="a" fill="hsl(var(--primary) / 0.5)" name="Entrenadores" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="growth" className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }} 
                  interval="preserveStartEnd"
                  className="text-muted-foreground"
                />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} className="text-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [value, 'Total acumulado']}
                />
                <Area 
                  type="monotone" 
                  dataKey="cumulative" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary) / 0.2)" 
                  strokeWidth={2}
                  name="Usuarios totales"
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
