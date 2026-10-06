import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { money } from '@/components/fees/feeUtils';
import { tr } from '@/lib/tr';

interface FeePayment {
  club: string;
  logo_url: string | null;
  player: string;
  concept: string;
  amount: number;
  currency: string;
  due_date: string;
  status: 'pending' | 'paid' | 'waived';
  can_pay: boolean;
}

const LANGS = [['es', 'Español'], ['en', 'English'], ['it', 'Italiano']] as const;

/** Public page a family opens from a reminder to pay one instalment through the club's Stripe. */
export default function PayFeePage() {
  const { token } = useParams();
  const [params] = useSearchParams();
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage || 'es').slice(0, 2);
  const [payment, setPayment] = useState<FeePayment | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const justPaid = params.get('status') === 'paid';

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('get_fee_payment', { _token: token }).then(({ data }: { data: FeePayment | null }) => setPayment(data ?? null));
  }, [token]);

  const pay = async () => {
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.functions.invoke('fee-checkout', { body: { token, language: lang } });
    if (data?.url) { window.location.href = data.url; return; }
    let code = data?.error;
    try { code = (await (error as { context?: Response })?.context?.json())?.error ?? code; } catch { /* not JSON */ }
    setError(code === 'not_pending' ? tr('Este pago ya no está pendiente.') : tr('No se pudo abrir el pago. Inténtalo de nuevo o contacta con el club.'));
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex justify-end gap-1">
          {LANGS.map(([code, name]) => (
            <Button key={code} size="sm" variant={lang === code ? 'default' : 'ghost'} onClick={() => i18n.changeLanguage(code)}>{name}</Button>
          ))}
        </div>
        {payment === undefined ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : !payment ? (
          <Card><CardContent className="p-6 text-center">{tr('Este enlace de pago no existe.')}</CardContent></Card>
        ) : (
          <Card>
            <CardHeader className="text-center">
              {payment.logo_url && <img src={payment.logo_url} alt="" className="h-16 w-16 object-contain mx-auto" />}
              <CardDescription>{payment.club}</CardDescription>
              <CardTitle>{payment.concept}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">{payment.player} · {tr('Vencimiento')} {new Date(payment.due_date).toLocaleDateString(lang)}</p>
              <p className="text-3xl font-semibold">{money(Number(payment.amount), payment.currency)}</p>
              {payment.status === 'paid' || justPaid ? (
                <div className="space-y-2">
                  <CheckCircle className="h-10 w-10 text-green-600 mx-auto" />
                  <p className="font-medium">{justPaid && payment.status !== 'paid' ? tr('¡Gracias! Estamos confirmando el pago.') : tr('Este pago ya está hecho. ¡Gracias!')}</p>
                </div>
              ) : payment.status === 'waived' ? (
                <p className="text-sm text-muted-foreground">{tr('El club ha marcado este pago como exento.')}</p>
              ) : payment.can_pay ? (
                <>
                  <Button className="w-full gap-2" size="lg" onClick={pay} disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    {tr('Pagar {amount}', { amount: money(Number(payment.amount), payment.currency) })}
                  </Button>
                  <p className="text-xs text-muted-foreground">{tr('Pago seguro con Stripe. El dinero va directamente al club.')}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{tr('El club no tiene activado el pago online. Contacta con el club para pagar.')}</p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
          </Card>
        )}
        <p className="text-center text-xs text-muted-foreground">Top Volley Manager</p>
      </div>
    </div>
  );
}
