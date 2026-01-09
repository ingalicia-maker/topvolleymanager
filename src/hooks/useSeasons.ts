import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useClub } from './useClub';
import { toast } from 'sonner';

export interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  club_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useSeasons() {
  const { user } = useAuth();
  const { club } = useClub();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);

  const fetchSeasons = async () => {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching seasons:', error);
    } else {
      setSeasons((data as Season[]) || []);
      const active = (data as Season[])?.find(s => s.is_active);
      setActiveSeason(active || null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSeasons();
  }, []);

  const createSeason = async (name: string, startDate: string) => {
    // First, deactivate all existing seasons for this club
    if (club?.id) {
      await supabase
        .from('seasons')
        .update({ is_active: false })
        .eq('club_id', club.id);
    }

    const { data, error } = await supabase
      .from('seasons')
      .insert([{
        name,
        start_date: startDate,
        is_active: true,
        club_id: club?.id || null,
        created_by: user?.id || null,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating season:', error);
      toast.error('Error al crear la temporada');
      return null;
    }

    toast.success('Nueva temporada creada');
    await fetchSeasons();
    return data as Season;
  };

  const updateSeason = async (id: string, updates: Partial<Pick<Season, 'name' | 'start_date' | 'end_date' | 'is_active'>>) => {
    const { error } = await supabase
      .from('seasons')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating season:', error);
      toast.error('Error al actualizar la temporada');
      return false;
    }

    toast.success('Temporada actualizada');
    await fetchSeasons();
    return true;
  };

  const closeSeason = async (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    return updateSeason(id, { end_date: today, is_active: false });
  };

  const setAsActiveSeason = async (id: string) => {
    // Deactivate all seasons first
    if (club?.id) {
      await supabase
        .from('seasons')
        .update({ is_active: false })
        .eq('club_id', club.id);
    }

    const { error } = await supabase
      .from('seasons')
      .update({ is_active: true })
      .eq('id', id);

    if (error) {
      console.error('Error setting active season:', error);
      toast.error('Error al activar la temporada');
      return false;
    }

    await fetchSeasons();
    return true;
  };

  return {
    seasons,
    loading,
    activeSeason,
    createSeason,
    updateSeason,
    closeSeason,
    setAsActiveSeason,
    refetch: fetchSeasons,
  };
}
