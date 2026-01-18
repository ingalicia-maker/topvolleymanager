import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useTeams } from '@/hooks/useTeams';
import { usePlayers } from '@/hooks/usePlayers';
import { useClub } from '@/hooks/useClub';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Users, UserPlus, ArrowRight, RefreshCw } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  surname1: string | null;
  phone: string;
  teams: string[] | null;
}

interface ImportSeasonPlayersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ImportSeasonPlayersDialog({ open, onOpenChange, onSuccess }: ImportSeasonPlayersDialogProps) {
  const { t } = useTranslation();
  const { teams } = useTeams();
  const { players: currentPlayers, refetch } = usePlayers();
  const { club } = useClub();
  
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [playerTeamAssignments, setPlayerTeamAssignments] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  // Fetch all players from the club (including those not in current season teams)
  useEffect(() => {
    const fetchAllPlayers = async () => {
      if (!club?.id || !open) return;
      
      setLoading(true);
      const { data, error } = await supabase
        .from('players')
        .select('id, name, surname1, phone, teams')
        .eq('club_id', club.id)
        .order('name');

      if (error) {
        console.error('Error fetching players:', error);
      } else {
        setAllPlayers(data || []);
      }
      setLoading(false);
    };

    fetchAllPlayers();
  }, [club?.id, open]);

  // Find players not assigned to any current team
  const unassignedPlayers = allPlayers.filter(player => {
    const playerTeams = player.teams || [];
    const currentTeamIds = teams.map(t => t.id);
    return !playerTeams.some(teamId => currentTeamIds.includes(teamId));
  });

  const handlePlayerSelect = (playerId: string, checked: boolean) => {
    const newSelected = new Set(selectedPlayers);
    if (checked) {
      newSelected.add(playerId);
    } else {
      newSelected.delete(playerId);
      // Also remove team assignment
      const newAssignments = { ...playerTeamAssignments };
      delete newAssignments[playerId];
      setPlayerTeamAssignments(newAssignments);
    }
    setSelectedPlayers(newSelected);
  };

  const handleTeamAssignment = (playerId: string, teamId: string, checked: boolean) => {
    const current = playerTeamAssignments[playerId] || [];
    let newTeams: string[];
    
    if (checked) {
      newTeams = [...current, teamId];
    } else {
      newTeams = current.filter(t => t !== teamId);
    }
    
    setPlayerTeamAssignments({
      ...playerTeamAssignments,
      [playerId]: newTeams
    });
  };

  const handleSelectAll = () => {
    if (selectedPlayers.size === unassignedPlayers.length) {
      setSelectedPlayers(new Set());
      setPlayerTeamAssignments({});
    } else {
      setSelectedPlayers(new Set(unassignedPlayers.map(p => p.id)));
    }
  };

  const handleImport = async () => {
    const playersToImport = Array.from(selectedPlayers);
    
    if (playersToImport.length === 0) {
      toast.error(t('seasons.selectPlayersToImport', 'Selecciona al menos una jugadora'));
      return;
    }

    // Check that all selected players have at least one team assigned
    const playersWithoutTeam = playersToImport.filter(
      id => !playerTeamAssignments[id] || playerTeamAssignments[id].length === 0
    );

    if (playersWithoutTeam.length > 0) {
      toast.error(t('seasons.assignTeamsToAll', 'Asigna al menos un equipo a cada jugadora seleccionada'));
      return;
    }

    setImporting(true);

    try {
      // Update each player's team assignments
      for (const playerId of playersToImport) {
        const newTeams = playerTeamAssignments[playerId];
        const { error } = await supabase
          .from('players')
          .update({ teams: newTeams })
          .eq('id', playerId);

        if (error) {
          console.error('Error updating player:', error);
          throw error;
        }
      }

      toast.success(t('seasons.playersImported', '{{count}} jugadoras importadas correctamente', { count: playersToImport.length }));
      
      // Reset state
      setSelectedPlayers(new Set());
      setPlayerTeamAssignments({});
      
      // Refresh players list
      await refetch();
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(t('seasons.importError', 'Error al importar jugadoras'));
    } finally {
      setImporting(false);
    }
  };

  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || teamId;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t('seasons.importPlayers', 'Importar Jugadoras')}
          </DialogTitle>
          <DialogDescription>
            {t('seasons.importDescription', 'Selecciona jugadoras de temporadas anteriores y asígnalas a equipos actuales')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : unassignedPlayers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">
                {t('seasons.noUnassignedPlayers', 'Todas las jugadoras ya están asignadas a equipos')}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">
                  {unassignedPlayers.length} {t('seasons.playersAvailable', 'jugadoras disponibles')}
                </span>
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  {selectedPlayers.size === unassignedPlayers.length 
                    ? t('seasons.deselectAll', 'Deseleccionar todo')
                    : t('seasons.selectAll', 'Seleccionar todo')}
                </Button>
              </div>

              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {unassignedPlayers.map((player) => {
                    const isSelected = selectedPlayers.has(player.id);
                    const assignedTeams = playerTeamAssignments[player.id] || [];
                    const previousTeams = player.teams || [];

                    return (
                      <div
                        key={player.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          isSelected ? 'border-primary/50 bg-primary/5' : 'border-border'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handlePlayerSelect(player.id, !!checked)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {player.name} {player.surname1 || ''}
                            </p>
                            <p className="text-xs text-muted-foreground">{player.phone}</p>
                            
                            {previousTeams.length > 0 && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <span>{t('seasons.previousTeams', 'Equipos anteriores')}:</span>
                                {previousTeams.map(teamId => (
                                  <Badge key={teamId} variant="outline" className="text-xs">
                                    {getTeamName(teamId)}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {isSelected && (
                              <div className="mt-3 pt-3 border-t">
                                <Label className="text-xs flex items-center gap-1 mb-2">
                                  <ArrowRight className="h-3 w-3" />
                                  {t('seasons.assignToTeams', 'Asignar a equipos')}:
                                </Label>
                                <div className="flex flex-wrap gap-2">
                                  {teams.map((team) => (
                                    <label
                                      key={team.id}
                                      className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                                        assignedTeams.includes(team.id)
                                          ? 'bg-primary text-primary-foreground'
                                          : 'bg-muted hover:bg-muted/80'
                                      }`}
                                    >
                                      <Checkbox
                                        checked={assignedTeams.includes(team.id)}
                                        onCheckedChange={(checked) => 
                                          handleTeamAssignment(player.id, team.id, !!checked)
                                        }
                                        className="h-3 w-3"
                                      />
                                      {team.name}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancelar')}
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={importing || selectedPlayers.size === 0}
          >
            {importing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {t('seasons.importing', 'Importando...')}
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                {t('seasons.importSelected', 'Importar {{count}} jugadoras', { count: selectedPlayers.size })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
