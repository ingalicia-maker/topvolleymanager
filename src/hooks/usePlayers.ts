import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useClub } from './useClub';

export interface DbPlayer {
  id: string;
  name: string;
  surname1: string | null;
  surname2: string | null;
  phone: string;
  teams: string[];
  number: number | null;
  birth_year: number | null;
  birth_day: number | null;
  birth_month: number | null;
  dni: string | null;
  height: number | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  club_id: string | null;
  is_archived?: boolean | null;
  archived_at?: string | null;
}

export function usePlayers() {
  const [allPlayers, setAllPlayers] = useState<DbPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const { club } = useClub();

  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching players:', error);
      toast.error('Error al cargar jugadoras');
    } else {
      setAllPlayers((data || []) as DbPlayer[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const addPlayer = async (player: Omit<DbPlayer, 'id' | 'created_at' | 'updated_at' | 'club_id'>) => {
    const { data, error } = await supabase
      .from('players')
      .insert([{ ...player, club_id: club?.id || null }])
      .select()
      .single();

    if (error) {
      toast.error('Error al añadir jugadora');
      return null;
    }
    
    setAllPlayers(prev => [...prev, data as DbPlayer]);
    toast.success('Jugadora añadida');
    return data;
  };

  const updatePlayer = async (id: string, updates: Partial<DbPlayer>) => {
    const { error } = await supabase
      .from('players')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast.error('Error al actualizar jugadora');
      return false;
    }

    setAllPlayers(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    toast.success('Jugadora actualizada');
    return true;
  };

  const deletePlayer = async (id: string) => {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Error al eliminar jugadora');
      return false;
    }

    setAllPlayers(prev => prev.filter(p => p.id !== id));
    toast.success('Jugadora eliminada');
    return true;
  };

  const setArchived = async (id: string, archived: boolean) => {
    const updates = {
      is_archived: archived,
      archived_at: archived ? new Date().toISOString() : null,
    };

    const { error } = await supabase
      .from('players')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast.error(archived ? 'Error al archivar jugadora' : 'Error al restaurar jugadora');
      return false;
    }

    setAllPlayers(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
    toast.success(archived ? 'Jugadora archivada' : 'Jugadora restaurada');
    return true;
  };

  const archivePlayer = (id: string) => setArchived(id, true);
  const unarchivePlayer = (id: string) => setArchived(id, false);

  const players = allPlayers.filter(p => !p.is_archived);
  const archivedPlayers = allPlayers.filter(p => !!p.is_archived);

  return {
    players,
    archivedPlayers,
    allPlayers,
    loading,
    addPlayer,
    updatePlayer,
    deletePlayer,
    archivePlayer,
    unarchivePlayer,
    refetch: fetchPlayers,
  };
}
