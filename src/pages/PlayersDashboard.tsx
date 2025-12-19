import { useState, useEffect } from 'react';
import { Trash2, Plus, Save, X, Filter, MessageCircle, AlertTriangle } from 'lucide-react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Player, TEAMS, SAMPLE_PLAYERS } from '@/types/volleyball';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export default function PlayersDashboard() {
  const [players, setPlayers] = useLocalStorage<Player[]>('volleyball-players', []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Player>>({});
  const [teamFilter, setTeamFilter] = useState<string[]>([]);
  const [showAddRow, setShowAddRow] = useState(false);
  const [newPlayer, setNewPlayer] = useState<Partial<Player>>({
    name: '',
    phone: '',
    teams: [],
    number: undefined,
    auspicias: '',
  });

  // Load sample players if empty
  useEffect(() => {
    if (players.length === 0) {
      setPlayers(SAMPLE_PLAYERS);
      toast.success('Jugadoras de ejemplo cargadas');
    }
  }, []);

  const filteredPlayers = players.filter(p =>
    teamFilter.length === 0 || p.teams.some(t => teamFilter.includes(t))
  );

  const startEdit = (player: Player) => {
    setEditingId(player.id);
    setEditData({ ...player });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = () => {
    if (!editingId) return;
    setPlayers(prev => prev.map(p => 
      p.id === editingId ? { ...p, ...editData } as Player : p
    ));
    setEditingId(null);
    setEditData({});
    toast.success('Jugadora actualizada');
  };

  const deletePlayer = (id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
    toast.success('Jugadora eliminada');
  };

  const addNewPlayer = () => {
    if (!newPlayer.name?.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!newPlayer.phone?.trim()) {
      toast.error('El teléfono es obligatorio');
      return;
    }
    if (!newPlayer.teams?.length) {
      toast.error('Selecciona al menos un equipo');
      return;
    }

    const player: Player = {
      id: crypto.randomUUID(),
      name: newPlayer.name.trim(),
      phone: newPlayer.phone.trim(),
      teams: newPlayer.teams,
      number: newPlayer.number,
      auspicias: newPlayer.auspicias?.trim() || undefined,
    };

    setPlayers(prev => [...prev, player]);
    setNewPlayer({ name: '', phone: '', teams: [], number: undefined, auspicias: '' });
    setShowAddRow(false);
    toast.success('Jugadora añadida');
  };

  const toggleTeam = (playerId: string | null, teamId: string, isEditing: boolean) => {
    if (isEditing && playerId) {
      setEditData(prev => ({
        ...prev,
        teams: prev.teams?.includes(teamId)
          ? prev.teams.filter(t => t !== teamId)
          : [...(prev.teams || []), teamId]
      }));
    } else {
      setNewPlayer(prev => ({
        ...prev,
        teams: prev.teams?.includes(teamId)
          ? prev.teams.filter(t => t !== teamId)
          : [...(prev.teams || []), teamId]
      }));
    }
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const TeamSelector = ({ selectedTeams, onToggle }: { selectedTeams: string[], onToggle: (teamId: string) => void }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-full justify-start">
          {selectedTeams.length === 0 ? (
            <span className="text-muted-foreground">Equipos...</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {selectedTeams.map(teamId => {
                const team = TEAMS.find(t => t.id === teamId);
                return team ? (
                  <span
                    key={teamId}
                    className="text-xs px-1 rounded"
                    style={{ backgroundColor: `${team.color}30`, color: team.color }}
                  >
                    {team.name.split(' ')[0]}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2">
        {TEAMS.map(team => (
          <div
            key={team.id}
            className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
            onClick={() => onToggle(team.id)}
          >
            <Checkbox checked={selectedTeams.includes(team.id)} />
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: team.color }}
            />
            <span className="text-sm">{team.name}</span>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header
        title="Dashboard Jugadoras"
        showBack
        rightAction={
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <Filter className="h-4 w-4" />
                  {teamFilter.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                      {teamFilter.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {TEAMS.map(team => (
                  <DropdownMenuCheckboxItem
                    key={team.id}
                    checked={teamFilter.includes(team.id)}
                    onCheckedChange={() => setTeamFilter(prev =>
                      prev.includes(team.id) ? prev.filter(t => t !== team.id) : [...prev, team.id]
                    )}
                  >
                    <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: team.color }} />
                    {team.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <div className="p-4">
        <div className="rounded-lg border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Nombre</TableHead>
                <TableHead className="min-w-[120px]">Teléfono</TableHead>
                <TableHead className="min-w-[100px]">Nº</TableHead>
                <TableHead className="min-w-[150px]">Equipos</TableHead>
                <TableHead className="min-w-[150px]">
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    Ausencias
                  </div>
                </TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlayers.map(player => (
                <TableRow key={player.id}>
                  <TableCell>
                    {editingId === player.id ? (
                      <Input
                        value={editData.name || ''}
                        onChange={e => setEditData(prev => ({ ...prev, name: e.target.value }))}
                        className="h-8"
                      />
                    ) : (
                      <span className="font-medium">{player.name}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === player.id ? (
                      <Input
                        value={editData.phone || ''}
                        onChange={e => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                        className="h-8"
                      />
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{player.phone}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-green-600"
                          onClick={() => handleWhatsApp(player.phone)}
                        >
                          <MessageCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === player.id ? (
                      <Input
                        type="number"
                        value={editData.number || ''}
                        onChange={e => setEditData(prev => ({ ...prev, number: e.target.value ? parseInt(e.target.value) : undefined }))}
                        className="h-8 w-16"
                      />
                    ) : (
                      player.number && <Badge variant="outline">#{player.number}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === player.id ? (
                      <TeamSelector
                        selectedTeams={editData.teams || []}
                        onToggle={(teamId) => toggleTeam(player.id, teamId, true)}
                      />
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {player.teams.map(teamId => {
                          const team = TEAMS.find(t => t.id === teamId);
                          return team ? (
                            <Badge
                              key={teamId}
                              variant="secondary"
                              className="text-[10px]"
                              style={{ backgroundColor: `${team.color}20`, color: team.color }}
                            >
                              {team.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === player.id ? (
                      <Input
                        value={editData.auspicias || ''}
                        onChange={e => setEditData(prev => ({ ...prev, auspicias: e.target.value }))}
                        className="h-8"
                        placeholder="Motivo..."
                      />
                    ) : (
                      player.auspicias && (
                        <span className="text-sm text-amber-600">{player.auspicias}</span>
                      )
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === player.id ? (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveEdit}>
                          <Save className="h-3 w-3 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit}>
                          <X className="h-3 w-3 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => startEdit(player)}
                        >
                          Editar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar jugadora?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Se eliminará a {player.name}. Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deletePlayer(player.id)}>
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {/* Add new row */}
              {showAddRow && (
                <TableRow className="bg-muted/30">
                  <TableCell>
                    <Input
                      value={newPlayer.name || ''}
                      onChange={e => setNewPlayer(prev => ({ ...prev, name: e.target.value }))}
                      className="h-8"
                      placeholder="Nombre..."
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={newPlayer.phone || ''}
                      onChange={e => setNewPlayer(prev => ({ ...prev, phone: e.target.value }))}
                      className="h-8"
                      placeholder="+34..."
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={newPlayer.number || ''}
                      onChange={e => setNewPlayer(prev => ({ ...prev, number: e.target.value ? parseInt(e.target.value) : undefined }))}
                      className="h-8 w-16"
                      placeholder="Nº"
                    />
                  </TableCell>
                  <TableCell>
                    <TeamSelector
                      selectedTeams={newPlayer.teams || []}
                      onToggle={(teamId) => toggleTeam(null, teamId, false)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={newPlayer.auspicias || ''}
                      onChange={e => setNewPlayer(prev => ({ ...prev, auspicias: e.target.value }))}
                      className="h-8"
                      placeholder="Ausencia..."
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={addNewPlayer}>
                        <Save className="h-3 w-3 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowAddRow(false)}>
                        <X className="h-3 w-3 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Add button */}
        {!showAddRow && (
          <Button
            variant="outline"
            className="w-full mt-4 gap-2"
            onClick={() => setShowAddRow(true)}
          >
            <Plus className="h-4 w-4" />
            Añadir jugadora
          </Button>
        )}

        <p className="text-center text-muted-foreground text-xs mt-4">
          {filteredPlayers.length} jugadoras {teamFilter.length > 0 ? '(filtradas)' : ''}
        </p>
      </div>
      <BottomNav />
    </div>
  );
}