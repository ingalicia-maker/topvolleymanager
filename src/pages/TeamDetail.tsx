import { useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Plus, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { PlayerCard } from '@/components/PlayerCard';
import { SwipeableRow } from '@/components/SwipeableRow';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePlayers } from '@/hooks/usePlayers';
import { useTeams } from '@/hooks/useTeams';

export default function TeamDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { teamId } = useParams<{ teamId: string }>();
  const { players, updatePlayer } = usePlayers();
  const { teams, loading } = useTeams();
  const [playerToRemove, setPlayerToRemove] = useState<string | null>(null);
  const [playerToMove, setPlayerToMove] = useState<string | null>(null);
  const [addExistingOpen, setAddExistingOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  const team = teams.find(t => t.id === teamId);
  const teamPlayers = players.filter(p => p.teams?.includes(teamId || ''));

  const fullName = (p: { name: string; surname1: string | null; surname2: string | null }) =>
    [p.name, p.surname1, p.surname2].filter(Boolean).join(' ');
  const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  // Club players that are not yet in this team (archived ones are already excluded by usePlayers).
  const candidates = useMemo(() => {
    const q = normalize(search.trim());
    return players
      .filter(p => !p.teams?.includes(teamId || ''))
      .filter(p => !q || normalize(fullName(p)).includes(q))
      .sort((a, b) => fullName(a).localeCompare(fullName(b), 'es'));
  }, [players, teamId, search]);
  const hasAnyCandidate = players.some(p => !p.teams?.includes(teamId || ''));

  const closeAddExisting = () => {
    setAddExistingOpen(false);
    setSearch('');
    setSelectedIds([]);
  };

  const toggleSelected = (id: string) =>
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const addSelectedToTeam = async () => {
    if (!teamId || selectedIds.length === 0) return;
    setAdding(true);
    const results = await Promise.all(
      selectedIds.map(id => {
        const player = players.find(p => p.id === id);
        if (!player) return Promise.resolve(false);
        return updatePlayer(
          id,
          { teams: Array.from(new Set([...(player.teams || []), teamId])) },
          { silent: true },
        );
      }),
    );
    setAdding(false);
    const added = results.filter(Boolean).length;
    if (added > 0) toast.success(t('coachHub.playersAdded', { count: added }));
    closeAddExisting();
  };

  const removeFromTeam = async (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player || !teamId) return;
    const ok = await updatePlayer(playerId, {
      teams: (player.teams || []).filter(id => id !== teamId),
    });
    if (ok) toast.success(t('coachHub.playerRemoved'));
  };

  const moveToTeam = async (playerId: string, targetTeamId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player || !teamId) return;
    const next = Array.from(
      new Set([...(player.teams || []).filter(id => id !== teamId), targetTeamId])
    );
    const ok = await updatePlayer(playerId, { teams: next });
    if (ok) toast.success(t('coachHub.playerMoved'));
    setPlayerToMove(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-28">
        <Header title={t('common.loading')} showBack backTo="/teams" />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-background pb-28">
        <Header title={t('teams.teamNotFound')} showBack />
        <BottomNav />
      </div>
    );
  }

  const otherTeams = teams.filter(tm => tm.id !== teamId);

  return (
    <div className="min-h-screen bg-background pb-28">
      <Header
        title={team.name}
        showBack
        rightAction={
          <Link to={`/players/new?team=${teamId}`}>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              {t('common.add')}
            </Button>
          </Link>
        }
      />
      <div className="p-4">
        <div
          className="rounded-lg p-4 mb-4"
          style={{ backgroundColor: `${team.color}15` }}
        >
          <p className="text-sm text-muted-foreground">{t('teams.coach')}</p>
          <p className="font-bold text-foreground">{team.coach}</p>
          <p className="text-sm text-muted-foreground mt-2">
            {t('events.playersCountLabel', { count: teamPlayers.length })}
          </p>
        </div>

        <Button
          variant="outline"
          className="w-full gap-2 mb-4"
          onClick={() => setAddExistingOpen(true)}
        >
          <UserPlus className="h-4 w-4" />
          {t('coachHub.addExisting')}
        </Button>

        {teamPlayers.length > 0 && (
          <p className="text-xs text-muted-foreground mb-2">{t('coachHub.swipeHint')}</p>
        )}

        <div className="space-y-2">
          {teamPlayers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t('events.noPlayersInTeam')}
            </p>
          ) : (
            teamPlayers.map(player => (
              <SwipeableRow
                key={player.id}
                editLabel={t('common.edit')}
                moveLabel={t('coachHub.moveToTeam')}
                deleteLabel={t('coachHub.removeFromTeam')}
                onEdit={() => navigate(`/players/${player.id}`)}
                onMove={() => setPlayerToMove(player.id)}
                onDelete={() => setPlayerToRemove(player.id)}
              >
                <PlayerCard player={player} showTeams={false} />
              </SwipeableRow>
            ))
          )}
        </div>
      </div>

      <AlertDialog open={!!playerToRemove} onOpenChange={(open) => !open && setPlayerToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('coachHub.removeConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('coachHub.removeConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (playerToRemove) removeFromTeam(playerToRemove);
                setPlayerToRemove(null);
              }}
            >
              {t('coachHub.removeFromTeam')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={addExistingOpen} onOpenChange={(open) => !open && closeAddExisting()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('coachHub.addExistingTitle')}</DialogTitle>
            <DialogDescription>{t('coachHub.addExistingDesc')}</DialogDescription>
          </DialogHeader>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('coachHub.searchPlayers')}
          />
          <div className="space-y-1 max-h-[45vh] overflow-y-auto overscroll-contain">
            {candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {hasAnyCandidate ? t('coachHub.noSearchResults') : t('coachHub.noCandidates')}
              </p>
            ) : (
              candidates.map(p => {
                const otherTeamNames = teams
                  .filter(tm => p.teams?.includes(tm.id))
                  .map(tm => tm.name)
                  .join(', ');
                return (
                  <label
                    key={p.id}
                    className="flex items-center gap-3 rounded-md border p-3 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedIds.includes(p.id)}
                      onCheckedChange={() => toggleSelected(p.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{fullName(p)}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {otherTeamNames || t('coachHub.noTeam')}
                      </p>
                    </div>
                  </label>
                );
              })
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeAddExisting} disabled={adding}>
              {t('common.cancel')}
            </Button>
            <Button onClick={addSelectedToTeam} disabled={adding || selectedIds.length === 0}>
              {t('coachHub.addSelected', { count: selectedIds.length })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!playerToMove} onOpenChange={(open) => !open && setPlayerToMove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('coachHub.moveDialogTitle')}</DialogTitle>
            <DialogDescription>{t('coachHub.moveDialogDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {otherTeams.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t('coachHub.noOtherTeams')}
              </p>
            ) : (
              otherTeams.map(tm => (
                <Button
                  key={tm.id}
                  variant="outline"
                  className="w-full justify-start"
                  style={{ borderColor: tm.color, color: tm.color }}
                  onClick={() => playerToMove && moveToTeam(playerToMove, tm.id)}
                >
                  {tm.name}
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
