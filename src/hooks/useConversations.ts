import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useClub } from './useClub';

export interface Conversation {
  id: string;
  club_id: string;
  title: string | null;
  is_group: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface ConversationWithDetails extends Conversation {
  participants: Array<{
    user_id: string;
    name: string;
    email: string;
    last_read_at: string | null;
  }>;
  lastMessage: Message | null;
  unreadCount: number;
}

export function useConversations() {
  const { user } = useAuth();
  const { club } = useClub();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);

  const fetchConversations = useCallback(async () => {
    if (!user || !club) {
      setLoading(false);
      return;
    }

    try {
      // Get conversations where user is a participant
      const { data: participantData } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id);

      if (!participantData || participantData.length === 0) {
        setConversations([]);
        setTotalUnread(0);
        setLoading(false);
        return;
      }

      const conversationIds = participantData.map(p => p.conversation_id);
      const lastReadMap = new Map(participantData.map(p => [p.conversation_id, p.last_read_at]));

      // Fetch conversations
      const { data: convData } = await supabase
        .from('conversations')
        .select('*')
        .in('id', conversationIds)
        .order('updated_at', { ascending: false });

      if (!convData) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Fetch all participants for these conversations
      const { data: allParticipants } = await supabase
        .from('conversation_participants')
        .select('*')
        .in('conversation_id', conversationIds);

      // Get unique user IDs
      const userIds = [...new Set(allParticipants?.map(p => p.user_id) || [])];

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Fetch last message for each conversation
      const conversationsWithDetails: ConversationWithDetails[] = await Promise.all(
        convData.map(async (conv) => {
          // Get last message
          const { data: lastMsgData } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Count unread messages
          const myLastRead = lastReadMap.get(conv.id);
          let unreadCount = 0;
          
          if (myLastRead) {
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .gt('created_at', myLastRead)
              .neq('sender_id', user.id);
            unreadCount = count || 0;
          } else {
            // Never read - count all messages not from me
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .neq('sender_id', user.id);
            unreadCount = count || 0;
          }

          // Get participants with profile info
          const convParticipants = allParticipants
            ?.filter(p => p.conversation_id === conv.id)
            .map(p => {
              const profile = profileMap.get(p.user_id);
              return {
                user_id: p.user_id,
                name: profile?.name || 'Usuario',
                email: profile?.email || '',
                last_read_at: p.last_read_at,
              };
            }) || [];

          return {
            ...conv,
            participants: convParticipants,
            lastMessage: lastMsgData as Message | null,
            unreadCount,
          };
        })
      );

      // Sort by last message or updated_at
      conversationsWithDetails.sort((a, b) => {
        const aTime = a.lastMessage?.created_at || a.updated_at;
        const bTime = b.lastMessage?.created_at || b.updated_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setConversations(conversationsWithDetails);
      setTotalUnread(conversationsWithDetails.reduce((sum, c) => sum + c.unreadCount, 0));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user, club]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Subscribe to new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  const createConversation = useCallback(
    async (participantIds: string[], title?: string) => {
      if (!user || !club) return null;

      try {
        // Check if 1-to-1 conversation already exists
        if (participantIds.length === 1) {
          const existingConv = conversations.find(
            (c) =>
              !c.is_group &&
              c.participants.length === 2 &&
              c.participants.some((p) => p.user_id === participantIds[0])
          );
          if (existingConv) return existingConv.id;
        }

        // Create conversation
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            club_id: club.id,
            title: title || null,
            is_group: participantIds.length > 1,
            created_by: user.id,
          })
          .select()
          .single();

        if (convError) throw convError;

        // Add creator as participant
        const { error: creatorParticipantError } = await supabase
          .from('conversation_participants')
          .insert({
            conversation_id: newConv.id,
            user_id: user.id,
          });

        if (creatorParticipantError) throw creatorParticipantError;

        // Add other participants
        for (const userId of participantIds) {
          const { error: participantError } = await supabase
            .from('conversation_participants')
            .insert({
              conversation_id: newConv.id,
              user_id: userId,
            });

          if (participantError) throw participantError;
        }

        await fetchConversations();
        return newConv.id;
      } catch (error) {
        console.error('Error creating conversation:', error);
        return null;
      }
    },
    [user, club, conversations, fetchConversations]
  );

  const sendMessage = useCallback(
    async (conversationId: string, content: string) => {
      if (!user) return false;

      try {
        const { error } = await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
        });

        if (error) throw error;

        // Update conversation updated_at
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);

        return true;
      } catch (error) {
        console.error('Error sending message:', error);
        return false;
      }
    },
    [user]
  );

  const markAsRead = useCallback(
    async (conversationId: string) => {
      if (!user) return;

      try {
        await supabase
          .from('conversation_participants')
          .update({ last_read_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id);

        await fetchConversations();
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    },
    [user, fetchConversations]
  );

  const getOrCreateDirectConversation = useCallback(
    async (otherUserId: string) => {
      // Check if already exists
      const existing = conversations.find(
        (c) =>
          !c.is_group &&
          c.participants.length === 2 &&
          c.participants.some((p) => p.user_id === otherUserId)
      );

      if (existing) return existing.id;

      return await createConversation([otherUserId]);
    },
    [conversations, createConversation]
  );

  return {
    conversations,
    loading,
    totalUnread,
    createConversation,
    sendMessage,
    markAsRead,
    getOrCreateDirectConversation,
    refetch: fetchConversations,
  };
}
