import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePlayers } from '@/hooks/usePlayers';
import { useTeams } from '@/hooks/useTeams';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, Save, Trash2, MessageCircle, Camera, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function PlayerDetail() {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const { players, updatePlayer, deletePlayer, loading } = usePlayers();
  const { teams, loading: teamsLoading } = useTeams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const player = players.find(p => p.id === playerId);

  const [name, setName] = useState('');
  const [surname1, setSurname1] = useState('');
  const [surname2, setSurname2] = useState('');
  const [phone, setPhone] = useState('');
  const [number, setNumber] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [height, setHeight] = useState('');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (player) {
      setName(player.name || '');
      setSurname1(player.surname1 || '');
      setSurname2(player.surname2 || '');
      setPhone(player.phone || '');
      setNumber(player.number?.toString() || '');
      setBirthYear(player.birth_year?.toString() || '');
      setHeight(player.height?.toString() || '');
      setSelectedTeams(player.teams || []);
      setPhotoUrl(player.photo_url || null);
    }
  }, [player]);

  const toggleTeam = (teamId: string) => {
    setSelectedTeams(prev =>
      prev.includes(teamId) ? prev.filter(t => t !== teamId) : [...prev, teamId]
    );
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !playerId) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 5MB');
      return;
    }

    setUploadingPhoto(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${playerId}-${Date.now()}.${fileExt}`;

      // Delete old photo if exists
      if (photoUrl) {
        const oldPath = photoUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('player-photos').remove([oldPath]);
        }
      }

      // Upload new photo
      const { error: uploadError } = await supabase.storage
        .from('player-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('player-photos')
        .getPublicUrl(fileName);

      setPhotoUrl(publicUrl);
      toast.success('Foto subida correctamente');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Error al subir la foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!photoUrl) return;

    try {
      const fileName = photoUrl.split('/').pop();
      if (fileName) {
        await supabase.storage.from('player-photos').remove([fileName]);
      }
      setPhotoUrl(null);
      toast.success('Foto eliminada');
    } catch (error) {
      console.error('Error removing photo:', error);
      toast.error('Error al eliminar la foto');
    }
  };

  const handleSave = async () => {
    if (!playerId) return;

    if (!name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!phone.trim()) {
      toast.error('El teléfono es obligatorio');
      return;
    }
    if (selectedTeams.length === 0) {
      toast.error('Selecciona al menos un equipo');
      return;
    }

    setSaving(true);
    const success = await updatePlayer(playerId, {
      name: name.trim(),
      surname1: surname1.trim() || null,
      surname2: surname2.trim() || null,
      phone: phone.trim(),
      teams: selectedTeams,
      number: number ? parseInt(number) : null,
      birth_year: birthYear ? parseInt(birthYear) : null,
      height: height ? parseInt(height) : null,
      photo_url: photoUrl,
    });

    if (success) {
      navigate(-1);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!playerId) return;

    // Delete photo if exists
    if (photoUrl) {
      const fileName = photoUrl.split('/').pop();
      if (fileName) {
        await supabase.storage.from('player-photos').remove([fileName]);
      }
    }

    const success = await deletePlayer(playerId);
    if (success) {
      navigate('/players');
    }
  };

  const handleWhatsApp = () => {
    if (player?.phone) {
      const phoneNumber = player.phone.replace(/\D/g, '');
      window.open(`https://wa.me/${phoneNumber}`, '_blank');
    }
  };

  if (loading || teamsLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Cargando..." showBack />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Jugadora no encontrada" showBack />
        <BottomNav />
      </div>
    );
  }

  const fullName = [player.name, player.surname1, player.surname2]
    .filter(Boolean)
    .join(' ');

  const initials = player.name.charAt(0).toUpperCase() + (player.surname1?.charAt(0).toUpperCase() || '');

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Editar Jugadora" showBack />

      <div className="p-4 space-y-4">
        {/* Player Header with Photo */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16">
                <AvatarImage src={photoUrl || undefined} alt={fullName} />
                <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
                  {player.number ? `#${player.number}` : initials}
                </AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <Button
                variant="secondary"
                size="icon"
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Camera className="h-3 w-3" />
                )}
              </Button>
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-lg">{fullName}</h2>
              {player.birth_year && (
                <p className="text-sm text-muted-foreground">Nacida en {player.birth_year}</p>
              )}
              {photoUrl && (
                <Button
                  variant="link"
                  size="sm"
                  className="text-destructive p-0 h-auto text-xs"
                  onClick={handleRemovePhoto}
                >
                  Eliminar foto
                </Button>
              )}
            </div>
            <Button variant="outline" size="icon" onClick={handleWhatsApp}>
              <MessageCircle className="h-5 w-5 text-green-600" />
            </Button>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos Personales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nombre"
                disabled={saving}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="surname1">Primer Apellido</Label>
                <Input
                  id="surname1"
                  value={surname1}
                  onChange={e => setSurname1(e.target.value)}
                  placeholder="Opcional"
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surname2">Segundo Apellido</Label>
                <Input
                  id="surname2"
                  value={surname2}
                  onChange={e => setSurname2(e.target.value)}
                  placeholder="Opcional"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono (WhatsApp) *</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+34 600 000 000"
                disabled={saving}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="number">Nº Camiseta</Label>
                <Input
                  id="number"
                  type="number"
                  value={number}
                  onChange={e => setNumber(e.target.value)}
                  placeholder="Ej: 7"
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthYear">Año Nac.</Label>
                <Input
                  id="birthYear"
                  type="number"
                  value={birthYear}
                  onChange={e => setBirthYear(e.target.value)}
                  placeholder="2010"
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Altura (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  placeholder="165"
                  disabled={saving}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teams */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Equipos *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {teams.map(team => (
              <label
                key={team.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={selectedTeams.includes(team.id)}
                  onCheckedChange={() => toggleTeam(team.id)}
                  disabled={saving}
                />
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: team.color }}
                />
                <div className="flex-1">
                  <p className="font-medium text-foreground">{team.name}</p>
                  <p className="text-sm text-muted-foreground">Coach: {team.coach}</p>
                </div>
              </label>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button onClick={handleSave} className="w-full gap-2" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
                <Trash2 className="h-4 w-4" />
                Eliminar Jugadora
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar jugadora?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminará a {fullName} de forma permanente. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
