// Admin list of "Clubes Fundadores" applications: approve (grants 12 months of Pro) or reject.
import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Check, Gift, Loader2, Mail, MapPin, Phone, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface Application {
  id: string;
  club_name: string;
  city: string;
  country: string | null;
  contact_name: string;
  email: string;
  phone: string | null;
  teams_count: number | null;
  message: string | null;
  lang: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approved_at: string | null;
}

// The table and functions are newer than the generated Supabase types.
const db = supabase as unknown as {
  from: (t: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

const RESULT: Record<string, string> = {
  ok: 'Pase Pro de 12 meses activado.',
  already: 'Esta solicitud ya estaba aprobada.',
  no_account: 'Ese email todavía no tiene cuenta. Pídele que se registre con ese email y vuelve a aprobar.',
  full: 'Ya están ocupadas las 25 plazas.',
  forbidden: 'Solo los administradores pueden aprobar.',
  not_found: 'No se encontró la solicitud.',
};

export function FounderApplications() {
  const [apps, setApps] = useState<Application[]>([]);
  const [spots, setSpots] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data }, { data: left }] = await Promise.all([
      db.from('founder_applications').select('*').order('created_at', { ascending: false }),
      db.rpc('founder_spots_left'),
    ]);
    setApps((data as Application[]) ?? []);
    setSpots(typeof left === 'number' ? left : null);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const approve = async (a: Application) => {
    setBusy(a.id);
    const { data, error } = await db.rpc('grant_founder_pass', { _application_id: a.id });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    const msg = RESULT[String(data)] ?? String(data);
    if (data === 'ok') toast.success(`${a.club_name}: ${msg}`); else toast.warning(msg);
    void load();
  };

  const reject = async (a: Application) => {
    setBusy(a.id);
    const { error } = await db.from('founder_applications').update({ status: 'rejected' }).eq('id', a.id);
    setBusy(null);
    if (error) toast.error(error.message); else void load();
  };

  const statusBadge = (s: Application['status']) =>
    s === 'approved' ? <Badge className="bg-green-600">Aprobada</Badge>
      : s === 'rejected' ? <Badge variant="secondary">Rechazada</Badge>
        : <Badge variant="outline">Pendiente</Badge>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5 text-primary" />Clubes Fundadores</CardTitle>
        <CardDescription>
          {spots !== null ? `Quedan ${spots} de 25 plazas. ` : ''}
          Al aprobar, la cuenta con ese email recibe 12 meses del plan Pro gratis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : apps.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">Todavía no hay solicitudes.</p>
        ) : apps.map(a => (
          <div key={a.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold truncate">{a.club_name}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(a.created_at), 'dd/MM/yyyy HH:mm')} · {a.lang?.toUpperCase()}</p>
              </div>
              {statusBadge(a.status)}
            </div>
            <div className="text-sm space-y-1 text-muted-foreground">
              <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{a.city}{a.country ? `, ${a.country}` : ''}</p>
              <p className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{a.contact_name} · {a.teams_count ?? '?'} equipos</p>
              <p className="flex items-center gap-1.5 break-all"><Mail className="h-3.5 w-3.5 shrink-0" /><a className="underline" href={`mailto:${a.email}`}>{a.email}</a></p>
              {a.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{a.phone}</p>}
              {a.message && <p className="italic">"{a.message}"</p>}
            </div>
            {a.status === 'pending' && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="flex-1 gap-1" onClick={() => approve(a)} disabled={busy === a.id}>
                  {busy === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Aprobar y regalar Pro
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => reject(a)} disabled={busy === a.id}>
                  <X className="h-4 w-4" />Rechazar
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
