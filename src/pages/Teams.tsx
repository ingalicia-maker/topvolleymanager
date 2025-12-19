import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { TeamCard } from '@/components/TeamCard';
import { TEAMS, Player } from '@/types/volleyball';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export default function Teams() {
  const [players] = useLocalStorage<Player[]>('volleyball-players', []);

  const getPlayerCount = (teamId: string) => {
    return players.filter(p => p.teams.includes(teamId)).length;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Equipos" />
      <main className="p-4 space-y-3">
        {TEAMS.map(team => (
          <TeamCard 
            key={team.id} 
            team={team} 
            playerCount={getPlayerCount(team.id)} 
          />
        ))}
      </main>
      <BottomNav />
    </div>
  );
}
