import { useEffect, useMemo, useState } from 'react';
import { subDays, format, startOfDay, eachDayOfInterval } from 'date-fns';
import { BarChart3, Eye, Loader2, RefreshCw, Users, UserCheck } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PageView {
  path: string;
  locale: string;
  session_id: string;
  user_id: string | null;
  created_at: string;
}

export function SiteAnalytics() {
  const [views, setViews] = useState<PageView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    const since = subDays(new Date(), 30).toISOString();
    const { data, error: queryError } = await supabase
      .from('page_views')
      .select('path, locale, session_id, user_id, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5000);

    if (queryError) {
      setError(queryError.message);
      setViews([]);
    } else {
      setViews(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const metrics = useMemo(() => {
    const sevenDaysAgo = subDays(new Date(), 7);
    const recent = views.filter(view => new Date(view.created_at) >= sevenDaysAgo);
    const sessions = new Set(recent.map(view => view.session_id));
    const signedInUsers = new Set(recent.flatMap(view => view.user_id ? [view.user_id] : []));
    const pageCounts = recent.reduce<Record<string, number>>((acc, view) => {
      acc[view.path] = (acc[view.path] ?? 0) + 1;
      return acc;
    }, {});
    const localeCounts = recent.reduce<Record<string, number>>((acc, view) => {
      acc[view.locale] = (acc[view.locale] ?? 0) + 1;
      return acc;
    }, {});
    const days = eachDayOfInterval({ start: startOfDay(sevenDaysAgo), end: startOfDay(new Date()) });
    const daily = days.map(day => ({
      date: format(day, 'dd/MM'),
      views: recent.filter(view => format(new Date(view.created_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')).length,
    }));

    return {
      views: recent.length,
      sessions: sessions.size,
      signedInUsers: signedInUsers.size,
      viewsPerSession: sessions.size ? recent.length / sessions.size : 0,
      topPages: Object.entries(pageCounts).sort((a, b) => b[1] - a[1]).slice(0, 6),
      locales: Object.entries(localeCounts).sort((a, b) => b[1] - a[1]),
      daily,
    };
  }, [views]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
          <p className="text-sm text-destructive">No se pudieron cargar las visitas: {error}</p>
          <Button variant="outline" onClick={loadAnalytics}><RefreshCw className="mr-2 h-4 w-4" />Reintentar</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Tráfico de la web</h2>
          <p className="text-sm text-muted-foreground">Actividad de los últimos 7 días</p>
        </div>
        <Button variant="ghost" size="icon" onClick={loadAnalytics} aria-label="Actualizar analíticas">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Visualizaciones', value: metrics.views, icon: Eye },
          { label: 'Visitantes', value: metrics.sessions, icon: Users },
          { label: 'Usuarios conectados', value: metrics.signedInUsers, icon: UserCheck },
          { label: 'Páginas / visita', value: metrics.viewsPerSession.toFixed(1), icon: BarChart3 },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <Icon className="mb-2 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visualizaciones diarias</CardTitle>
          <CardDescription>Se empezarán a registrar desde esta actualización</CardDescription>
        </CardHeader>
        <CardContent className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics.daily} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              <Bar dataKey="views" name="Visualizaciones" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Páginas más vistas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {metrics.topPages.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay visitas registradas.</p> : metrics.topPages.map(([path, count]) => (
              <div key={path} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{path}</span><strong>{count}</strong>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Visitas por idioma</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {metrics.locales.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay visitas registradas.</p> : metrics.locales.map(([locale, count]) => (
              <div key={locale} className="flex items-center justify-between text-sm">
                <span>{locale.toUpperCase()}</span><strong>{count}</strong>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}