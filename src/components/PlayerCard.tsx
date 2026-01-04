import { MessageCircle } from 'lucide-react';
import { DbPlayer } from '@/hooks/usePlayers';
import { useTeams } from '@/hooks/useTeams';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface PlayerCardProps {
  player: DbPlayer;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
  showTeams?: boolean;
}

export function PlayerCard({ player, selectable, selected, onSelect, showTeams = true }: PlayerCardProps) {
  const { teams } = useTeams();
  
  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = player.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}`, '_blank');
  };

  const playerTeams = teams.filter(t => player.teams?.includes(t.id));
  
  const fullName = [player.name, player.surname1, player.surname2]
    .filter(Boolean)
    .join(' ');

  return (
    <Card 
      className={`transition-all ${selectable ? 'cursor-pointer hover:shadow-md active:scale-[0.98]' : ''} ${selected ? 'ring-2 ring-primary' : ''}`}
      onClick={() => selectable && onSelect?.(player.id)}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {selectable && (
            <input
              type="checkbox"
              checked={!!selected}
              onChange={() => onSelect?.(player.id)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Seleccionar ${fullName}`}
              className="h-4 w-4 shrink-0 rounded-sm border border-primary bg-background text-primary accent-primary"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground truncate">{fullName}</span>
              {player.number && (
                <span className="text-xs font-bold text-primary">#{player.number}</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              {player.birth_year && <span>{player.birth_year}</span>}
              {player.height && <span>• {player.height} cm</span>}
            </div>
            {showTeams && playerTeams.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {playerTeams.map(team => (
                  <Badge 
                    key={team.id} 
                    variant="secondary" 
                    className="text-[10px] px-1.5 py-0"
                    style={{ backgroundColor: `${team.color}20`, color: team.color }}
                  >
                    {team.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={handleWhatsApp}
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
