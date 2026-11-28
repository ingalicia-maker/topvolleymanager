// "Clubes Fundadores": public page where the first 25 clubs apply for a free Pro season pass.
// Applications go to submit_founder_application(); admins grant the pass from the admin panel.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Gift, Loader2, Star, Trophy, Users, Video, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LanguageSelector } from '@/components/LanguageSelector';
import { supabase } from '@/integrations/supabase/client';
import logoMark from '@/assets/logo-mark.png';

const TOTAL_SPOTS = 25;

const COPY = {
  es: {
    title: 'Clubes Fundadores · Top Volley Manager',
    metaDesc: 'Los primeros 25 clubes de voleibol tienen una temporada del plan Pro gratis: gestión del club, convocatorias, scouting de partidos y vídeo con retardo.',
    badge: 'Plazas limitadas',
    h1: 'Únete a los Clubes Fundadores',
    lead: 'Los primeros 25 clubes de voleibol que se unan tienen una temporada completa del plan Pro gratis (valor 120 €). Sin tarjeta y sin compromiso de pago.',
    spotsLeft: (n: number) => `Quedan ${n} de ${TOTAL_SPOTS} plazas`,
    full: 'Ya no quedan plazas. Puedes empezar igualmente con 14 días de Pro gratis.',
    getTitle: 'Qué recibe tu club',
    get: [
      '12 meses del plan Pro: hasta 20 equipos y 15 entrenadores',
      'Convocatorias, ausencias, valoraciones y cuotas del club',
      'Scouting de partidos con mapas de ataque y estadísticas',
      'Vídeo con retardo de hasta 30 s para corregir la técnica',
      'Ayuda directa para poner en marcha el club en la app',
    ],
    askTitle: 'Qué te pedimos a cambio',
    ask: [
      'Usar la app de verdad con al menos 2 equipos durante el primer mes',
      'Dejar una reseña sincera en la App Store o Google Play',
      'Permitirnos mostrar el nombre y el escudo del club en la web',
    ],
    formTitle: 'Solicita tu plaza',
    formLead: 'Usa el email de la cuenta con la que el club usará Top Volley Manager. Si aún no la tienes, créala después con ese mismo email.',
    club: 'Nombre del club', city: 'Ciudad', country: 'País', contact: 'Persona de contacto',
    email: 'Email de la cuenta', phone: 'Teléfono (opcional)', teams: 'Número de equipos',
    message: '¿Algo que debamos saber? (opcional)', send: 'Solicitar plaza',
    sending: 'Enviando…',
    okTitle: '¡Solicitud recibida!',
    okBody: 'Revisaremos tu solicitud en 1–2 días y activaremos el plan Pro en la cuenta con ese email. Si todavía no tienes cuenta, créala ya con el mismo email.',
    createAccount: 'Crear mi cuenta',
    duplicate: 'Ya hay una solicitud con este email.',
    invalid: 'Revisa los datos del formulario e inténtalo de nuevo.',
    error: 'No se pudo enviar la solicitud. Inténtalo de nuevo en un momento.',
    back: 'Volver a la web',
  },
  en: {
    title: 'Founding Clubs · Top Volley Manager',
    metaDesc: 'The first 25 volleyball clubs get one free season of the Pro plan: club management, call-ups, match scouting and delayed video.',
    badge: 'Limited places',
    h1: 'Join the Founding Clubs',
    lead: 'The first 25 volleyball clubs to join get a full season of the Pro plan for free (worth €120). No card, no commitment to pay.',
    spotsLeft: (n: number) => `${n} of ${TOTAL_SPOTS} places left`,
    full: 'All places are taken. You can still start with a 14-day free Pro trial.',
    getTitle: 'What your club gets',
    get: [
      '12 months of the Pro plan: up to 20 teams and 15 coaches',
      'Call-ups, absences, ratings and club fees',
      'Match scouting with attack maps and statistics',
      'Delayed video up to 30 s to correct technique',
      'Direct help to set your club up in the app',
    ],
    askTitle: 'What we ask in return',
    ask: [
      'Really use the app with at least 2 teams during the first month',
      'Leave an honest review on the App Store or Google Play',
      'Let us show your club name and badge on our website',
    ],
    formTitle: 'Apply for your place',
    formLead: 'Use the email of the account your club will use in Top Volley Manager. If you don\'t have one yet, create it later with that same email.',
    club: 'Club name', city: 'City', country: 'Country', contact: 'Contact person',
    email: 'Account email', phone: 'Phone (optional)', teams: 'Number of teams',
    message: 'Anything we should know? (optional)', send: 'Apply for a place',
    sending: 'Sending…',
    okTitle: 'Application received!',
    okBody: 'We\'ll review it within 1–2 days and activate the Pro plan on the account with that email. If you don\'t have an account yet, create it now with the same email.',
    createAccount: 'Create my account',
    duplicate: 'There is already an application with this email.',
    invalid: 'Please check the form and try again.',
    error: 'The application could not be sent. Please try again in a moment.',
    back: 'Back to the website',
  },
  it: {
    title: 'Club Fondatori · Top Volley Manager',
    metaDesc: 'I primi 25 club di pallavolo hanno una stagione gratuita del piano Pro: gestione del club, convocazioni, scouting delle partite e video in differita.',
    badge: 'Posti limitati',
    h1: 'Unisciti ai Club Fondatori',
    lead: 'I primi 25 club di pallavolo che si uniscono hanno una stagione completa del piano Pro gratis (valore 120 €). Senza carta e senza obbligo di pagamento.',
    spotsLeft: (n: number) => `Restano ${n} posti su ${TOTAL_SPOTS}`,
    full: 'I posti sono esauriti. Puoi comunque iniziare con 14 giorni di Pro gratis.',
    getTitle: 'Cosa riceve il tuo club',
    get: [
      '12 mesi del piano Pro: fino a 20 squadre e 15 allenatori',
      'Convocazioni, assenze, valutazioni e quote del club',
      'Scouting delle partite con mappe d\'attacco e statistiche',
      'Video in differita fino a 30 s per correggere la tecnica',
      'Aiuto diretto per avviare il club nell\'app',
    ],
    askTitle: 'Cosa ti chiediamo in cambio',
    ask: [
      'Usare davvero l\'app con almeno 2 squadre durante il primo mese',
      'Lasciare una recensione sincera sull\'App Store o Google Play',
      'Permetterci di mostrare nome e stemma del club sul sito',
    ],
    formTitle: 'Richiedi il tuo posto',
    formLead: 'Usa l\'email dell\'account con cui il club userà Top Volley Manager. Se non ce l\'hai ancora, crealo dopo con la stessa email.',
    club: 'Nome del club', city: 'Città', country: 'Paese', contact: 'Persona di contatto',
    email: 'Email dell\'account', phone: 'Telefono (facoltativo)', teams: 'Numero di squadre',
    message: 'Qualcosa che dovremmo sapere? (facoltativo)', send: 'Richiedi il posto',
    sending: 'Invio in corso…',
    okTitle: 'Richiesta ricevuta!',
    okBody: 'La esamineremo entro 1–2 giorni e attiveremo il piano Pro sull\'account con quella email. Se non hai ancora un account, crealo ora con la stessa email.',
    createAccount: 'Crea il mio account',
    duplicate: 'Esiste già una richiesta con questa email.',
    invalid: 'Controlla i dati del modulo e riprova.',
    error: 'Non è stato possibile inviare la richiesta. Riprova tra poco.',
    back: 'Torna al sito',
  },
} as const;

type Lang = keyof typeof COPY;
const db = supabase as unknown as { rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> };

export default function FounderClubs() {
  const { i18n } = useTranslation();
  const lang: Lang = (['es', 'en', 'it'].includes(i18n.language?.slice(0, 2)) ? i18n.language.slice(0, 2) : 'es') as Lang;
  const c = COPY[lang];

  const [spots, setSpots] = useState<number | null>(null);
  const [form, setForm] = useState({ club: '', city: '', country: '', contact: '', email: '', phone: '', teams: '', message: '', website: '' });
  const [state, setState] = useState<'idle' | 'sending' | 'ok'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    db.rpc('founder_spots_left').then(({ data }) => setSpots(typeof data === 'number' ? data : null));
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.website) { setState('ok'); return; } // honeypot: bots fill the hidden field
    setError(null);
    setState('sending');
    const { data, error: err } = await db.rpc('submit_founder_application', {
      _club_name: form.club, _city: form.city, _country: form.country, _contact_name: form.contact,
      _email: form.email, _phone: form.phone, _teams_count: form.teams ? Number(form.teams) : null,
      _message: form.message, _lang: lang,
    });
    if (err) { setError(c.error); setState('idle'); return; }
    if (data === 'ok') { setState('ok'); return; }
    if (data === 'full') { setSpots(0); setState('idle'); return; }
    setError(data === 'duplicate' ? c.duplicate : c.invalid);
    setState('idle');
  };

  const full = spots === 0;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{c.title}</title>
        <meta name="description" content={c.metaDesc} />
        <link rel="canonical" href="https://www.topvolleymanager.com/clubes-fundadores" />
      </Helmet>

      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/landing" className="flex items-center gap-2 min-w-0">
            <img src={logoMark} alt="Top Volley Manager" className="h-8 w-auto shrink-0" />
            <span className="font-bold text-lg sm:text-xl whitespace-nowrap hidden min-[420px]:inline">Top Volley Manager</span>
          </Link>
          <LanguageSelector />
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-5xl">
        {/* Hero */}
        <section className="text-center mb-10">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-sm font-medium mb-4">
            <Gift className="h-4 w-4" /> {c.badge}
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">{c.h1}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{c.lead}</p>
          {spots !== null && (
            <div className="mt-6 max-w-sm mx-auto">
              <p className="font-semibold mb-2">{full ? c.full : c.spotsLeft(spots)}</p>
              <div className="h-3 rounded-full bg-muted overflow-hidden" aria-hidden>
                <div className="h-full bg-primary transition-all" style={{ width: `${((TOTAL_SPOTS - spots) / TOTAL_SPOTS) * 100}%` }} />
              </div>
            </div>
          )}
        </section>

        {/* Benefits / conditions */}
        <section className="grid gap-6 md:grid-cols-2 mb-10">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" />{c.getTitle}</h2>
              <ul className="space-y-3">
                {c.get.map((g, i) => {
                  const Icon = [Users, CheckCircle2, Crosshair, Video, Star][i] ?? CheckCircle2;
                  return <li key={g} className="flex gap-3"><Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" /><span>{g}</span></li>;
                })}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Star className="h-5 w-5 text-primary" />{c.askTitle}</h2>
              <ul className="space-y-3">
                {c.ask.map(a => <li key={a} className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" /><span>{a}</span></li>)}
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Form */}
        <section id="solicitud" className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-6">
              {state === 'ok' ? (
                <div className="text-center space-y-4 py-6">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
                  <h2 className="text-2xl font-bold">{c.okTitle}</h2>
                  <p className="text-muted-foreground">{c.okBody}</p>
                  <Link to="/auth"><Button size="lg">{c.createAccount}</Button></Link>
                </div>
              ) : full ? (
                <div className="text-center space-y-4 py-6">
                  <p className="text-muted-foreground">{c.full}</p>
                  <Link to="/auth"><Button size="lg">{c.createAccount}</Button></Link>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold">{c.formTitle}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{c.formLead}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="fc-club">{c.club}</Label><Input id="fc-club" required minLength={2} maxLength={120} value={form.club} onChange={set('club')} /></div>
                    <div className="space-y-1.5"><Label htmlFor="fc-city">{c.city}</Label><Input id="fc-city" required minLength={2} maxLength={80} value={form.city} onChange={set('city')} /></div>
                    <div className="space-y-1.5"><Label htmlFor="fc-country">{c.country}</Label><Input id="fc-country" maxLength={60} value={form.country} onChange={set('country')} /></div>
                    <div className="space-y-1.5"><Label htmlFor="fc-contact">{c.contact}</Label><Input id="fc-contact" required minLength={2} maxLength={120} value={form.contact} onChange={set('contact')} /></div>
                    <div className="space-y-1.5"><Label htmlFor="fc-teams">{c.teams}</Label><Input id="fc-teams" type="number" min={1} max={200} required value={form.teams} onChange={set('teams')} /></div>
                    <div className="space-y-1.5"><Label htmlFor="fc-email">{c.email}</Label><Input id="fc-email" type="email" required maxLength={200} value={form.email} onChange={set('email')} /></div>
                    <div className="space-y-1.5"><Label htmlFor="fc-phone">{c.phone}</Label><Input id="fc-phone" type="tel" maxLength={40} value={form.phone} onChange={set('phone')} /></div>
                    <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="fc-message">{c.message}</Label><Textarea id="fc-message" maxLength={1000} rows={3} value={form.message} onChange={set('message')} /></div>
                    {/* Honeypot, hidden from people */}
                    <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} className="hidden" aria-hidden />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" size="lg" className="w-full" disabled={state === 'sending'}>
                    {state === 'sending' ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{c.sending}</> : c.send}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
          <p className="text-center mt-6"><Link to="/landing" className="text-sm text-muted-foreground underline">{c.back}</Link></p>
        </section>
      </main>
    </div>
  );
}
