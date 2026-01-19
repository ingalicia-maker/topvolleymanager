import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClubSettings } from '@/hooks/useClubSettings';
import { useUserRole } from '@/hooks/useUserRole';
import { useStops } from '@/hooks/useStops';
import { toast } from 'sonner';
import { Building2, Palette, Type, Upload, Save, Shield, Bus, Plus, Trash2, GripVertical, Calendar, ChevronRight } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';

const COLOR_PRESETS = [
  { name: 'Azul', value: '221 83% 53%', hex: '#2563eb' },
  { name: 'Rojo', value: '0 84% 60%', hex: '#ef4444' },
  { name: 'Verde', value: '142 76% 36%', hex: '#16a34a' },
  { name: 'Naranja', value: '25 95% 53%', hex: '#f97316' },
  { name: 'Morado', value: '271 81% 56%', hex: '#a855f7' },
  { name: 'Rosa', value: '330 81% 60%', hex: '#ec4899' },
  { name: 'Cian', value: '186 94% 41%', hex: '#06b6d4' },
  { name: 'Amarillo', value: '45 93% 47%', hex: '#eab308' },
];

const FONT_OPTIONS = [
  'Inter',
  'Poppins',
  'Roboto',
  'Open Sans',
  'Montserrat',
  'Lato',
];

export default function ClubSettings() {
  const { settings, loading, updateSettings, uploadLogo } = useClubSettings();
  const { isDirector, loading: roleLoading } = useUserRole();
  const { stops, loading: stopsLoading, addStop, updateStop, deleteStop } = useStops();
  
  const [clubName, setClubName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [accentColor, setAccentColor] = useState('');
  const [fontFamily, setFontFamily] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stops management
  const [newStopName, setNewStopName] = useState('');
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [editingStopName, setEditingStopName] = useState('');
  const [addingStop, setAddingStop] = useState(false);

  useEffect(() => {
    if (settings) {
      setClubName(settings.club_name);
      setPrimaryColor(settings.primary_color);
      setAccentColor(settings.accent_color);
      setFontFamily(settings.font_family);
      setLogoUrl(settings.logo_url);
    }
  }, [settings]);

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Configuración del Club" showBack backTo="/profile" />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!isDirector) {
    return <Navigate to="/" replace />;
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona una imagen');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 5MB');
      return;
    }

    setUploading(true);
    const url = await uploadLogo(file);
    if (url) {
      setLogoUrl(url);
      toast.success('Logo subido correctamente');
    } else {
      toast.error('Error al subir el logo');
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!clubName.trim()) {
      toast.error('El nombre del club es obligatorio');
      return;
    }

    setSaving(true);
    const success = await updateSettings({
      club_name: clubName.trim(),
      primary_color: primaryColor,
      accent_color: accentColor,
      font_family: fontFamily,
      logo_url: logoUrl,
    });

    if (success) {
      toast.success('Configuración guardada. Recarga la página para ver los cambios.');
    } else {
      toast.error('Error al guardar la configuración');
    }
    setSaving(false);
  };

  const handleAddStop = async () => {
    if (!newStopName.trim()) {
      toast.error('El nombre de la parada es obligatorio');
      return;
    }

    setAddingStop(true);
    const result = await addStop(newStopName.trim());
    if (result) {
      setNewStopName('');
    }
    setAddingStop(false);
  };

  const handleEditStop = async (stopId: string) => {
    if (!editingStopName.trim()) {
      toast.error('El nombre de la parada es obligatorio');
      return;
    }

    const success = await updateStop(stopId, { name: editingStopName.trim() });
    if (success) {
      setEditingStopId(null);
      setEditingStopName('');
    }
  };

  const startEditingStop = (stopId: string, name: string) => {
    setEditingStopId(stopId);
    setEditingStopName(name);
  };

  const cancelEditingStop = () => {
    setEditingStopId(null);
    setEditingStopName('');
  };

  const handleDeleteStop = async (stopId: string) => {
    await deleteStop(stopId);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Configuración del Club" showBack backTo="/profile" />

      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
          <Shield className="h-5 w-5 text-amber-500" />
          <p className="text-sm text-amber-600">Solo los directores pueden modificar estas opciones</p>
        </div>

        {/* Season Management Link */}
        <Link to="/seasons">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors border-primary/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Gestión de Temporadas</p>
                  <p className="text-xs text-muted-foreground">
                    Iniciar nueva temporada, reutilizar jugadoras y equipos
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        {/* Club Identity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Identidad del Club
            </CardTitle>
            <CardDescription>Nombre y escudo de tu club</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clubName">Nombre del Club</Label>
              <Input
                id="clubName"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                placeholder="Nombre de tu club"
              />
            </div>

            <div className="space-y-2">
              <Label>Escudo del Club</Label>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo del club"
                    className="w-20 h-20 object-contain rounded-lg border border-border bg-background"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted">
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Subiendo...' : 'Subir escudo'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG hasta 5MB</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bus Stops */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bus className="h-5 w-5" />
              Paradas de Bus
            </CardTitle>
            <CardDescription>Configura las paradas para los desplazamientos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stopsLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {/* Existing stops */}
                <div className="space-y-2">
                  {stops.map((stop) => (
                    <div
                      key={stop.id}
                      className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/50"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                      {editingStopId === stop.id ? (
                        <>
                          <Input
                            value={editingStopName}
                            onChange={(e) => setEditingStopName(e.target.value)}
                            className="flex-1"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => handleEditStop(stop.id)}
                          >
                            Guardar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditingStop}
                          >
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 font-medium">{stop.name}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditingStop(stop.id, stop.name)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteStop(stop.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                  
                  {stops.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay paradas configuradas
                    </p>
                  )}
                </div>

                {/* Add new stop */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre de la nueva parada"
                    value={newStopName}
                    onChange={(e) => setNewStopName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddStop()}
                  />
                  <Button
                    onClick={handleAddStop}
                    disabled={addingStop || !newStopName.trim()}
                    className="gap-2 shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    Añadir
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Colors */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Palette className="h-5 w-5" />
              Colores
            </CardTitle>
            <CardDescription>Personaliza los colores de la interfaz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Color Principal</Label>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setPrimaryColor(color.value)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      primaryColor === color.value
                        ? 'border-foreground scale-105'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color.hex }}
                  >
                    <span className="sr-only">{color.name}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Color seleccionado: {COLOR_PRESETS.find(c => c.value === primaryColor)?.name || 'Personalizado'}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Color de Acento</Label>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setAccentColor(color.value)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      accentColor === color.value
                        ? 'border-foreground scale-105'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color.hex }}
                  >
                    <span className="sr-only">{color.name}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Color seleccionado: {COLOR_PRESETS.find(c => c.value === accentColor)?.name || 'Personalizado'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Fonts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Type className="h-5 w-5" />
              Tipografía
            </CardTitle>
            <CardDescription>Elige la fuente de la aplicación</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={fontFamily} onValueChange={setFontFamily}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una fuente" />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((font) => (
                  <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full gap-2"
          size="lg"
        >
          <Save className="h-5 w-5" />
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}
