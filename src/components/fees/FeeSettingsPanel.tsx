import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FeeSettings } from '@/hooks/useClubFees';
import { CURRENCIES } from './feeUtils';
import { tr } from '@/lib/tr';

interface Props {
  settings: FeeSettings;
  onSave: (values: Partial<FeeSettings>) => Promise<void>;
}

export function FeeSettingsPanel({ settings, onSave }: Props) {
  const [values, setValues] = useState(settings);
  const [saving, setSaving] = useState(false);
  useEffect(() => setValues(settings), [settings]);

  const save = async () => {
    if (values.contact_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.contact_email)) {
      toast.error(tr('Email de contacto no válido'));
      return;
    }
    setSaving(true);
    try {
      await onSave({
        currency: values.currency,
        contact_email: values.contact_email?.trim() || null,
        auto_reminders: values.auto_reminders,
        remind_days_before: Math.min(60, Math.max(0, Number(values.remind_days_before) || 0)),
        remind_every_days: Math.min(60, Math.max(1, Number(values.remind_every_days) || 7)),
      });
      toast.success(tr('Ajustes guardados'));
    } catch (e) {
      toast.error(tr('No se pudo guardar') + ': ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{tr('General')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>{tr('Moneda')}</Label>
            <Select value={values.currency} onValueChange={v => setValues({ ...values, currency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{tr('Email de contacto para las familias')}</Label>
            <Input type="email" value={values.contact_email ?? ''} onChange={e => setValues({ ...values, contact_email: e.target.value })} placeholder="tesoreria@miclub.com" />
            <p className="text-xs text-muted-foreground">{tr('Aparece en los recordatorios para que las familias puedan escribir al club.')}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{tr('Recordatorios automáticos')}</CardTitle>
          <CardDescription>{tr('Se envían por email cada mañana a las familias con pagos pendientes, en su idioma.')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>{tr('Activar recordatorios automáticos')}</Label>
            <Switch checked={values.auto_reminders} onCheckedChange={v => setValues({ ...values, auto_reminders: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{tr('Días antes del vencimiento')}</Label>
              <Input type="number" min={0} max={60} value={values.remind_days_before} onChange={e => setValues({ ...values, remind_days_before: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>{tr('Repetir cada (días)')}</Label>
              <Input type="number" min={1} max={60} value={values.remind_every_days} onChange={e => setValues({ ...values, remind_every_days: Number(e.target.value) })} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {tr('Ejemplo: con 3 y 7, la familia recibe un aviso 3 días antes del vencimiento y, si sigue sin pagar, otro cada 7 días.')}
          </p>
        </CardContent>
      </Card>

      <Button className="w-full" onClick={save} disabled={saving}>{saving ? tr('Guardando...') : tr('Guardar ajustes')}</Button>
    </div>
  );
}
