import { useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { PlayerCard } from '@/components/PlayerCard';
import { Button } from '@/components/ui/button';
import { TEAMS } from '@/types/volleyball';
import { usePlayers } from '@/hooks/usePlayers';
import { Link } from 'react-router-dom';

export default function TeamDetail() {
  const { teamId } = useParams<{ teamId: string }>();
  const { players } = usePlayers();

  const team = TEAMS.find(t => t.id === teamId);
  const teamPlayers = players.filter(p => p.teams.includes(teamId || ''));

  if (!team) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Equipo no encontrado" showBack />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header 
        title={team.name} 
        showBack 
        rightAction={
          <Link to={`/players/new?team=${teamId}`}>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Añadir
            </Button>
          </Link>
        }
      />
      <div className="p-4">
        <div 
          className="rounded-lg p-4 mb-4"
          style={{ backgroundColor: `${team.color}15` }}
        >
          <p className="text-sm text-muted-foreground">Coach</p>
          <p className="font-bold text-foreground">{team.coach}</p>
          <p className="text-sm text-muted-foreground mt-2">
            {teamPlayers.length} jugadora{teamPlayers.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="space-y-2">
          {teamPlayers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay jugadoras en este equipo
            </p>
          ) : (
            teamPlayers.map(player => (
              <PlayerCard key={player.id} player={player} showTeams={false} />
            ))
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}