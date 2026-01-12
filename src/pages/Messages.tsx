import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { useConversations, Message } from '@/hooks/useConversations';
import { useAuth } from '@/hooks/useAuth';
import { useClub } from '@/hooks/useClub';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { MessageSquare, Send, ArrowLeft, Users, Plus, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';

export default function Messages() {
  const { user } = useAuth();
  const { club, members: clubMembers } = useClub();
  const { conversations, loading, sendMessage, markAsRead, createConversation, refetch } = useConversations();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // New conversation dialog
  const [newConvDialogOpen, setNewConvDialogOpen] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [convTitle, setConvTitle] = useState('');
  const [creatingConv, setCreatingConv] = useState(false);

  // Fetch profiles for club members
  const { data: profiles } = useQuery({
    queryKey: ['club-profiles', club?.id],
    queryFn: async () => {
      if (!club || !clubMembers.length) return [];
      const userIds = clubMembers.map(m => m.user_id);
      const { data } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);
      return data || [];
    },
    enabled: !!club && clubMembers.length > 0,
  });

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setMessagesLoading(true);
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConversationId)
        .order('created_at', { ascending: true });
      
      setMessages((data || []) as Message[]);
      setMessagesLoading(false);
      
      // Mark as read
      await markAsRead(selectedConversationId);
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages-${selectedConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversationId}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
          markAsRead(selectedConversationId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversationId, markAsRead]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConversationId) return;
    
    setSending(true);
    const success = await sendMessage(selectedConversationId, newMessage.trim());
    if (success) {
      setNewMessage('');
    }
    setSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Ayer ' + format(date, 'HH:mm');
    }
    return format(date, 'd MMM HH:mm', { locale: es });
  };

  const getConversationTitle = (conv: typeof conversations[0]) => {
    if (conv.title) return conv.title;
    if (!conv.is_group) {
      const otherParticipant = conv.participants.find(p => p.user_id !== user?.id);
      return otherParticipant?.name || 'Conversación';
    }
    return conv.participants.filter(p => p.user_id !== user?.id).map(p => p.name).join(', ');
  };

  const getSenderName = (senderId: string) => {
    if (senderId === user?.id) return 'Tú';
    const conv = selectedConversation;
    const participant = conv?.participants.find(p => p.user_id === senderId);
    return participant?.name || 'Usuario';
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateConversation = async () => {
    if (selectedParticipants.length === 0) return;
    
    setCreatingConv(true);
    const convId = await createConversation(
      selectedParticipants,
      selectedParticipants.length > 1 ? convTitle || undefined : undefined
    );
    
    if (convId) {
      setSelectedConversationId(convId);
      setNewConvDialogOpen(false);
      setSelectedParticipants([]);
      setConvTitle('');
      await refetch();
    }
    setCreatingConv(false);
  };

  const otherMembers = profiles?.filter(p => p.id !== user?.id) || [];

  // Conversation list view
  if (!selectedConversationId) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Mensajes" showBack />

        <div className="p-4 space-y-4">
          <Button
            onClick={() => setNewConvDialogOpen(true)}
            className="w-full gap-2"
          >
            <Plus className="h-4 w-4" />
            Nueva conversación
          </Button>

          {loading ? (
            <>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </>
          ) : conversations.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No tienes conversaciones</p>
                <p className="text-sm text-muted-foreground">Inicia una nueva conversación con un entrenador o director</p>
              </CardContent>
            </Card>
          ) : (
            conversations.map(conv => (
              <Card
                key={conv.id}
                className={`cursor-pointer transition-colors hover:bg-accent/50 ${conv.unreadCount > 0 ? 'border-primary' : ''}`}
                onClick={() => setSelectedConversationId(conv.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {conv.is_group && <Users className="h-4 w-4 text-muted-foreground" />}
                        <p className="font-medium truncate">{getConversationTitle(conv)}</p>
                        {conv.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                      {conv.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {conv.lastMessage.sender_id === user?.id ? 'Tú: ' : ''}
                          {conv.lastMessage.content}
                        </p>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatMessageTime(conv.lastMessage.created_at)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* New Conversation Dialog */}
        <Dialog open={newConvDialogOpen} onOpenChange={setNewConvDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nueva conversación</DialogTitle>
              <DialogDescription>
                Selecciona los participantes para la conversación
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {selectedParticipants.length > 1 && (
                <div className="space-y-2">
                  <Label>Nombre del grupo (opcional)</Label>
                  <Input
                    placeholder="Ej: Coordinadores"
                    value={convTitle}
                    onChange={(e) => setConvTitle(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Participantes</Label>
                <div className="border rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
                  {otherMembers.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-accent/50"
                      onClick={() => toggleParticipant(member.id)}
                    >
                      <Checkbox
                        checked={selectedParticipants.includes(member.id)}
                        onCheckedChange={() => toggleParticipant(member.id)}
                      />
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedParticipants.length} seleccionado(s)
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setNewConvDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateConversation}
                disabled={selectedParticipants.length === 0 || creatingConv}
              >
                {creatingConv ? 'Creando...' : 'Crear'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <BottomNav />
      </div>
    );
  }

  // Chat view
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Chat Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedConversationId(null)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {selectedConversation && getConversationTitle(selectedConversation)}
            </p>
            {selectedConversation?.is_group && (
              <p className="text-xs text-muted-foreground">
                {selectedConversation.participants.length} participantes
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messagesLoading ? (
          <>
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-12 w-3/4 ml-auto" />
          </>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No hay mensajes aún</p>
            <p className="text-sm text-muted-foreground">Envía el primer mensaje</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    isMe
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted rounded-bl-md'
                  }`}
                >
                  {selectedConversation?.is_group && !isMe && (
                    <p className="text-xs font-medium mb-1 opacity-70">
                      {getSenderName(msg.sender_id)}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {format(new Date(msg.created_at), 'HH:mm')}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="sticky bottom-0 bg-background border-t p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Escribe un mensaje..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
