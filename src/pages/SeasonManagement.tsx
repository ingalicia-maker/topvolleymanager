import { useState } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useSeasons, Season } from '@/hooks/useSeasons';
import { useUserRole } from '@/hooks/useUserRole';
import { usePlayers } from '@/hooks/usePlayers';
import { useTeams } from '@/hooks/useTeams';
import { usePlayerRatings } from '@/hooks/usePlayerRatings';
import { ImportSeasonPlayersDialog } from '@/components/ImportSeasonPlayersDialog';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { 
  Calendar, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Play, 
  Users, 
  User, 
  BarChart3,
  Shield,
  Sparkles,
  Archive,
  UserPlus
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function SeasonManagement() {
  const { t } = useTranslation();
  const { seasons, loading, activeSeason, createSeason, closeSeason, setAsActiveSeason } = useSeasons();
  const { isDirector, loading: roleLoading } = useUserRole();
  const { players, refetch: refetchPlayers } = usePlayers();
  const { teams } = useTeams();
  const { ratings } = usePlayerRatings();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [newSeasonStartDate, setNewSeasonStartDate] = useState(() => 
    new Date().toISOString().split('T')[0]
  );
  const [creating, setCreating] = useState(false);

  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [seasonToClose, setSeasonToClose] = useState<Season | null>(null);
  
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Gestión de Temporadas" showBack backTo="/profile" />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!isDirector) {
    return <Navigate to="/" replace />;
  }

  const handleCreateSeason = async () => {
    if (!newSeasonName.trim()) {
      toast.error('El nombre de la temporada es obligatorio');
      return;
    }

    setCreating(true);
    const result = await createSeason(newSeasonName.trim(), newSeasonStartDate);
    if (result) {
      setNewSeasonName('');
      setIsCreateDialogOpen(false);
    }
    setCreating(false);
  };

  const handleCloseSeason = async () => {
    if (!seasonToClose) return;
    await closeSeason(seasonToClose.id);
    setIsCloseDialogOpen(false);
    setSeasonToClose(null);
  };

  const openCloseDialog = (season: Season) => {
    setSeasonToClose(season);
    setIsCloseDialogOpen(true);
  };

  const getSeasonStats = (seasonId: string) => {
    const seasonRatings = ratings.filter(r => r.season_id === seasonId);
    const uniquePlayers = new Set(seasonRatings.map(r => r.player_id)).size;
    return {
      ratingsCount: seasonRatings.length,
      playersRated: uniquePlayers,
    };
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "d MMM yyyy", { locale: es });
  };

  // Generate suggested season name
  const getSuggestedSeasonName = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    // If we're in August or later, it's year/year+1, otherwise year-1/year
    if (month >= 7) {
      return `Temporada ${year}/${year + 1}`;
    }
    return `Temporada ${year - 1}/${year}`;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Gestión de Temporadas" showBack backTo="/profile" />

      <div className="p-4 space-y-4">
        {/* Director Only Notice */}
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
          <Shield className="h-5 w-5 text-amber-500" />
          <p className="text-sm text-amber-600">Solo los directores pueden gestionar temporadas</p>
        </div>

        {/* Current Status */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              {t('seasons.currentStatus', 'Estado Actual')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeSeason ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-lg">{activeSeason.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('seasons.since', 'Desde')} {formatDate(activeSeason.start_date)}
                    </p>
                  </div>
                  <Badge className="bg-green-500">{t('seasons.active', 'Activa')}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{teams.length}</p>
                    <p className="text-xs text-muted-foreground">{t('nav.teams', 'Equipos')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{players.length}</p>
                    <p className="text-xs text-muted-foreground">{t('nav.players', 'Jugadoras')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{ratings.length}</p>
                    <p className="text-xs text-muted-foreground">{t('nav.ratings', 'Valoraciones')}</p>
                  </div>
                </div>
                
                {/* Action buttons for active season */}
                {isDirector && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t">
                    <Button 
                      variant="outline" 
                      className="flex-1 text-destructive border-destructive/50 hover:bg-destructive/10"
                      onClick={() => openCloseDialog(activeSeason)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {t('seasons.closeThisSeason', 'Cerrar esta temporada')}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Calendar className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">{t('seasons.noActiveSeason', 'No hay temporada activa')}</p>
                <p className="text-sm text-muted-foreground">{t('seasons.createToStart', 'Crea una nueva temporada para empezar')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Director-only Actions */}
        {isDirector && (
          <div className="space-y-3">
            {/* Create New Season */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full gap-2" size="lg" variant={activeSeason ? "outline" : "default"}>
                  <Plus className="h-5 w-5" />
                  {t('seasons.startNewSeason', 'Iniciar nueva temporada')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {t('seasons.createSeason', 'Crear Nueva Temporada')}
                  </DialogTitle>
                  <DialogDescription>
                    {t('seasons.createDescription', 'Al crear una nueva temporada, podrás reutilizar jugadoras, equipos y entrenadores existentes. Las valoraciones anteriores se mantendrán asociadas a su temporada original.')}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="seasonName">{t('seasons.seasonName', 'Nombre de la Temporada')}</Label>
                    <Input
                      id="seasonName"
                      value={newSeasonName}
                      onChange={(e) => setNewSeasonName(e.target.value)}
                      placeholder={getSuggestedSeasonName()}
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs"
                      onClick={() => setNewSeasonName(getSuggestedSeasonName())}
                    >
                      {t('seasons.useSuggestion', 'Usar sugerencia')}: {getSuggestedSeasonName()}
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="startDate">{t('seasons.startDate', 'Fecha de Inicio')}</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={newSeasonStartDate}
                      onChange={(e) => setNewSeasonStartDate(e.target.value)}
                    />
                  </div>

                  <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                    <p className="text-sm text-blue-600">
                      <strong>{t('common.note', 'Nota')}:</strong> {t('seasons.keepDataNote', 'Todos los equipos, jugadoras y entrenadores actuales seguirán disponibles en la nueva temporada. Podrás editarlos desde sus respectivas secciones.')}
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    {t('common.cancel', 'Cancelar')}
                  </Button>
                  <Button onClick={handleCreateSeason} disabled={creating}>
                    {creating ? t('seasons.creating', 'Creando...') : t('seasons.create', 'Crear Temporada')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Import Players from Previous Seasons */}
            <Button 
              variant="outline" 
              className="w-full gap-2" 
              size="lg"
              onClick={() => setIsImportDialogOpen(true)}
            >
              <UserPlus className="h-5 w-5" />
              {t('seasons.importPlayers', 'Importar Jugadoras')}
            </Button>

            <ImportSeasonPlayersDialog
              open={isImportDialogOpen}
              onOpenChange={setIsImportDialogOpen}
              onSuccess={() => refetchPlayers()}
            />
          </div>
        )}

        {/* Season History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Archive className="h-5 w-5" />
              Historial de Temporadas
            </CardTitle>
            <CardDescription>
              Todas las temporadas del club
            </CardDescription>
          </CardHeader>
          <CardContent>
            {seasons.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No hay temporadas registradas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {seasons.map((season) => {
                  const stats = getSeasonStats(season.id);
                  return (
                    <div
                      key={season.id}
                      className={`p-4 rounded-lg border ${
                        season.is_active 
                          ? 'border-green-500/50 bg-green-500/5' 
                          : 'border-border bg-muted/30'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{season.name}</p>
                            {season.is_active && (
                              <Badge className="bg-green-500 text-xs">Activa</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(season.start_date)}
                            {season.end_date && ` - ${formatDate(season.end_date)}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <BarChart3 className="h-4 w-4" />
                          {stats.ratingsCount} valoraciones
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {stats.playersRated} jugadoras
                        </span>
                      </div>

                      {isDirector && (
                        <div className="flex gap-2">
                          {season.is_active ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-destructive border-destructive/50"
                              onClick={() => openCloseDialog(season)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              {t('seasons.closeSeason', 'Cerrar Temporada')}
                            </Button>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setAsActiveSeason(season.id)}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              {t('seasons.reactivate', 'Reactivar')}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Close Season Confirmation Dialog */}
        <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                Cerrar Temporada
              </DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que quieres cerrar la temporada "{seasonToClose?.name}"?
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                <p className="text-sm text-amber-600">
                  <strong>Nota:</strong> Las valoraciones y datos de esta temporada se conservarán.
                  Podrás crear una nueva temporada y seguir usando los mismos equipos y jugadoras.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCloseDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleCloseSeason}>
                Cerrar Temporada
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <BottomNav />
    </div>
  );
}
