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
import { Building2, Users, Link2, Loader2, CheckCircle, XCircle, Shield } from 'lucide-react';

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
  const [submitting, setSubmitting] = useState(false);
  const [joinResult, setJoinResult] = useState<{ success: boolean; message: string } | null>(null);
  const [responsibilityCodeAccepted, setResponsibilityCodeAccepted] = useState(false);
  const [clubResponsibilityCode, setClubResponsibilityCode] = useState<string | null>(null);
  const [clubInfo, setClubInfo] = useState<{ name: string; responsible_person_name?: string } | null>(null);
  const [loadingClubInfo, setLoadingClubInfo] = useState(false);

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
    // Priority: path param (/inv/:token) > query param (?invite=token) > hash (#token)
    const token = pathToken || searchParams.get('invite') || getHashToken();
    if (token) {
      setInviteToken(token);
      setMode('join');
      fetchClubInfoFromToken(token);
    }
  }, [pathToken, searchParams, location.hash]);

  const fetchClubInfoFromToken = async (token: string) => {
    setLoadingClubInfo(true);
    try {
      // Use RPC function to preview invitation (works even without club_invitations SELECT policy)
      const { data, error } = await supabase.rpc('get_invitation_preview', { _token: token });
      
      if (error) {
        console.error('Error fetching invitation preview:', error);
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
        responsible_person_name: preview.responsible_person_name 
      });
      setClubResponsibilityCode(preview.responsibility_code);
    } catch (error) {
      console.error('Error fetching club info:', error);
      setJoinResult({ success: false, message: 'Error al cargar la invitación' });
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
      navigate('/', { replace: true });
    } else {
      toast.error(result.error || 'Error al crear el club');
    }
  };

  const handleJoinClub = async () => {
    if (!inviteToken.trim()) {
      toast.error('Introduce el código de invitación');
      return;
    }

    if (clubResponsibilityCode && !responsibilityCodeAccepted) {
      toast.error('Debes aceptar el código de responsabilidad del club para continuar');
      return;
    }

    setSubmitting(true);
    setJoinResult(null);
    
    try {
      // Use the RPC function to accept the invitation
      const { data, error } = await supabase.rpc('accept_club_invitation', { _token: inviteToken.trim() });
      
      if (error) {
        // Parse Postgres error message
        let errorMsg = error.message;
        if (errorMsg.includes('Invitación no válida')) {
          errorMsg = 'Invitación no válida o expirada';
        } else if (errorMsg.includes('Ya eres miembro')) {
          errorMsg = 'Ya eres miembro de este club';
        } else if (errorMsg.includes('expirado')) {
          errorMsg = 'La invitación ha expirado';
        }
        setJoinResult({ success: false, message: errorMsg });
        setSubmitting(false);
        return;
      }

      // Update profile with responsibility code acceptance
      if (user) {
        await supabase
          .from('profiles')
          .update({ responsibility_code_accepted_at: new Date().toISOString() })
          .eq('id', user.id);
      }
      
      setJoinResult({ success: true, message: '¡Te has unido al club!' });
      toast.success('¡Te has unido al club!');
      setTimeout(() => navigate('/', { replace: true }), 1500);
    } catch (error: any) {
      console.error('Error joining club:', error);
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
                ) : (
                  'Introduce el código de invitación que te han compartido.'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!pathToken && !searchParams.get('invite') && !location.hash && (
                <div className="space-y-2">
                  <Label htmlFor="inviteToken">Código de invitación</Label>
                  <Input
                    id="inviteToken"
                    value={inviteToken}
                    onChange={(e) => setInviteToken(e.target.value)}
                    placeholder="Pega aquí el código"
                    autoFocus
                  />
                </div>
              )}

              {loadingClubInfo ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : clubResponsibilityCode && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Shield className="h-4 w-4 text-primary" />
                    Código de Responsabilidad del Club
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
                      He leído y acepto el código de responsabilidad del club{' '}
                      {clubInfo?.responsible_person_name && (
                        <span className="text-muted-foreground">
                          (Responsable: {clubInfo.responsible_person_name})
                        </span>
                      )}
                    </label>
                  </div>
                </div>
              )}

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
                  }}
                  className="flex-1"
                >
                  Atrás
                </Button>
                <Button
                  onClick={handleJoinClub}
                  disabled={submitting || !inviteToken.trim() || (clubResponsibilityCode && !responsibilityCodeAccepted)}
                  className="flex-1"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Unirme'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
