import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import i18n from '@/i18n';

const SUPPORTED_LANGUAGES = ['es', 'en', 'it'];

export function LanguageRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Get the preferred language from i18n (which uses browser detection)
    let preferredLang = i18n.language;
    
    // Normalize language code (e.g., 'en-US' -> 'en')
    if (preferredLang.includes('-')) {
      preferredLang = preferredLang.split('-')[0];
    }
    
    // Default to 'es' if not supported
    if (!SUPPORTED_LANGUAGES.includes(preferredLang)) {
      preferredLang = 'es';
    }

    // Redirect to the language-prefixed landing page
    navigate(`/${preferredLang}`, { replace: true });
  }, [navigate, location]);

  return null;
}

export function useLanguageFromPath() {
  const location = useLocation();
  
  useEffect(() => {
    const pathLang = location.pathname.split('/')[1];
    
    if (SUPPORTED_LANGUAGES.includes(pathLang) && i18n.language !== pathLang) {
      i18n.changeLanguage(pathLang);
    }
  }, [location.pathname]);
}

export function getLanguageFromPath(): string {
  const pathLang = window.location.pathname.split('/')[1];
  return SUPPORTED_LANGUAGES.includes(pathLang) ? pathLang : 'es';
}
