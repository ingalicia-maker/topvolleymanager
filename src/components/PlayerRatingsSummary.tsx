import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RATING_CATEGORIES, RatingCategoryKey } from '@/hooks/usePlayerRatings';
import { User, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { TEAMS } from '@/types/volleyball';

const RATING_EMOJIS: Record<string, string> = {
  effort_attitude: '💪',
  communication_cooperation: '🤝',
  technical_execution: '🏐',
  decision_making: '🧠',
  leadership_initiative: '⭐',
};

interface PlayerRatingsSummaryProps {
  player: {
    id: string;
    name: string;
    number: number | null;
    teams: string[];
  };
  teamId: string;
  ratings: Array<{
    player_id: string;
    team_id: string;
    rating_date: string;
    effort_attitude: number;
    communication_cooperation: number;
    technical_execution: number;
    decision_making: number;
    leadership_initiative: number;
  }>;
  onClick?: () => void;
  isSelected?: boolean;
}

export function PlayerRatingsSummary({
  player,
  teamId,
  ratings,
  onClick,
  isSelected = false,
}: PlayerRatingsSummaryProps) {
  const team = TEAMS.find(t => t.id === teamId);

  // Calculate latest month stats
  const stats = useMemo(() => {
    const playerRatings = ratings.filter(
      r => r.player_id === player.id && r.team_id === teamId
    );

    if (playerRatings.length === 0) return null;

    // Group by month
    const byMonth: Record<string, typeof playerRatings> = {};
    playerRatings.forEach(r => {
      const monthKey = r.rating_date.substring(0, 7);
      if (!byMonth[monthKey]) byMonth[monthKey] = [];
      byMonth[monthKey].push(r);
    });

    const months = Object.keys(byMonth).sort();
    if (months.length === 0) return null;

    const latestMonth = months[months.length - 1];
    const prevMonth = months.length > 1 ? months[months.length - 2] : null;

    const calcAvg = (monthRatings: typeof playerRatings) => {
      const avgByCategory: Record<RatingCategoryKey, number> = {} as any;
      RATING_CATEGORIES.forEach(cat => {
        avgByCategory[cat.key] = monthRatings.reduce((acc, r) => acc + r[cat.key], 0) / monthRatings.length;
      });
      const totalAvg = Object.values(avgByCategory).reduce((a, b) => a + b, 0) / 5;
      return { avgByCategory, totalAvg };
    };

    const current = calcAvg(byMonth[latestMonth]);
    const previous = prevMonth ? calcAvg(byMonth[prevMonth]) : null;

    const trend = previous ? current.totalAvg - previous.totalAvg : 0;

    return {
      avgByCategory: current.avgByCategory,
      totalAvg: current.totalAvg,
      trend,
      ratingsCount: playerRatings.length,
    };
  }, [player.id, teamId, ratings]);

  const getTrendIcon = () => {
    if (!stats || stats.trend === 0) return <Minus className="h-3 w-3 text-muted-foreground" />;
    if (stats.trend > 0) return <TrendingUp className="h-3 w-3 text-green-600" />;
    return <TrendingDown className="h-3 w-3 text-red-600" />;
  };

  const getScoreColor = (score: number) => {
    if (score <= 3) return 'text-red-600';
    if (score <= 5) return 'text-amber-600';
    if (score <= 7) return 'text-blue-600';
    return 'text-green-600';
  };

  return (
    <Card
      className={`cursor-pointer transition-colors ${
        isSelected ? 'ring-2 ring-primary' : 'hover:bg-accent/50'
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Player avatar */}
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {player.number ? (
              <span className="font-bold text-primary">{player.number}</span>
            ) : (
              <User className="h-5 w-5 text-primary" />
            )}
          </div>

          {/* Player info + ratings */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{player.name}</p>
              {stats && (
                <div className="flex items-center gap-1">
                  {getTrendIcon()}
                </div>
              )}
            </div>

            {stats ? (
              <div className="flex items-center gap-1 mt-1 overflow-x-auto">
                {RATING_CATEGORIES.map(cat => (
                  <Badge
                    key={cat.key}
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 shrink-0 ${getScoreColor(stats.avgByCategory[cat.key])}`}
                    title={cat.label}
                  >
                    {RATING_EMOJIS[cat.key]} {stats.avgByCategory[cat.key].toFixed(1)}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sin puntuaciones</p>
            )}
          </div>

          {/* Global score */}
          <div className="flex items-center gap-2 shrink-0">
            {stats && (
              <div 
                className={`text-lg font-bold ${getScoreColor(stats.totalAvg)}`}
              >
                {stats.totalAvg.toFixed(1)}
              </div>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
