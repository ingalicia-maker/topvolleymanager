import { useState } from 'react';
import { Plus, Search, Trash2, Upload, Star, Download, Lock } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { PlayerCard } from '@/components/PlayerCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePlayers } from '@/hooks/usePlayers';
import { useSubscription } from '@/hooks/useSubscription';
import { ImportPlayersDialog } from '@/components/ImportPlayersDialog';
import { toast } from 'sonner';
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
  const { t } = useTranslation();
  const { players, loading, deletePlayer, refetch } = usePlayers();
  const { canExport, isPremium } = useSubscription();
  const [search, setSearch] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const exportToExcel = () => {
    if (!canExport) {
      toast.error(t('subscription.exportLimited'));
      return;
    }
    const exportData = players.map(p => ({
      Nombre: p.name,
      'Apellido 1': p.surname1 || '',
      'Apellido 2': p.surname2 || '',
      Teléfono: p.phone,
      Equipos: (p.teams || []).join(', '),
      Dorsal: p.number || '',
      'Año Nacimiento': p.birth_year || '',
      'Altura (cm)': p.height || ''
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Jugadoras');
    XLSX.writeFile(wb, 'jugadoras.xlsx');
  };

  const filteredPlayers = players.filter(p => {
    const q = search.toLowerCase();
    const fullName = [p.name, p.surname1, p.surname2].filter(Boolean).join(' ').toLowerCase();
    return fullName.includes(q) || p.name.toLowerCase().includes(q);
  });

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
        <Header title={t('nav.players')} />
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
        title={t('nav.players')}
        rightAction={
          <div className="flex gap-2">
            {isSelecting ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => {
                  setIsSelecting(false);
                  setSelectedPlayers([]);
                }}>
                  {t('common.cancel')}
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
                        <AlertDialogTitle>{t('players.deleteConfirm')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('players.deleteCount', { count: selectedPlayers.length })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={deleteSelected}>{t('common.delete')}</AlertDialogAction>
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
                  {t('common.edit')}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exportToExcel}
                  className={!canExport ? 'opacity-50' : ''}
                >
                  {!canExport && <Lock className="h-3 w-3 mr-1" />}
                  <Download className="h-4 w-4" />
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
            placeholder={t('players.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="space-y-2">
          {filteredPlayers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {players.length === 0 ? t('players.noPlayers') : t('players.notFound')}
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