import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Check, X, Trash2, UserPlus, Search, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import type { Enrollment, EnrollmentForm, FeeCharge, FeePlan } from '@/hooks/useClubFees';
import { money } from './feeUtils';
import { ImportEnrollmentsDialog } from './ImportEnrollmentsDialog';
import { useConfirm } from './ConfirmDialog';
import { tr } from '@/lib/tr';

interface Props {
  clubId: string;
  enrollments: Enrollment[];
  forms: EnrollmentForm[];
  plans: FeePlan[];
  charges: FeeCharge[];
  currency: string;
  onSave: (e: Partial<Enrollment>) => Promise<void>;
  onActivate: (e: Enrollment, planId: string | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onImport: (rows: Partial<Enrollment>[]) => Promise<number>;
}

type Filter = 'pending' | 'active' | 'cancelled';
const NO_PLAN = 'none';

export function EnrollmentsPanel({ clubId, enrollments, forms, plans, charges, currency, onSave, onActivate, onDelete, onImport }: Props) {
  const [importing, setImporting] = useState(false);
  const [confirm, confirmDialog] = useConfirm();
  const [filter, setFilter] = useState<Filter>('pending');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Partial<Enrollment> | null>(null);
  const [busy, setBusy] = useState(false);

  const counts = useMemo(() => ({
    pending: enrollments.filter(e => e.status === 'pending').length,
    active: enrollments.filter(e => e.status === 'active').length,
    cancelled: enrollments.filter(e => e.status === 'cancelled').length,
  }), [enrollments]);

  const list = enrollments.filter(e => e.status === filter && (
    !query || `${e.player_name} ${e.guardian_name ?? ''} ${e.guardian_email ?? ''}`.toLowerCase().includes(query.toLowerCase())
  ));

  const fieldsOf = (e: Partial<Enrollment>) => forms.find(f => f.id === e.form_id)?.fields ?? [];
  const balance = (id: string) => charges.filter(c => c.enrollment_id === id && c.status === 'pending').reduce((s, c) => s + c.amount, 0);

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); setOpen(null); }
    catch (e) { toast.error(tr('No se pudo guardar') + ': ' + (e as Error).message); }
    finally { setBusy(false); }
  };

  const editedFields = () => {
    const { id, player_name, player_birth_date, guardian_name, guardian_email, guardian_phone, notes, plan_id, language } = open!;
    return {
      id, player_name: player_name!.trim(), player_birth_date: player_birth_date || null, guardian_name,
      guardian_email: guardian_email?.trim().toLowerCase() || null, guardian_phone, notes, plan_id: plan_id ?? null, language: language ?? 'es',
    };
  };

  const save = () => {
    if (!open?.player_name?.trim()) { toast.error(tr('Escribe el nombre de la jugadora')); return; }
    return run(() => onSave({ ...editedFields(), ...(open.id ? {} : { status: 'pending' as const }) }), tr('Inscripción guardada'));
  };

  // Saves what was edited in the dialog, then accepts the enrolment with the chosen plan
  const activate = () => open?.id && open.player_name?.trim() && run(async () => {
    await onSave(editedFields());
    await onActivate({ ...(open as Enrollment), ...editedFields() }, open.plan_id ?? null);
  }, tr('Inscripción aceptada y pagos creados'));
  const cancel = () => open?.id && run(() => onSave({ id: open.id, status: 'cancelled' }), tr('Inscripción dada de baja'));
  const remove = async () => {
    if (!open?.id || !(await confirm(tr('¿Eliminar esta inscripción y todos sus pagos?')))) return;
    return run(() => onDelete(open.id!), tr('Inscripción eliminada'));
  };

  /** Adds the child to the club's player list, linked to the enrolment. */
  const addToPlayers = () => open?.id && run(async () => {
    const birth = open.player_birth_date ? new Date(open.player_birth_date) : null;
    const [name, ...rest] = (open.player_name ?? '').trim().split(/\s+/);
    const { data, error } = await supabase.from('players').insert({
      club_id: clubId,
      name,
      surname1: rest[0] ?? null,
      surname2: rest.slice(1).join(' ') || null,
      phone: open.guardian_phone ?? '',
      birth_day: birth?.getDate() ?? null,
      birth_month: birth ? birth.getMonth() + 1 : null,
      birth_year: birth?.getFullYear() ?? null,
    }).select('id').single();
    if (error) throw error;
    await onSave({ id: open.id, player_id: data.id });
  }, tr('Jugadora añadida a la lista del club'));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" value={query} onChange={e => setQuery(e.target.value)} placeholder={tr('Buscar jugadora o familia')} />
        </div>
        <Button size="sm" className="gap-1 shrink-0" onClick={() => setOpen({ player_name: '', language: 'es', plan_id: plans.find(p => p.active)?.id ?? null })}>
          <Plus className="h-4 w-4" /> {tr('Añadir')}
        </Button>
        <Button size="sm" variant="outline" className="gap-1 shrink-0" onClick={() => setImporting(true)} aria-label={tr('Importar familias')}>
          <FileUp className="h-4 w-4" /> <span className="hidden sm:inline">{tr('Importar')}</span>
        </Button>
      </div>
      {confirmDialog}
      <ImportEnrollmentsDialog open={importing} onOpenChange={setImporting} plans={plans} onImport={onImport} />
      <div className="flex gap-2">
        {(['pending', 'active', 'cancelled'] as Filter[]).map(f => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
            {{ pending: tr('Por revisar'), active: tr('Inscritos'), cancelled: tr('Bajas') }[f]} ({counts[f]})
          </Button>
        ))}
      </div>

      {list.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">{tr('No hay inscripciones en esta lista.')}</CardContent></Card>}

      {list.map(e => (
        <Card key={e.id} className="cursor-pointer hover:bg-accent/40" onClick={() => setOpen(e)}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{e.player_name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {[e.guardian_name, e.guardian_email].filter(Boolean).join(' · ')}
              </p>
              <p className="text-xs text-muted-foreground">
                {plans.find(p => p.id === e.plan_id)?.name ?? tr('Sin cuota')} · {new Date(e.created_at).toLocaleDateString()}
              </p>
            </div>
            {e.status === 'active' && balance(e.id) > 0 && <Badge variant="outline">{money(balance(e.id), currency)}</Badge>}
            {e.player_id && <Badge variant="secondary">{tr('Jugadora')}</Badge>}
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!open} onOpenChange={o => !o && setOpen(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{open?.id ? open.player_name : tr('Nueva inscripción')}</DialogTitle></DialogHeader>
          {open && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <Label>{tr('Nombre y apellidos de la jugadora')}</Label>
                  <Input value={open.player_name ?? ''} onChange={e => setOpen({ ...open, player_name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>{tr('Fecha de nacimiento')}</Label>
                  <Input type="date" value={open.player_birth_date ?? ''} onChange={e => setOpen({ ...open, player_birth_date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>{tr('Idioma de la familia')}</Label>
                  <Select value={open.language ?? 'es'} onValueChange={v => setOpen({ ...open, language: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="it">Italiano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>{tr('Padre, madre o tutor')}</Label>
                  <Input value={open.guardian_name ?? ''} onChange={e => setOpen({ ...open, guardian_name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" value={open.guardian_email ?? ''} onChange={e => setOpen({ ...open, guardian_email: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>{tr('Teléfono')}</Label>
                  <Input value={open.guardian_phone ?? ''} onChange={e => setOpen({ ...open, guardian_phone: e.target.value })} />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>{tr('Cuota')}</Label>
                  <Select value={open.plan_id ?? NO_PLAN} onValueChange={v => setOpen({ ...open, plan_id: v === NO_PLAN ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_PLAN}>{tr('Sin cuota')}</SelectItem>
                      {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name} · {money(Number(p.amount), currency)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {fieldsOf(open).length > 0 && (
                <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                  {fieldsOf(open).map(f => {
                    const v = open.answers?.[f.id];
                    return (
                      <p key={f.id} className="text-sm">
                        <span className="text-muted-foreground">{f.label}: </span>
                        {typeof v === 'boolean' ? (v ? tr('Sí') : tr('No')) : (v || '—')}
                      </p>
                    );
                  })}
                </div>
              )}

              <div className="space-y-1">
                <Label>{tr('Notas internas')}</Label>
                <Textarea rows={2} value={open.notes ?? ''} onChange={e => setOpen({ ...open, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            <div className="flex gap-2">
              {open?.id && <Button variant="ghost" size="icon" aria-label={tr('Eliminar')} onClick={remove} disabled={busy}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
              {open?.id && open.status !== 'cancelled' && <Button variant="outline" size="sm" className="gap-1" onClick={cancel} disabled={busy}><X className="h-4 w-4" />{tr('Dar de baja')}</Button>}
              {open?.id && !open.player_id && <Button variant="outline" size="sm" className="gap-1" onClick={addToPlayers} disabled={busy}><UserPlus className="h-4 w-4" />{tr('Añadir a jugadores')}</Button>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={save} disabled={busy}>{tr('Guardar')}</Button>
              {open?.id && open.status !== 'active' && (
                <Button className="gap-1" onClick={activate} disabled={busy}><Check className="h-4 w-4" />{tr('Aceptar inscripción')}</Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
