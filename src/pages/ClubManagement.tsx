import { useState } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClub } from '@/hooks/useClub';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Building2,
  Users,
  Link2,
  Copy,
  Trash2,
  UserPlus,
  Crown,
  User,
  Loader2,
  Settings,
  Mail,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MemberWithProfile {
  id: string;
  user_id: string;
  role: 'coach' | 'director';
  joined_at: string;
  profile?: {
    name: string;
    email: string;
  };
}

export default function ClubManagement() {
  const {
    club,
    members,
    invitations,
    isDirector,
    createInvitation,
    deleteInvitation,
    updateClub,
    removeMember,
    refetch,
  } = useClub();

  const [clubName, setClubName] = useState(club?.name || '');
  const [saving, setSaving] = useState(false);
  const [inviteRole, setInviteRole] = useState<'coach' | 'director'>('coach');
  const [inviteEmail, setInviteEmail] = useState('');
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [membersWithProfiles, setMembersWithProfiles] = useState<MemberWithProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  // Fetch member profiles
  useState(() => {
    const fetchProfiles = async () => {
      if (members.length === 0) {
        setLoadingProfiles(false);
        return;
      }

      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      const enriched = members.map(member => ({
        ...member,
        profile: profiles?.find(p => p.id === member.user_id),
      }));

      setMembersWithProfiles(enriched);
      setLoadingProfiles(false);
    };

    fetchProfiles();
  });

  const handleSaveClub = async () => {
    if (!clubName.trim()) {
      toast.error('El nombre del club es obligatorio');
      return;
    }

    setSaving(true);
    const success = await updateClub({ name: clubName.trim() });
    setSaving(false);

    if (success) {
      toast.success('Club actualizado');
    } else {
      toast.error('Error al actualizar el club');
    }
  };

  const handleCreateInvitation = async () => {
    setCreatingInvite(true);
    const invitation = await createInvitation(inviteRole, inviteEmail || undefined);
    setCreatingInvite(false);

    if (invitation) {
      toast.success('Invitación creada');
      setInviteEmail('');
    } else {
      toast.error('Error al crear la invitación');
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/club-onboarding?invite=${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Enlace copiado al portapapeles');
  };

  const handleDeleteInvitation = async (id: string) => {
    const success = await deleteInvitation(id);
    if (success) {
      toast.success('Invitación eliminada');
    } else {
      toast.error('Error al eliminar la invitación');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const success = await removeMember(memberId);
    if (success) {
      toast.success('Miembro eliminado');
      refetch();
    } else {
      toast.error('Error al eliminar el miembro');
    }
  };

  if (!club) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Gestión del Club" showBack />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Gestión del Club" showBack />

      <div className="p-4">
        <Tabs defaultValue="general">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="general" className="flex-1 gap-1">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="members" className="flex-1 gap-1">
              <Users className="h-4 w-4" />
              Miembros
            </TabsTrigger>
            <TabsTrigger value="invitations" className="flex-1 gap-1">
              <Link2 className="h-4 w-4" />
              Invitaciones
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Información del Club
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clubName">Nombre del club</Label>
                  <Input
                    id="clubName"
                    value={clubName}
                    onChange={(e) => setClubName(e.target.value)}
                    disabled={!isDirector}
                  />
                </div>

                {isDirector && (
                  <Button onClick={handleSaveClub} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Guardar cambios
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Miembros del Club
                </CardTitle>
                <CardDescription>
                  {members.length} miembro{members.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingProfiles ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  membersWithProfiles.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {member.role === 'director' ? (
                            <Crown className="h-5 w-5 text-primary" />
                          ) : (
                            <User className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {member.profile?.name || 'Usuario'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {member.profile?.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={member.role === 'director' ? 'default' : 'secondary'}
                        >
                          {member.role === 'director' ? 'Director' : 'Entrenador'}
                        </Badge>
                        {isDirector && member.role !== 'director' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  ¿Eliminar miembro?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {member.profile?.name} será eliminado del club.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveMember(member.id)}
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Crear Invitación
                </CardTitle>
                <CardDescription>
                  Genera un enlace para invitar a nuevos miembros
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Rol del invitado</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(v) => setInviteRole(v as 'coach' | 'director')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="coach">Entrenador</SelectItem>
                        <SelectItem value="director">Director Deportivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Email (opcional)</Label>
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email@ejemplo.com"
                    />
                  </div>
                </div>
                <Button onClick={handleCreateInvitation} disabled={creatingInvite}>
                  {creatingInvite ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Link2 className="h-4 w-4 mr-2" />
                  )}
                  Crear invitación
                </Button>
              </CardContent>
            </Card>

            {invitations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Invitaciones pendientes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {invitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {inv.role === 'director' ? 'Director' : 'Entrenador'}
                          </Badge>
                          {inv.email && (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {inv.email}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          Expira: {new Date(inv.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyInviteLink(inv.token)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteInvitation(inv.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
}
