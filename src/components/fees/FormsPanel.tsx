import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Copy, MessageCircle, Mail, ArrowUp, ArrowDown, ExternalLink, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Enrollment, EnrollmentForm, FeePlan, FieldType, FormField } from '@/hooks/useClubFees';
import { enrollmentLink } from './feeUtils';
import { tr } from '@/lib/tr';

interface Props {
  forms: EnrollmentForm[];
  plans: FeePlan[];
  clubName: string;
  onSave: (form: Partial<EnrollmentForm>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  enrollments: Enrollment[];
  onSend: (formId: string, emails: string[], language: string) => Promise<number>;
}

const EMAIL = /[^\s,;<>"']+@[^\s,;<>"']+\.[^\s,;<>"']+/g;

const FIELD_TYPES: FieldType[] = ['text', 'textarea', 'number', 'date', 'select', 'checkbox'];
const fieldTypeLabel = (t: FieldType) => ({
  text: tr('Texto corto'),
  textarea: tr('Texto largo'),
  number: tr('Número'),
  date: tr('Fecha'),
  select: tr('Lista de opciones'),
  checkbox: tr('Casilla (sí/no)'),
}[t]);

/** Starting fields; the club can rename, remove or add any of them. */
const defaultFields = (): FormField[] => [
  { id: 'dni', label: tr('DNI / documento del jugador'), type: 'text', required: false },
  { id: 'address', label: tr('Dirección'), type: 'text', required: false },
  { id: 'allergies', label: tr('Alergias o información médica'), type: 'textarea', required: false },
  { id: 'size', label: tr('Talla de equipación'), type: 'select', required: false, options: ['XS', 'S', 'M', 'L', 'XL'] },
  { id: 'photos', label: tr('Autorizo el uso de imágenes del jugador en las comunicaciones del club'), type: 'checkbox', required: false },
];

const newId = () => 'f' + Math.random().toString(36).slice(2, 8);

export function FormsPanel({ forms, plans, clubName, onSave, onDelete, enrollments, onSend }: Props) {
  const [sending, setSending] = useState<EnrollmentForm | null>(null);
  const [recipients, setRecipients] = useState('');
  const [sendLang, setSendLang] = useState('es');
  const [busySend, setBusySend] = useState(false);
  const emails = [...new Set((recipients.match(EMAIL) ?? []).map(e => e.toLowerCase()))];
  const familyEmails = (filter: (e: Enrollment) => boolean) =>
    [...new Set(enrollments.filter(filter).map(e => e.guardian_email).filter(Boolean) as string[])];
  const addRecipients = (list: string[]) => setRecipients(r => [...new Set([...(r.match(EMAIL) ?? []), ...list])].join('\n'));

  const send = async () => {
    if (!sending || !emails.length) return;
    setBusySend(true);
    try {
      const n = await onSend(sending.id, emails, sendLang);
      toast.success(tr('Formulario enviado a {n} familias', { n }));
      setSending(null);
      setRecipients('');
    } catch (e) {
      toast.error(tr('No se pudo enviar') + ': ' + (e as Error).message);
    } finally {
      setBusySend(false);
    }
  };

  const [editing, setEditing] = useState<Partial<EnrollmentForm> | null>(null);
  const [saving, setSaving] = useState(false);

  const fields = editing?.fields ?? [];
  const setFields = (f: FormField[]) => editing && setEditing({ ...editing, fields: f });
  const updateField = (i: number, patch: Partial<FormField>) => setFields(fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const moveField = (i: number, d: -1 | 1) => {
    const next = [...fields];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setFields(next);
  };

  const save = async () => {
    if (!editing?.title?.trim()) { toast.error(tr('Escribe un título para el formulario')); return; }
    if (fields.some(f => !f.label.trim())) { toast.error(tr('Todos los campos necesitan un nombre')); return; }
    setSaving(true);
    try {
      await onSave({
        ...editing,
        title: editing.title.trim(),
        fields: fields.map(f => ({ ...f, label: f.label.trim(), options: f.type === 'select' ? (f.options ?? []).filter(Boolean) : undefined })),
      });
      toast.success(tr('Formulario guardado'));
      setEditing(null);
    } catch (e) {
      toast.error(tr('No se pudo guardar') + ': ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (form: EnrollmentForm) => {
    if (!confirm(tr('¿Eliminar el formulario "{name}"? Las inscripciones recibidas se mantienen.', { name: form.title }))) return;
    try { await onDelete(form.id); } catch (e) { toast.error((e as Error).message); }
  };

  const share = (form: EnrollmentForm, how: 'copy' | 'whatsapp' | 'email') => {
    const url = enrollmentLink(form.slug);
    const text = tr('Inscripción {club}: {title}. Rellena el formulario aquí: {url}', { club: clubName, title: form.title, url });
    if (how === 'copy') { navigator.clipboard.writeText(url); toast.success(tr('Enlace copiado')); }
    if (how === 'whatsapp') window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    if (how === 'email') window.location.href = `mailto:?subject=${encodeURIComponent(form.title)}&body=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{tr('Crea el formulario de inscripción y envía el enlace a las familias. No necesitan cuenta.')}</p>
        <Button size="sm" className="gap-1 shrink-0" onClick={() => setEditing({ title: tr('Inscripción temporada'), intro: '', fields: defaultFields(), plan_ids: plans.filter(p => p.active).map(p => p.id), is_open: true })}>
          <Plus className="h-4 w-4" /> {tr('Nuevo formulario')}
        </Button>
      </div>

      {forms.length === 0 && (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">{tr('Aún no hay formularios de inscripción.')}</CardContent></Card>
      )}

      {forms.map(form => (
        <Card key={form.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{form.title}</p>
                  <Badge variant={form.is_open ? 'default' : 'secondary'}>{form.is_open ? tr('Abierto') : tr('Cerrado')}</Badge>
                </div>
                <p className="text-xs text-muted-foreground break-all">{enrollmentLink(form.slug)}</p>
              </div>
              <Button variant="ghost" size="icon" aria-label={tr('Editar')} onClick={() => setEditing(form)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" aria-label={tr('Eliminar')} onClick={() => remove(form)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="gap-1" onClick={() => setSending(form)} disabled={!form.is_open}><Send className="h-4 w-4" />{tr('Enviar por email')}</Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => share(form, 'copy')}><Copy className="h-4 w-4" />{tr('Copiar enlace')}</Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => share(form, 'whatsapp')}><MessageCircle className="h-4 w-4" />WhatsApp</Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => share(form, 'email')}><Mail className="h-4 w-4" />{tr('Tu email')}</Button>
              <Button size="sm" variant="ghost" className="gap-1" onClick={() => window.open(`/inscripcion/${form.slug}`, '_blank', 'noopener')}><ExternalLink className="h-4 w-4" />{tr('Ver')}</Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!sending} onOpenChange={o => !o && setSending(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{tr('Enviar "{title}"', { title: sending?.title ?? '' })}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{tr('Cada familia recibe un email con el enlace al formulario. Las familias que ya conoces lo reciben en su idioma.')}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => addRecipients(familyEmails(e => e.status !== 'cancelled'))}>
                {tr('Añadir familias del club ({n})', { n: familyEmails(e => e.status !== 'cancelled').length })}
              </Button>
              <Button size="sm" variant="outline" onClick={() => addRecipients(familyEmails(e => e.status === 'pending'))}>
                {tr('Solo por revisar ({n})', { n: familyEmails(e => e.status === 'pending').length })}
              </Button>
            </div>
            <div className="space-y-1">
              <Label>{tr('Emails (uno por línea o separados por comas)')}</Label>
              <Textarea rows={6} value={recipients} onChange={e => setRecipients(e.target.value)} placeholder="familia@example.com" />
              <p className="text-xs text-muted-foreground">{tr('{n} emails válidos', { n: emails.length })}</p>
            </div>
            <div className="space-y-1">
              <Label>{tr('Idioma para las familias nuevas')}</Label>
              <Select value={sendLang} onValueChange={setSendLang}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="it">Italiano</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSending(null)}>{tr('Cancelar')}</Button>
            <Button onClick={send} disabled={!emails.length || busySend || emails.length > 500}>
              {busySend ? tr('Enviando...') : tr('Enviar a {n}', { n: emails.length })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? tr('Editar formulario') : tr('Nuevo formulario')}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>{tr('Título')}</Label>
                <Input value={editing.title ?? ''} onChange={e => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{tr('Texto de bienvenida (opcional)')}</Label>
                <Textarea rows={3} value={editing.intro ?? ''} onChange={e => setEditing({ ...editing, intro: e.target.value })} placeholder={tr('Plazos, documentación, normas del club...')} />
              </div>
              <div className="flex items-center justify-between">
                <Label>{tr('Formulario abierto')}</Label>
                <Switch checked={editing.is_open ?? true} onCheckedChange={v => setEditing({ ...editing, is_open: v })} />
              </div>

              <div className="space-y-2">
                <Label>{tr('Cuotas que pueden elegir las familias')}</Label>
                {plans.length === 0 && <p className="text-xs text-muted-foreground">{tr('Crea antes las cuotas en la pestaña Cuotas.')}</p>}
                {plans.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={(editing.plan_ids ?? []).includes(p.id)}
                      onCheckedChange={v => setEditing({
                        ...editing,
                        plan_ids: v ? [...(editing.plan_ids ?? []), p.id] : (editing.plan_ids ?? []).filter(id => id !== p.id),
                      })}
                    />
                    {p.name}
                  </label>
                ))}
              </div>

              <div className="space-y-2">
                <Label>{tr('Campos del formulario')}</Label>
                <p className="text-xs text-muted-foreground">
                  {tr('Siempre se piden: nombre del jugador, fecha de nacimiento, nombre, email y teléfono del responsable. Añade aquí el resto.')}
                </p>
                {fields.map((f, i) => (
                  <div key={f.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center gap-1">
                      <Input value={f.label} onChange={e => updateField(i, { label: e.target.value })} placeholder={tr('Nombre del campo')} />
                      <Button variant="ghost" size="icon" aria-label={tr('Subir')} onClick={() => moveField(i, -1)} disabled={i === 0}><ArrowUp className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" aria-label={tr('Bajar')} onClick={() => moveField(i, 1)} disabled={i === fields.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" aria-label={tr('Eliminar')} onClick={() => setFields(fields.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                    <div className="flex items-center gap-3">
                      <Select value={f.type} onValueChange={v => updateField(i, { type: v as FieldType })}>
                        <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>{FIELD_TYPES.map(t => <SelectItem key={t} value={t}>{fieldTypeLabel(t)}</SelectItem>)}</SelectContent>
                      </Select>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox checked={f.required} onCheckedChange={v => updateField(i, { required: !!v })} />
                        {tr('Obligatorio')}
                      </label>
                    </div>
                    {f.type === 'select' && (
                      <Input
                        value={(f.options ?? []).join(', ')}
                        onChange={e => updateField(i, { options: e.target.value.split(',').map(o => o.trim()) })}
                        placeholder={tr('Opciones separadas por comas')}
                      />
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setFields([...fields, { id: newId(), label: '', type: 'text', required: false }])}>
                  <Plus className="h-4 w-4" /> {tr('Añadir campo')}
                </Button>
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
