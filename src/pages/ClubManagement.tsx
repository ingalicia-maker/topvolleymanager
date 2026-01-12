import { useState, useRef, useEffect } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClub } from '@/hooks/useClub';
import { useStops } from '@/hooks/useStops';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Building2,
  Users,
  Link2,
  Copy,
  Trash2,
  UserPlus,
  Crown,
  User,
  Loader2,
  Settings,
  Mail,
  Palette,
  Type,
  Upload,
  Bus,
  Plus,
  GripVertical,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  Shield,
  FileText,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
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

const FONT_OPTIONS = ['Inter', 'Poppins', 'Roboto', 'Open Sans', 'Montserrat', 'Lato'];

interface MemberWithProfile {
  id: string;
  user_id: string;
  role: 'coach' | 'director';
  joined_at: string;
  profile?: {
    name: string;
    email: string;
  };
}

export default function ClubManagement() {
  const {
    club,
    members,
    invitations,
    isDirector,
    isCoach,
    createInvitation,
    deleteInvitation,
    updateClub,
    removeMember,
    updateMemberRole,
    refetch,
  } = useClub();

  const { stops, loading: stopsLoading, addStop, updateStop, deleteStop } = useStops();
  
  const [clubName, setClubName] = useState(club?.name || '');
  const [primaryColor, setPrimaryColor] = useState(club?.primary_color || '221 83% 53%');
  const [accentColor, setAccentColor] = useState(club?.accent_color || '25 95% 53%');
  const [fontFamily, setFontFamily] = useState(club?.font_family || 'Inter');
  const [logoUrl, setLogoUrl] = useState<string | null>(club?.logo_url || null);
  
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [inviteRole, setInviteRole] = useState<'coach' | 'director'>('coach');
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [lastInviteToken, setLastInviteToken] = useState<string | null>(null);
  const [membersWithProfiles, setMembersWithProfiles] = useState<MemberWithProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  
  // Stops management
  const [newStopName, setNewStopName] = useState('');
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [editingStopName, setEditingStopName] = useState('');
  const [addingStop, setAddingStop] = useState(false);
  
  // Legal settings
  const [responsiblePersonName, setResponsiblePersonName] = useState(club?.responsible_person_name || '');
  const [responsiblePersonEmail, setResponsiblePersonEmail] = useState(club?.responsible_person_email || '');
  const [termsAndConditions, setTermsAndConditions] = useState(club?.terms_and_conditions || '');
  const [responsibilityCode, setResponsibilityCode] = useState(club?.responsibility_code || '');
  const [savingLegal, setSavingLegal] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch member profiles
  useEffect(() => {
    const fetchProfiles = async () => {
      if (members.length === 0) {
        setMembersWithProfiles([]);
        setLoadingProfiles(false);
        return;
      }

      setLoadingProfiles(true);
      const userIds = members.map((m) => m.user_id);
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      if (error) {
        console.error('Error fetching member profiles:', error);
      }

      const enriched = members.map((member) => ({
        ...member,
        profile: profiles?.find((p) => p.id === member.user_id),
      }));

      setMembersWithProfiles(enriched);
      setLoadingProfiles(false);
    };

    fetchProfiles();
  }, [members]);

  // Sync form fields when club loads/changes
  useEffect(() => {
    if (!club) return;
    setClubName(club.name || '');
    setPrimaryColor(club.primary_color || '221 83% 53%');
    setAccentColor(club.accent_color || '25 95% 53%');
    setFontFamily(club.font_family || 'Inter');
    setLogoUrl(club.logo_url || null);
    setResponsiblePersonName(club.responsible_person_name || '');
    setResponsiblePersonEmail(club.responsible_person_email || '');
    setTermsAndConditions(club.terms_and_conditions || '');
    setResponsibilityCode(club.responsibility_code || '');
  }, [club]);

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
    const fileExt = file.name.split('.').pop();
    const fileName = `club-${club?.id}-logo-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('club-logos')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast.error('Error al subir el logo');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('club-logos')
      .getPublicUrl(fileName);

    setLogoUrl(urlData.publicUrl);
    toast.success('Logo subido correctamente');
    setUploading(false);
  };

  const handleSaveClub = async () => {
    if (!clubName.trim()) {
      toast.error('El nombre del club es obligatorio');
      return;
    }

    setSaving(true);
    const success = await updateClub({
      name: clubName.trim(),
      primary_color: primaryColor,
      accent_color: accentColor,
      font_family: fontFamily,
      logo_url: logoUrl,
    });
    setSaving(false);

    if (success) {
      toast.success('Configuración guardada. Recarga para ver los cambios.');
    } else {
      toast.error('Error al actualizar el club');
    }
  };

  const handleAddStop = async () => {
    if (!newStopName.trim()) {
      toast.error('El nombre de la parada es obligatorio');
      return;
    }
    setAddingStop(true);
    const result = await addStop(newStopName.trim());
    if (result) setNewStopName('');
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

  const handleDeleteStop = async (stopId: string) => {
    await deleteStop(stopId);
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/club-onboarding?invite=${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Enlace copiado al portapapeles');
  };

  const handleDeleteInvitation = async (id: string) => {
    const success = await deleteInvitation(id);
    if (success) {
      toast.success('Invitación eliminada');
    } else {
      toast.error('Error al eliminar la invitación');
    }
  };

  const handleRegenerateInvitation = async (oldInvitation: typeof invitations[0]) => {
    // Delete the old one and create a new one with same role
    const deleted = await deleteInvitation(oldInvitation.id);
    if (!deleted) {
      toast.error('Error al regenerar la invitación');
      return;
    }
    
    const { invitation, error } = await createInvitation(oldInvitation.role as 'coach' | 'director');
    if (invitation) {
      setLastInviteToken(invitation.token);
      try {
        await navigator.clipboard.writeText(
          `${window.location.origin}/club-onboarding?invite=${invitation.token}`
        );
        toast.success('Enlace regenerado y copiado');
      } catch {
        toast.success('Enlace regenerado. ¡Cópialo!');
      }
    } else {
      toast.error(error || 'Error al regenerar la invitación');
    }
  };

  const getInvitationStatus = (inv: typeof invitations[0]) => {
    if (inv.used_at) {
      return { status: 'used', label: 'Usada', color: 'text-green-600', icon: CheckCircle2 };
    }
    if (new Date(inv.expires_at) < new Date()) {
      return { status: 'expired', label: 'Expirada', color: 'text-destructive', icon: XCircle };
    }
    return { status: 'active', label: 'Activa', color: 'text-primary', icon: Clock };
  };

  const handleRemoveMember = async (memberId: string) => {
    const success = await removeMember(memberId);
    if (success) {
      toast.success('Miembro eliminado');
      refetch();
    } else {
      toast.error('Error al eliminar el miembro');
    }
  };

  const handlePromoteToDirector = async (memberId: string, memberName: string) => {
    const success = await updateMemberRole(memberId, 'director');
    if (success) {
      toast.success(`${memberName} ahora es Director Deportivo`);
      refetch();
    } else {
      toast.error('Error al actualizar el rol');
    }
  };

  const handleDemoteToCoach = async (memberId: string, memberName: string) => {
    const success = await updateMemberRole(memberId, 'coach');
    if (success) {
      toast.success(`${memberName} ahora es Entrenador`);
      refetch();
    } else {
      toast.error('Error al actualizar el rol');
    }
  };

  const handleCreateInvitation = async () => {
    setCreatingInvite(true);
    // If coach is creating, force role to 'coach' and notify directors
    const roleToUse = isDirector ? inviteRole : 'coach';
    const shouldNotifyDirectors = !isDirector; // Notify if coach creates invitation
    
    const { invitation, error } = await createInvitation(roleToUse, undefined, shouldNotifyDirectors);
    setCreatingInvite(false);

    if (invitation) {
      setLastInviteToken(invitation.token);

      // Best effort: auto-copy
      try {
        await navigator.clipboard.writeText(
          `${window.location.origin}/club-onboarding?invite=${invitation.token}`
        );
        toast.success('Enlace de invitación creado y copiado');
      } catch {
        toast.success('Enlace de invitación creado. ¡Cópialo y compártelo!');
      }
    } else {
      toast.error(error || 'Error al crear la invitación');
    }
  };

  const handleSaveLegalSettings = async () => {
    setSavingLegal(true);
    const success = await updateClub({
      responsible_person_name: responsiblePersonName.trim() || null,
      responsible_person_email: responsiblePersonEmail.trim() || null,
      terms_and_conditions: termsAndConditions.trim() || null,
      responsibility_code: responsibilityCode.trim() || null,
      terms_updated_at: new Date().toISOString(),
      responsibility_code_updated_at: new Date().toISOString(),
    });
    setSavingLegal(false);

    if (success) {
      toast.success('Configuración legal guardada correctamente');
    } else {
      toast.error('Error al guardar la configuración legal');
    }
  };

  if (!club) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Gestión del Club" showBack />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Gestión del Club" showBack />

      <div className="p-4">
        <Tabs defaultValue="general">
          <TabsList className="w-full mb-4 grid grid-cols-5">
            <TabsTrigger value="general" className="gap-1 text-xs sm:text-sm">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="visual" className="gap-1 text-xs sm:text-sm">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Visual</span>
            </TabsTrigger>
            <TabsTrigger value="legal" className="gap-1 text-xs sm:text-sm">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Legal</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-1 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Miembros</span>
            </TabsTrigger>
            <TabsTrigger value="invitations" className="gap-1 text-xs sm:text-sm">
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">Invitar</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Identidad del Club
                </CardTitle>
                <CardDescription>Nombre y escudo del club</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clubName">Nombre del club</Label>
                  <Input
                    id="clubName"
                    value={clubName}
                    onChange={(e) => setClubName(e.target.value)}
                    disabled={!isDirector}
                  />
                </div>

                {isDirector && (
                  <div className="space-y-2">
                    <Label>Escudo del Club</Label>
                    <div className="flex items-center gap-4">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-20 h-20 object-contain rounded-lg border bg-background" />
                      ) : (
                        <div className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted">
                          <Building2 className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
                          <Upload className="h-4 w-4" />
                          {uploading ? 'Subiendo...' : 'Subir escudo'}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG hasta 5MB</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bus Stops */}
            {isDirector && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Bus className="h-5 w-5" />
                    Paradas de Bus
                  </CardTitle>
                  <CardDescription>Configura las paradas para desplazamientos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stopsLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {stops.map((stop) => (
                          <div key={stop.id} className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
                            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                            {editingStopId === stop.id ? (
                              <>
                                <Input value={editingStopName} onChange={(e) => setEditingStopName(e.target.value)} className="flex-1" autoFocus />
                                <Button size="sm" onClick={() => handleEditStop(stop.id)}>Guardar</Button>
                                <Button size="sm" variant="outline" onClick={() => { setEditingStopId(null); setEditingStopName(''); }}>Cancelar</Button>
                              </>
                            ) : (
                              <>
                                <span className="flex-1 font-medium">{stop.name}</span>
                                <Button size="sm" variant="ghost" onClick={() => { setEditingStopId(stop.id); setEditingStopName(stop.name); }}>Editar</Button>
                                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteStop(stop.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        ))}
                        {stops.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No hay paradas configuradas</p>}
                      </div>
                      <div className="flex gap-2">
                        <Input placeholder="Nueva parada" value={newStopName} onChange={(e) => setNewStopName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddStop()} />
                        <Button onClick={handleAddStop} disabled={addingStop || !newStopName.trim()} className="gap-2 shrink-0">
                          <Plus className="h-4 w-4" />
                          Añadir
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {isDirector && (
              <Button onClick={handleSaveClub} disabled={saving} className="w-full">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Guardar cambios
              </Button>
            )}
          </TabsContent>

          <TabsContent value="visual" className="space-y-4">
            {!isDirector ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Solo los directores pueden modificar la configuración visual.
                </CardContent>
              </Card>
            ) : (
              <>
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
                            className={`p-3 rounded-lg border-2 transition-all ${primaryColor === color.value ? 'border-foreground scale-105' : 'border-transparent'}`}
                            style={{ backgroundColor: color.hex }}
                          >
                            <span className="sr-only">{color.name}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Seleccionado: {COLOR_PRESETS.find(c => c.value === primaryColor)?.name || 'Personalizado'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Color de Acento</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {COLOR_PRESETS.map((color) => (
                          <button
                            key={color.value}
                            onClick={() => setAccentColor(color.value)}
                            className={`p-3 rounded-lg border-2 transition-all ${accentColor === color.value ? 'border-foreground scale-105' : 'border-transparent'}`}
                            style={{ backgroundColor: color.hex }}
                          >
                            <span className="sr-only">{color.name}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Seleccionado: {COLOR_PRESETS.find(c => c.value === accentColor)?.name || 'Personalizado'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

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
                          <SelectItem key={font} value={font} style={{ fontFamily: font }}>{font}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                <Button onClick={handleSaveClub} disabled={saving} className="w-full">
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Guardar configuración visual
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="legal" className="space-y-4">
            {!isDirector ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Solo los directores pueden modificar la configuración legal.
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="h-5 w-5" />
                      Responsable del Tratamiento
                    </CardTitle>
                    <CardDescription>Datos del Director Deportivo responsable del club</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="responsibleName">Nombre del responsable</Label>
                      <Input
                        id="responsibleName"
                        value={responsiblePersonName}
                        onChange={(e) => setResponsiblePersonName(e.target.value)}
                        placeholder="Nombre y apellidos del Director Deportivo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="responsibleEmail">Email de contacto</Label>
                      <Input
                        id="responsibleEmail"
                        type="email"
                        value={responsiblePersonEmail}
                        onChange={(e) => setResponsiblePersonEmail(e.target.value)}
                        placeholder="email@club.com"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="h-5 w-5" />
                      Términos y Condiciones del Club
                    </CardTitle>
                    <CardDescription>
                      Condiciones de uso y tratamiento de datos personales. Este texto se muestra a los usuarios al registrarse.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={termsAndConditions}
                      onChange={(e) => setTermsAndConditions(e.target.value)}
                      placeholder="Escribe aquí los términos y condiciones del club..."
                      className="min-h-[200px] font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Se recomienda incluir: finalidad del tratamiento, base legal, destinatarios, derechos y conservación de datos.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Shield className="h-5 w-5" />
                      Código de Responsabilidad
                    </CardTitle>
                    <CardDescription>
                      Los nuevos miembros deberán aceptar este código al unirse al club. Define las normas de uso de datos.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={responsibilityCode}
                      onChange={(e) => setResponsibilityCode(e.target.value)}
                      placeholder="Escribe aquí el código de responsabilidad del club..."
                      className="min-h-[200px] font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Se recomienda incluir: confidencialidad, uso responsable, respeto a la privacidad y cumplimiento legal (RGPD).
                    </p>
                  </CardContent>
                </Card>

                <Button onClick={handleSaveLegalSettings} disabled={savingLegal} className="w-full">
                  {savingLegal && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Guardar configuración legal
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Miembros del Club
                </CardTitle>
                <CardDescription>
                  {members.length} miembro{members.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingProfiles ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  membersWithProfiles.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {member.role === 'director' ? (
                            <Crown className="h-5 w-5 text-primary" />
                          ) : (
                            <User className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {member.profile?.name || 'Usuario'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {member.profile?.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={member.role === 'director' ? 'default' : 'secondary'}
                        >
                          {member.role === 'director' ? 'Director' : 'Entrenador'}
                        </Badge>
                        {isDirector && member.role !== 'director' && (
                          <>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1">
                                  <Crown className="h-3 w-3" />
                                  <span className="hidden sm:inline">Hacer Director</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    ¿Conceder permisos de Director?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {member.profile?.name} tendrá permisos completos de Director Deportivo: gestionar equipos, jugadoras, invitaciones y configuración del club.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handlePromoteToDirector(member.id, member.profile?.name || 'Usuario')}
                                  >
                                    Confirmar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    ¿Eliminar miembro?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {member.profile?.name} será eliminado del club.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemoveMember(member.id)}
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                        {isDirector && member.role === 'director' && membersWithProfiles.filter(m => m.role === 'director').length > 1 && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="gap-1">
                                <User className="h-3 w-3" />
                                <span className="hidden sm:inline">Hacer Entrenador</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  ¿Revocar permisos de Director?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {member.profile?.name} pasará a ser Entrenador y perderá los permisos de gestión del club.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDemoteToCoach(member.id, member.profile?.name || 'Usuario')}
                                >
                                  Confirmar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Crear Enlace de Invitación
                </CardTitle>
                <CardDescription>
                  Genera un enlace que puedes compartir con quien quieras invitar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isDirector ? (
                  <div className="space-y-2">
                    <Label>Rol del invitado</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(v) => setInviteRole(v as 'coach' | 'director')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="coach">Entrenador</SelectItem>
                        <SelectItem value="director">Director Deportivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Como entrenador, puedes invitar a otros entrenadores al club. El director deportivo será notificado de la invitación.
                  </p>
                )}
                <Button onClick={handleCreateInvitation} disabled={creatingInvite} className="w-full">
                  {creatingInvite ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Link2 className="h-4 w-4 mr-2" />
                  )}
                  Generar enlace de invitación
                </Button>

                {lastInviteToken && (
                  <div className="space-y-2">
                    <Label>Último enlace generado</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={`${window.location.origin}/club-onboarding?invite=${lastInviteToken}`}
                        readOnly
                        className="flex-1 text-xs font-mono bg-background"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyInviteLink(lastInviteToken)}
                        className="shrink-0 gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copiar
                      </Button>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  El enlace será válido por 7 días
                </p>
              </CardContent>
            </Card>

            {invitations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    Historial de invitaciones
                  </CardTitle>
                  <CardDescription>
                    Todas las invitaciones generadas (activas, usadas y expiradas)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {invitations.map((inv) => {
                    const inviteLink = `${window.location.origin}/club-onboarding?invite=${inv.token}`;
                    const { status, label, color, icon: StatusIcon } = getInvitationStatus(inv);
                    const isActive = status === 'active';

                    return (
                      <div
                        key={inv.id}
                        className={`p-4 rounded-lg border space-y-3 ${
                          isActive ? 'bg-muted/50' : 'bg-muted/20 opacity-75'
                        }`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={inv.role === 'director' ? 'default' : 'secondary'}>
                              {inv.role === 'director' ? 'Director' : 'Entrenador'}
                            </Badge>
                            <span className={`text-xs font-medium flex items-center gap-1 ${color}`}>
                              <StatusIcon className="h-3 w-3" />
                              {label}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {status === 'used'
                              ? `Usada: ${new Date(inv.used_at!).toLocaleDateString()}`
                              : `Expira: ${new Date(inv.expires_at).toLocaleDateString()}`}
                          </span>
                        </div>

                        {/* Only show copyable link if active */}
                        {isActive && (
                          <div className="flex items-center gap-2">
                            <Input
                              value={inviteLink}
                              readOnly
                              className="flex-1 text-xs font-mono bg-background"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyInviteLink(inv.token)}
                              className="shrink-0 gap-2"
                            >
                              <Copy className="h-4 w-4" />
                              Copiar
                            </Button>
                          </div>
                        )}

                        <div className="flex items-center justify-between flex-wrap gap-2">
                          {inv.email && (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {inv.email}
                            </span>
                          )}
                          <div className="flex items-center gap-2 ml-auto">
                            {/* Regenerate button for expired or used invitations */}
                            {!isActive && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRegenerateInvitation(inv)}
                                className="gap-1"
                              >
                                <RefreshCw className="h-4 w-4" />
                                Regenerar
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteInvitation(inv.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
}
