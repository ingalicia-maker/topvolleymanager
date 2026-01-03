import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { TEAMS } from '@/types/volleyball';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, Shield, Users, Save, LogOut } from 'lucide-react';

export default function Profile() {
  const { profile, isDirector, assignedTeams, updateAssignedTeams, loading, roles } = useUserRole();
  const { signOut, user } = useAuth();
  const [selectedTeams, setSelectedTeams] = useState<string[]>(assignedTeams);
  const [wantsDirector, setWantsDirector] = useState(isDirector);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedTeams(assignedTeams);
    setWantsDirector(isDirector);
  }, [assignedTeams, isDirector]);

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
    
    // Update assigned teams
    const teamsSuccess = await updateAssignedTeams(selectedTeams);
    
    // Handle director role change
    if (wantsDirector !== isDirector) {
      if (wantsDirector) {
        // Add director role
        await supabase.from('user_roles').insert({ user_id: user.id, role: 'director' as const });
      } else {
        // Remove director role
        await supabase.from('user_roles').delete().eq('user_id', user.id).eq('role', 'director');
      }
    }
    
    if (teamsSuccess) {
      toast.success('Perfil actualizado correctamente');
      // Reload to get fresh role data
      window.location.reload();
    } else {
      toast.error('Error al actualizar perfil');
    }
    setSaving(false);
  };

  const hasChanges = JSON.stringify(selectedTeams.sort()) !== JSON.stringify(assignedTeams.sort()) || wantsDirector !== isDirector;

  if (loading) {
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
          </CardContent>
        </Card>

        {/* Assigned Teams */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Equipos Asignados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Director Option */}
            <div
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                wantsDirector 
                  ? 'border-amber-500 bg-amber-500/10' 
                  : 'border-border hover:bg-accent/50'
              }`}
              onClick={() => setWantsDirector(!wantsDirector)}
            >
              <Checkbox
                checked={wantsDirector}
                onCheckedChange={(checked) => setWantsDirector(checked === true)}
              />
              <div className="flex-1">
                <p className="font-medium text-amber-600">Director Deportivo</p>
                <p className="text-xs text-muted-foreground">Acceso total a todos los equipos y funcionalidades</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Equipos que entrenas</p>
              <p className="text-xs text-muted-foreground mb-3">
                Puedes ser director y entrenador a la vez
              </p>
              <div className="space-y-2">
                {TEAMS.map(team => (
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
