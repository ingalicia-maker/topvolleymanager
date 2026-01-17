import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTeams } from '@/hooks/useTeams';
import { useUserRole } from '@/hooks/useUserRole';
import { useClub } from '@/hooks/useClub';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import { Users, Shield, Mail, Phone, CheckCircle, Clock, UserX, MessageSquare, Send, FileCheck, FileX, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useConversations } from '@/hooks/useConversations';
import { CoachDetailDialog } from '@/components/CoachDetailDialog';

interface CoachProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  assigned_teams: string[] | null;
  created_at: string | null;
  role: 'coach' | 'director';
  responsibility_code_accepted_at: string | null;
  terms_accepted_at: string | null;
}

interface UserRole {
  user_id: string;
  role: 'coach' | 'director';
}

export default function CoachManagement() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loading: roleLoading, profile: currentUserProfile, isDirector } = useUserRole();
  const { club, members: clubMembers, loading: clubLoading } = useClub();
  const { user } = useAuth();
  const { teams } = useTeams();
  const { maxCoaches, isPaidPlan } = useSubscription();
  const { getOrCreateDirectConversation, createConversation } = useConversations();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [groupChatDialogOpen, setGroupChatDialogOpen] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [groupChatTitle, setGroupChatTitle] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [creatingGroupChat, setCreatingGroupChat] = useState(false);
  
  // Coach detail dialog
  const [selectedCoach, setSelectedCoach] = useState<CoachProfile | null>(null);
  const [coachDetailOpen, setCoachDetailOpen] = useState(false);

  const handleDirectMessage = async (userId: string) => {
    try {
      setProcessingId(userId);
      const res = await getOrCreateDirectConversation(userId);
      if (res.id) {
        navigate('/messages', { state: { openConversationId: res.id } });
      } else {
        toast.error(res.error || 'Error al crear la conversación');
      }
    } catch (error) {
      console.error('Error creating direct message:', error);
      toast.error('Error al crear la conversación');
    } finally {
      setProcessingId(null);
    }
  };

  // Fetch profiles for club members only
  const { data: profiles, isLoading: profilesLoading, refetch } = useQuery({
    queryKey: ['club-member-profiles', club?.id],
    queryFn: async () => {
      if (!club?.id || !clubMembers.length) return [];
      
      const memberUserIds = clubMembers.map(m => m.user_id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', memberUserIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Enrich profiles with role from club_members
      return data.map(profile => {
        const member = clubMembers.find(m => m.user_id === profile.id);
        return {
          ...profile,
          role: member?.role || 'coach'
        } as CoachProfile;
      });
    },
    enabled: !!club?.id && clubMembers.length > 0,
  });

  // Fetch all user roles for approved status
  const { data: userRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ['all-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (error) throw error;
      return data as UserRole[];
    },
  });

  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || teamId;
  };

  const getUserRoles = (userId: string) => {
    return userRoles?.filter(r => r.user_id === userId).map(r => r.role) || [];
  };

  const isUserDirector = (userId: string) => {
    const profile = profiles?.find(p => p.id === userId);
    return profile?.role === 'director';
  };

  const handleAssignCoachRole = async (userId: string) => {
    setProcessingId(userId);
    try {
      const coach = profiles?.find(p => p.id === userId);
      
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'coach' as const });
      
      if (error) throw error;

      if (coach) {
        try {
          await supabase.functions.invoke('notify-coach-approved', {
            body: {
              coachEmail: coach.email,
              coachName: coach.name,
              approvedBy: currentUserProfile?.name || 'Director Deportivo'
            }
          });
        } catch (emailError) {
          console.error('Error sending approval email:', emailError);
        }
      }
      
      toast.success('Entrenador aprobado correctamente');
      queryClient.invalidateQueries({ queryKey: ['all-user-roles'] });
      refetch();
    } catch (error) {
      toast.error('Error al asignar rol');
    }
    setProcessingId(null);
  };

  const handleRemoveCoachRole = async (userId: string) => {
    setProcessingId(userId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'coach');
      
      if (error) throw error;
      toast.success('Rol de entrenador eliminado');
      queryClient.invalidateQueries({ queryKey: ['all-user-roles'] });
      refetch();
    } catch (error) {
      toast.error('Error al eliminar rol');
    }
    setProcessingId(null);
  };

  const openMessageDialog = () => {
    setMessageTitle('');
    setMessageContent('');
    setSelectedRecipients(coaches.map(c => c.id)); // Select all coaches by default
    setMessageDialogOpen(true);
  };

  const toggleRecipient = (userId: string) => {
    setSelectedRecipients(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllCoaches = () => {
    setSelectedRecipients(coaches.map(c => c.id));
  };

  const deselectAllCoaches = () => {
    setSelectedRecipients([]);
  };

  const openGroupChatDialog = () => {
    setGroupChatTitle('');
    setSelectedGroupMembers([]);
    setGroupChatDialogOpen(true);
  };

  const toggleGroupMember = (userId: string) => {
    setSelectedGroupMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroupChat = async () => {
    if (selectedGroupMembers.length === 0) {
      toast.error('Selecciona al menos un participante');
      return;
    }

    setCreatingGroupChat(true);
    try {
      const res = await createConversation(
        selectedGroupMembers,
        groupChatTitle.trim() || undefined
      );

      if (res.id) {
        toast.success('Conversación grupal creada');
        setGroupChatDialogOpen(false);
        navigate('/messages', { state: { openConversationId: res.id } });
      } else {
        toast.error(res.error || 'Error al crear la conversación');
      }
    } catch (error) {
      console.error('Error creating group chat:', error);
      toast.error('Error al crear la conversación');
    }
    setCreatingGroupChat(false);
  };

  const handleSendMessage = async () => {
    if (!messageTitle.trim() || !messageContent.trim()) {
      toast.error('Por favor completa el título y el mensaje');
      return;
    }

    if (selectedRecipients.length === 0) {
      toast.error('Selecciona al menos un destinatario');
      return;
    }

    setSendingMessage(true);
    try {
      // Create notifications for all selected recipients
      const notifications = selectedRecipients.map(recipientId => ({
        recipient_id: recipientId,
        sender_id: user?.id || null,
        type: 'director_message',
        title: messageTitle.trim(),
        message: messageContent.trim(),
        is_read: false,
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;

      toast.success(`Mensaje enviado a ${selectedRecipients.length} entrenador(es)`);
      setMessageDialogOpen(false);
      setMessageTitle('');
      setMessageContent('');
      setSelectedRecipients([]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar el mensaje');
    }
    setSendingMessage(false);
  };

  if (roleLoading || clubLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Gestión de Entrenadores" showBack />
        <div className="p-4 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!isDirector) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Gestión de Entrenadores" showBack />
        <div className="p-4">
          <Card>
            <CardContent className="p-4">
              <p className="font-medium">No tienes permisos para ver esta sección.</p>
              <p className="text-sm text-muted-foreground mt-1">Necesitas rol de Director Deportivo.</p>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  const loading = profilesLoading || rolesLoading;

  // Filter by role from club_members
  const coaches = profiles?.filter(p => p.role === 'coach') || [];
  const directors = profiles?.filter(p => p.role === 'director') || [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Gestión de Entrenadores" showBack />

      <div className="p-4 space-y-4">
        {/* Stats Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{coaches.length}</p>
                <p className="text-xs text-muted-foreground">Entrenadores</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-500">{directors.length}</p>
                <p className="text-xs text-muted-foreground">Directores</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-muted-foreground">{teams.length}</p>
                <p className="text-xs text-muted-foreground">Equipos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {coaches.length > 0 && (
            <Button 
              onClick={openMessageDialog}
              className="gap-2"
              variant="outline"
            >
              <Send className="h-4 w-4" />
              Notificación
            </Button>
          )}
          <Button 
            onClick={openGroupChatDialog}
            className="gap-2"
            variant="outline"
          >
            <MessageSquare className="h-4 w-4" />
            Nueva conversación
          </Button>
        </div>

        {/* Directors Section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-amber-500" />
              Directores Deportivos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : directors.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay directores deportivos
              </p>
            ) : (
              directors.map(director => (
                <div
                  key={director.id}
                  className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{director.name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {director.email}
                      </div>
                      {director.created_at && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Registrado: {format(new Date(director.created_at), "d MMM yyyy", { locale: es })}
                        </div>
                      )}
                    </div>
                    <Badge className="bg-amber-500">
                      <Shield className="h-3 w-3 mr-1" />
                      Director
                    </Badge>
                  </div>
                  {director.id !== user?.id && (
                    <div className="mt-3 pt-3 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDirectMessage(director.id)}
                        disabled={processingId === director.id}
                        className="gap-1"
                      >
                        <MessageSquare className="h-4 w-4" />
                        {processingId === director.id ? 'Creando...' : 'Mensaje'}
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Coaches Section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Entrenadores Registrados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </>
            ) : coaches.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay entrenadores registrados
              </p>
            ) : (
              coaches.map(coach => {
                const hasCoachRole = getUserRoles(coach.id).includes('coach');
                const hasTeams = coach.assigned_teams && coach.assigned_teams.length > 0;
                const hasAcceptedCode = !!coach.responsibility_code_accepted_at;

                return (
                  <div
                    key={coach.id}
                    className="p-3 rounded-lg border border-border bg-card cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => {
                      setSelectedCoach(coach);
                      setCoachDetailOpen(true);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{coach.name}</p>
                          {hasCoachRole && (
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Aprobado
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {coach.email}
                        </div>
                        {coach.phone && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {coach.phone}
                          </div>
                        )}
                        {coach.created_at && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(new Date(coach.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                          </div>
                        )}
                        {hasTeams && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {coach.assigned_teams!.map(teamId => (
                              <Badge key={teamId} variant="outline" className="text-xs">
                                {getTeamName(teamId)}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {/* Responsibility code acceptance status */}
                        <div className="flex items-center gap-1 text-xs mt-2">
                          {hasAcceptedCode ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <FileCheck className="h-3 w-3" />
                              Código de responsabilidad aceptado ({format(new Date(coach.responsibility_code_accepted_at!), "d MMM yyyy", { locale: es })})
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-600">
                              <FileX className="h-3 w-3" />
                              Código de responsabilidad pendiente
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCoach(coach);
                          setCoachDetailOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-3 pt-3 border-t flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDirectMessage(coach.id);
                        }}
                        className="gap-1"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Mensaje
                      </Button>
                      {!hasCoachRole ? (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAssignCoachRole(coach.id);
                          }}
                          disabled={processingId === coach.id}
                          className="flex-1 gap-1"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Aprobar
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCoachRole(coach.id);
                          }}
                          disabled={processingId === coach.id}
                          className="flex-1 gap-1 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <UserX className="h-4 w-4" />
                          Revocar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Enviar comunicación
            </DialogTitle>
            <DialogDescription>
              Envía un mensaje a los entrenadores seleccionados. Aparecerá en sus notificaciones.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message-title">Título</Label>
              <Input
                id="message-title"
                placeholder="Ej: Reunión de coordinación"
                value={messageTitle}
                onChange={(e) => setMessageTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message-content">Mensaje</Label>
              <Textarea
                id="message-content"
                placeholder="Escribe tu mensaje aquí..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Destinatarios</Label>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={selectAllCoaches}
                  >
                    Todos
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={deselectAllCoaches}
                  >
                    Ninguno
                  </Button>
                </div>
              </div>
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                {coaches.map(coach => (
                  <div 
                    key={coach.id} 
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => toggleRecipient(coach.id)}
                  >
                     <Checkbox
                       checked={selectedRecipients.includes(coach.id)}
                       onCheckedChange={() => toggleRecipient(coach.id)}
                       onClick={(e) => e.stopPropagation()}
                     />
                    <span className="text-sm">{coach.name}</span>
                    <span className="text-xs text-muted-foreground">({coach.email})</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedRecipients.length} de {coaches.length} seleccionados
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setMessageDialogOpen(false)}
              disabled={sendingMessage}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSendMessage}
              disabled={sendingMessage || !messageTitle.trim() || !messageContent.trim() || selectedRecipients.length === 0}
              className="gap-2"
            >
              {sendingMessage ? (
                <>Enviando...</>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Chat Dialog */}
      <Dialog open={groupChatDialogOpen} onOpenChange={setGroupChatDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Nueva conversación
            </DialogTitle>
            <DialogDescription>
              Crea una conversación 1:1 o grupal con los entrenadores seleccionados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-title">Nombre del grupo (opcional)</Label>
              <Input
                id="group-title"
                placeholder="Ej: Coordinación Cadetes"
                value={groupChatTitle}
                onChange={(e) => setGroupChatTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Participantes</Label>
              <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
                {(profiles || []).filter(p => p.id !== user?.id).map(member => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer"
                    onClick={() => toggleGroupMember(member.id)}
                  >
                     <Checkbox
                       checked={selectedGroupMembers.includes(member.id)}
                       onCheckedChange={() => toggleGroupMember(member.id)}
                       onClick={(e) => e.stopPropagation()}
                     />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                    <Badge variant={member.role === 'director' ? 'default' : 'secondary'} className="text-xs shrink-0">
                      {member.role === 'director' ? 'Director' : 'Entrenador'}
                    </Badge>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedGroupMembers.length} participante(s) seleccionado(s)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setGroupChatDialogOpen(false)}
              disabled={creatingGroupChat}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateGroupChat}
              disabled={creatingGroupChat || selectedGroupMembers.length === 0}
              className="gap-2"
            >
              {creatingGroupChat ? (
                <>Creando...</>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4" />
                  Crear conversación
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Coach Detail Dialog */}
      <CoachDetailDialog
        open={coachDetailOpen}
        onOpenChange={setCoachDetailOpen}
        coach={selectedCoach}
        teams={teams}
        onCoachUpdated={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['all-user-roles'] });
        }}
        onCoachDeleted={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['all-user-roles'] });
        }}
        currentUserId={user?.id}
      />

      <BottomNav />
    </div>
  );
}
