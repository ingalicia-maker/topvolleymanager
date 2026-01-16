import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useClub } from '@/hooks/useClub';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Building2, Users, Link2, Loader2, CheckCircle, XCircle, Shield, KeyRound } from 'lucide-react';

export default function ClubOnboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { token: pathToken } = useParams<{ token?: string }>(); // For /inv/:token routes
  const { user } = useAuth();
  const { hasClub, loading, createClub, joinClubWithToken } = useClub();
  
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [clubName, setClubName] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [joinResult, setJoinResult] = useState<{ success: boolean; message: string } | null>(null);
  const [responsibilityCodeAccepted, setResponsibilityCodeAccepted] = useState(false);
  const [clubResponsibilityCode, setClubResponsibilityCode] = useState<string | null>(null);
  const [clubInfo, setClubInfo] = useState<{ name: string; responsible_person_name?: string } | null>(null);
  const [loadingClubInfo, setLoadingClubInfo] = useState(false);
  const [useCodeMode, setUseCodeMode] = useState(false);

  const getHashToken = () => {
    const hash = location.hash || '';
    if (!hash) return null;

    const raw = hash.startsWith('#') ? hash.slice(1) : hash;
    if (!raw) return null;

    // Support both "#TOKEN" and "#invite=TOKEN"
    if (raw.includes('invite=')) {
      const params = new URLSearchParams(raw);
      return params.get('invite');
    }

    return raw;
  };

  // Check for invitation token in URL (supports /inv/:token, ?invite=token, and #token)
  useEffect(() => {
    // Priority: path param (/inv/:token) > query param (?invite=token) > hash (#token) > stored token (post-registro)
    const storedToken = localStorage.getItem('pending_invite_token');
    const token = pathToken || searchParams.get('invite') || getHashToken() || storedToken;

    if (token) {
      setInviteToken(token);
      setMode('join');
      fetchClubInfoFromToken(token);
    }
  }, [pathToken, searchParams, location.hash]);

  const fetchClubInfoFromToken = async (token: string) => {
    setLoadingClubInfo(true);

    try {
      // Use RPC function to preview invitation (security definer - works for new users)
      const { data, error } = await supabase.rpc('get_invitation_preview', { _token: token });

      if (error) {
        setJoinResult({ success: false, message: 'Invitación no válida o expirada' });
        setLoadingClubInfo(false);
        return;
      }

      // data is an array, get first row
      const preview = Array.isArray(data) ? data[0] : data;

      if (!preview) {
        setJoinResult({ success: false, message: 'Invitación no válida o expirada' });
        setLoadingClubInfo(false);
        return;
      }

      // Check if already used or expired
      if (preview.used_at) {
        setJoinResult({ success: false, message: 'Esta invitación ya ha sido utilizada' });
        setLoadingClubInfo(false);
        return;
      }

      if (new Date(preview.expires_at) < new Date()) {
        setJoinResult({ success: false, message: 'La invitación ha expirado' });
        setLoadingClubInfo(false);
        return;
      }

      setClubInfo({
        name: preview.club_name,
        responsible_person_name: preview.responsible_person_name,
      });
      setClubResponsibilityCode(preview.responsibility_code);
    } catch (error) {
      console.error('[ClubOnboarding] Error fetching club info:', error);
      setJoinResult({ success: false, message: 'Error al cargar la invitación' });
    }

    setLoadingClubInfo(false);
  };

  const fetchClubInfoFromCode = async (code: string) => {
    if (code.length < 6) return;
    
    setLoadingClubInfo(true);
    setJoinResult(null);

    try {
      const { data, error } = await supabase.rpc('get_invitation_preview_by_code', { _code: code.toUpperCase() });

      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        setJoinResult({ success: false, message: 'Código no válido o expirado' });
        setClubInfo(null);
        setClubResponsibilityCode(null);
        setLoadingClubInfo(false);
        return;
      }

      const preview = Array.isArray(data) ? data[0] : data;

      if (preview.used_at) {
        setJoinResult({ success: false, message: 'Este código ya ha sido utilizado' });
        setLoadingClubInfo(false);
        return;
      }

      if (new Date(preview.expires_at) < new Date()) {
        setJoinResult({ success: false, message: 'El código ha expirado' });
        setLoadingClubInfo(false);
        return;
      }

      setClubInfo({
        name: preview.club_name,
        responsible_person_name: preview.responsible_person_name,
      });
      setClubResponsibilityCode(preview.responsibility_code);
      setJoinResult(null);
    } catch (error) {
      console.error('[ClubOnboarding] Error fetching club info by code:', error);
      setJoinResult({ success: false, message: 'Error al verificar el código' });
    }

    setLoadingClubInfo(false);
  };

  // Redirect if already has a club
  useEffect(() => {
    if (hasClub === true) {
      navigate('/', { replace: true });
    }
  }, [hasClub, navigate]);

  const handleCreateClub = async () => {
    if (!clubName.trim()) {
      toast.error('Introduce el nombre del club');
      return;
    }

    setSubmitting(true);
    const result = await createClub(clubName.trim());
    setSubmitting(false);

    if (result.club) {
      toast.success('¡Club creado correctamente!');
      // Force a page reload to ensure the club data is fresh
      window.location.href = '/';
    } else {
      toast.error(result.error || 'Error al crear el club');
    }
  };

  const handleJoinClub = async () => {
    // Determine if using code or token
    const usingCode = useCodeMode && inviteCode.trim().length >= 6;
    const usingToken = !useCodeMode && inviteToken.trim();

    if (!usingCode && !usingToken) {
      toast.error(useCodeMode ? 'Introduce un código de invitación válido' : 'Abre el enlace de invitación para unirte al club');
      return;
    }

    if (clubResponsibilityCode && !responsibilityCodeAccepted) {
      toast.error('Debes aceptar el compromiso de responsabilidad del club para continuar');
      return;
    }

    setSubmitting(true);
    setJoinResult(null);

    try {
      let result: { success: boolean; error?: string; club_id?: string };

      if (usingCode) {
        // Use short code RPC
        const { data, error } = await supabase.rpc('accept_club_invitation_by_code', { _code: inviteCode.trim().toUpperCase() });
        
        if (error) {
          result = { success: false, error: error.message };
        } else {
          result = data as { success: boolean; error?: string; club_id?: string };
        }
      } else {
        // Use token RPC
        const { data, error } = await supabase.rpc('accept_club_invitation', { _token: inviteToken.trim() });
        
        if (error) {
          let errorMsg = error.message;
          if (errorMsg.includes('Invitación no válida')) {
            errorMsg = 'Invitación no válida o expirada';
          } else if (errorMsg.includes('Ya eres miembro')) {
            errorMsg = 'Ya eres miembro de este club';
          } else if (errorMsg.includes('expirado')) {
            errorMsg = 'La invitación ha expirado';
          }
          result = { success: false, error: errorMsg };
        } else {
          result = { success: true };
        }
      }

      if (!result.success) {
        setJoinResult({ success: false, message: result.error || 'Error al unirse al club' });
        setSubmitting(false);
        return;
      }

      // Update profile with responsibility code acceptance
      if (user && clubResponsibilityCode) {
        await supabase
          .from('profiles')
          .update({ responsibility_code_accepted_at: new Date().toISOString() })
          .eq('id', user.id);
      }

      setJoinResult({ success: true, message: '¡Te has unido al club!' });
      toast.success('¡Te has unido al club!');

      // Clear stored data once membership is accepted
      localStorage.removeItem('pending_invite_token');
      localStorage.removeItem('pending_signup_role');

      setTimeout(() => navigate('/', { replace: true }), 1500);
    } catch (error: any) {
      console.error('[ClubOnboarding] Error joining club:', error);
      setJoinResult({ success: false, message: error?.message || 'Error al unirse al club' });
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {mode === 'select' && (
          <Card>
            <CardHeader className="text-center">
              <Building2 className="h-12 w-12 mx-auto text-primary mb-2" />
              <CardTitle className="text-2xl">Bienvenido a la App</CardTitle>
              <CardDescription>
                Para empezar, crea un nuevo club o únete a uno existente con un enlace de invitación.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => setMode('create')}
                className="w-full h-16 text-lg gap-3"
                variant="default"
              >
                <Building2 className="h-6 w-6" />
                Crear un nuevo club
              </Button>
              <Button
                onClick={() => setMode('join')}
                className="w-full h-16 text-lg gap-3"
                variant="outline"
              >
                <Link2 className="h-6 w-6" />
                Unirme con invitación
              </Button>
            </CardContent>
          </Card>
        )}

        {mode === 'create' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Crear nuevo club
              </CardTitle>
              <CardDescription>
                Introduce el nombre de tu club. Podrás cambiarlo después.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clubName">Nombre del club</Label>
                <Input
                  id="clubName"
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  placeholder="Ej: Club Deportivo Valencia"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setMode('select')}
                  className="flex-1"
                >
                  Atrás
                </Button>
                <Button
                  onClick={handleCreateClub}
                  disabled={submitting || !clubName.trim()}
                  className="flex-1"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Crear club'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {mode === 'join' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Unirse a un club
              </CardTitle>
              <CardDescription>
                {clubInfo ? (
                  <>Estás a punto de unirte a <strong>{clubInfo.name}</strong></>
                ) : loadingClubInfo ? (
                  'Cargando información de la invitación...'
                ) : (
                  'Introduce el código de invitación que te han compartido'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Show code input if no token from URL */}
              {!inviteToken.trim() && !clubInfo && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="inviteCode" className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4" />
                      Código de invitación
                    </Label>
                    <Input
                      id="inviteCode"
                      value={inviteCode}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
                        setInviteCode(val);
                        setUseCodeMode(true);
                        if (val.length === 6) {
                          fetchClubInfoFromCode(val);
                        } else {
                          setClubInfo(null);
                          setClubResponsibilityCode(null);
                          setJoinResult(null);
                        }
                      }}
                      placeholder="ABC123"
                      className="text-center text-2xl font-mono tracking-widest"
                      maxLength={6}
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Introduce el código de 6 caracteres que te ha dado el director de tu club
                    </p>
                  </div>
                </div>
              )}

              {loadingClubInfo ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : clubResponsibilityCode ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Shield className="h-4 w-4 text-primary" />
                    Compromiso de responsabilidad del club
                  </div>
                  <ScrollArea className="h-48 rounded-lg border bg-muted/30 p-3">
                    <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {clubResponsibilityCode}
                    </div>
                  </ScrollArea>
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                    <Checkbox
                      id="responsibility-acceptance"
                      checked={responsibilityCodeAccepted}
                      onCheckedChange={(checked) => setResponsibilityCodeAccepted(checked === true)}
                    />
                    <label
                      htmlFor="responsibility-acceptance"
                      className="text-sm cursor-pointer leading-relaxed"
                    >
                      He leído y acepto el compromiso de responsabilidad del club{' '}
                      {clubInfo?.responsible_person_name && (
                        <span className="text-muted-foreground">
                          (Responsable: {clubInfo.responsible_person_name})
                        </span>
                      )}
                    </label>
                  </div>
                </div>
              ) : null}

              {joinResult && (
                <div
                  className={`p-3 rounded-lg flex items-center gap-2 ${
                    joinResult.success
                      ? 'bg-green-500/10 text-green-600'
                      : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  {joinResult.success ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                  {joinResult.message}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMode('select');
                    setJoinResult(null);
                    setResponsibilityCodeAccepted(false);
                    setInviteToken('');
                    setInviteCode('');
                    setUseCodeMode(false);
                    setClubInfo(null);
                    setClubResponsibilityCode(null);
                    localStorage.removeItem('pending_invite_token');
                    localStorage.removeItem('pending_signup_role');
                  }}
                  className="flex-1"
                >
                  Atrás
                </Button>
                {(inviteToken.trim() || (useCodeMode && inviteCode.length === 6 && clubInfo)) && (
                  <Button
                    onClick={handleJoinClub}
                    disabled={
                      submitting ||
                      loadingClubInfo ||
                      (clubResponsibilityCode && !responsibilityCodeAccepted)
                    }
                    className="flex-1"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Unirme al club'
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
