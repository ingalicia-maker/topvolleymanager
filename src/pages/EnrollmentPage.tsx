import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import type { FormField, Frequency } from '@/hooks/useClubFees';
import { frequencyLabel, money } from '@/components/fees/feeUtils';
import { tr } from '@/lib/tr';

interface PublicForm {
  title: string;
  intro: string | null;
  fields: FormField[];
  is_open: boolean;
  currency: string;
  club: { name: string; logo_url: string | null };
  plans: { id: string; name: string; description: string | null; amount: number; frequency: Frequency; installments: number }[];
}

const LANGS = [['es', 'Español'], ['en', 'English'], ['it', 'Italiano']] as const;

/** Public enrolment form a club shares with families (no account needed). */
export default function EnrollmentPage() {
  const { slug } = useParams();
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage || 'es').slice(0, 2);
  const [form, setForm] = useState<PublicForm | null | undefined>(undefined);
  const [values, setValues] = useState({ player_name: '', player_birth_date: '', guardian_name: '', guardian_email: '', guardian_phone: '', plan_id: '' });
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('get_enrollment_form', { _slug: slug }).then(({ data }: { data: PublicForm | null }) => {
      setForm(data ?? null);
      if (data?.plans.length === 1) setValues(v => ({ ...v, plan_id: data.plans[0].id }));
    });
  }, [slug]);

  const set = (k: keyof typeof values, v: string) => setValues(s => ({ ...s, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!consent) { setError(tr('Debes aceptar el tratamiento de los datos para enviar la inscripción.')); return; }
    setSending(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc('submit_enrollment', {
      _slug: slug,
      _data: { ...values, answers, language: lang },
    });
    setSending(false);
    if (!error) { setDone(true); window.scrollTo(0, 0); return; }
    const code = error.message ?? '';
    setError(
      code.includes('invalid_email') ? tr('El email no es válido.')
      : code.includes('missing_required') ? tr('Completa todos los campos obligatorios.')
      : code.includes('form_closed') ? tr('Las inscripciones están cerradas.')
      : code.includes('duplicate') ? tr('Esta inscripción ya se ha enviado.')
      : tr('No se pudo enviar la inscripción. Inténtalo de nuevo.'),
    );
  };

  const langPicker = (
    <div className="flex justify-end gap-1">
      {LANGS.map(([code, name]) => (
        <Button key={code} size="sm" variant={lang === code ? 'default' : 'ghost'} onClick={() => i18n.changeLanguage(code)}>{name}</Button>
      ))}
    </div>
  );

  if (form === undefined) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-4">
      <div className="max-w-xl mx-auto space-y-4">
        {langPicker}
        {!form ? (
          <Card><CardContent className="p-6 text-center">{tr('Este formulario no existe.')}</CardContent></Card>
        ) : done ? (
          <Card><CardContent className="p-8 text-center space-y-3">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <p className="text-lg font-semibold">{tr('¡Inscripción enviada!')}</p>
            <p className="text-sm text-muted-foreground">{tr('Te hemos enviado un email de confirmación. El club revisará la inscripción y se pondrá en contacto contigo.')}</p>
          </CardContent></Card>
        ) : (
          <Card>
            <CardHeader className="text-center">
              {form.club.logo_url && <img src={form.club.logo_url} alt="" className="h-16 w-16 object-contain mx-auto" />}
              <CardDescription>{form.club.name}</CardDescription>
              <CardTitle>{form.title}</CardTitle>
              {form.intro && <p className="text-sm text-muted-foreground whitespace-pre-line text-left pt-2">{form.intro}</p>}
            </CardHeader>
            <CardContent>
              {!form.is_open ? (
                <p className="text-center text-sm text-muted-foreground">{tr('Las inscripciones están cerradas.')}</p>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <p className="font-medium">{tr('Datos de la jugadora')}</p>
                  <div className="space-y-1">
                    <Label>{tr('Nombre y apellidos de la jugadora')} *</Label>
                    <Input required maxLength={200} value={values.player_name} onChange={e => set('player_name', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>{tr('Fecha de nacimiento')}</Label>
                    <Input type="date" value={values.player_birth_date} onChange={e => set('player_birth_date', e.target.value)} />
                  </div>

                  <p className="font-medium pt-2">{tr('Padre, madre o tutor')}</p>
                  <div className="space-y-1">
                    <Label>{tr('Nombre y apellidos')} *</Label>
                    <Input required maxLength={200} value={values.guardian_name} onChange={e => set('guardian_name', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Email *</Label>
                      <Input required type="email" value={values.guardian_email} onChange={e => set('guardian_email', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>{tr('Teléfono')}</Label>
                      <Input type="tel" maxLength={40} value={values.guardian_phone} onChange={e => set('guardian_phone', e.target.value)} />
                    </div>
                  </div>

                  {form.fields.length > 0 && <p className="font-medium pt-2">{tr('Más información')}</p>}
                  {form.fields.map(f => (
                    <div key={f.id} className="space-y-1">
                      {f.type === 'checkbox' ? (
                        <label className="flex items-start gap-2 text-sm">
                          <Checkbox className="mt-0.5" checked={!!answers[f.id]} onCheckedChange={v => setAnswers(a => ({ ...a, [f.id]: !!v }))} />
                          <span>{f.label}{f.required && ' *'}</span>
                        </label>
                      ) : (
                        <>
                          <Label>{f.label}{f.required && ' *'}</Label>
                          {f.type === 'textarea' ? (
                            <Textarea required={f.required} maxLength={2000} value={String(answers[f.id] ?? '')} onChange={e => setAnswers(a => ({ ...a, [f.id]: e.target.value }))} />
                          ) : f.type === 'select' ? (
                            <Select value={String(answers[f.id] ?? '')} onValueChange={v => setAnswers(a => ({ ...a, [f.id]: v }))}>
                              <SelectTrigger><SelectValue placeholder={tr('Elige una opción')} /></SelectTrigger>
                              <SelectContent>{(f.options ?? []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                            </Select>
                          ) : (
                            <Input type={f.type} required={f.required} maxLength={500} value={String(answers[f.id] ?? '')} onChange={e => setAnswers(a => ({ ...a, [f.id]: e.target.value }))} />
                          )}
                        </>
                      )}
                    </div>
                  ))}

                  {form.plans.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <p className="font-medium">{tr('Cuota')} *</p>
                      <RadioGroup value={values.plan_id} onValueChange={v => set('plan_id', v)}>
                        {form.plans.map(p => (
                          <label key={p.id} className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
                            <RadioGroupItem value={p.id} className="mt-1" />
                            <div>
                              <p className="font-medium">{p.name}</p>
                              <p className="text-sm text-muted-foreground">{money(Number(p.amount), form.currency)} · {frequencyLabel(p.frequency, p.installments)}</p>
                              {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                            </div>
                          </label>
                        ))}
                      </RadioGroup>
                    </div>
                  )}

                  <label className="flex items-start gap-2 text-sm pt-2">
                    <Checkbox className="mt-0.5" checked={consent} onCheckedChange={v => setConsent(!!v)} />
                    <span>{tr('Acepto que {club} trate estos datos para gestionar la inscripción y los pagos de la jugadora.', { club: form.club.name })} *</span>
                  </label>

                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={sending}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : tr('Enviar inscripción')}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}
        <p className="text-center text-xs text-muted-foreground">Top Volley Manager</p>
      </div>
    </div>
  );
}
