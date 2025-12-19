import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DbAusencia {
  id: string;
  player_id: string;
  date: string;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

export function useAusencias() {
  const [ausencias, setAusencias] = useState<DbAusencia[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAusencias = async () => {
    const { data, error } = await supabase
      .from('ausencias')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching ausencias:', error);
      toast.error('Error al cargar ausencias');
    } else {
      setAusencias(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAusencias();
  }, []);

  const addAusencia = async (ausencia: Omit<DbAusencia, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('ausencias')
      .insert([ausencia])
      .select()
      .single();

    if (error) {
      toast.error('Error al registrar ausencia');
      return null;
    }
    
    setAusencias(prev => [data, ...prev]);
    toast.success('Ausencia registrada');
    return data;
  };

  const updateAusencia = async (id: string, updates: Partial<DbAusencia>) => {
    const { error } = await supabase
      .from('ausencias')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast.error('Error al actualizar ausencia');
      return false;
    }

    setAusencias(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    return true;
  };

  const deleteAusencia = async (id: string) => {
    const { error } = await supabase
      .from('ausencias')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Error al eliminar ausencia');
      return false;
    }

    setAusencias(prev => prev.filter(a => a.id !== id));
    toast.success('Ausencia eliminada');
    return true;
  };

  return { ausencias, loading, addAusencia, updateAusencia, deleteAusencia, refetch: fetchAusencias };
}