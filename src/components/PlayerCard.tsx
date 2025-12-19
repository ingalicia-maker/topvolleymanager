import { Phone, MessageCircle } from 'lucide-react';
import { Player, TEAMS } from '@/types/volleyball';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';

interface PlayerCardProps {
  player: Player;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
  showTeams?: boolean;
}

export function PlayerCard({ player, selectable, selected, onSelect, showTeams = true }: PlayerCardProps) {
  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = player.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}`, '_blank');
  };

  const playerTeams = TEAMS.filter(t => player.teams.includes(t.id));

  return (
    <Card 
      className={`transition-all ${selectable ? 'cursor-pointer hover:shadow-md active:scale-[0.98]' : ''} ${selected ? 'ring-2 ring-primary' : ''}`}
      onClick={() => selectable && onSelect?.(player.id)}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {selectable && (
            <Checkbox 
              checked={selected} 
              onCheckedChange={() => onSelect?.(player.id)}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground truncate">{player.name}</span>
              {player.number && (
                <span className="text-xs font-bold text-primary">#{player.number}</span>
              )}
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
