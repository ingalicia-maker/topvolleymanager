import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { usePlayers } from '@/hooks/usePlayers';
import { useTeams } from '@/hooks/useTeams';
import { toast } from 'sonner';

export default function NewPlayer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedTeam = searchParams.get('team');
  
  const { addPlayer } = usePlayers();
  const { teams, loading: teamsLoading } = useTeams();
  
  const [name, setName] = useState('');
  const [surname1, setSurname1] = useState('');
  const [surname2, setSurname2] = useState('');
  const [phone, setPhone] = useState('');
  const [number, setNumber] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [height, setHeight] = useState('');
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
      surname1: surname1.trim() || null,
      surname2: surname2.trim() || null,
      phone: phone.trim(),
      teams: selectedTeams,
      number: number ? parseInt(number) : null,
      birth_year: birthYear ? parseInt(birthYear) : null,
      height: height ? parseInt(height) : null,
      photo_url: null,
    });

    if (result) {
      setName('');
      setSurname1('');
      setSurname2('');
      setPhone('');
      setNumber('');
      setBirthYear('');
      setHeight('');
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
            placeholder="Nombre"
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="surname1">Primer Apellido</Label>
            <Input
              id="surname1"
              value={surname1}
              onChange={e => setSurname1(e.target.value)}
              placeholder="Opcional"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="surname2">Segundo Apellido</Label>
            <Input
              id="surname2"
              value={surname2}
              onChange={e => setSurname2(e.target.value)}
              placeholder="Opcional"
              disabled={loading}
            />
          </div>
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

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="number">Nº Camiseta</Label>
            <Input
              id="number"
              type="number"
              value={number}
              onChange={e => setNumber(e.target.value)}
              placeholder="Ej: 7"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthYear">Año Nac.</Label>
            <Input
              id="birthYear"
              type="number"
              value={birthYear}
              onChange={e => setBirthYear(e.target.value)}
              placeholder="Ej: 2010"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height">Altura (cm)</Label>
            <Input
              id="height"
              type="number"
              value={height}
              onChange={e => setHeight(e.target.value)}
              placeholder="Ej: 165"
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label>Equipos *</Label>
          {teamsLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {teams.map(team => (
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
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar Jugadora'}
        </Button>
      </form>
      <BottomNav />
    </div>
  );
}
