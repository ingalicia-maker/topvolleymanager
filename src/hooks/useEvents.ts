import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DbEvent {
  id: string;
  type: string;
  team_id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  invited_players: string[];
  confirmed_players: string[];
  declined_players: string[];
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useEvents() {
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
      toast.error('Error al cargar eventos');
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const addEvent = async (event: Omit<DbEvent, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('events')
      .insert([event])
      .select()
      .single();

    if (error) {
      toast.error('Error al crear evento');
      return null;
    }
    
    setEvents(prev => [data, ...prev]);
    toast.success('Evento creado');
    return data;
  };

  const updateEvent = async (id: string, updates: Partial<DbEvent>) => {
    const { error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast.error('Error al actualizar evento');
      return false;
    }

    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    return true;
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Error al eliminar evento');
      return false;
    }

    setEvents(prev => prev.filter(e => e.id !== id));
    toast.success('Evento eliminado');
    return true;
  };

  return { events, loading, addEvent, updateEvent, deleteEvent, refetch: fetchEvents };
}