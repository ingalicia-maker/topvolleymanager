import { useState } from 'react';
import { Plus, Search, Trash2, Upload, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { PlayerCard } from '@/components/PlayerCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePlayers } from '@/hooks/usePlayers';
import { ImportPlayersDialog } from '@/components/ImportPlayersDialog';
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
  const { players, loading, deletePlayer, refetch } = usePlayers();
  const [search, setSearch] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const filteredPlayers = players.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const togglePlayer = (id: string) => {
    setSelectedPlayers(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const deleteSelected = async () => {
    for (const id of selectedPlayers) {
      await deletePlayer(id);
    }
    setSelectedPlayers([]);
    setIsSelecting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Jugadoras" />
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
        title="Jugadoras"
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
                        <AlertDialogTitle>¿Eliminar jugadoras?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se eliminarán {selectedPlayers.length} jugadora{selectedPlayers.length > 1 ? 's' : ''}. Esta acción no se puede deshacer.
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
                <Link to="/ratings">
                  <Button variant="ghost" size="sm">
                    <Star className="h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => setIsSelecting(true)}>
                  Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
                  <Upload className="h-4 w-4" />
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
            placeholder="Buscar jugadora..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="space-y-2">
          {filteredPlayers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {players.length === 0 ? 'No hay jugadoras registradas' : 'No se encontraron jugadoras'}
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
      
      <ImportPlayersDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onSuccess={refetch}
      />
      
      <BottomNav />
    </div>
  );
}