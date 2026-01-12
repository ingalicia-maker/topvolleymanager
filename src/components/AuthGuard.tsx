import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClub } from '@/hooks/useClub';

interface AuthGuardProps {
  children: React.ReactNode;
  requireClub?: boolean;
  unauthenticatedRedirect?: string;
}

export function AuthGuard({ children, requireClub = true, unauthenticatedRedirect = '/auth' }: AuthGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { hasClub, loading: clubLoading } = useClub();
  const navigate = useNavigate();
  const location = useLocation();

  const loading = authLoading || (user && clubLoading);

  useEffect(() => {
    if (authLoading) return;

    // Preserve the intended destination so invitation links (/inv/:token) work for logged-out users.
    // IMPORTANT: include hash fragments so /invitation#TOKEN survives the redirect to /auth.
    const redirectTarget = `${location.pathname}${location.search}${location.hash || ''}`;

    if (!user) {
      const params = new URLSearchParams();
      params.set('redirect', redirectTarget);
      navigate(`${unauthenticatedRedirect}?${params.toString()}`, { replace: true });
      return;
    }

    if (!clubLoading && requireClub && hasClub === false && location.pathname !== '/club-onboarding') {
      navigate('/club-onboarding', { replace: true });
    }
  }, [user, authLoading, hasClub, clubLoading, navigate, requireClub, location.pathname, location.search, unauthenticatedRedirect]);

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
