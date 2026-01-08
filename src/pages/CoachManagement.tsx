import { useState } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTeams } from '@/hooks/useTeams';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import { Users, Shield, Mail, CheckCircle, Clock, UserX } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Navigate } from 'react-router-dom';

interface CoachProfile {
  id: string;
  name: string;
  email: string;
  assigned_teams: string[] | null;
  created_at: string | null;
}

interface UserRole {
  user_id: string;
  role: 'coach' | 'director';
}

export default function CoachManagement() {
  const { isDirector, loading: roleLoading } = useUserRole();
  const { teams } = useTeams();
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch all profiles (coaches)
  const { data: profiles, isLoading: profilesLoading, refetch } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CoachProfile[];
    },
  });

  // Fetch all user roles
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
    return getUserRoles(userId).includes('director');
  };

  const handleAssignCoachRole = async (userId: string) => {
    setProcessingId(userId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'coach' as const });
      
      if (error) throw error;
      toast.success('Rol de entrenador asignado');
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
      refetch();
    } catch (error) {
      toast.error('Error al eliminar rol');
    }
    setProcessingId(null);
  };

  if (roleLoading) {
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

  // Only directors can access this page
  if (!isDirector) {
    return <Navigate to="/" replace />;
  }

  const loading = profilesLoading || rolesLoading;

  // Filter out directors from the list (they manage themselves)
  const coaches = profiles?.filter(p => !isUserDirector(p.id)) || [];
  const directors = profiles?.filter(p => isUserDirector(p.id)) || [];

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
                          Revocar Acceso
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
      <BottomNav />
    </div>
  );
}
