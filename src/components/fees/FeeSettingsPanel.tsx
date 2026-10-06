import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useConfirm } from './ConfirmDialog';
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
  onStripe: (action: 'onboard' | 'status' | 'disconnect') => Promise<{ url?: string }>;
}

export function FeeSettingsPanel({ settings, onSave, onStripe }: Props) {
  const [stripeBusy, setStripeBusy] = useState(false);
  const [confirm, confirmDialog] = useConfirm();

  const stripe = async (action: 'onboard' | 'status' | 'disconnect') => {
    if (action === 'disconnect' && !(await confirm(tr('Las familias ya no podrán pagar con tarjeta desde los recordatorios. Tu cuenta de Stripe no se borra.')))) return;
    setStripeBusy(true);
    try {
      const r = await onStripe(action);
      if (r.url) window.location.href = r.url;
      else if (action === 'disconnect') toast.success(tr('Stripe desconectado'));
    } catch (e) {
      toast.error(tr('No se pudo conectar con Stripe') + ': ' + (e as Error).message);
    } finally {
      setStripeBusy(false);
    }
  };
  const connected = !!settings.stripe_account_id;
  const ready = connected && !!settings.stripe_charges_enabled;
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> {tr('Cobros online con Stripe (opcional)')}
            {ready && <Badge className="bg-green-600 hover:bg-green-600 gap-1"><CheckCircle2 className="h-3 w-3" />{tr('Conectado')}</Badge>}
            {connected && !ready && <Badge variant="outline">{tr('Alta pendiente')}</Badge>}
          </CardTitle>
          <CardDescription>
            {tr('Conecta la cuenta de Stripe del club y las familias podrán pagar cada plazo con tarjeta desde el recordatorio. El pago se marca solo como pagado y el dinero va directo a la cuenta del club. Si no lo conectas, todo funciona igual: registras los pagos a mano (transferencia, efectivo, Bizum...).')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {!ready && (
            <Button onClick={() => stripe('onboard')} disabled={stripeBusy} className="gap-1">
              {stripeBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              {connected ? tr('Completar el alta en Stripe') : tr('Conectar con Stripe')}
            </Button>
          )}
          {connected && (
            <Button variant="outline" onClick={() => stripe('status')} disabled={stripeBusy}>{tr('Comprobar estado')}</Button>
          )}
          {ready && (
            <Button variant="outline" className="gap-1" asChild>
              <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" />{tr('Abrir panel de Stripe')}</a>
            </Button>
          )}
          {connected && (
            <Button variant="ghost" className="text-destructive" onClick={() => stripe('disconnect')} disabled={stripeBusy}>{tr('Desconectar')}</Button>
          )}
          <p className="w-full text-xs text-muted-foreground">{tr('Stripe cobra su comisión habitual al club por cada pago. Top Volley Manager no cobra comisión.')}</p>
        </CardContent>
      </Card>
      {confirmDialog}

      <Button className="w-full" onClick={save} disabled={saving}>{saving ? tr('Guardando...') : tr('Guardar ajustes')}</Button>
    </div>
  );
}
