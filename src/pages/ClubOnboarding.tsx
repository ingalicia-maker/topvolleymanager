import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useClub } from '@/hooks/useClub';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Building2, Users, Link2, Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function ClubOnboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { hasClub, loading, createClub, joinClubWithToken } = useClub();
  
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [clubName, setClubName] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [joinResult, setJoinResult] = useState<{ success: boolean; message: string } | null>(null);

  // Check for invitation token in URL
  useEffect(() => {
    const token = searchParams.get('invite');
    if (token) {
      setInviteToken(token);
      setMode('join');
    }
  }, [searchParams]);

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

    setSubmitting(true);
    setJoinResult(null);
    
    const result = await joinClubWithToken(inviteToken.trim());
    setSubmitting(false);

    if (result.success) {
      setJoinResult({ success: true, message: '¡Te has unido al club!' });
      toast.success('¡Te has unido al club!');
      setTimeout(() => navigate('/', { replace: true }), 1500);
    } else {
      setJoinResult({ success: false, message: result.error || 'Error al unirse' });
    }
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
                Introduce el código de invitación que te han compartido.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  }}
                  className="flex-1"
                >
                  Atrás
                </Button>
                <Button
                  onClick={handleJoinClub}
                  disabled={submitting || !inviteToken.trim()}
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
