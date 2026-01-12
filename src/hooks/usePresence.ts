import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface OnlineUser {
  id: string;
  name: string;
  online_at: string;
}

export function usePresence(channelName: string = 'app-presence') {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Map<string, OnlineUser>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = new Map<string, OnlineUser>();
        
        Object.entries(state).forEach(([key, presences]) => {
          if (presences && presences.length > 0) {
            const presence = presences[0] as unknown as { id: string; name: string; online_at: string };
            users.set(key, {
              id: presence.id,
              name: presence.name,
              online_at: presence.online_at,
            });
          }
        });
        
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (newPresences && newPresences.length > 0) {
          const presence = newPresences[0] as unknown as { id: string; name: string; online_at: string };
          setOnlineUsers(prev => {
            const updated = new Map(prev);
            updated.set(key, {
              id: presence.id,
              name: presence.name,
              online_at: presence.online_at,
            });
            return updated;
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => {
          const updated = new Map(prev);
          updated.delete(key);
          return updated;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Fetch user profile name
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', user.id)
            .single();

          await channel.track({
            id: user.id,
            name: profile?.name || 'Usuario',
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [user, channelName]);

  const isOnline = useCallback((userId: string) => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  const getOnlineUsersList = useCallback(() => {
    return Array.from(onlineUsers.values());
  }, [onlineUsers]);

  return {
    onlineUsers,
    isOnline,
    getOnlineUsersList,
    onlineCount: onlineUsers.size,
  };
}

// Hook for conversation-specific presence
export function useConversationPresence(conversationId: string | null) {
  const { user } = useAuth();
  const [viewingUsers, setViewingUsers] = useState<Map<string, { id: string; name: string }>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user || !conversationId) {
      setViewingUsers(new Map());
      return;
    }

    const channel = supabase.channel(`conversation-${conversationId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = new Map<string, { id: string; name: string }>();
        
        Object.entries(state).forEach(([key, presences]) => {
          if (presences && presences.length > 0) {
            const presence = presences[0] as unknown as { id: string; name: string };
            if (key !== user.id) { // Exclude self
              users.set(key, {
                id: presence.id,
                name: presence.name,
              });
            }
          }
        });
        
        setViewingUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key !== user.id && newPresences && newPresences.length > 0) {
          const presence = newPresences[0] as unknown as { id: string; name: string };
          setViewingUsers(prev => {
            const updated = new Map(prev);
            updated.set(key, {
              id: presence.id,
              name: presence.name,
            });
            return updated;
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setViewingUsers(prev => {
          const updated = new Map(prev);
          updated.delete(key);
          return updated;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', user.id)
            .single();

          await channel.track({
            id: user.id,
            name: profile?.name || 'Usuario',
          });
        }
      });

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [user, conversationId]);

  const isViewing = useCallback((userId: string) => {
    return viewingUsers.has(userId);
  }, [viewingUsers]);

  return {
    viewingUsers,
    isViewing,
    viewingCount: viewingUsers.size,
  };
}
