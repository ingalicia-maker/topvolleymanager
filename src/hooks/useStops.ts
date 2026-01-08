import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useClub } from './useClub';

export interface DbStop {
  id: string;
  name: string;
  order_index: number;
  created_at: string | null;
  created_by: string | null;
  club_id: string | null;
}

export function useStops() {
  const [stops, setStops] = useState<DbStop[]>([]);
  const [loading, setLoading] = useState(true);
  const { club } = useClub();

  const fetchStops = async () => {
    const { data, error } = await supabase
      .from('stops')
      .select('*')
      .order('order_index');

    if (error) {
      console.error('Error fetching stops:', error);
      toast.error('Error al cargar paradas');
    } else {
      setStops(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStops();
  }, []);

  const addStop = async (name: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const maxOrder = stops.length > 0 ? Math.max(...stops.map(s => s.order_index)) : 0;
    
    const { data, error } = await supabase
      .from('stops')
      .insert([{ 
        name, 
        order_index: maxOrder + 1,
        created_by: userData.user?.id,
        club_id: club?.id || null,
      }])
      .select()
      .single();

    if (error) {
      toast.error('Error al añadir parada');
      return null;
    }
    
    setStops(prev => [...prev, data]);
    toast.success('Parada añadida');
    return data;
  };

  const updateStop = async (id: string, updates: Partial<DbStop>) => {
    const { error } = await supabase
      .from('stops')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast.error('Error al actualizar parada');
      return false;
    }

    setStops(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    toast.success('Parada actualizada');
    return true;
  };

  const deleteStop = async (id: string) => {
    const { error } = await supabase
      .from('stops')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Error al eliminar parada');
      return false;
    }

    setStops(prev => prev.filter(s => s.id !== id));
    toast.success('Parada eliminada');
    return true;
  };

  return { stops, loading, addStop, updateStop, deleteStop, refetch: fetchStops };
}
