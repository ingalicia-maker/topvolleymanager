import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, X } from 'lucide-react';
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

export function ImportPlayersDialog({ open, onOpenChange, onSuccess }: ImportPlayersDialogProps) {
  const { teams } = useTeams();
  const { players, addPlayer } = usePlayers();
  const [file, setFile] = useState<File | null>(null);
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const existingPhones = players.map(p => p.phone);

  const findTeamIds = (teamNames: string): string[] => {
    if (!teamNames) return [];
    const names = teamNames.split(',').map(n => n.trim().toLowerCase());
    return names
      .map(name => teams.find(t => t.name.toLowerCase() === name)?.id)
      .filter((id): id is string => !!id);
  };

  const validateRow = (row: PlayerRow, index: number): ValidatedRow => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!row.nombre?.toString().trim()) {
      errors.push('Nombre es obligatorio');
    }

    const phone = row.telefono?.toString().trim();
    if (!phone) {
      errors.push('Teléfono es obligatorio');
    } else if (existingPhones.includes(phone)) {
      warnings.push('Este teléfono ya existe');
    }

    const teamIds = findTeamIds(row.equipo?.toString() || '');
    if (!row.equipo?.toString().trim()) {
      errors.push('Equipo es obligatorio');
    } else if (teamIds.length === 0) {
      errors.push(`Equipo "${row.equipo}" no encontrado`);
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
      const rows = XLSX.utils.sheet_to_json<PlayerRow>(sheet);
      
      const validated = rows.map((row, index) => validateRow(row, index));
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

  const downloadTemplate = () => {
    const templateData = [
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
        telefono: '+34600333444',
        equipo: teams.slice(0, 2).map(t => t.name).join(', ') || 'Cadete, Infantil',
        dorsal: 12,
        año_nacimiento: 2012,
        altura: 155,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Jugadoras');
    XLSX.writeFile(wb, 'plantilla_jugadoras.xlsx');
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
        phone: row.telefono!.toString().trim(),
        teams: teamIds,
        number: row.dorsal ? parseInt(row.dorsal.toString()) : null,
        birth_year: row.año_nacimiento ? parseInt(row.año_nacimiento.toString()) : null,
        height: row.altura ? parseInt(row.altura.toString()) : null,
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
            Sube un archivo Excel (.xlsx) o CSV con los datos de las jugadoras
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Instructions */}
          <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
            <p className="font-medium">Formato del archivo:</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
              <div>
                <span className="text-destructive">*</span> <strong>nombre</strong> - Nombre
              </div>
              <div>
                <span className="text-destructive">*</span> <strong>telefono</strong> - WhatsApp
              </div>
              <div>
                <span className="text-destructive">*</span> <strong>equipo</strong> - Nombre del equipo
              </div>
              <div><strong>apellido1</strong> - Primer apellido</div>
              <div><strong>apellido2</strong> - Segundo apellido</div>
              <div><strong>dorsal</strong> - Número</div>
              <div><strong>año_nacimiento</strong> - Ej: 2010</div>
              <div><strong>altura</strong> - En centímetros</div>
            </div>
            <p className="text-muted-foreground text-xs mt-2">
              * Campos obligatorios. Para asignar varios equipos, sepáralos con comas.
            </p>
          </div>

          {/* Download template */}
          <Button variant="outline" onClick={downloadTemplate} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Descargar plantilla de ejemplo
          </Button>

          {/* Drop zone */}
          {!file && (
            <label
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Arrastra tu archivo aquí</p>
              <p className="text-xs text-muted-foreground mt-1">
                o haz clic para seleccionar (.xlsx, .xls, .csv)
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
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center gap-4 text-sm mb-2">
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
              
              <ScrollArea className="flex-1 border rounded-lg">
                <div className="p-2 space-y-1">
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
                            Fila {row.rowNumber}: {row.nombre} {row.apellido1}
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
              </ScrollArea>
            </div>
          )}
        </div>

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
