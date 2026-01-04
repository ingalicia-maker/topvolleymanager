import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DbTeam {
  id: string;
  name: string;
  coach: string;
  color: string;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
}

export function useTeams() {
  const [teams, setTeams] = useState<DbTeam[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching teams:', error);
      toast.error('Error al cargar equipos');
    } else {
      setTeams(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const addTeam = async (team: Omit<DbTeam, 'created_at' | 'updated_at' | 'created_by'>) => {
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('teams')
      .insert([{ ...team, created_by: userData.user?.id }])
      .select()
      .single();

    if (error) {
      toast.error('Error al añadir equipo');
      return null;
    }
    
    setTeams(prev => [...prev, data]);
    toast.success('Equipo añadido');
    return data;
  };

  const updateTeam = async (id: string, updates: Partial<DbTeam>) => {
    const { error } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast.error('Error al actualizar equipo');
      return false;
    }

    setTeams(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    toast.success('Equipo actualizado');
    return true;
  };

  const deleteTeam = async (id: string) => {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Error al eliminar equipo');
      return false;
    }

    setTeams(prev => prev.filter(t => t.id !== id));
    toast.success('Equipo eliminado');
    return true;
  };

  return { teams, loading, addTeam, updateTeam, deleteTeam, refetch: fetchTeams };
}
