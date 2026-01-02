import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus } from 'lucide-react';

interface RatingInputProps {
  label: string;
  emoji: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function RatingInput({
  label,
  emoji,
  value,
  onChange,
  min = 1,
  max = 10,
}: RatingInputProps) {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  // Color based on value
  const getValueColor = () => {
    if (value <= 3) return 'bg-red-500/10 text-red-600 border-red-500/30';
    if (value <= 5) return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
    if (value <= 7) return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
    return 'bg-green-500/10 text-green-600 border-green-500/30';
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-lg">{emoji}</span>
        <span className="text-sm font-medium truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full shrink-0"
          onClick={handleDecrement}
          disabled={value <= min}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Badge 
          variant="outline" 
          className={`min-w-[3rem] h-10 text-lg font-bold justify-center ${getValueColor()}`}
        >
          {value}
        </Badge>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full shrink-0"
          onClick={handleIncrement}
          disabled={value >= max}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
