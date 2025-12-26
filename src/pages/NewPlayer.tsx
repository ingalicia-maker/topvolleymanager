import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { TEAMS } from '@/types/volleyball';
import { usePlayers } from '@/hooks/usePlayers';
import { toast } from 'sonner';

export default function NewPlayer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedTeam = searchParams.get('team');
  
  const { addPlayer } = usePlayers();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [number, setNumber] = useState('');
  const [selectedTeams, setSelectedTeams] = useState<string[]>(
    preselectedTeam ? [preselectedTeam] : []
  );
  const [loading, setLoading] = useState(false);

  const toggleTeam = (teamId: string) => {
    setSelectedTeams(prev =>
      prev.includes(teamId) ? prev.filter(t => t !== teamId) : [...prev, teamId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    setLoading(true);
    const result = await addPlayer({
      name: name.trim(),
      phone: phone.trim(),
      teams: selectedTeams,
      number: number ? parseInt(number) : null,
    });

    if (result) {
      setName('');
      setPhone('');
      setNumber('');
      setSelectedTeams(preselectedTeam ? [preselectedTeam] : []);
      toast.success('Jugadora guardada. Puedes añadir otra o volver al inicio.', {
        action: {
          label: 'Ir al inicio',
          onClick: () => navigate('/'),
        },
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Nueva Jugadora" showBack />
      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre *</Label>
          <Input
            id="name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nombre completo"
            disabled={loading}
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
            disabled={loading}
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
            disabled={loading}
          />
        </div>

        <div className="space-y-3">
          <Label>Equipos *</Label>
          <div className="space-y-2">
            {TEAMS.map(team => (
              <label
                key={team.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={selectedTeams.includes(team.id)}
                  onCheckedChange={() => toggleTeam(team.id)}
                  disabled={loading}
                />
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: team.color }}
                />
                <div className="flex-1">
                  <p className="font-medium text-foreground">{team.name}</p>
                  <p className="text-sm text-muted-foreground">Coach: {team.coach}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar Jugadora'}
        </Button>
      </form>
      <BottomNav />
    </div>
  );
}