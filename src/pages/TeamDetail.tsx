import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { PlayerCard } from '@/components/PlayerCard';
import { SwipeableRow } from '@/components/SwipeableRow';
import { Button } from '@/components/ui/button';
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

  const team = teams.find(t => t.id === teamId);
  const teamPlayers = players.filter(p => p.teams?.includes(teamId || ''));

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
