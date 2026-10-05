import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useClub } from './useClub';
import { useUserRole } from './useUserRole';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { tr } from '@/lib/tr';
import { useRatingCriteria } from './useRatingCriteria';
import { averageByCriterion, overallAverage, ratingAverage, scoreOf, type ScoredRating } from '@/lib/ratingCriteria';

export interface PlayerRating {
  id: string;
  player_id: string;
  team_id: string;
  rated_by: string | null;
  event_id: string | null;
  rating_date: string;
  effort_attitude: number | null;
  communication_cooperation: number | null;
  technical_execution: number | null;
  decision_making: number | null;
  leadership_initiative: number | null;
  extra_scores?: Record<string, number> | null;
  notes: string | null;
  created_at: string;
  club_id: string | null;
  season_id: string | null;
}

export interface RatingInput {
  player_id: string;
  team_id: string;
  event_id?: string;
  effort_attitude: number | null;
  communication_cooperation: number | null;
  technical_execution: number | null;
  decision_making: number | null;
  leadership_initiative: number | null;
  extra_scores?: Record<string, number>;
  notes?: string;
}

export type { Criterion } from '@/lib/ratingCriteria';

export function usePlayerRatings() {
  const { user } = useAuth();
  const { club } = useClub();
  const { assignedTeams, isDirector, loading: roleLoading } = useUserRole();
  const [allRatings, setAllRatings] = useState<PlayerRating[]>([]);
  const [loading, setLoading] = useState(true);
  const { criteria } = useRatingCriteria();

  const fetchRatings = async () => {
    const { data, error } = await supabase
      .from('player_ratings')
      .select('*')
      .order('rating_date', { ascending: false });

    if (error) {
      console.error('Error fetching ratings:', error);
      toast.error(tr('Error al cargar puntuaciones'));
    } else {
      setAllRatings((data as unknown as PlayerRating[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRatings();
  }, []);

  // Filter ratings by assigned teams for coaches
  // Directors can see all ratings, coaches only see their assigned teams
  const ratings = useMemo(() => {
    if (roleLoading) return [];
    if (isDirector) return allRatings;
    if (assignedTeams.length === 0) return [];
    return allRatings.filter(r => assignedTeams.includes(r.team_id));
  }, [allRatings, isDirector, assignedTeams, roleLoading]);

  const addRating = async (rating: RatingInput & { rating_date?: string }, seasonId?: string) => {
    const ratingDate = rating.rating_date || format(new Date(), 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from('player_ratings')
      .insert([{
        ...rating,
        rated_by: user?.id || null,
        rating_date: ratingDate,
        club_id: club?.id || null,
        season_id: seasonId || null,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error saving rating:', error);
      toast.error(tr('Error al guardar puntuación'));
    }

    setAllRatings(prev => [data as unknown as PlayerRating, ...prev]);
    toast.success(tr('Puntuación guardada'));
    return data;
  };

  const updateRating = async (id: string, updates: Partial<RatingInput & { rating_date?: string }>) => {
    const { data, error } = await supabase
      .from('player_ratings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast.error(tr('Error al actualizar puntuación'));
      return null;
    }

    setAllRatings(prev => prev.map(r => r.id === id ? (data as unknown as PlayerRating) : r));
    toast.success(tr('Puntuación actualizada'));
    return data;
  };

  const deleteRating = async (id: string) => {
    const { error } = await supabase
      .from('player_ratings')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error(tr('Error al eliminar puntuación'));
      return false;
    }

    setAllRatings(prev => prev.filter(r => r.id !== id));
    toast.success(tr('Puntuación eliminada'));
    return true;
  };

  const getWeeklyPlayerStats = (playerId: string, teamId?: string) => {
    const now = new Date();
    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');

    const weekRatings = ratings.filter(r => 
      r.player_id === playerId &&
      r.rating_date >= weekStart &&
      r.rating_date <= weekEnd &&
      (!teamId || r.team_id === teamId)
    );

    if (weekRatings.length === 0) return null;

    const avgByCategory = averageByCriterion(weekRatings as ScoredRating[], criteria);
    const totalAvg = overallAverage(avgByCategory);

    return { avgByCategory, totalAvg, ratingsCount: weekRatings.length };
  };

  const getPlayerOfTheWeek = (teamId?: string) => {
    const now = new Date();
    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');

    const weekRatings = ratings.filter(r => 
      r.rating_date >= weekStart &&
      r.rating_date <= weekEnd &&
      (!teamId || r.team_id === teamId)
    );

    const byPlayer: Record<string, PlayerRating[]> = {};
    weekRatings.forEach(r => {
      if (!byPlayer[r.player_id]) byPlayer[r.player_id] = [];
      byPlayer[r.player_id].push(r);
    });

    let topPlayer: { playerId: string; avgScore: number } | null = null;

    Object.entries(byPlayer).forEach(([playerId, playerRatings]) => {
      const avgs = playerRatings.map((r) => ratingAverage(r as ScoredRating, criteria)).filter((v): v is number => v !== null);
      if (!avgs.length) return;
      const avgScore = avgs.reduce((a, b) => a + b, 0) / avgs.length;

      if (!topPlayer || avgScore > topPlayer.avgScore) {
        topPlayer = { playerId, avgScore };
      }
    });

    return topPlayer;
  };

  const getMonthlyEvolution = (playerId: string, teamId?: string): Array<Record<string, number | null> & {
    month: string;
    totalAvg: number;
  }> => {
    const playerRatings = ratings.filter(r => 
      r.player_id === playerId &&
      (!teamId || r.team_id === teamId)
    );

    const byMonth: Record<string, PlayerRating[]> = {};
    playerRatings.forEach(r => {
      const monthKey = r.rating_date.substring(0, 7);
      if (!byMonth[monthKey]) byMonth[monthKey] = [];
      byMonth[monthKey].push(r);
    });

    return Object.entries(byMonth)
      .map(([month, monthRatings]) => {
        const avgs = averageByCriterion(monthRatings as ScoredRating[], criteria);
        return { ...avgs, month, totalAvg: overallAverage(avgs) } as Record<string, number | null> & { month: string; totalAvg: number };
      })
      .sort((a, b) => a.month.localeCompare(b.month));
  };

  const getPlayerTrends = (playerId: string, teamId?: string) => {
    const evolution = getMonthlyEvolution(playerId, teamId);
    if (evolution.length < 2) return [];

    const trends: string[] = [];
    const lastTwo = evolution.slice(-2);
    const [prev, curr] = lastTwo;

    criteria.forEach(cat => {
      if (curr[cat.key] == null || prev[cat.key] == null) return;
      const diff = (curr[cat.key] as number) - (prev[cat.key] as number);
      if (diff >= 0.5) {
        trends.push(tr('Mejora en {toLowerCase}', { toLowerCase: cat.label.toLowerCase() }));
      } else if (diff <= -0.5) {
        trends.push(tr('Bajada en {toLowerCase}', { toLowerCase: cat.label.toLowerCase() }));
      }
    });

    const recentRatings = ratings
      .filter(r => r.player_id === playerId && (!teamId || r.team_id === teamId))
      .slice(0, 9);

    if (recentRatings.length >= 6) {
      const highEffortCount = recentRatings.filter(r => (r.effort_attitude ?? 0) >= 4).length;
      if (highEffortCount >= recentRatings.length * 0.8) {
        trends.push(tr('Mantiene alto nivel de esfuerzo'));
      }
    }

    return trends;
  };

  const getPositiveAlerts = (playerId: string, teamId?: string) => {
    const alerts: string[] = [];
    
    const now = new Date();
    let consecutiveHighEffort = 0;
    
    for (let i = 0; i < 4; i++) {
      const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      
      const weekRatings = ratings.filter(r => 
        r.player_id === playerId &&
        r.rating_date >= format(weekStart, 'yyyy-MM-dd') &&
        r.rating_date <= format(weekEnd, 'yyyy-MM-dd') &&
        (!teamId || r.team_id === teamId)
      );
      
      if (weekRatings.length > 0) {
        const effortScores = weekRatings.map(r => scoreOf(r as ScoredRating, 'effort_attitude')).filter((v): v is number => v !== null);
        if (!effortScores.length) break;
        const avgEffort = effortScores.reduce((a, b) => a + b, 0) / effortScores.length;
        if (avgEffort >= 4) {
          consecutiveHighEffort++;
        } else {
          break;
        }
      } else {
        break;
      }
    }
    
    if (consecutiveHighEffort >= 3) {
      alerts.push(tr('¡Ha sido la más constante en esfuerzo durante {consecutiveHighEffort} semanas!', { consecutiveHighEffort }));
    }

    const evolution = getMonthlyEvolution(playerId, teamId);
    if (evolution.length >= 2) {
      const [prev, curr] = evolution.slice(-2);
      if (curr.decision_making != null && prev.decision_making != null && curr.decision_making - prev.decision_making >= 1) {
        alerts.push(tr('¡Gran mejora en su lectura de juego!'));
      }
    }

    return alerts;
  };

  return {
    ratings,
    loading,
    addRating,
    updateRating,
    deleteRating,
    getWeeklyPlayerStats,
    getPlayerOfTheWeek,
    getMonthlyEvolution,
    getPlayerTrends,
    getPositiveAlerts,
    criteria,
    refetch: fetchRatings,
  };
}
