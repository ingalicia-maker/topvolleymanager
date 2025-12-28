import { Trophy, Star, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePlayerRatings, RATING_CATEGORIES } from '@/hooks/usePlayerRatings';
import { usePlayers } from '@/hooks/usePlayers';

interface PlayerOfTheWeekProps {
  teamId?: string;
}

export function PlayerOfTheWeek({ teamId }: PlayerOfTheWeekProps) {
  const { getPlayerOfTheWeek, getWeeklyPlayerStats, getPositiveAlerts } = usePlayerRatings();
  const { players } = usePlayers();

  const potw = getPlayerOfTheWeek(teamId);

  if (!potw) {
    return null;
  }

  const player = players.find(p => p.id === potw.playerId);
  if (!player) return null;

  const stats = getWeeklyPlayerStats(potw.playerId, teamId);
  const alerts = getPositiveAlerts(potw.playerId, teamId);

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Trophy Icon */}
          <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Trophy className="h-7 w-7 text-primary" />
          </div>

          {/* Player Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-[10px] bg-primary/20 text-primary">
                <Star className="h-3 w-3 mr-1" />
                Jugadora de la semana
              </Badge>
            </div>
            <h3 className="font-bold text-lg text-foreground truncate">{player.name}</h3>
            {player.number && (
              <span className="text-sm text-primary">#{player.number}</span>
            )}
            
            {/* Average Score */}
            {stats && (
              <div className="mt-2 flex items-center gap-2">
                <div className="text-2xl font-bold text-primary">
                  {potw.avgScore.toFixed(1)}
                </div>
                <span className="text-sm text-muted-foreground">/ 5</span>
              </div>
            )}

            {/* Category highlights */}
            {stats && (
              <div className="mt-3 flex flex-wrap gap-1">
                {RATING_CATEGORIES.filter(cat => stats.avgByCategory[cat.key] >= 4).map(cat => (
                  <Badge key={cat.key} variant="outline" className="text-[10px]">
                    {cat.shortLabel}
                  </Badge>
                ))}
              </div>
            )}

            {/* Positive Alerts */}
            {alerts.length > 0 && (
              <div className="mt-3 space-y-1">
                {alerts.slice(0, 2).map((alert, i) => (
                  <div key={i} className="flex items-center gap-1 text-xs text-primary">
                    <TrendingUp className="h-3 w-3" />
                    <span>{alert}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
