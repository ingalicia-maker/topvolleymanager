import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DbTeam } from '@/hooks/useTeams';
import { Card, CardContent } from './ui/card';

interface TeamCardProps {
  team: DbTeam;
  playerCount: number;
}

export function TeamCard({ team, playerCount }: TeamCardProps) {
  return (
    <Link to={`/teams/${team.id}`}>
      <Card className="overflow-hidden transition-all hover:shadow-lg active:scale-[0.98]">
        <div 
          className="h-2" 
          style={{ backgroundColor: team.color }}
        />
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-foreground">{team.name}</h3>
              <p className="text-sm text-muted-foreground">Coach: {team.coach}</p>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-1">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">{playerCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
