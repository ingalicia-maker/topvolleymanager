import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useClub } from './useClub';
import { addDays, addWeeks, parseISO, format, isBefore, isAfter } from 'date-fns';

export interface CoachSubmission {
  coach_id: string;
  coach_name: string;
  submitted: boolean;
  submitted_at: string | null;
}

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
  // Displacement-specific fields
  destination: string | null;
  departure_time: string | null;
  stops: string[];
  player_stops: Record<string, string>;
  player_returns: Record<string, boolean>;
  total_passengers: number | null;
  selected_teams: string[];
  coach_submissions: Record<string, CoachSubmission>;
  club_id: string | null;
  // Recurring and persistence fields
  keep_forever: boolean;
  is_recurring: boolean;
  recurring_pattern: string | null;
  recurring_end_date: string | null;
  parent_event_id: string | null;
}

export function useEvents() {
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { club } = useClub();

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
      toast.error('Error al cargar eventos');
    } else {
      const parsed = (data || []).map(e => ({
        ...e,
        stops: Array.isArray(e.stops) ? e.stops : [],
        player_stops: typeof e.player_stops === 'object' && e.player_stops !== null ? e.player_stops : {},
        player_returns: typeof e.player_returns === 'object' && e.player_returns !== null ? e.player_returns : {},
        selected_teams: Array.isArray(e.selected_teams) ? e.selected_teams : [],
        coach_submissions: typeof e.coach_submissions === 'object' && e.coach_submissions !== null && !Array.isArray(e.coach_submissions) ? e.coach_submissions : {},
        keep_forever: e.keep_forever ?? false,
        is_recurring: e.is_recurring ?? false,
        recurring_pattern: e.recurring_pattern ?? null,
        recurring_end_date: e.recurring_end_date ?? null,
        parent_event_id: e.parent_event_id ?? null,
      })) as unknown as DbEvent[];
      setEvents(parsed);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const addEvent = async (event: Omit<DbEvent, 'id' | 'created_at' | 'updated_at' | 'club_id'>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eventToInsert = {
      ...event,
      player_stops: event.player_stops,
      player_returns: event.player_returns,
      coach_submissions: event.coach_submissions,
      club_id: club?.id || null,
    } as any;
    
    const { data, error } = await supabase
      .from('events')
      .insert([eventToInsert])
      .select()
      .single();

    if (error) {
      toast.error('Error al crear evento');
      return null;
    }
    
    const parsed = {
      ...data,
      stops: Array.isArray(data.stops) ? data.stops : [],
      player_stops: typeof data.player_stops === 'object' && data.player_stops !== null ? data.player_stops : {},
      player_returns: typeof data.player_returns === 'object' && data.player_returns !== null ? data.player_returns : {},
      selected_teams: Array.isArray(data.selected_teams) ? data.selected_teams : [],
      coach_submissions: typeof data.coach_submissions === 'object' && data.coach_submissions !== null && !Array.isArray(data.coach_submissions) ? data.coach_submissions : {},
      keep_forever: data.keep_forever ?? false,
      is_recurring: data.is_recurring ?? false,
      recurring_pattern: data.recurring_pattern ?? null,
      recurring_end_date: data.recurring_end_date ?? null,
      parent_event_id: data.parent_event_id ?? null,
    } as unknown as DbEvent;
    
    setEvents(prev => [parsed, ...prev]);
    toast.success('Evento creado');
    return parsed;
  };

  // Create recurring events based on the parent event
  const createRecurringEvents = async (
    parentEvent: DbEvent,
    pattern: 'weekly' | 'biweekly',
    endDate?: string
  ) => {
    const startDate = parseISO(parentEvent.date);
    const endDateParsed = endDate ? parseISO(endDate) : addWeeks(startDate, 12); // Default 12 weeks
    const weeksInterval = pattern === 'weekly' ? 1 : 2;
    
    const recurringEvents: Omit<DbEvent, 'id' | 'created_at' | 'updated_at' | 'club_id'>[] = [];
    let currentDate = addWeeks(startDate, weeksInterval);
    
    while (isBefore(currentDate, endDateParsed) || format(currentDate, 'yyyy-MM-dd') === format(endDateParsed, 'yyyy-MM-dd')) {
      recurringEvents.push({
        type: parentEvent.type,
        team_id: parentEvent.team_id,
        title: parentEvent.title,
        date: format(currentDate, 'yyyy-MM-dd'),
        time: parentEvent.time,
        location: parentEvent.location,
        invited_players: parentEvent.invited_players,
        confirmed_players: [],
        declined_players: [],
        notes: parentEvent.notes,
        created_by: parentEvent.created_by,
        destination: parentEvent.destination,
        departure_time: parentEvent.departure_time,
        stops: parentEvent.stops,
        player_stops: {},
        player_returns: {},
        total_passengers: parentEvent.total_passengers,
        selected_teams: parentEvent.selected_teams,
        coach_submissions: parentEvent.coach_submissions,
        keep_forever: parentEvent.keep_forever,
        is_recurring: true,
        recurring_pattern: pattern,
        recurring_end_date: endDate || null,
        parent_event_id: parentEvent.id,
      });
      
      currentDate = addWeeks(currentDate, weeksInterval);
    }

    if (recurringEvents.length === 0) {
      return { created: 0 };
    }

    // Insert all recurring events
    const eventsToInsert = recurringEvents.map(e => ({
      ...e,
      club_id: club?.id || null,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase
      .from('events')
      .insert(eventsToInsert as any)
      .select();

    if (error) {
      console.error('Error creating recurring events:', error);
      toast.error('Error al crear eventos recurrentes');
      return { created: 0 };
    }

    // Parse and add to state
    const parsedEvents = (data || []).map(e => ({
      ...e,
      stops: Array.isArray(e.stops) ? e.stops : [],
      player_stops: typeof e.player_stops === 'object' && e.player_stops !== null ? e.player_stops : {},
      player_returns: typeof e.player_returns === 'object' && e.player_returns !== null ? e.player_returns : {},
      selected_teams: Array.isArray(e.selected_teams) ? e.selected_teams : [],
      coach_submissions: typeof e.coach_submissions === 'object' && e.coach_submissions !== null && !Array.isArray(e.coach_submissions) ? e.coach_submissions : {},
      keep_forever: e.keep_forever ?? false,
      is_recurring: e.is_recurring ?? false,
      recurring_pattern: e.recurring_pattern ?? null,
      recurring_end_date: e.recurring_end_date ?? null,
      parent_event_id: e.parent_event_id ?? null,
    })) as unknown as DbEvent[];

    setEvents(prev => [...parsedEvents, ...prev]);
    toast.success(`${parsedEvents.length} eventos recurrentes creados`);
    
    return { created: parsedEvents.length };
  };

  const updateEvent = async (id: string, updates: Partial<DbEvent>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase
      .from('events')
      .update(updates as any)
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

  return { events, loading, addEvent, updateEvent, deleteEvent, createRecurringEvents, refetch: fetchEvents };
}
