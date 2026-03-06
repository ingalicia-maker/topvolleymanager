import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useClub } from './useClub';
import { useUserRole } from './useUserRole';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';

export interface PlayerRating {
  id: string;
  player_id: string;
  team_id: string;
  rated_by: string | null;
  event_id: string | null;
  rating_date: string;
  effort_attitude: number;
  communication_cooperation: number;
  technical_execution: number;
  decision_making: number;
  leadership_initiative: number;
  notes: string | null;
  created_at: string;
  club_id: string | null;
  season_id: string | null;
}

export interface RatingInput {
  player_id: string;
  team_id: string;
  event_id?: string;
  effort_attitude: number;
  communication_cooperation: number;
  technical_execution: number;
  decision_making: number;
  leadership_initiative: number;
  notes?: string;
}

export const RATING_CATEGORIES = [
  { key: 'effort_attitude', label: 'Esfuerzo y actitud', shortLabel: 'Esfuerzo' },
  { key: 'communication_cooperation', label: 'Comunicación y cooperación', shortLabel: 'Comunicación' },
  { key: 'technical_execution', label: 'Ejecución técnica', shortLabel: 'Técnica' },
  { key: 'decision_making', label: 'Toma de decisiones', shortLabel: 'Decisiones' },
  { key: 'leadership_initiative', label: 'Liderazgo e iniciativa', shortLabel: 'Liderazgo' },
] as const;

export type RatingCategoryKey = typeof RATING_CATEGORIES[number]['key'];

export function usePlayerRatings() {
  const { user } = useAuth();
  const { club } = useClub();
  const { assignedTeams, isDirector, loading: roleLoading } = useUserRole();
  const [allRatings, setAllRatings] = useState<PlayerRating[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRatings = async () => {
    const { data, error } = await supabase
      .from('player_ratings')
      .select('*')
      .order('rating_date', { ascending: false });

    if (error) {
      console.error('Error fetching ratings:', error);
      toast.error('Error al cargar puntuaciones');
    } else {
      setAllRatings(data || []);
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
      toast.error('Error al guardar puntuación');
    }

    setAllRatings(prev => [data, ...prev]);
    toast.success('Puntuación guardada');
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
      toast.error('Error al actualizar puntuación');
      return null;
    }

    setAllRatings(prev => prev.map(r => r.id === id ? data : r));
    toast.success('Puntuación actualizada');
    return data;
  };

  const deleteRating = async (id: string) => {
    const { error } = await supabase
      .from('player_ratings')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Error al eliminar puntuación');
      return false;
    }

    setAllRatings(prev => prev.filter(r => r.id !== id));
    toast.success('Puntuación eliminada');
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

    const avgByCategory: Record<RatingCategoryKey, number> = {
      effort_attitude: 0,
      communication_cooperation: 0,
      technical_execution: 0,
      decision_making: 0,
      leadership_initiative: 0,
    };

    RATING_CATEGORIES.forEach(cat => {
      const sum = weekRatings.reduce((acc, r) => acc + (r[cat.key] as number), 0);
      avgByCategory[cat.key] = sum / weekRatings.length;
    });

    const totalAvg = Object.values(avgByCategory).reduce((a, b) => a + b, 0) / 5;

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
      const totalScore = playerRatings.reduce((acc, r) => {
        return acc + r.effort_attitude + r.communication_cooperation + 
               r.technical_execution + r.decision_making + r.leadership_initiative;
      }, 0);
      const avgScore = totalScore / (playerRatings.length * 5);

      if (!topPlayer || avgScore > topPlayer.avgScore) {
        topPlayer = { playerId, avgScore };
      }
    });

    return topPlayer;
  };

  const getMonthlyEvolution = (playerId: string, teamId?: string): Array<{
    month: string;
    effort_attitude: number;
    communication_cooperation: number;
    technical_execution: number;
    decision_making: number;
    leadership_initiative: number;
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
        const effort_attitude = monthRatings.reduce((acc, r) => acc + r.effort_attitude, 0) / monthRatings.length;
        const communication_cooperation = monthRatings.reduce((acc, r) => acc + r.communication_cooperation, 0) / monthRatings.length;
        const technical_execution = monthRatings.reduce((acc, r) => acc + r.technical_execution, 0) / monthRatings.length;
        const decision_making = monthRatings.reduce((acc, r) => acc + r.decision_making, 0) / monthRatings.length;
        const leadership_initiative = monthRatings.reduce((acc, r) => acc + r.leadership_initiative, 0) / monthRatings.length;
        const totalAvg = (effort_attitude + communication_cooperation + technical_execution + decision_making + leadership_initiative) / 5;
        return { 
          month, 
          effort_attitude,
          communication_cooperation,
          technical_execution,
          decision_making,
          leadership_initiative,
          totalAvg 
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));
  };

  const getPlayerTrends = (playerId: string, teamId?: string) => {
    const evolution = getMonthlyEvolution(playerId, teamId);
    if (evolution.length < 2) return [];

    const trends: string[] = [];
    const lastTwo = evolution.slice(-2);
    const [prev, curr] = lastTwo;

    RATING_CATEGORIES.forEach(cat => {
      const diff = (curr[cat.key] as number) - (prev[cat.key] as number);
      if (diff >= 0.5) {
        trends.push(`Mejora en ${cat.label.toLowerCase()}`);
      } else if (diff <= -0.5) {
        trends.push(`Bajada en ${cat.label.toLowerCase()}`);
      }
    });

    const recentRatings = ratings
      .filter(r => r.player_id === playerId && (!teamId || r.team_id === teamId))
      .slice(0, 9);

    if (recentRatings.length >= 6) {
      const highEffortCount = recentRatings.filter(r => r.effort_attitude >= 4).length;
      if (highEffortCount >= recentRatings.length * 0.8) {
        trends.push('Mantiene alto nivel de esfuerzo');
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
        const avgEffort = weekRatings.reduce((a, r) => a + r.effort_attitude, 0) / weekRatings.length;
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
      alerts.push(`¡Ha sido la más constante en esfuerzo durante ${consecutiveHighEffort} semanas!`);
    }

    const evolution = getMonthlyEvolution(playerId, teamId);
    if (evolution.length >= 2) {
      const [prev, curr] = evolution.slice(-2);
      if ((curr.decision_making as number) - (prev.decision_making as number) >= 1) {
        alerts.push('¡Gran mejora en su lectura de juego!');
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
    refetch: fetchRatings,
  };
}
