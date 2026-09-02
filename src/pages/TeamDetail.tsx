import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
import { usePlayers } from '@/hooks/usePlayers';
import { useTeams } from '@/hooks/useTeams';

export default function TeamDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { teamId } = useParams<{ teamId: string }>();
  const { players, archivePlayer, deletePlayer } = usePlayers();
  const { teams, loading } = useTeams();
  const [playerToDelete, setPlayerToDelete] = useState<string | null>(null);

  const team = teams.find(t => t.id === teamId);
  const teamPlayers = players.filter(p => p.teams?.includes(teamId || ''));

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
                archiveLabel={t('players.archive')}
                deleteLabel={t('common.delete')}
                onEdit={() => navigate(`/players/${player.id}`)}
                onArchive={() => archivePlayer(player.id)}
                onDelete={() => setPlayerToDelete(player.id)}
              >
                <PlayerCard player={player} showTeams={false} />
              </SwipeableRow>
            ))
          )}
        </div>
      </div>

      <AlertDialog open={!!playerToDelete} onOpenChange={(open) => !open && setPlayerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('players.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('players.deleteCount', { count: 1 })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (playerToDelete) deletePlayer(playerToDelete);
                setPlayerToDelete(null);
              }}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
}
