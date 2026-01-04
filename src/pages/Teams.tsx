import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { TeamCard } from '@/components/TeamCard';
import { Button } from '@/components/ui/button';
import { usePlayers } from '@/hooks/usePlayers';
import { useTeams } from '@/hooks/useTeams';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const TEAM_COLORS = [
  'hsl(25, 95%, 53%)',
  'hsl(262, 83%, 58%)',
  'hsl(142, 76%, 36%)',
  'hsl(199, 89%, 48%)',
  'hsl(350, 89%, 60%)',
  'hsl(45, 93%, 47%)',
  'hsl(280, 70%, 50%)',
  'hsl(180, 70%, 40%)',
];

export default function Teams() {
  const { players } = usePlayers();
  const { teams, loading, addTeam } = useTeams();
  const [open, setOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamCoach, setNewTeamCoach] = useState('');
  const [newTeamColor, setNewTeamColor] = useState(TEAM_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const getPlayerCount = (teamId: string) => {
    return players.filter(p => p.teams?.includes(teamId)).length;
  };

  const generateTeamId = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !newTeamCoach.trim()) return;
    
    setSaving(true);
    const result = await addTeam({
      id: generateTeamId(newTeamName),
      name: newTeamName.trim(),
      coach: newTeamCoach.trim(),
      color: newTeamColor,
    });
    
    if (result) {
      setNewTeamName('');
      setNewTeamCoach('');
      setNewTeamColor(TEAM_COLORS[0]);
      setOpen(false);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Equipos" />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header
        title="Equipos"
        rightAction={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo Equipo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="teamName">Nombre del equipo *</Label>
                  <Input
                    id="teamName"
                    value={newTeamName}
                    onChange={e => setNewTeamName(e.target.value)}
                    placeholder="Ej: Cadete A"
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teamCoach">Entrenador/a *</Label>
                  <Input
                    id="teamCoach"
                    value={newTeamCoach}
                    onChange={e => setNewTeamCoach(e.target.value)}
                    placeholder="Nombre del entrenador"
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color del equipo</Label>
                  <div className="flex flex-wrap gap-2">
                    {TEAM_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          newTeamColor === color ? 'border-foreground scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewTeamColor(color)}
                        disabled={saving}
                      />
                    ))}
                  </div>
                </div>
                <Button
                  onClick={handleCreateTeam}
                  className="w-full"
                  disabled={saving || !newTeamName.trim() || !newTeamCoach.trim()}
                >
                  {saving ? 'Creando...' : 'Crear Equipo'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <main className="p-4 space-y-3">
        {teams.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No hay equipos registrados
          </p>
        ) : (
          teams.map(team => (
            <TeamCard 
              key={team.id} 
              team={team} 
              playerCount={getPlayerCount(team.id)} 
            />
          ))
        )}
      </main>
      <BottomNav />
    </div>
  );
}
