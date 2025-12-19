import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Player, TEAMS } from '@/types/volleyball';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';

export default function NewPlayer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedTeam = searchParams.get('team');
  
  const [players, setPlayers] = useLocalStorage<Player[]>('volleyball-players', []);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [number, setNumber] = useState('');
  const [selectedTeams, setSelectedTeams] = useState<string[]>(
    preselectedTeam ? [preselectedTeam] : []
  );

  const toggleTeam = (teamId: string) => {
    setSelectedTeams(prev =>
      prev.includes(teamId) ? prev.filter(t => t !== teamId) : [...prev, teamId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!phone.trim()) {
      toast.error('El teléfono es obligatorio');
      return;
    }
    if (selectedTeams.length === 0) {
      toast.error('Selecciona al menos un equipo');
      return;
    }

    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name: name.trim(),
      phone: phone.trim(),
      teams: selectedTeams,
      number: number ? parseInt(number) : undefined,
    };

    setPlayers([...players, newPlayer]);
    toast.success('Jugador añadido');
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Nuevo Jugador" showBack />
      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre *</Label>
          <Input
            id="name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nombre completo"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono (WhatsApp) *</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+34 600 000 000"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="number">Número de camiseta</Label>
          <Input
            id="number"
            type="number"
            value={number}
            onChange={e => setNumber(e.target.value)}
            placeholder="Opcional"
          />
        </div>

        <div className="space-y-3">
          <Label>Equipos *</Label>
          <div className="space-y-2">
            {TEAMS.map(team => (
              <div
                key={team.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleTeam(team.id)}
              >
                <Checkbox
                  checked={selectedTeams.includes(team.id)}
                  onCheckedChange={() => toggleTeam(team.id)}
                />
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: team.color }}
                />
                <div className="flex-1">
                  <p className="font-medium text-foreground">{team.name}</p>
                  <p className="text-sm text-muted-foreground">Coach: {team.coach}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" className="w-full">
          Guardar Jugador
        </Button>
      </form>
      <BottomNav />
    </div>
  );
}
