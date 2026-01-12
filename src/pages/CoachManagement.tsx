import { useState } from 'react';
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
import { toast } from 'sonner';
import { Users, Shield, Mail, CheckCircle, Clock, UserX, MessageSquare, Send } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Navigate, useNavigate } from 'react-router-dom';
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

interface CoachProfile {
  id: string;
  name: string;
  email: string;
  assigned_teams: string[] | null;
  created_at: string | null;
  role: 'coach' | 'director';
}

interface UserRole {
  user_id: string;
  role: 'coach' | 'director';
}

export default function CoachManagement() {
  const navigate = useNavigate();
  const { loading: roleLoading, profile: currentUserProfile, isDirector } = useUserRole();
  const { club, members: clubMembers, loading: clubLoading } = useClub();
  const { user } = useAuth();
  const { teams } = useTeams();
  const { getOrCreateDirectConversation } = useConversations();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);

  const handleDirectMessage = async (userId: string) => {
    const convId = await getOrCreateDirectConversation(userId);
    if (convId) {
      navigate('/messages');
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
    return <Navigate to="/" replace />;
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

        {/* Send Message Button */}
        {coaches.length > 0 && (
          <Button 
            onClick={openMessageDialog}
            className="w-full gap-2"
            variant="outline"
          >
            <MessageSquare className="h-4 w-4" />
            Enviar comunicación a entrenadores
          </Button>
        )}

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

                return (
                  <div
                    key={coach.id}
                    className="p-3 rounded-lg border border-border bg-card"
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
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDirectMessage(coach.id)}
                        className="gap-1"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Mensaje
                      </Button>
                      {!hasCoachRole ? (
                        <Button
                          size="sm"
                          onClick={() => handleAssignCoachRole(coach.id)}
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
                          onClick={() => handleRemoveCoachRole(coach.id)}
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

      <BottomNav />
    </div>
  );
}
