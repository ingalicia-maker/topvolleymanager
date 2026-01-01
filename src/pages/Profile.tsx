import { useState } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { TEAMS } from '@/types/volleyball';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { User, Shield, Users, Save, LogOut } from 'lucide-react';

export default function Profile() {
  const { profile, isDirector, assignedTeams, updateAssignedTeams, loading } = useUserRole();
  const { signOut } = useAuth();
  const [selectedTeams, setSelectedTeams] = useState<string[]>(assignedTeams);
  const [saving, setSaving] = useState(false);

  const toggleTeam = (teamId: string) => {
    setSelectedTeams(prev =>
      prev.includes(teamId)
        ? prev.filter(t => t !== teamId)
        : [...prev, teamId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await updateAssignedTeams(selectedTeams);
    if (success) {
      toast.success('Equipos actualizados correctamente');
    } else {
      toast.error('Error al actualizar equipos');
    }
    setSaving(false);
  };

  const hasChanges = JSON.stringify(selectedTeams.sort()) !== JSON.stringify(assignedTeams.sort());

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
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">Rol:</p>
              {isDirector ? (
                <Badge className="bg-amber-500 hover:bg-amber-600">
                  <Shield className="h-3 w-3 mr-1" />
                  Director Deportivo
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Users className="h-3 w-3 mr-1" />
                  Entrenador
                </Badge>
              )}
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
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Selecciona los equipos que entrenas. Verás las ausencias y eventos de estos equipos.
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
