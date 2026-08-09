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
import { useTranslation } from 'react-i18next';
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
  ExternalLink,
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
  const { t } = useTranslation();
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
      toast.error(t('clubManagement.selectImage'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('clubManagement.imageSizeLimit'));
      return;
    }

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `club-${club?.id}-logo-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('club-logos')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast.error(t('clubManagement.errorUploadingLogo'));
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('club-logos')
      .getPublicUrl(fileName);

    setLogoUrl(urlData.publicUrl);
    toast.success(t('clubManagement.logoUploaded'));
    setUploading(false);
  };

  const handleSaveClub = async () => {
    if (!clubName.trim()) {
      toast.error(t('clubManagement.clubNameRequired'));
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
      toast.success(t('clubManagement.settingsSaved'));
    } else {
      toast.error(t('clubManagement.errorUpdatingClub'));
    }
  };

  const handleAddStop = async () => {
    if (!newStopName.trim()) {
      toast.error(t('clubManagement.stopNameRequired'));
      return;
    }
    setAddingStop(true);
    const result = await addStop(newStopName.trim());
    if (result) setNewStopName('');
    setAddingStop(false);
  };

  const handleEditStop = async (stopId: string) => {
    if (!editingStopName.trim()) {
      toast.error(t('clubManagement.stopNameRequired'));
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

  const getInviteBaseUrl = () => {
    // Always generate a professional public link (avoid preview domains like "lovableproject").
    // In local development we keep localhost so testing remains easy.
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return window.location.origin;

    // Use www to avoid SSL issues on some registrars/root-domain setups.
    return 'https://www.topvolleymanager.com';
  };

  // Generate a clean invitation link without query params.
  // We use a hash fragment so it works even if the hosting doesn't rewrite SPA routes like /inv/TOKEN.
  // Example: https://www.topvolleymanager.com/invitation#TOKEN
  const getInviteLink = (token: string) => {
    return `${getInviteBaseUrl()}/invitation#${token}`;
  };

  const copyInviteLink = (token: string) => {
    const link = getInviteLink(token);
    navigator.clipboard.writeText(link);
    toast.success(t('clubManagement.linkCopied'));
  };

  const openAndValidateInviteLink = async (token: string) => {
    const link = getInviteLink(token);
    
    // Open in new tab
    const newWindow = window.open(link, '_blank');
    
    // Try to check if the link is accessible (may be blocked by CORS)
    try {
      const response = await fetch(link, { method: 'HEAD', mode: 'no-cors' });
      // With no-cors we can't read the status, so we just inform the user
      toast.info(t('clubManagement.linkOpenedVerify'), {
        duration: 5000,
      });
    } catch (error) {
      // If fetch fails, the window might still work (CORS restrictions)
      if (!newWindow || newWindow.closed) {
        toast.error(t('clubManagement.linkOpenFailed'), {
          duration: 5000,
          description: t('clubManagement.error404Hint'),
        });
      } else {
        toast.info(t('clubManagement.linkOpenedRepublish'), {
          duration: 5000,
        });
      }
    }
  };

  const handleDeleteInvitation = async (id: string) => {
    const success = await deleteInvitation(id);
    if (success) {
      toast.success(t('clubManagement.invitationDeleted'));
    } else {
      toast.error(t('clubManagement.errorDeletingInvitation'));
    }
  };

  const handleRegenerateInvitation = async (oldInvitation: typeof invitations[0]) => {
    // Delete the old one and create a new one with same role
    const deleted = await deleteInvitation(oldInvitation.id);
    if (!deleted) {
      toast.error(t('clubManagement.errorRegeneratingInvitation'));
      return;
    }
    
    const { invitation, error } = await createInvitation(oldInvitation.role as 'coach' | 'director');
    if (invitation) {
      setLastInviteToken(invitation.token);
      try {
        await navigator.clipboard.writeText(getInviteLink(invitation.token));
        toast.success(t('clubManagement.linkRegeneratedCopied'));
      } catch {
        toast.success(t('clubManagement.linkRegenerated'));
      }
    } else {
      toast.error(error || t('clubManagement.errorRegeneratingInvitation'));
    }
  };

  const getInvitationStatus = (inv: typeof invitations[0]) => {
    if (inv.used_at) {
      return { status: 'used', label: t('clubManagement.statusUsed'), color: 'text-green-600', icon: CheckCircle2 };
    }
    if (new Date(inv.expires_at) < new Date()) {
      return { status: 'expired', label: t('clubManagement.statusExpired'), color: 'text-destructive', icon: XCircle };
    }
    return { status: 'active', label: t('clubManagement.statusActive'), color: 'text-primary', icon: Clock };
  };

  const handleRemoveMember = async (memberId: string) => {
    const success = await removeMember(memberId);
    if (success) {
      toast.success(t('clubManagement.memberRemoved'));
      refetch();
    } else {
      toast.error(t('clubManagement.errorRemovingMember'));
    }
  };

  const handlePromoteToDirector = async (memberId: string, memberName: string) => {
    const success = await updateMemberRole(memberId, 'director');
    if (success) {
      toast.success(t('clubManagement.nowDirector', { name: memberName }));
      refetch();
    } else {
      toast.error(t('clubManagement.errorUpdatingRole'));
    }
  };

  const handleDemoteToCoach = async (memberId: string, memberName: string) => {
    const success = await updateMemberRole(memberId, 'coach');
    if (success) {
      toast.success(t('clubManagement.nowCoach', { name: memberName }));
      refetch();
    } else {
      toast.error(t('clubManagement.errorUpdatingRole'));
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
        await navigator.clipboard.writeText(getInviteLink(invitation.token));
        toast.success(t('clubManagement.inviteLinkCreatedCopied'));
      } catch {
        toast.success(t('clubManagement.inviteLinkCreated'));
      }
    } else {
      toast.error(error || t('clubManagement.errorCreatingInvitation'));
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
      toast.success(t('clubManagement.legalSettingsSaved'));
    } else {
      toast.error(t('clubManagement.errorSavingLegal'));
    }
  };

  if (!club) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title={t('clubManagement.title')} showBack backTo="/profile" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title={t('clubManagement.title')} showBack backTo="/profile" />

      <div className="p-4">
        <Tabs defaultValue="general">
          <TabsList className="w-full mb-4 grid grid-cols-5">
            <TabsTrigger value="general" className="gap-1 text-xs sm:text-sm">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">{t('clubManagement.tabGeneral')}</span>
            </TabsTrigger>
            <TabsTrigger value="visual" className="gap-1 text-xs sm:text-sm">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">{t('clubManagement.tabVisual')}</span>
            </TabsTrigger>
            <TabsTrigger value="legal" className="gap-1 text-xs sm:text-sm">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">{t('clubManagement.tabLegal')}</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-1 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{t('clubManagement.tabMembers')}</span>
            </TabsTrigger>
            <TabsTrigger value="invitations" className="gap-1 text-xs sm:text-sm">
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('clubManagement.tabInvite')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {t('clubManagement.clubIdentity')}
                </CardTitle>
                <CardDescription>{t('clubManagement.nameAndCrest')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clubName">{t('clubManagement.clubName')}</Label>
                  <Input
                    id="clubName"
                    value={clubName}
                    onChange={(e) => setClubName(e.target.value)}
                    disabled={!isDirector}
                  />
                </div>

                {isDirector && (
                  <div className="space-y-2">
                    <Label>{t('clubManagement.clubCrest')}</Label>
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
                          {uploading ? t('clubManagement.uploading') : t('clubManagement.uploadCrest')}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">{t('clubManagement.imageFormatHint')}</p>
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
                    {t('clubManagement.busStops')}
                  </CardTitle>
                  <CardDescription>{t('clubManagement.configureStops')}</CardDescription>
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
                                <Button size="sm" onClick={() => handleEditStop(stop.id)}>{t('clubManagement.save')}</Button>
                                <Button size="sm" variant="outline" onClick={() => { setEditingStopId(null); setEditingStopName(''); }}>{t('clubManagement.cancel')}</Button>
                              </>
                            ) : (
                              <>
                                <span className="flex-1 font-medium">{stop.name}</span>
                                <Button size="sm" variant="ghost" onClick={() => { setEditingStopId(stop.id); setEditingStopName(stop.name); }}>{t('clubManagement.edit')}</Button>
                                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteStop(stop.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        ))}
                        {stops.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t('clubManagement.noStopsConfigured')}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Input placeholder={t('clubManagement.newStopPlaceholder')} value={newStopName} onChange={(e) => setNewStopName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddStop()} />
                        <Button onClick={handleAddStop} disabled={addingStop || !newStopName.trim()} className="gap-2 shrink-0">
                          <Plus className="h-4 w-4" />
                          {t('clubManagement.add')}
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
                {t('clubManagement.saveChanges')}
              </Button>
            )}
          </TabsContent>

          <TabsContent value="visual" className="space-y-4">
            {!isDirector ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {t('clubManagement.onlyDirectorsVisual')}
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Palette className="h-5 w-5" />
                      {t('clubManagement.colors')}
                    </CardTitle>
                    <CardDescription>{t('clubManagement.customizeColors')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t('clubManagement.primaryColor')}</Label>
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
                        {t('clubManagement.selected')}: {COLOR_PRESETS.find(c => c.value === primaryColor)?.name || t('clubManagement.custom')}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('clubManagement.accentColor')}</Label>
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
                        {t('clubManagement.selected')}: {COLOR_PRESETS.find(c => c.value === accentColor)?.name || t('clubManagement.custom')}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Type className="h-5 w-5" />
                      {t('clubManagement.typography')}
                    </CardTitle>
                    <CardDescription>{t('clubManagement.chooseFont')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Select value={fontFamily} onValueChange={setFontFamily}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('clubManagement.selectFont')} />
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
                  {t('clubManagement.saveVisualSettings')}
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="legal" className="space-y-4">
            {!isDirector ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {t('clubManagement.onlyDirectorsLegal')}
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="h-5 w-5" />
                      {t('clubManagement.dataController')}
                    </CardTitle>
                    <CardDescription>{t('clubManagement.directorDataDescription')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="responsibleName">{t('clubManagement.responsibleName')}</Label>
                      <Input
                        id="responsibleName"
                        value={responsiblePersonName}
                        onChange={(e) => setResponsiblePersonName(e.target.value)}
                        placeholder={t('clubManagement.responsibleNamePlaceholder')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="responsibleEmail">{t('clubManagement.contactEmail')}</Label>
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
                      {t('clubManagement.clubTerms')}
                    </CardTitle>
                    <CardDescription>
                      {t('clubManagement.clubTermsDescription')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={termsAndConditions}
                      onChange={(e) => setTermsAndConditions(e.target.value)}
                      placeholder={t('clubManagement.termsPlaceholder')}
                      className="min-h-[200px] font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('clubManagement.termsHint')}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Shield className="h-5 w-5" />
                      {t('clubManagement.responsibilityCode')}
                    </CardTitle>
                    <CardDescription>
                      {t('clubManagement.responsibilityCodeDescription')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={responsibilityCode}
                      onChange={(e) => setResponsibilityCode(e.target.value)}
                      placeholder={t('clubManagement.responsibilityCodePlaceholder')}
                      className="min-h-[200px] font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('clubManagement.responsibilityCodeHint')}
                    </p>
                  </CardContent>
                </Card>

                <Button onClick={handleSaveLegalSettings} disabled={savingLegal} className="w-full">
                  {savingLegal && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {t('clubManagement.saveLegalSettings')}
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t('clubManagement.clubMembers')}
                </CardTitle>
                <CardDescription>
                  {t('clubManagement.memberCount', { count: members.length })}
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
                            {member.profile?.name || t('clubManagement.defaultUserName')}
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
                          {member.role === 'director' ? t('auth.director') : t('auth.coach')}
                        </Badge>
                        {isDirector && member.role !== 'director' && (
                          <>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1">
                                  <Crown className="h-3 w-3" />
                                  <span className="hidden sm:inline">{t('clubManagement.makeDirector')}</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    {t('clubManagement.confirmGrantDirectorTitle')}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('clubManagement.confirmGrantDirectorDescription', { name: member.profile?.name })}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('clubManagement.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handlePromoteToDirector(member.id, member.profile?.name || t('clubManagement.defaultUserName'))}
                                  >
                                    {t('clubManagement.confirm')}
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
                                    {t('clubManagement.confirmRemoveMemberTitle')}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('clubManagement.confirmRemoveMemberDescription', { name: member.profile?.name })}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('clubManagement.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemoveMember(member.id)}
                                  >
                                    {t('clubManagement.remove')}
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
                                <span className="hidden sm:inline">{t('clubManagement.makeCoach')}</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {t('clubManagement.confirmRevokeDirectorTitle')}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('clubManagement.confirmRevokeDirectorDescription', { name: member.profile?.name })}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('clubManagement.cancel')}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDemoteToCoach(member.id, member.profile?.name || t('clubManagement.defaultUserName'))}
                                >
                                  {t('clubManagement.confirm')}
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
                  {t('clubManagement.inviteMembers')}
                </CardTitle>
                <CardDescription>
                  {t('clubManagement.generateInviteHint')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isDirector ? (
                  <div className="space-y-2">
                    <Label>{t('clubManagement.inviteeRole')}</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(v) => setInviteRole(v as 'coach' | 'director')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="coach">{t('auth.coach')}</SelectItem>
                        <SelectItem value="director">{t('auth.director')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('clubManagement.coachInviteHint')}
                  </p>
                )}
                <Button onClick={handleCreateInvitation} disabled={creatingInvite} className="w-full">
                  {creatingInvite ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {t('clubManagement.generateInviteCode')}
                </Button>

                {lastInviteToken && (
                  <div className="space-y-3 p-4 rounded-lg border-2 border-primary/50 bg-primary/5">
                    <Label className="text-sm font-medium">{t('clubManagement.generatedInviteCode')}</Label>
                    <div className="flex items-center justify-center gap-2">
                      <div className="text-3xl font-mono font-bold tracking-widest text-primary bg-background px-4 py-2 rounded-lg border">
                        {invitations.find(i => i.token === lastInviteToken)?.short_code || '------'}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const code = invitations.find(i => i.token === lastInviteToken)?.short_code;
                          if (code) {
                            navigator.clipboard.writeText(code);
                            toast.success(t('clubManagement.codeCopied'));
                          }
                        }}
                        className="shrink-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                      {t('clubManagement.shareCodeHint')}
                    </p>

                    <div className="border-t pt-3 mt-3">
                      <Label className="text-xs text-muted-foreground">{t('clubManagement.orShareLink')}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          value={getInviteLink(lastInviteToken)}
                          readOnly
                          className="flex-1 text-xs font-mono bg-background"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyInviteLink(lastInviteToken)}
                          className="shrink-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  {t('clubManagement.codeValidFor7Days')}
                </p>
              </CardContent>
            </Card>

            {invitations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    {t('clubManagement.invitationHistory')}
                  </CardTitle>
                  <CardDescription>
                    {t('clubManagement.allInvitationsGenerated')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                {invitations.map((inv) => {
                    const inviteLink = getInviteLink(inv.token);
                    const { status, label, color, icon: StatusIcon } = getInvitationStatus(inv);
                    const isActive = status === 'active';
                    const shortCode = inv.short_code;

                    return (
                      <div
                        key={inv.id}
                        className={`p-4 rounded-lg border space-y-3 ${
                          isActive ? 'bg-muted/50' : 'bg-muted/20 opacity-75'
                        }`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            {isActive && shortCode && (
                              <span className="font-mono font-bold text-lg tracking-wider text-primary">
                                {shortCode}
                              </span>
                            )}
                            <Badge variant={inv.role === 'director' ? 'default' : 'secondary'}>
                              {inv.role === 'director' ? t('auth.director') : t('auth.coach')}
                            </Badge>
                            <span className={`text-xs font-medium flex items-center gap-1 ${color}`}>
                              <StatusIcon className="h-3 w-3" />
                              {label}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {status === 'used'
                              ? t('clubManagement.usedOn', { date: new Date(inv.used_at!).toLocaleDateString() })
                              : t('clubManagement.expiresOn', { date: new Date(inv.expires_at).toLocaleDateString() })}
                          </span>
                        </div>

                        {/* Show code copy button and link if active */}
                        {isActive && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {shortCode && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(shortCode);
                                  toast.success(t('clubManagement.codeCopied'));
                                }}
                                className="shrink-0 gap-2"
                              >
                                <Copy className="h-4 w-4" />
                                {t('clubManagement.copyCode')}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyInviteLink(inv.token)}
                              className="shrink-0 gap-2 text-muted-foreground"
                            >
                              <Link2 className="h-4 w-4" />
                              {t('clubManagement.copyLink')}
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
                                {t('clubManagement.regenerate')}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteInvitation(inv.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              {t('clubManagement.remove')}
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
