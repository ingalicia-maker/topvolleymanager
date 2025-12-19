import { useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { PlayerCard } from '@/components/PlayerCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Player } from '@/types/volleyball';
import { useLocalStorage } from '@/hooks/useLocalStorage';
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

export default function Players() {
  const [players, setPlayers] = useLocalStorage<Player[]>('volleyball-players', []);
  const [search, setSearch] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);

  const filteredPlayers = players.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const togglePlayer = (id: string) => {
    setSelectedPlayers(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const deleteSelected = () => {
    setPlayers(prev => prev.filter(p => !selectedPlayers.includes(p.id)));
    setSelectedPlayers([]);
    setIsSelecting(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header
        title="Jugadores"
        rightAction={
          <div className="flex gap-2">
            {isSelecting ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => {
                  setIsSelecting(false);
                  setSelectedPlayers([]);
                }}>
                  Cancelar
                </Button>
                {selectedPlayers.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar jugadores?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se eliminarán {selectedPlayers.length} jugador{selectedPlayers.length > 1 ? 'es' : ''}. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={deleteSelected}>Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => setIsSelecting(true)}>
                  Editar
                </Button>
                <Link to="/players/new">
                  <Button size="sm" className="gap-1">
                    <Plus className="h-4 w-4" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        }
      />
      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar jugador..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="space-y-2">
          {filteredPlayers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {players.length === 0 ? 'No hay jugadores registrados' : 'No se encontraron jugadores'}
            </p>
          ) : (
            filteredPlayers.map(player => (
              <PlayerCard
                key={player.id}
                player={player}
                selectable={isSelecting}
                selected={selectedPlayers.includes(player.id)}
                onSelect={togglePlayer}
              />
            ))
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
