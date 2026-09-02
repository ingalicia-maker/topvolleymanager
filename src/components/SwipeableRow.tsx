import { useRef, useState } from 'react';
import { Pencil, Archive, Trash2, ArrowRightLeft } from 'lucide-react';

interface SwipeableRowProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onMove?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  moveLabel?: string;
  archiveLabel?: string;
  deleteLabel?: string;
}

const ACTION_WIDTH = 72;

export function SwipeableRow({
  children,
  onEdit,
  onMove,
  onArchive,
  onDelete,
  editLabel = 'Editar',
  moveLabel = 'Mover',
  archiveLabel = 'Archivar',
  deleteLabel = 'Eliminar',
}: SwipeableRowProps) {
  const actions = [
    onEdit && { key: 'edit', icon: Pencil, label: editLabel, run: onEdit, className: 'bg-secondary text-secondary-foreground' },
    onMove && { key: 'move', icon: ArrowRightLeft, label: moveLabel, run: onMove, className: 'bg-accent text-accent-foreground' },
    onArchive && { key: 'archive', icon: Archive, label: archiveLabel, run: onArchive, className: 'bg-muted text-foreground' },
    onDelete && { key: 'delete', icon: Trash2, label: deleteLabel, run: onDelete, className: 'bg-destructive text-destructive-foreground' },
  ].filter(Boolean) as {
    key: string;
    icon: typeof Pencil;
    label: string;
    run: () => void;
    className: string;
  }[];

  const maxOffset = actions.length * ACTION_WIDTH;
  const [offset, setOffset] = useState(0);
  const startX = useRef<number | null>(null);
  const startOffset = useRef(0);

  if (actions.length === 0) return <>{children}</>;

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startOffset.current = offset;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const delta = e.touches[0].clientX - startX.current;
    const next = Math.min(maxOffset, Math.max(0, startOffset.current - delta));
    setOffset(next);
  };

  const onTouchEnd = () => {
    setOffset(offset > maxOffset / 3 ? maxOffset : 0);
    startX.current = null;
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      <div className="absolute inset-y-0 right-0 flex" style={{ width: maxOffset }}>
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            aria-label={action.label}
            className={`flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium ${action.className}`}
            onClick={() => {
              setOffset(0);
              action.run();
            }}
          >
            <action.icon className="h-4 w-4" />
            {action.label}
          </button>
        ))}
      </div>
      <div
        className="relative transition-transform duration-200"
        style={{ transform: `translateX(-${offset}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
