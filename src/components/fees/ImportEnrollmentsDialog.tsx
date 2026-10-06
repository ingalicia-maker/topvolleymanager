import { useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Enrollment, FeePlan } from '@/hooks/useClubFees';
import { tr } from '@/lib/tr';
import { trn } from './feeUtils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: FeePlan[];
  onImport: (rows: Partial<Enrollment>[]) => Promise<number>;
}

/** Column names accepted in Spanish, English and Italian (lower case, without accents). */
const COLUMNS: Record<keyof Row, string[]> = {
  player_name: ['jugador', 'jugadora', 'nombre jugador', 'nombre', 'player', 'player name', 'name', 'giocatore', 'giocatrice', 'nome'],
  player_surname: ['apellidos', 'apellido', 'surname', 'last name', 'cognome'],
  player_birth_date: ['fecha nacimiento', 'fecha de nacimiento', 'nacimiento', 'birth date', 'date of birth', 'birthdate', 'data di nascita', 'data nascita'],
  guardian_name: ['tutor', 'padre/madre', 'padre o madre', 'responsable', 'guardian', 'parent', 'genitore', 'tutore'],
  guardian_email: ['email', 'correo', 'e-mail', 'mail', 'email tutor'],
  guardian_phone: ['telefono', 'movil', 'phone', 'mobile', 'cellulare'],
  plan: ['cuota', 'fee', 'plan', 'quota'],
  language: ['idioma', 'language', 'lingua'],
};

interface Row {
  player_name: string;
  player_surname: string;
  player_birth_date: string;
  guardian_name: string;
  guardian_email: string;
  guardian_phone: string;
  plan: string;
  language: string;
}

const plain = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/[_.]+/g, ' ');

/** Dates come as Excel serial numbers, dd/mm/yyyy or yyyy-mm-dd. */
function toIsoDate(v: unknown): string | null {
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    return d ? `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` : null;
  }
  const s = String(v ?? '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

const NO_PLAN = 'none';

export function ImportEnrollmentsDialog({ open, onOpenChange, plans, onImport }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<'active' | 'pending'>('active');
  const [defaultPlan, setDefaultPlan] = useState<string>(NO_PLAN);
  const [busy, setBusy] = useState(false);

  const reset = () => { setRows([]); setStatus('active'); setDefaultPlan(NO_PLAN); };

  const read = async (file: File) => {
    try {
      const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(book.Sheets[book.SheetNames[0]], { defval: '' });
      const parsed = raw.map(r => {
        const out = {} as Row;
        for (const key of Object.keys(COLUMNS) as (keyof Row)[]) {
          const col = Object.keys(r).find(c => COLUMNS[key].includes(plain(c)));
          out[key] = col ? (key === 'player_birth_date' ? (toIsoDate(r[col]) ?? '') : String(r[col]).trim()) : '';
        }
        return out;
      }).filter(r => r.player_name);
      if (!parsed.length) { toast.error(tr('No se encontró ninguna jugadora. Revisa que el archivo tenga una columna "Jugadora".')); return; }
      setRows(parsed);
    } catch {
      toast.error(tr('No se pudo leer el archivo. Usa un CSV o Excel.'));
    }
  };

  const template = () => {
    const ws = XLSX.utils.json_to_sheet([{
      [tr('Jugadora')]: 'Lucía', [tr('Apellidos')]: 'Navarro Pérez', [tr('Fecha nacimiento')]: '03/04/2012',
      [tr('Tutor')]: 'Marta Pérez', Email: 'marta@example.com', [tr('Teléfono')]: '+34 600 000 000',
      [tr('Cuota')]: plans[0]?.name ?? '', [tr('Idioma')]: 'es',
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tr('Inscripciones'));
    XLSX.writeFile(wb, 'inscripciones.xlsx');
  };

  const planFor = (r: Row) =>
    plans.find(p => plain(p.name) === plain(r.plan))?.id ?? (defaultPlan === NO_PLAN ? null : defaultPlan);

  const submit = async () => {
    setBusy(true);
    try {
      const n = await onImport(rows.map(r => ({
        player_name: [r.player_name, r.player_surname].filter(Boolean).join(' ').slice(0, 200),
        player_birth_date: r.player_birth_date || null,
        guardian_name: r.guardian_name || null,
        guardian_email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.guardian_email) ? r.guardian_email.toLowerCase() : null,
        guardian_phone: r.guardian_phone || null,
        plan_id: planFor(r),
        language: ['es', 'en', 'it'].includes(plain(r.language)) ? plain(r.language) : 'es',
        status,
      })));
      toast.success(trn('{n} inscripción importada', '{n} inscripciones importadas', n));
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(tr('No se pudo importar') + ': ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const withoutEmail = rows.filter(r => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.guardian_email)).length;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tr('Importar familias')}</DialogTitle>
          <DialogDescription>
            {tr('Sube un CSV o Excel con una fila por jugadora. Columnas: Jugadora, Apellidos, Fecha nacimiento, Tutor, Email, Teléfono, Cuota, Idioma (es, en o it).')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={template}><Download className="h-4 w-4" />{tr('Descargar plantilla')}</Button>
            <Button variant="outline" size="sm" className="gap-1" asChild>
              <label className="cursor-pointer">
                <Upload className="h-4 w-4" />{tr('Elegir archivo')}
                <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => e.target.files?.[0] && read(e.target.files[0])} />
              </label>
            </Button>
          </div>

          {rows.length > 0 && (
            <>
              <div className="rounded-lg border p-3 text-sm space-y-1 max-h-48 overflow-y-auto">
                {rows.slice(0, 50).map((r, i) => (
                  <p key={i} className="truncate">
                    <b>{[r.player_name, r.player_surname].filter(Boolean).join(' ')}</b>
                    <span className="text-muted-foreground"> · {r.guardian_email || tr('sin email')}{r.plan && ` · ${r.plan}`}</span>
                  </p>
                ))}
                {rows.length > 50 && <p className="text-muted-foreground">{tr('y {n} más', { n: rows.length - 50 })}</p>}
              </div>
              {withoutEmail > 0 && <p className="text-xs text-amber-600">{trn('{n} fila sin email válido: no recibirá emails.', '{n} filas sin email válido: no recibirán emails.', withoutEmail)}</p>}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{tr('Importar como')}</Label>
                  <Select value={status} onValueChange={v => setStatus(v as 'active' | 'pending')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{tr('Inscritos (crea sus pagos)')}</SelectItem>
                      <SelectItem value="pending">{tr('Por revisar')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{tr('Cuota si la fila no indica ninguna')}</Label>
                  <Select value={defaultPlan} onValueChange={setDefaultPlan}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_PLAN}>{tr('Sin cuota')}</SelectItem>
                      {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{tr('Cancelar')}</Button>
          <Button onClick={submit} disabled={!rows.length || busy}>
            {busy ? tr('Importando...') : tr('Importar {n}', { n: rows.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
