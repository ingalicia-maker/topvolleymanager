import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Bell, Check, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isOverdue, type Enrollment, type FeeCharge } from '@/hooks/useClubFees';
import { money, PAYMENT_METHODS } from './feeUtils';
import { tr } from '@/lib/tr';

interface Props {
  charges: FeeCharge[];
  enrollments: Enrollment[];
  currency: string;
  onSave: (c: Partial<FeeCharge>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMarkPaid: (ids: string[], method: string) => Promise<void>;
  onRemind: (ids: string[]) => Promise<number>;
}

type Filter = 'due' | 'overdue' | 'paid' | 'all';

export function PaymentsPanel({ charges, enrollments, currency, onSave, onDelete, onMarkPaid, onRemind }: Props) {
  const [filter, setFilter] = useState<Filter>('due');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [editing, setEditing] = useState<Partial<FeeCharge> | null>(null);
  const [busy, setBusy] = useState(false);

  const byId = useMemo(() => new Map(enrollments.map(e => [e.id, e])), [enrollments]);
  const list = charges.filter(c => {
    const e = byId.get(c.enrollment_id);
    if (e?.status === 'cancelled' && c.status === 'pending' && filter !== 'all') return false;
    if (query && !`${e?.player_name ?? ''} ${e?.guardian_name ?? ''} ${c.concept}`.toLowerCase().includes(query.toLowerCase())) return false;
    return {
      due: c.status === 'pending',
      overdue: isOverdue(c),
      paid: c.status === 'paid',
      all: true,
    }[filter];
  });

  const toggle = (id: string) => setSelected(s => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const allSelected = list.length > 0 && list.every(c => selected.has(c.id));
  const ids = [...selected].filter(id => list.some(c => c.id === id));

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try { await fn(); if (ok) toast.success(ok); setSelected(new Set()); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const remind = (targets: string[]) => run(async () => {
    const pending = targets.filter(id => charges.find(c => c.id === id)?.status === 'pending');
    const sent = await onRemind(pending);
    toast.success(tr('{n} recordatorios enviados', { n: sent }));
    if (sent < pending.length) toast.warning(tr('{n} familias no tienen email', { n: pending.length - sent }));
  });

  const saveEdit = () => {
    if (!editing) return;
    if (!editing.enrollment_id) { toast.error(tr('Elige la jugadora')); return; }
    if (!editing.concept?.trim() || !editing.due_date) { toast.error(tr('Completa el concepto y la fecha')); return; }
    return run(async () => {
      await onSave({ ...editing, concept: editing.concept!.trim(), amount: Number(editing.amount) || 0 });
      setEditing(null);
    }, tr('Pago guardado'));
  };

  const statusBadge = (c: FeeCharge) => {
    if (c.status === 'paid') return <Badge className="bg-green-600 hover:bg-green-600">{tr('Pagado')}</Badge>;
    if (c.status === 'waived') return <Badge variant="secondary">{tr('Exento')}</Badge>;
    if (isOverdue(c)) return <Badge variant="destructive">{tr('Vencido')}</Badge>;
    return <Badge variant="outline">{tr('Pendiente')}</Badge>;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" value={query} onChange={e => setQuery(e.target.value)} placeholder={tr('Buscar jugadora o concepto')} />
        </div>
        <Button size="sm" variant="outline" className="gap-1 shrink-0"
          onClick={() => setEditing({ concept: '', amount: 0, due_date: format(new Date(), 'yyyy-MM-dd'), status: 'pending' })}>
          <Plus className="h-4 w-4" /> {tr('Pago')}
        </Button>
      </div>
      <div className="flex gap-2 flex-wrap">
        {(['due', 'overdue', 'paid', 'all'] as Filter[]).map(f => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => { setFilter(f); setSelected(new Set()); }}>
            {{ due: tr('Pendientes'), overdue: tr('Vencidos'), paid: tr('Pagados'), all: tr('Todos') }[f]}
          </Button>
        ))}
      </div>

      {list.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap rounded-lg border p-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={allSelected} onCheckedChange={v => setSelected(v ? new Set(list.map(c => c.id)) : new Set())} />
            {ids.length ? tr('{n} seleccionados', { n: ids.length }) : tr('Seleccionar todos')}
          </label>
          {ids.length > 0 && (
            <>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{tr(m)}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" className="gap-1" disabled={busy} onClick={() => run(() => onMarkPaid(ids, method), tr('Marcados como pagados'))}>
                <Check className="h-4 w-4" /> {tr('Pagado')}
              </Button>
              <Button size="sm" variant="outline" className="gap-1" disabled={busy} onClick={() => remind(ids)}>
                <Bell className="h-4 w-4" /> {tr('Recordar')}
              </Button>
            </>
          )}
        </div>
      )}

      {list.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">{tr('No hay pagos en esta lista.')}</CardContent></Card>}

      {list.map(c => {
        const e = byId.get(c.enrollment_id);
        return (
          <Card key={c.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} aria-label={tr('Seleccionar')} />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{e?.player_name ?? '—'}</p>
                <p className="text-xs text-muted-foreground truncate">{new Date(c.due_date).toLocaleDateString()} · {c.concept}</p>
                <p className="text-xs text-muted-foreground">
                  {c.status === 'paid' && c.paid_at && `${tr('Pagado el')} ${new Date(c.paid_at).toLocaleDateString()}${c.payment_method ? ` · ${tr(c.payment_method)}` : ''}`}
                  {c.status === 'pending' && c.reminders_sent > 0 && tr('{n} recordatorios enviados', { n: c.reminders_sent })}
                </p>
              </div>
              <div className="text-right space-y-1">
                <p className="font-semibold text-sm">{money(c.amount, currency)}</p>
                {statusBadge(c)}
              </div>
              <Button variant="ghost" size="icon" aria-label={tr('Editar')} onClick={() => setEditing(c)}><Pencil className="h-4 w-4" /></Button>
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? tr('Editar pago') : tr('Nuevo pago')}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              {!editing.id && (
                <div className="space-y-1">
                  <Label>{tr('Jugadora')}</Label>
                  <Select value={editing.enrollment_id ?? ''} onValueChange={v => setEditing({ ...editing, enrollment_id: v })}>
                    <SelectTrigger><SelectValue placeholder={tr('Elige la jugadora')} /></SelectTrigger>
                    <SelectContent>
                      {enrollments.filter(e => e.status === 'active').map(e => <SelectItem key={e.id} value={e.id}>{e.player_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1">
                <Label>{tr('Concepto')}</Label>
                <Input value={editing.concept ?? ''} onChange={e => setEditing({ ...editing, concept: e.target.value })} placeholder={tr('Torneo de verano')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{tr('Importe')} ({currency})</Label>
                  <Input type="number" min={0} step="0.01" value={editing.amount ?? 0} onChange={e => setEditing({ ...editing, amount: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label>{tr('Vencimiento')}</Label>
                  <Input type="date" value={editing.due_date ?? ''} onChange={e => setEditing({ ...editing, due_date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{tr('Estado')}</Label>
                  <Select value={editing.status ?? 'pending'} onValueChange={v => setEditing({
                    ...editing,
                    status: v as FeeCharge['status'],
                    paid_at: v === 'paid' ? (editing.paid_at ?? new Date().toISOString()) : null,
                  })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{tr('Pendiente')}</SelectItem>
                      <SelectItem value="paid">{tr('Pagado')}</SelectItem>
                      <SelectItem value="waived">{tr('Exento')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editing.status === 'paid' && (
                  <div className="space-y-1">
                    <Label>{tr('Método')}</Label>
                    <Select value={editing.payment_method ?? PAYMENT_METHODS[0]} onValueChange={v => setEditing({ ...editing, payment_method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{tr(m)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label>{tr('Nota')}</Label>
                <Textarea rows={2} value={editing.note ?? ''} onChange={e => setEditing({ ...editing, note: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex gap-2">
              {editing?.id && (
                <Button variant="ghost" size="icon" aria-label={tr('Eliminar')} disabled={busy}
                  onClick={() => confirm(tr('¿Eliminar este pago?')) && run(async () => { await onDelete(editing.id!); setEditing(null); }, tr('Pago eliminado'))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
              {editing?.id && editing.status === 'pending' && (
                <Button variant="outline" size="sm" className="gap-1" disabled={busy} onClick={() => remind([editing.id!])}>
                  <Bell className="h-4 w-4" /> {tr('Recordar')}
                </Button>
              )}
            </div>
            <Button onClick={saveEdit} disabled={busy}>{tr('Guardar')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
