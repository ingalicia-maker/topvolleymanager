import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useTeams } from '@/hooks/useTeams';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { useClub } from '@/hooks/useClub';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useSubscription } from '@/hooks/useSubscription';
import { LanguageSelector } from '@/components/LanguageSelector';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { User, Shield, Users, Save, LogOut, Settings, Bell, BellOff, Building2, Crown, Globe, Zap, FileCheck, FileX } from 'lucide-react';

export default function Profile() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { teams, loading: teamsLoading } = useTeams();
  const { profile, isDirector, assignedTeams, updateAssignedTeams, loading, roles } = useUserRole();
  const { signOut, user } = useAuth();
  const { club, isDirector: isClubDirector } = useClub();
  const { isSupported, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const { subscription, isPremium } = useSubscription();
  const [selectedTeams, setSelectedTeams] = useState<string[]>(assignedTeams);
  const [saving, setSaving] = useState(false);

  const handlePushToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  useEffect(() => {
    setSelectedTeams(assignedTeams);
  }, [assignedTeams]);

  const toggleTeam = (teamId: string) => {
    setSelectedTeams(prev =>
      prev.includes(teamId)
        ? prev.filter(t => t !== teamId)
        : [...prev, teamId]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    
    // Update assigned teams only - director role is managed via invitations
    const teamsSuccess = await updateAssignedTeams(selectedTeams);
    
    if (teamsSuccess) {
      toast.success('Perfil actualizado correctamente');
    } else {
      toast.error('Error al actualizar perfil');
    }
    setSaving(false);
  };

  const hasChanges = JSON.stringify(selectedTeams.sort()) !== JSON.stringify(assignedTeams.sort());

  if (loading || teamsLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Mi Perfil" showBack />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Mi Perfil" showBack />

      <div className="p-4 space-y-4">
        {/* User Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Información
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Nombre</p>
              <p className="font-medium">{profile?.name || 'Sin nombre'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{profile?.email}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Roles actuales:</p>
              <div className="flex flex-wrap gap-2">
                {isDirector && (
                  <Badge className="bg-amber-500 hover:bg-amber-600">
                    <Shield className="h-3 w-3 mr-1" />
                    Director Deportivo
                  </Badge>
                )}
                {assignedTeams.length > 0 && (
                  <Badge variant="secondary">
                    <Users className="h-3 w-3 mr-1" />
                    Entrenador
                  </Badge>
                )}
                {!isDirector && assignedTeams.length === 0 && (
                  <Badge variant="outline">Sin rol asignado</Badge>
                )}
              </div>
            </div>
            
            {/* Responsibility code acceptance status */}
            {profile?.responsibility_code_accepted_at ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <FileCheck className="h-5 w-5 text-green-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">Código de responsabilidad aceptado</p>
                  <p className="text-xs text-muted-foreground">
                    Aceptado el {new Date(profile.responsibility_code_accepted_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <FileX className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Código de responsabilidad pendiente</p>
                  <p className="text-xs text-muted-foreground">
                    Aún no has aceptado el código de responsabilidad del club
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Club Management - visible to all */}
        {club && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="font-medium">{club.name}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate('/club-management');
                }}
                className="w-full gap-2"
              >
                <Building2 className="h-4 w-4" />
                Gestión del Club
              </Button>
              {isClubDirector && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate('/coach-management');
                    }}
                    className="w-full gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Gestión de Entrenadores
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate('/club-settings');
                    }}
                    className="w-full gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Configuración Visual
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Opciones exclusivas de Director Deportivo
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Subscription & Language */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <Button
              variant="outline"
              onClick={() => navigate('/subscription')}
              className="w-full gap-2"
            >
              {isPremium ? <Crown className="h-4 w-4 text-amber-500" /> : <Zap className="h-4 w-4" />}
              {t('subscription.title')} - {isPremium ? t('subscription.premium') : `${subscription.creditsRemaining} ${t('subscription.creditsRemaining')}`}
            </Button>
            
            {subscription.isAdmin && (
              <Button
                variant="outline"
                onClick={() => navigate('/admin')}
                className="w-full gap-2 border-amber-500 text-amber-600"
              >
                <Crown className="h-4 w-4" />
                {t('admin.title')}
              </Button>
            )}
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4" />
                {t('profile.language')}
              </div>
              <LanguageSelector />
            </div>
          </CardContent>
        </Card>

        {/* Push Notifications */}
        {isSupported && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isSubscribed ? (
                    <Bell className="h-5 w-5 text-primary" />
                  ) : (
                    <BellOff className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">Notificaciones Push</p>
                    <p className="text-xs text-muted-foreground">
                      {isSubscribed ? 'Recibirás alertas en tu dispositivo' : 'Activa las alertas en tu dispositivo'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isSubscribed}
                  onCheckedChange={handlePushToggle}
                  disabled={pushLoading}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assigned Teams */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Equipos Asignados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Director role info - read only */}
            {isDirector && (
              <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-amber-500 bg-amber-500/10">
                <Shield className="h-5 w-5 text-amber-600" />
                <div className="flex-1">
                  <p className="font-medium text-amber-600">Director Deportivo</p>
                  <p className="text-xs text-muted-foreground">Acceso total a todos los equipos y funcionalidades</p>
                </div>
              </div>
            )}

            <div className={isDirector ? "border-t pt-4" : ""}>
              <p className="text-sm font-medium mb-2">Equipos que entrenas</p>
              <p className="text-xs text-muted-foreground mb-3">
                {isDirector 
                  ? "Como director tienes acceso a todos los equipos. Selecciona los que entrenas directamente."
                  : "Selecciona los equipos que entrenas. Para ser director, necesitas una invitación del Director Deportivo actual."
                }
              </p>
              <div className="space-y-2">
                {teams.map(team => (
                  <div
                  key={team.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => toggleTeam(team.id)}
                >
                  <Checkbox
                    checked={selectedTeams.includes(team.id)}
                    onCheckedChange={() => toggleTeam(team.id)}
                  />
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: team.color }}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{team.name}</p>
                    <p className="text-xs text-muted-foreground">{team.coach}</p>
                  </div>
                </div>
              ))}
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="w-full gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Button
          variant="outline"
          onClick={signOut}
          className="w-full gap-2 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
      <BottomNav />
    </div>
  );
}
