import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  User, Mail, Phone, Calendar, Shield, Users, 
  MessageSquare, Save, Trash2, FileCheck, FileX, Edit2, X 
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useConversations } from '@/hooks/useConversations';
import { Team } from '@/types/volleyball';

interface CoachProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  assigned_teams: string[] | null;
  created_at: string | null;
  role: 'coach' | 'director';
  responsibility_code_accepted_at: string | null;
}

interface CoachDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coach: CoachProfile | null;
  teams: Team[];
  onCoachUpdated: () => void;
  onCoachDeleted: () => void;
  currentUserId?: string;
}

export function CoachDetailDialog({
  open,
  onOpenChange,
  coach,
  teams,
  onCoachUpdated,
  onCoachDeleted,
  currentUserId,
}: CoachDetailDialogProps) {
  const navigate = useNavigate();
  const { getOrCreateDirectConversation } = useConversations();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [messagingLoading, setMessagingLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Editable fields
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  useEffect(() => {
    if (coach) {
      setSelectedTeams(coach.assigned_teams || []);
      setIsEditing(false);
      setConfirmDelete(false);
    }
  }, [coach]);

  const toggleTeam = (teamId: string) => {
    setSelectedTeams(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleSave = async () => {
    if (!coach) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ assigned_teams: selectedTeams })
        .eq('id', coach.id);

      if (error) throw error;

      toast.success('Equipos asignados correctamente');
      setIsEditing(false);
      onCoachUpdated();
    } catch (error) {
      console.error('Error updating coach:', error);
      toast.error('Error al actualizar el entrenador');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!coach) return;
    setDeleting(true);

    try {
      // Remove from club_members
      const { error: memberError } = await supabase
        .from('club_members')
        .delete()
        .eq('user_id', coach.id);

      if (memberError) throw memberError;

      // Remove from user_roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', coach.id)
        .eq('role', 'coach');

      toast.success('Entrenador eliminado del club');
      onOpenChange(false);
      onCoachDeleted();
    } catch (error) {
      console.error('Error deleting coach:', error);
      toast.error('Error al eliminar el entrenador');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleDirectMessage = async () => {
    if (!coach) return;
    setMessagingLoading(true);

    try {
      const res = await getOrCreateDirectConversation(coach.id);
      if (res.id) {
        onOpenChange(false);
        navigate('/messages', { state: { openConversationId: res.id } });
      } else {
        toast.error(res.error || 'Error al crear la conversación');
      }
    } catch (error) {
      console.error('Error creating direct message:', error);
      toast.error('Error al crear la conversación');
    } finally {
      setMessagingLoading(false);
    }
  };

  if (!coach) return null;

  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || teamId;
  };

  const hasAcceptedCode = !!coach.responsibility_code_accepted_at;
  const isCurrentUser = coach.id === currentUserId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil del Entrenador
          </DialogTitle>
          <DialogDescription>
            Información y gestión del entrenador
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Basic Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{coach.name}</h3>
              <Badge variant={coach.role === 'director' ? 'default' : 'secondary'}>
                {coach.role === 'director' ? (
                  <>
                    <Shield className="h-3 w-3 mr-1" />
                    Director
                  </>
                ) : (
                  <>
                    <Users className="h-3 w-3 mr-1" />
                    Entrenador
                  </>
                )}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${coach.email}`} className="text-primary hover:underline">
                  {coach.email}
                </a>
              </div>
              
              {coach.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${coach.phone}`} className="text-primary hover:underline">
                    {coach.phone}
                  </a>
                </div>
              )}

              {coach.created_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Registrado: {format(new Date(coach.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                </div>
              )}
            </div>

            {/* Responsibility Code Status */}
            <div className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
              hasAcceptedCode 
                ? 'bg-green-500/10 text-green-700' 
                : 'bg-amber-500/10 text-amber-700'
            }`}>
              {hasAcceptedCode ? (
                <>
                  <FileCheck className="h-4 w-4" />
                  <span>
                    Código aceptado el {format(new Date(coach.responsibility_code_accepted_at!), "d MMM yyyy", { locale: es })}
                  </span>
                </>
              ) : (
                <>
                  <FileX className="h-4 w-4" />
                  <span>Código de responsabilidad pendiente</span>
                </>
              )}
            </div>
          </div>

          {/* Teams Assignment */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Equipos asignados</Label>
              {!isEditing && !isCurrentUser && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-1 h-7"
                >
                  <Edit2 className="h-3 w-3" />
                  Editar
                </Button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2 border rounded-lg p-3">
                {teams.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay equipos creados</p>
                ) : (
                  teams.map(team => (
                    <div
                      key={team.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-accent/50 cursor-pointer"
                      onClick={() => toggleTeam(team.id)}
                    >
                      <Checkbox
                        checked={selectedTeams.includes(team.id)}
                        onCheckedChange={() => toggleTeam(team.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: team.color }}
                      />
                      <span className="text-sm">{team.name}</span>
                    </div>
                  ))
                )}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedTeams(coach.assigned_teams || []);
                      setIsEditing(false);
                    }}
                    disabled={saving}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    {saving ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {coach.assigned_teams && coach.assigned_teams.length > 0 ? (
                  coach.assigned_teams.map(teamId => (
                    <Badge key={teamId} variant="outline" className="text-xs">
                      {getTeamName(teamId)}
                    </Badge>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">Sin equipos asignados</p>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
          {!isCurrentUser && (
            <>
              <Button
                variant="outline"
                onClick={handleDirectMessage}
                disabled={messagingLoading}
                className="gap-2 w-full sm:w-auto"
              >
                <MessageSquare className="h-4 w-4" />
                {messagingLoading ? 'Abriendo...' : 'Enviar mensaje'}
              </Button>

              {confirmDelete ? (
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                    size="sm"
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                    size="sm"
                    className="gap-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deleting ? 'Eliminando...' : 'Confirmar'}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setConfirmDelete(true)}
                  className="gap-2 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar del club
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}