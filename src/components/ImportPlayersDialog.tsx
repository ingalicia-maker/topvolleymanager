import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTeams } from '@/hooks/useTeams';
import { usePlayers } from '@/hooks/usePlayers';
import { toast } from 'sonner';

interface PlayerRow {
  nombre?: string;
  apellido1?: string;
  apellido2?: string;
  telefono?: string;
  equipo?: string;
  dorsal?: number | string;
  año_nacimiento?: number | string;
  altura?: number | string;
}

interface ValidatedRow extends PlayerRow {
  rowNumber: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface ImportPlayersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

/** Normaliza cabeceras: minúsculas, sin acentos, sin espacios ni guiones */
const normalizeHeader = (h: string) =>
  h
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_.-]+/g, '');

const HEADER_ALIASES: Record<string, keyof PlayerRow | 'apellidos'> = {
  nombre: 'nombre',
  name: 'nombre',
  firstname: 'nombre',
  apellidos: 'apellidos',
  apellido: 'apellidos',
  surname: 'apellidos',
  lastname: 'apellidos',
  apellido1: 'apellido1',
  primerapellido: 'apellido1',
  surname1: 'apellido1',
  apellido2: 'apellido2',
  segundoapellido: 'apellido2',
  surname2: 'apellido2',
  telefono: 'telefono',
  movil: 'telefono',
  whatsapp: 'telefono',
  phone: 'telefono',
  equipo: 'equipo',
  equipos: 'equipo',
  team: 'equipo',
  teams: 'equipo',
  dorsal: 'dorsal',
  numero: 'dorsal',
  number: 'dorsal',
  anonacimiento: 'año_nacimiento',
  anodenacimiento: 'año_nacimiento',
  nacimiento: 'año_nacimiento',
  birthyear: 'año_nacimiento',
  altura: 'altura',
  height: 'altura',
};

export function ImportPlayersDialog({ open, onOpenChange, onSuccess }: ImportPlayersDialogProps) {
  const { teams } = useTeams();
  const { players, addPlayer } = usePlayers();
  const [file, setFile] = useState<File | null>(null);
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const existingPhones = players.map(p => p.phone).filter(Boolean);

  const findTeamIds = (teamNames: string): string[] => {
    if (!teamNames) return [];
    const names = teamNames.split(',').map(n => n.trim().toLowerCase());
    return names
      .map(name => teams.find(t => t.name.toLowerCase() === name)?.id)
      .filter((id): id is string => !!id);
  };

  /** Convierte una fila cruda (cabeceras libres) al formato interno */
  const mapRow = (raw: Record<string, unknown>): PlayerRow => {
    const mapped: PlayerRow & { apellidos?: string } = {};
    for (const [key, value] of Object.entries(raw)) {
      const target = HEADER_ALIASES[normalizeHeader(key)];
      if (!target) continue;
      if (value === null || value === undefined || value.toString().trim() === '') continue;
      (mapped as Record<string, unknown>)[target] = value;
    }
    // "Apellidos" en una sola columna -> se reparte en apellido1 / apellido2
    if (mapped.apellidos && !mapped.apellido1) {
      const parts = mapped.apellidos.toString().trim().split(/\s+/);
      mapped.apellido1 = parts[0];
      if (parts.length > 1 && !mapped.apellido2) mapped.apellido2 = parts.slice(1).join(' ');
    }
    delete mapped.apellidos;
    return mapped;
  };

  const validateRow = (row: PlayerRow, index: number): ValidatedRow => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!row.nombre?.toString().trim()) {
      errors.push('Nombre es obligatorio');
    }

    if (!row.apellido1?.toString().trim() && !row.apellido2?.toString().trim()) {
      errors.push('Apellido(s) es obligatorio');
    }

    const phone = row.telefono?.toString().trim();
    if (!phone) {
      warnings.push('Sin teléfono (lo podrás añadir después)');
    } else if (existingPhones.includes(phone)) {
      warnings.push('Este teléfono ya existe');
    }

    const rawTeam = row.equipo?.toString().trim();
    if (!rawTeam) {
      warnings.push('Sin equipo (lo podrás asignar después)');
    } else if (findTeamIds(rawTeam).length === 0) {
      warnings.push(`Equipo "${rawTeam}" no encontrado, se importará sin equipo`);
    }

    return {
      ...row,
      rowNumber: index + 2,
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  };

  const parseFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

      const validated = rows
        .map(mapRow)
        .filter(r => Object.keys(r).length > 0)
        .map((row, index) => validateRow(row, index));

      if (validated.length === 0) {
        toast.error('No se han encontrado filas con datos. Revisa las columnas del archivo.');
      }
      setValidatedRows(validated);
    } catch (error) {
      toast.error('Error al leer el archivo');
      console.error(error);
    }
    setIsProcessing(false);
  }, [teams, existingPhones]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      parseFile(droppedFile);
    }
  }, [parseFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const templateData = () => [
    {
      nombre: 'María',
      apellido1: 'García',
      apellido2: 'López',
      telefono: '+34600111222',
      equipo: teams[0]?.name || 'Juvenil A',
      dorsal: 7,
      año_nacimiento: 2010,
      altura: 165,
    },
    {
      nombre: 'Laura',
      apellido1: 'Fernández',
      apellido2: '',
      telefono: '',
      equipo: '',
      dorsal: '',
      año_nacimiento: '',
      altura: '',
    },
  ];

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(templateData());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Jugadoras');
    XLSX.writeFile(wb, 'plantilla_jugadoras.xlsx');
  };

  const downloadCsvTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(templateData());
    const csv = XLSX.utils.sheet_to_csv(ws);
    // BOM para que Excel abra bien los acentos
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_jugadoras.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importPlayers = async () => {
    const validRows = validatedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      toast.error('No hay filas válidas para importar');
      return;
    }

    setIsProcessing(true);
    let imported = 0;

    for (const row of validRows) {
      const teamIds = findTeamIds(row.equipo?.toString() || '');
      const result = await addPlayer({
        name: row.nombre!.toString().trim(),
        surname1: row.apellido1?.toString().trim() || null,
        surname2: row.apellido2?.toString().trim() || null,
        phone: row.telefono?.toString().trim() || '',
        teams: teamIds,
        number: row.dorsal ? parseInt(row.dorsal.toString()) || null : null,
        birth_year: row.año_nacimiento ? parseInt(row.año_nacimiento.toString()) || null : null,
        height: row.altura ? parseInt(row.altura.toString()) || null : null,
        photo_url: null,
      });
      if (result) imported++;
    }

    setIsProcessing(false);
    toast.success(`${imported} jugadora${imported !== 1 ? 's' : ''} importada${imported !== 1 ? 's' : ''}`);
    onSuccess();
    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setValidatedRows([]);
    onOpenChange(false);
  };

  const validCount = validatedRows.filter(r => r.isValid).length;
  const invalidCount = validatedRows.filter(r => !r.isValid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Jugadoras
          </DialogTitle>
          <DialogDescription>
            Sube un archivo CSV (.csv) o Excel (.xlsx) con los datos de las jugadoras
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4">
            {/* Instructions */}
            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-3">
              <p className="font-medium">Columnas del archivo (primera fila = cabeceras):</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                <div>
                  <span className="text-destructive">*</span> <strong>nombre</strong> — Nombre
                </div>
                <div>
                  <span className="text-destructive">*</span> <strong>apellido1</strong> — Primer apellido
                </div>
                <div><strong>apellido2</strong> — Segundo apellido</div>
                <div><strong>telefono</strong> — WhatsApp (ej: +34600111222)</div>
                <div><strong>equipo</strong> — Nombre del equipo</div>
                <div><strong>dorsal</strong> — Número</div>
                <div><strong>año_nacimiento</strong> — Ej: 2010</div>
                <div><strong>altura</strong> — En centímetros</div>
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="text-destructive">*</span> Solo <strong>nombre</strong> y <strong>apellido(s)</strong> son
                obligatorios. El resto lo puedes dejar vacío y completarlo después a mano en la ficha de cada jugadora.
              </p>
              <div className="flex items-start gap-2 text-xs text-muted-foreground border-t pt-2">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  También se aceptan cabeceras equivalentes (<em>apellidos</em>, <em>móvil</em>, <em>equipos</em>,{' '}
                  <em>name</em>, <em>phone</em>, <em>team</em>…), con o sin acentos y en mayúsculas. Si usas una sola
                  columna <em>apellidos</em>, se dividirá automáticamente. Para varios equipos, sepáralos con comas.
                  En CSV, usa comas como separador y codificación UTF-8.
                </span>
              </div>
            </div>

            {/* Download templates */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={downloadCsvTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Plantilla CSV
              </Button>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Plantilla Excel
              </Button>
            </div>

            {/* Drop zone */}
            {!file && (
              <label
                className={`block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium">Arrastra tu archivo aquí</p>
                <p className="text-xs text-muted-foreground mt-1">
                  o haz clic para seleccionar (.csv, .xlsx, .xls)
                </p>
              </label>
            )}

            {/* File selected */}
            {file && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <span className="flex-1 text-sm truncate">{file.name}</span>
                <Button variant="ghost" size="sm" onClick={() => { setFile(null); setValidatedRows([]); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Preview */}
            {validatedRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {validCount} válidas
                  </span>
                  {invalidCount > 0 && (
                    <span className="flex items-center gap-1 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      {invalidCount} con errores
                    </span>
                  )}
                </div>

                <div className="border rounded-lg p-2 space-y-1">
                  {validatedRows.map((row, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded text-sm ${
                        row.isValid
                          ? 'bg-green-500/10 border border-green-500/20'
                          : 'bg-destructive/10 border border-destructive/20'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {row.isValid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            Fila {row.rowNumber}: {row.nombre} {row.apellido1} {row.apellido2}
                          </p>
                          {row.errors.length > 0 && (
                            <p className="text-xs text-destructive">{row.errors.join(', ')}</p>
                          )}
                          {row.warnings.length > 0 && (
                            <p className="text-xs text-amber-600">{row.warnings.join(', ')}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={importPlayers}
            disabled={validCount === 0 || isProcessing}
            className="flex-1"
          >
            {isProcessing ? 'Importando...' : `Importar ${validCount} jugadora${validCount !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
