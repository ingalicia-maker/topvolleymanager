import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClub } from '@/hooks/useClub';

interface AuthGuardProps {
  children: React.ReactNode;
  requireClub?: boolean;
}

export function AuthGuard({ children, requireClub = true }: AuthGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { hasClub, loading: clubLoading } = useClub();
  const navigate = useNavigate();
  const location = useLocation();

  const loading = authLoading || (user && clubLoading);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!clubLoading && requireClub && hasClub === false && location.pathname !== '/club-onboarding') {
      navigate('/club-onboarding');
    }
  }, [user, authLoading, hasClub, clubLoading, navigate, requireClub, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requireClub && hasClub === false) {
    return null;
  }

  return <>{children}</>;
}
