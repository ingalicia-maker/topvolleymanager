import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  recipient_id: string;
  sender_id: string | null;
  type: string;
  title: string;
  message: string;
  related_player_id: string | null;
  related_event_id: string | null;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
    } else {
      setNotifications(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  const createNotification = async (notification: Omit<Notification, 'id' | 'created_at' | 'is_read'>) => {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{ ...notification, is_read: false }])
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }

    return data;
  };

  // Notify coaches when their player is summoned by another coach
  const notifyPlayerSummoned = async (
    recipientCoachId: string,
    senderName: string,
    playerName: string,
    eventTitle: string,
    playerId: string,
    eventId: string
  ) => {
    return createNotification({
      recipient_id: recipientCoachId,
      sender_id: user?.id || null,
      type: 'player_summoned',
      title: 'Jugadora convocada',
      message: `${senderName} ha convocado a ${playerName} para "${eventTitle}"`,
      related_player_id: playerId,
      related_event_id: eventId,
    });
  };

  // Notify coach when a displacement is created with their team
  const notifyDisplacementCreated = async (
    recipientCoachId: string,
    senderName: string,
    destination: string,
    eventDate: string,
    eventId: string
  ) => {
    const formattedDate = new Date(eventDate).toLocaleDateString('es-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
    
    return createNotification({
      recipient_id: recipientCoachId,
      sender_id: user?.id || null,
      type: 'displacement_created',
      title: 'Nuevo desplazamiento',
      message: `${senderName} ha creado un desplazamiento a ${destination} para el ${formattedDate}. Añade las jugadoras de tu equipo.`,
      related_player_id: null,
      related_event_id: eventId,
    });
  };

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    createNotification,
    notifyPlayerSummoned,
    notifyDisplacementCreated,
    refetch: fetchNotifications,
  };
}
