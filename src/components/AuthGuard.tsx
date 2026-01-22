import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClub } from '@/hooks/useClub';
import i18n from '@/i18n';

interface AuthGuardProps {
  children: React.ReactNode;
  requireClub?: boolean;
  unauthenticatedRedirect?: string;
}

const SUPPORTED_LANGUAGES = ['es', 'en', 'it'];

function getPreferredLanguage(): string {
  let preferredLang = i18n.language;
  
  // Normalize language code (e.g., 'en-US' -> 'en')
  if (preferredLang.includes('-')) {
    preferredLang = preferredLang.split('-')[0];
  }
  
  // Default to 'es' if not supported
  if (!SUPPORTED_LANGUAGES.includes(preferredLang)) {
    preferredLang = 'es';
  }
  
  return preferredLang;
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
      // Special case: redirect to language-prefixed landing page
      if (unauthenticatedRedirect === '/__lang_redirect__') {
        const lang = getPreferredLanguage();
        navigate(`/${lang}`, { replace: true });
        return;
      }
      
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
