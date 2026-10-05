import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useRatingCriteria } from '@/hooks/useRatingCriteria';
import { builtinDefaultLabel, type BuiltinKey } from '@/lib/ratingCriteria';
import { tr } from '@/lib/tr';

interface Draft {
  id: string | null;
  builtinKey: BuiltinKey | null;
  label: string;
  /** Default (translated) name of a builtin criterion, to know whether it was renamed. */
  defaultLabel: string | null;
  emoji: string;
  active: boolean;
}

interface RatingCriteriaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Lets a director choose the club's rating criteria: hide/show, rename, reorder and add. */
export function RatingCriteriaDialog({ open, onOpenChange }: RatingCriteriaDialogProps) {
  const { all, saveCriteria } = useRatingCriteria();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDrafts(all.map((c) => ({
      id: c.id,
      builtinKey: c.builtinKey,
      label: c.label,
      // buildCriteria uses the renamed label if there is one; compare against the default text.
      defaultLabel: c.builtinKey ? builtinDefaultLabel(c.builtinKey) : null,
      emoji: c.emoji,
      active: c.active,
    })));
    setNewLabel('');
  }, [open, all]);

  const update = (i: number, patch: Partial<Draft>) =>
    setDrafts((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const move = (i: number, dir: -1 | 1) =>
    setDrafts((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.length) return d;
      const next = [...d];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const add = () => {
    const label = newLabel.trim().slice(0, 60);
    if (!label) return;
    setDrafts((d) => [...d, { id: null, builtinKey: null, label, defaultLabel: null, emoji: '🔹', active: true }]);
    setNewLabel('');
  };

  const activeCount = drafts.filter((d) => d.active).length;
  const invalid = activeCount === 0 || drafts.some((d) => !d.builtinKey && !d.label.trim());

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveCriteria(drafts.map((d) => ({
      id: d.id,
      builtinKey: d.builtinKey,
      label: d.label,
      active: d.active,
      renamed: d.builtinKey && d.label.trim() !== d.defaultLabel ? d.label.trim() : null,
    })));
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{tr('Criterios de valoración')}</DialogTitle>
          <DialogDescription>
            {tr('Elige qué criterios se valoran en tu club. Puedes ocultar, renombrar, ordenar o añadir criterios. Las valoraciones anteriores se conservan.')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {drafts.map((d, i) => (
            <div key={d.id ?? `new-${i}`} className={`flex items-center gap-2 rounded-lg border p-2 ${d.active ? '' : 'opacity-60'}`}>
              <span className="text-lg w-6 text-center">{d.emoji}</span>
              <Input
                value={d.label}
                maxLength={60}
                onChange={(e) => update(i, { label: e.target.value })}
                onBlur={() => { if (d.builtinKey && !d.label.trim()) update(i, { label: d.defaultLabel ?? '' }); }}
                className="h-9 flex-1"
                aria-label={tr('Nombre del criterio')}
              />
              <div className="flex flex-col">
                <button type="button" className="p-0.5 text-muted-foreground disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label={tr('Mover arriba')}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" className="p-0.5 text-muted-foreground disabled:opacity-30" disabled={i === drafts.length - 1} onClick={() => move(i, 1)} aria-label={tr('Mover abajo')}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
              {d.id === null && !d.builtinKey ? (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDrafts((x) => x.filter((_, j) => j !== i))} aria-label={tr('Eliminar')}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : (
                <Switch checked={d.active} onCheckedChange={(v) => update(i, { active: v })} aria-label={tr('Visible')} />
              )}
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <Input
              value={newLabel}
              maxLength={60}
              placeholder={tr('Nuevo criterio (ej. Saque)')}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
              className="h-9"
            />
            <Button variant="outline" size="sm" onClick={add} disabled={!newLabel.trim()} className="gap-1">
              <Plus className="h-4 w-4" />
              {tr('Añadir')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {tr('Los criterios desactivados no se piden al valorar, pero sus datos anteriores se guardan.')}
          </p>
          {activeCount === 0 && (
            <p className="text-xs text-destructive">{tr('Debe haber al menos un criterio activo.')}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{tr('Cancelar')}</Button>
          <Button onClick={handleSave} disabled={saving || invalid}>
            {saving ? tr('Guardando...') : tr('Guardar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
