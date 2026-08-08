import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RATING_CATEGORIES, RatingCategoryKey } from '@/hooks/usePlayerRatings';
import { Trophy, Medal, User } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { getDateFnsLocale } from '@/lib/dateLocale';

interface PlayerRankingProps {
  players: Array<{
    id: string;
    name: string;
    number: number | null;
    teams: string[] | null;
  }>;
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
  teamId: string;
  month: string; // Format: 'yyyy-MM'
  onPlayerClick?: (playerId: string) => void;
}

interface RankedPlayer {
  player: PlayerRankingProps['players'][0];
  totalAvg: number;
  avgByCategory: Record<RatingCategoryKey, number>;
  ratingsCount: number;
}

export function PlayerRanking({ players, ratings, teamId, month, onPlayerClick }: PlayerRankingProps) {
  const { i18n } = useTranslation();
  const formatMonthDisplay = (monthStr: string) => {
    const [year, monthNum] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return format(date, 'MMMM yyyy', { locale: getDateFnsLocale(i18n.language) });
  };

  const rankedPlayers = useMemo(() => {
    const teamPlayers = players.filter(p => p.teams?.includes(teamId));
    
    const ranked: RankedPlayer[] = [];
    
    teamPlayers.forEach(player => {
      const playerMonthRatings = ratings.filter(
        r => r.player_id === player.id && 
             r.team_id === teamId && 
             r.rating_date.startsWith(month)
      );
      
      if (playerMonthRatings.length === 0) return;
      
      const avgByCategory: Record<RatingCategoryKey, number> = {} as any;
      RATING_CATEGORIES.forEach(cat => {
        avgByCategory[cat.key] = playerMonthRatings.reduce((acc, r) => acc + r[cat.key], 0) / playerMonthRatings.length;
      });
      
      const totalAvg = Object.values(avgByCategory).reduce((a, b) => a + b, 0) / 5;
      
      ranked.push({
        player,
        totalAvg,
        avgByCategory,
        ratingsCount: playerMonthRatings.length,
      });
    });
    
    // Sort by total average descending
    return ranked.sort((a, b) => b.totalAvg - a.totalAvg);
  }, [players, ratings, teamId, month]);

  const getRankIcon = (position: number) => {
    if (position === 0) return <Trophy className="h-5 w-5 text-amber-500" />;
    if (position === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (position === 2) return <Medal className="h-5 w-5 text-amber-700" />;
    return <span className="text-sm font-medium text-muted-foreground w-5 text-center">{position + 1}</span>;
  };

  const getRankBgColor = (position: number) => {
    if (position === 0) return 'bg-amber-500/10 border-amber-500/30';
    if (position === 1) return 'bg-gray-200/50 dark:bg-gray-700/30 border-gray-300/50';
    if (position === 2) return 'bg-amber-700/10 border-amber-700/30';
    return '';
  };

  const getScoreColor = (score: number) => {
    if (score <= 3) return 'text-red-600';
    if (score <= 5) return 'text-amber-600';
    if (score <= 7) return 'text-blue-600';
    return 'text-green-600';
  };

  if (rankedPlayers.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Trophy className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-muted-foreground text-sm">
            No hay puntuaciones para {formatMonthDisplay(month)}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          Ranking {formatMonthDisplay(month)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rankedPlayers.map((item, index) => (
          <div
            key={item.player.id}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors ${getRankBgColor(index)}`}
            onClick={() => onPlayerClick?.(item.player.id)}
          >
            {/* Rank icon */}
            <div className="shrink-0 w-6 flex justify-center">
              {getRankIcon(index)}
            </div>
            
            {/* Player avatar */}
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              {item.player.number ? (
                <span className="font-bold text-primary">{item.player.number}</span>
              ) : (
                <User className="h-5 w-5 text-primary" />
              )}
            </div>
            
            {/* Player info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{item.player.name}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {RATING_CATEGORIES.map(cat => (
                  <Badge
                    key={cat.key}
                    variant="outline"
                    className="text-[9px] px-1 py-0"
                    title={cat.label}
                  >
                    {item.avgByCategory[cat.key].toFixed(1)}
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Score */}
            <div className={`text-xl font-bold ${getScoreColor(item.totalAvg)}`}>
              {item.totalAvg.toFixed(1)}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
