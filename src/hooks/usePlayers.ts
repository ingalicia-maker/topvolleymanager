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
  height: number | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  club_id: string | null;
}

export function usePlayers() {
  const [players, setPlayers] = useState<DbPlayer[]>([]);
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
      setPlayers(data || []);
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
    
    setPlayers(prev => [...prev, data]);
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

    setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
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

    setPlayers(prev => prev.filter(p => p.id !== id));
    toast.success('Jugadora eliminada');
    return true;
  };

  return { players, loading, addPlayer, updatePlayer, deletePlayer, refetch: fetchPlayers };
}
