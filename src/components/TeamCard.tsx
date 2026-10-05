import { Users, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DbTeam } from '@/hooks/useTeams';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { tr } from '@/lib/tr';

interface TeamCardProps {
  team: DbTeam;
  playerCount: number;
  onDelete?: (team: DbTeam) => void;
  deleteLabel?: string;
}

export function TeamCard({ team, playerCount, onDelete, deleteLabel }: TeamCardProps) {
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
              <p className="text-sm text-muted-foreground">{tr('Entrenador: {coach}', { coach: team.coach })}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-1">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">{playerCount}</span>
              </div>
              {onDelete && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={deleteLabel}
                  className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(team);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
