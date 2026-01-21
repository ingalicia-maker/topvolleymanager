import { ExternalLink, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const GA_MEASUREMENT_ID = 'G-PGZNMSVL5W';

export function GoogleAnalyticsCard() {
  const openGADashboard = () => {
    // Opens Google Analytics dashboard for this property
    window.open(
      `https://analytics.google.com/analytics/web/#/p${GA_MEASUREMENT_ID.replace('G-', '')}/reports/intelligenthome`,
      '_blank'
    );
  };

  const openGARealtime = () => {
    window.open(
      `https://analytics.google.com/analytics/web/#/p${GA_MEASUREMENT_ID.replace('G-', '')}/reports/realtime`,
      '_blank'
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Google Analytics
        </CardTitle>
        <CardDescription>
          Conexión con tu cuenta de Google Analytics 4
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
          <div>
            <p className="text-sm font-medium">Measurement ID</p>
            <code className="text-xs text-muted-foreground">{GA_MEASUREMENT_ID}</code>
          </div>
          <Badge variant="outline" className="text-green-600 border-green-600">
            Conectado
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={openGADashboard} className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
            <ExternalLink className="h-3 w-3" />
          </Button>
          <Button variant="outline" onClick={openGARealtime} className="gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Realtime
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Google Analytics está integrado en la app. Accede al dashboard de GA4 para ver métricas detalladas como usuarios activos, páginas vistas, eventos, conversiones y más.
        </p>
      </CardContent>
    </Card>
  );
}
