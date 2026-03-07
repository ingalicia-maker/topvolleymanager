import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DbEvent } from '@/hooks/useEvents';
import { useTeams } from '@/hooks/useTeams';
import { useStops } from '@/hooks/useStops';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Shield, Info } from 'lucide-react';

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
  const [opponent, setOpponent] = useState(event.opponent || '');
  const [notes, setNotes] = useState(event.notes || '');
  const [keepForever, setKeepForever] = useState(event.keep_forever ?? false);
  const [selectedStops, setSelectedStops] = useState<string[]>((event.stops as string[]) || []);
  const [selectedTeams, setSelectedTeams] = useState<string[]>(event.selected_teams || []);
  const [saving, setSaving] = useState(false);

  const isDisplacement = event.type === 'displacement';
  const isMatch = event.type === 'match';

  const toggleStop = (stop: string) => {
    setSelectedStops(prev =>
      prev.includes(stop) ? prev.filter(s => s !== stop) : [...prev, stop]
    );
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeams(prev =>
      prev.includes(teamId) ? prev.filter(t => t !== teamId) : [...prev, teamId]
    );
  };

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
      opponent: isMatch && opponent.trim() ? opponent.trim() : null,
      notes: notes.trim() || null,
      keep_forever: keepForever,
    };

    if (isDisplacement) {
      updates.stops = selectedStops;
      updates.selected_teams = selectedTeams;
      // Set team_id to first selected team if available
      if (selectedTeams.length > 0 && !selectedTeams.includes(event.team_id)) {
        updates.team_id = selectedTeams[0];
      }
    }

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

          {/* Opponent field - only for matches */}
          {isMatch && (
            <div className="space-y-2">
              <Label htmlFor="opponent">Adversario (opcional)</Label>
              <Input
                id="opponent"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="Nombre del equipo rival..."
                disabled={saving}
              />
            </div>
          )}
          {/* Teams selection for displacement */}
          {isDisplacement && (
            <div className="space-y-2">
              <Label>Equipos</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {teams.map(tm => (
                  <label
                    key={tm.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTeams.includes(tm.id) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <Checkbox
                      checked={selectedTeams.includes(tm.id)}
                      onCheckedChange={() => toggleTeam(tm.id)}
                      disabled={saving}
                    />
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tm.color }}
                      />
                      <span className="text-sm font-medium">{tm.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Stops selection for displacement */}
          {isDisplacement && (
            <div className="space-y-2">
              <Label>Paradas del bus (opcional)</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availableStops.map(stop => (
                  <label
                    key={stop.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedStops.includes(stop.name) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <Checkbox
                      checked={selectedStops.includes(stop.name)}
                      onCheckedChange={() => toggleStop(stop.name)}
                      disabled={saving}
                    />
                    <span className="text-sm">{stop.name}</span>
                  </label>
                ))}
                {availableStops.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No hay paradas configuradas
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales..."
              disabled={saving}
              rows={3}
            />
          </div>

          {/* Keep forever option */}
          <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Los eventos se eliminan automáticamente 30 días después de su publicación.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-white dark:bg-background border border-amber-200 dark:border-amber-700">
                <Checkbox
                  checked={keepForever}
                  onCheckedChange={(checked) => setKeepForever(checked === true)}
                  disabled={saving}
                />
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium">Mantener guardado para siempre</span>
                </div>
              </label>

              {keepForever && (
                <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1">
                  ✓ Este evento no se eliminará automáticamente.
                </p>
              )}
            </CardContent>
          </Card>
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
