import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DbEvent } from '@/hooks/useEvents';
import { useTeams } from '@/hooks/useTeams';
import { useStops } from '@/hooks/useStops';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface EditEventDialogProps {
  event: DbEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: Partial<DbEvent>) => Promise<boolean>;
}

export function EditEventDialog({ event, open, onOpenChange, onSave }: EditEventDialogProps) {
  const { t } = useTranslation();
  const { teams } = useTeams();
  const { stops: availableStops } = useStops();
  
  const [title, setTitle] = useState(event.title);
  const [date, setDate] = useState(event.date);
  const [time, setTime] = useState(event.time);
  const [location, setLocation] = useState(event.location);
  const [destination, setDestination] = useState(event.destination || '');
  const [notes, setNotes] = useState(event.notes || '');
  const [saving, setSaving] = useState(false);

  const isDisplacement = event.type === 'displacement';

  // Generate time options in 15-minute increments
  const timeOptions: string[] = [];
  for (let h = 5; h <= 23; h++) {
    for (const m of [0, 15, 30, 45]) {
      const hour = h.toString().padStart(2, '0');
      const minute = m.toString().padStart(2, '0');
      timeOptions.push(`${hour}:${minute}`);
    }
  }

  const nativeSelectClassName =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  const handleSave = async () => {
    if (!date) {
      toast.error('La fecha es obligatoria');
      return;
    }
    if (!time) {
      toast.error('La hora es obligatoria');
      return;
    }
    if (isDisplacement && !destination.trim()) {
      toast.error('El destino es obligatorio');
      return;
    }
    if (!isDisplacement && !location.trim()) {
      toast.error('La ubicación es obligatoria');
      return;
    }

    setSaving(true);
    const updates: Partial<DbEvent> = {
      title: title.trim(),
      date,
      time,
      location: isDisplacement ? destination.trim() : location.trim(),
      destination: isDisplacement ? destination.trim() : null,
      notes: notes.trim() || null,
    };

    const success = await onSave(updates);
    setSaving(false);

    if (success) {
      toast.success('Evento actualizado');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar evento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Fecha</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">{isDisplacement ? 'Hora de salida' : 'Hora'}</Label>
            <select
              id="time"
              className={nativeSelectClassName}
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={saving}
            >
              {timeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {isDisplacement ? (
            <div className="space-y-2">
              <Label htmlFor="destination">Destino</Label>
              <Input
                id="destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                disabled={saving}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={saving}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales..."
              disabled={saving}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
