import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { InvitationRegistrationForm } from '@/components/InvitationRegistrationForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { triggerCoachWelcome } from '@/components/CoachWelcomeDialog';

export default function Invitation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { token: pathToken } = useParams<{ token?: string }>();
  const { user, loading: authLoading } = useAuth();
  
  const [joiningClub, setJoiningClub] = useState(false);
  const [joinResult, setJoinResult] = useState<{ success: boolean; message: string } | null>(null);

  // Extract token from various URL formats
  const getToken = (): string | null => {
    // Priority: path param > query param > hash
    if (pathToken) return pathToken;
    
    const queryToken = searchParams.get('invite');
    if (queryToken) return queryToken;
    
    const hash = location.hash || '';
    if (!hash) return null;
    
    const raw = hash.startsWith('#') ? hash.slice(1) : hash;
    if (!raw) return null;
    
    // Support both "#TOKEN" and "#invite=TOKEN"
    if (raw.includes('invite=')) {
      const params = new URLSearchParams(raw);
      return params.get('invite');
    }
    
    return raw.length > 10 ? raw : null;
  };

  const inviteToken = getToken();

  // Handle logged-in user: auto-join club
  useEffect(() => {
    if (authLoading) return;
    
    if (user && inviteToken && !joiningClub && !joinResult) {
      autoJoinClub();
    }
  }, [user, authLoading, inviteToken]);

  const autoJoinClub = async () => {
    if (!inviteToken) return;
    
    setJoiningClub(true);
    
    try {
      const { error } = await supabase.rpc('accept_club_invitation', { _token: inviteToken });
      
      if (error) {
        if (error.message?.toLowerCase().includes('ya eres miembro')) {
          toast.success('¡Ya eres miembro de este club!');
          navigate('/', { replace: true });
          return;
        }
        setJoinResult({ success: false, message: error.message || 'Error al unirse al club' });
        setJoiningClub(false);
        return;
      }
      
      // Success
      window.dispatchEvent(new Event('club-membership-changed'));
      triggerCoachWelcome();
      toast.success('¡Te has unido al club!');
      navigate('/', { replace: true });
    } catch (err) {
      console.error('[Invitation] Error:', err);
      setJoinResult({ success: false, message: 'Error inesperado al unirse al club' });
      setJoiningClub(false);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // No token found
  if (!inviteToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Enlace no válido</CardTitle>
            <CardDescription>
              No se ha encontrado ningún token de invitación en el enlace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => navigate('/landing')}>
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Logged-in user joining club
  if (user) {
    if (joiningClub) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Uniéndote al club...</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (joinResult && !joinResult.success) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Error al unirse</CardTitle>
              <CardDescription>{joinResult.message}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
                Ir al dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Fallback (shouldn't reach here normally)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in: show registration form directly
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <InvitationRegistrationForm 
        inviteToken={inviteToken}
        onBackToLogin={() => navigate('/auth', { replace: true })}
      />
    </div>
  );
}
