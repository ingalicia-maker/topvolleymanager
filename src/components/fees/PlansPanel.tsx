import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FeePlan, Frequency } from '@/hooks/useClubFees';
import { frequencyLabel, money } from './feeUtils';
import { tr } from '@/lib/tr';

interface Props {
  plans: FeePlan[];
  currency: string;
  onSave: (plan: Partial<FeePlan>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const EMPTY: Partial<FeePlan> = { name: '', description: '', amount: 0, frequency: 'monthly', installments: 10, first_due_date: null, payment_link: '', active: true };

export function PlansPanel({ plans, currency, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState<Partial<FeePlan> | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!editing?.name?.trim()) { toast.error(tr('Escribe el nombre de la cuota')); return; }
    if (editing.payment_link && !/^https:\/\//.test(editing.payment_link)) {
      toast.error(tr('El enlace de pago debe empezar por https://'));
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...editing,
        name: editing.name.trim(),
        amount: Number(editing.amount) || 0,
        installments: editing.frequency === 'once' ? 1 : Math.min(24, Math.max(1, Number(editing.installments) || 1)),
        payment_link: editing.payment_link?.trim() || null,
        first_due_date: editing.first_due_date || null,
      });
      toast.success(tr('Cuota guardada'));
      setEditing(null);
    } catch (e) {
      toast.error(tr('No se pudo guardar') + ': ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (plan: FeePlan) => {
    if (!confirm(tr('¿Eliminar la cuota "{name}"? Los pagos ya creados se mantienen.', { name: plan.name }))) return;
    try { await onDelete(plan.id); } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{tr('Define las cuotas del club: importe, periodicidad y enlace de pago de Stripe.')}</p>
        <Button size="sm" className="gap-1 shrink-0" onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="h-4 w-4" /> {tr('Nueva cuota')}
        </Button>
      </div>

      {plans.length === 0 && (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">{tr('Aún no hay cuotas. Crea la primera, por ejemplo "Cuota mensual" o "Matrícula".')}</CardContent></Card>
      )}

      {plans.map(plan => (
        <Card key={plan.id} className={plan.active ? '' : 'opacity-60'}>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium">{plan.name}</p>
                {!plan.active && <Badge variant="secondary">{tr('Inactiva')}</Badge>}
                {plan.payment_link && <Badge variant="outline" className="gap-1"><Link2 className="h-3 w-3" />Stripe</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                {money(Number(plan.amount), currency)} · {frequencyLabel(plan.frequency, plan.installments)}
                {plan.first_due_date && ` · ${tr('desde')} ${new Date(plan.first_due_date).toLocaleDateString()}`}
              </p>
              {plan.description && <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>}
            </div>
            <Button variant="ghost" size="icon" aria-label={tr('Editar')} onClick={() => setEditing(plan)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" aria-label={tr('Eliminar')} onClick={() => remove(plan)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? tr('Editar cuota') : tr('Nueva cuota')}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>{tr('Nombre')}</Label>
                <Input value={editing.name ?? ''} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder={tr('Cuota mensual infantil')} />
              </div>
              <div className="space-y-1">
                <Label>{tr('Descripción (opcional)')}</Label>
                <Textarea rows={2} value={editing.description ?? ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{tr('Importe')} ({currency})</Label>
                  <Input type="number" min={0} step="0.01" value={editing.amount ?? 0} onChange={e => setEditing({ ...editing, amount: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label>{tr('Periodicidad')}</Label>
                  <Select value={editing.frequency} onValueChange={v => setEditing({ ...editing, frequency: v as Frequency })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">{tr('Pago único')}</SelectItem>
                      <SelectItem value="monthly">{tr('Mensual')}</SelectItem>
                      <SelectItem value="quarterly">{tr('Trimestral')}</SelectItem>
                      <SelectItem value="yearly">{tr('Anual')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {editing.frequency !== 'once' && (
                  <div className="space-y-1">
                    <Label>{tr('Número de plazos')}</Label>
                    <Input type="number" min={1} max={24} value={editing.installments ?? 1} onChange={e => setEditing({ ...editing, installments: Number(e.target.value) })} />
                  </div>
                )}
                <div className="space-y-1">
                  <Label>{tr('Primer vencimiento')}</Label>
                  <Input type="date" value={editing.first_due_date ?? ''} onChange={e => setEditing({ ...editing, first_due_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>{tr('Enlace de pago de Stripe (opcional)')}</Label>
                <Input value={editing.payment_link ?? ''} onChange={e => setEditing({ ...editing, payment_link: e.target.value })} placeholder="https://buy.stripe.com/..." />
                <p className="text-xs text-muted-foreground">{tr('Crea un "Payment Link" en tu cuenta de Stripe y pégalo aquí. Aparecerá en los recordatorios para que las familias paguen con un clic.')}</p>
              </div>
              <div className="flex items-center justify-between">
                <Label>{tr('Activa')}</Label>
                <Switch checked={editing.active ?? true} onCheckedChange={v => setEditing({ ...editing, active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{tr('Cancelar')}</Button>
            <Button onClick={save} disabled={saving}>{saving ? tr('Guardando...') : tr('Guardar')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
